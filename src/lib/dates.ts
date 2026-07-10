import { BA_TIME_ZONE } from "./constants";

export interface BAParts {
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
}

/** Returns date parts in Buenos Aires timezone. Use this instead of new Date() for display. */
export function baParts(date: Date = new Date()): BAParts {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .formatToParts(date)
    .reduce<Record<string, string>>((acc, p) => {
      acc[p.type] = p.value;
      return acc;
    }, {});

  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: parts.hour === "24" ? "00" : parts.hour,
    minute: parts.minute,
  };
}

/** Returns today's date string in BA timezone as YYYY-MM-DD */
export function todayBA(): string {
  const { year, month, day } = baParts();
  return `${year}-${month}-${day}`;
}

/** Returns current datetime in BA timezone as YYYY-MM-DDTHH:mm */
export function nowDatetimeBA(): string {
  const { year, month, day, hour, minute } = baParts();
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

/** Returns current month key as YYYY-MM in BA timezone */
export function currentMonthBA(): string {
  const { year, month } = baParts();
  return `${year}-${month}`;
}

/**
 * Convierte cualquier formato de fecha a YYYY-MM-DD[THH:MM:SS].
 * Maneja: YYYY-MM-DD, DD/MM/YYYY, "Thu Oct 16 2025 00:00:00 GMT-0300...", ISO completo.
 */
export function normalizeISODate(raw: string | number | undefined | null): string {
  if (raw === null || raw === undefined || raw === "") return "";

  // Número serial de Excel/Sheets (ej: 46168 = fecha como días desde 1/1/1900)
  const numVal = typeof raw === "number" ? raw : (typeof raw === "string" && /^\d+(\.\d+)?$/.test(raw.trim()) ? Number(raw) : NaN);
  if (!isNaN(numVal) && numVal > 40000 && numVal < 70000) {
    // 25569 = serial de Excel para el 1/1/1970 (epoch Unix)
    const unixMs = (numVal - 25569) * 86400 * 1000;
    const d = new Date(unixMs);
    if (!isNaN(d.getTime())) {
      const y = d.getUTCFullYear();
      const m = String(d.getUTCMonth() + 1).padStart(2, "0");
      const dd = String(d.getUTCDate()).padStart(2, "0");
      return `${y}-${m}-${dd}`;
    }
  }

  const s = String(raw).trim();
  if (!s) return "";

  // Ya es YYYY-MM-DD[T...]
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s;

  // DD/MM/YYYY [HH:MM[:SS]]
  const ddmm = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (ddmm) {
    const [, d, m, y, h, min, sec] = ddmm;
    const dd = d.padStart(2, "0"), mm = m.padStart(2, "0");
    if (h) return `${y}-${mm}-${dd}T${h.padStart(2, "0")}:${min}:${sec ?? "00"}`;
    return `${y}-${mm}-${dd}`;
  }

  // "Thu Oct 16 2025 00:00:00 GMT-0300 (...)" — formato Date.toString()
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getUTCFullYear();
    const m = String(parsed.getUTCMonth() + 1).padStart(2, "0");
    const d = String(parsed.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  return "";
}

/**
 * Formats a date or datetime string for display.
 * YYYY-MM-DD          → DD/MM/YYYY
 * YYYY-MM-DDTHH:mm    → DD/MM/YYYY HH:mm
 * Cualquier otro formato es normalizado primero.
 */
export function formatDateDisplay(isoDate: string): string {
  if (!isoDate) return "";
  const norm = normalizeISODate(isoDate);
  if (!norm) return "";
  const dtMatch = norm.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (dtMatch) {
    const [, year, month, day, hour, minute] = dtMatch;
    return `${day}/${month}/${year} ${hour}:${minute}`;
  }
  const [year, month, day] = norm.split("-");
  if (!year || !month || !day) return isoDate;
  return `${day}/${month}/${year}`;
}

/** Western zodiac sign from a YYYY-MM-DD birth date */
export function zodiacSign(fecha: string): string {
  if (!fecha) return "";
  const [, m, d] = fecha.split("-").map(Number);
  if (!m || !d) return "";
  const signs: [number, number, string][] = [
    [1, 19, "Capricornio"], [2, 18, "Acuario"], [3, 20, "Piscis"],
    [4, 19, "Aries"], [5, 20, "Tauro"], [6, 20, "Géminis"],
    [7, 22, "Cáncer"], [8, 22, "Leo"], [9, 22, "Virgo"],
    [10, 22, "Libra"], [11, 21, "Escorpio"], [12, 21, "Sagitario"],
    [12, 31, "Capricornio"],
  ];
  for (const [sm, sd, name] of signs) {
    if (m < sm || (m === sm && d <= sd)) return name;
  }
  return "";
}

/** Chinese zodiac sign from a YYYY-MM-DD birth date */
export function chineseZodiac(fecha: string): string {
  if (!fecha) return "";
  const year = parseInt(fecha.split("-")[0]);
  if (!year) return "";
  const animals = ["Mono","Gallo","Perro","Cerdo","Rata","Buey","Tigre","Conejo","Dragón","Serpiente","Caballo","Cabra"];
  const emojis =  ["🐒",   "🐓",   "🐕",   "🐖",   "🐀",  "🐂",  "🐅",   "🐇",    "🐉",    "🐍",       "🐎",     "🐐"];
  const elements = ["Metal ⚙️","Agua 💧","Madera 🌳","Fuego 🔥","Tierra 🪵"];
  const ai = ((year % 12) + 12) % 12;
  const ei = Math.floor((((year % 10) + 10) % 10) / 2);
  return `${animals[ai]} de ${elements[ei]} ${emojis[ai]}`;
}

export interface MayaAstrology {
  signo: string;
  tono: string;
  color: string;
  direccion: string;
  elemento: string;
}

const MAYA_SIGNS: MayaAstrology[] = [
  { signo: "Imix",    tono: "", color: "Rojo",      direccion: "Este",   elemento: "Agua" },
  { signo: "Ik",      tono: "", color: "Blanco",    direccion: "Norte",  elemento: "Viento" },
  { signo: "Akbal",   tono: "", color: "Azul",      direccion: "Oeste",  elemento: "Noche" },
  { signo: "Kan",     tono: "", color: "Amarillo",  direccion: "Sur",    elemento: "Semilla" },
  { signo: "Chicchan",tono: "", color: "Rojo",      direccion: "Este",   elemento: "Serpiente" },
  { signo: "Cimi",    tono: "", color: "Blanco",    direccion: "Norte",  elemento: "Muerte" },
  { signo: "Manik",   tono: "", color: "Azul",      direccion: "Oeste",  elemento: "Venado" },
  { signo: "Lamat",   tono: "", color: "Amarillo",  direccion: "Sur",    elemento: "Estrella" },
  { signo: "Muluc",   tono: "", color: "Rojo",      direccion: "Este",   elemento: "Agua" },
  { signo: "Ok",      tono: "", color: "Blanco",    direccion: "Norte",  elemento: "Perro" },
  { signo: "Chuen",   tono: "", color: "Azul",      direccion: "Oeste",  elemento: "Mono" },
  { signo: "Eb",      tono: "", color: "Amarillo",  direccion: "Sur",    elemento: "Lluvia" },
  { signo: "Ben",     tono: "", color: "Rojo",      direccion: "Este",   elemento: "Caña" },
  { signo: "Ix",      tono: "", color: "Blanco",    direccion: "Norte",  elemento: "Jaguar" },
  { signo: "Men",     tono: "", color: "Azul",      direccion: "Oeste",  elemento: "Aguila" },
  { signo: "Cib",     tono: "", color: "Amarillo",  direccion: "Sur",    elemento: "Sabiduria" },
  { signo: "Caban",   tono: "", color: "Rojo",      direccion: "Este",   elemento: "Tierra" },
  { signo: "Etznab",  tono: "", color: "Blanco",    direccion: "Norte",  elemento: "Pedernal" },
  { signo: "Cauac",   tono: "", color: "Azul",      direccion: "Oeste",  elemento: "Tormenta" },
  { signo: "Ahau",    tono: "", color: "Amarillo",  direccion: "Sur",    elemento: "Sol" },
];

function gregorianToJulianDay(year: number, month: number, day: number): number {
  let y = year;
  let m = month;
  if (m <= 2) {
    y -= 1;
    m += 12;
  }
  const a = Math.floor(y / 100);
  const b = 2 - a + Math.floor(a / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + b - 1524;
}

export function mayaAstrology(fecha: string): MayaAstrology {
  if (!fecha) return { signo: "", tono: "", color: "", direccion: "", elemento: "" };

  const [yearStr, monthStr, dayStr] = fecha.slice(0, 10).split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  if (!year || !month || !day) return { signo: "", tono: "", color: "", direccion: "", elemento: "" };

  const jdn = gregorianToJulianDay(year, month, day);
  const offset = jdn + 96;
  const signIndex = ((offset % 20) + 20) % 20;
  const tone = (((offset % 13) + 13) % 13) + 1;
  const base = MAYA_SIGNS[signIndex];

  return {
    signo: base.signo,
    tono: String(tone),
    color: base.color,
    direccion: base.direccion,
    elemento: base.elemento,
  };
}

/** Auto-calculates age from a YYYY-MM-DD birth date string */
export function calcAge(fechaNacimiento: string): string {
  if (!fechaNacimiento) return "";
  const b = new Date(fechaNacimiento + "T00:00:00");
  if (isNaN(b.getTime())) return "";
  const n = new Date();
  let age = n.getFullYear() - b.getFullYear();
  const m = n.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && n.getDate() < b.getDate())) age--;
  return age >= 0 ? String(age) : "";
}

/** Returns the number of days from today to a future date in BA tz */
export function daysFromToday(isoDate: string): number {
  const today = todayBA();
  const a = new Date(today + "T00:00:00");
  const b = new Date(isoDate + "T00:00:00");
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}
