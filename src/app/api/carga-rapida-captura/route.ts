import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import sharp from "sharp";
import { createWorker } from "tesseract.js";

export const runtime = "nodejs";
export const maxDuration = 60;

const HEADER_Y_MIN = 150;
const HEADER_Y_MAX = 230;
const TIME_RE = /^(\d{1,2}):(\d{2})\s*(am|pm)$/i;

interface OcrWord {
  text: string;
  bbox: { x0: number; y0: number; x1: number; y1: number };
}

interface ExtractedItem {
  scheduledDate: string; // "YYYY-MM-DDTHH:mm"
  type: "REEL" | "PLACA";
}

function to24h(text: string): string {
  const m = text.match(TIME_RE);
  if (!m) return "08:00";
  let h = parseInt(m[1], 10);
  const min = m[2];
  const ampm = m[3].toLowerCase();
  if (ampm === "pm" && h !== 12) h += 12;
  if (ampm === "am" && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${min}`;
}

async function extractFromImage(buffer: Buffer, year: number, month: number): Promise<ExtractedItem[]> {
  const worker = await createWorker("eng", 1, { cachePath: "/tmp" });
  let words: OcrWord[] = [];
  try {
    const { data } = await worker.recognize(buffer, {}, { blocks: true });
    for (const block of data.blocks ?? []) {
      for (const para of block.paragraphs ?? []) {
        for (const line of para.lines ?? []) {
          for (const word of line.words ?? []) {
            words.push({ text: word.text.trim(), bbox: word.bbox });
          }
        }
      }
    }
  } finally {
    await worker.terminate();
  }

  // Columna de días: números en la fila del encabezado del calendario (Dom/Lun/Mar…)
  const dayCols = words
    .filter(w => w.bbox.y0 >= HEADER_Y_MIN && w.bbox.y0 <= HEADER_Y_MAX && /\d/.test(w.text))
    .map(w => {
      const m = w.text.match(/(\d{1,2})/);
      return m ? { day: parseInt(m[1], 10), cx: (w.bbox.x0 + w.bbox.x1) / 2 } : null;
    })
    .filter((d): d is { day: number; cx: number } => d !== null && d.day >= 1 && d.day <= 31);

  if (dayCols.length === 0) return [];

  const timeWords = words.filter(w => TIME_RE.test(w.text));
  if (timeWords.length === 0) return [];

  const { data: px, info } = await sharp(buffer).raw().ensureAlpha().toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels: C } = info;

  function pixelAt(x: number, y: number) {
    x = Math.max(0, Math.min(W - 1, x));
    y = Math.max(0, Math.min(H - 1, y));
    const idx = (y * W + x) * C;
    return [px[idx], px[idx + 1], px[idx + 2]];
  }

  // El ícono del tipo de contenido está siempre pegado a la izquierda de la hora.
  // Reel = ícono anaranjado (RGB ~240,195,180 de "tinta" promedio), Publicación = turquesa (~110,180,180).
  function classifyIcon(bbox: OcrWord["bbox"]): "REEL" | "PLACA" {
    const cy = Math.round((bbox.y0 + bbox.y1) / 2);
    const iconCx = bbox.x0 - 14;
    let rSum = 0, gSum = 0, bSum = 0, n = 0;
    for (let dx = -7; dx <= 7; dx++) {
      for (let dy = -7; dy <= 7; dy++) {
        const [r, g, b] = pixelAt(iconCx + dx, cy + dy);
        if (r > 230 && g > 230 && b > 230) continue; // fondo blanco de la insignia
        rSum += r; gSum += g; bSum += b; n++;
      }
    }
    if (n === 0) return "REEL";
    const r = rSum / n, g = gSum / n, b = bSum / n;
    if (b - r > 10 && g - r > 10) return "PLACA";
    return "REEL";
  }

  function nearestDay(cx: number): number {
    let best = dayCols[0].day, bestDist = Infinity;
    for (const d of dayCols) {
      const dist = Math.abs(d.cx - cx);
      if (dist < bestDist) { bestDist = dist; best = d.day; }
    }
    return best;
  }

  return timeWords.map(w => {
    const cx = (w.bbox.x0 + w.bbox.x1) / 2;
    const day = nearestDay(cx);
    const type = classifyIcon(w.bbox);
    const time = to24h(w.text);
    return {
      scheduledDate: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T${time}`,
      type,
    };
  });
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const formData = await req.formData();
    const year = parseInt(String(formData.get("year")), 10);
    const month = parseInt(String(formData.get("month")), 10);
    if (!year || !month || month < 1 || month > 12) {
      return NextResponse.json({ error: "Falta año/mes de referencia" }, { status: 400 });
    }

    const files = formData.getAll("images").filter((f): f is File => f instanceof File);
    if (files.length === 0) {
      return NextResponse.json({ error: "Falta al menos una imagen" }, { status: 400 });
    }

    const items: ExtractedItem[] = [];
    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      items.push(...(await extractFromImage(buffer, year, month)));
    }

    return NextResponse.json({ items });
  } catch (e) {
    console.error("[carga-rapida-captura] Exception:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
