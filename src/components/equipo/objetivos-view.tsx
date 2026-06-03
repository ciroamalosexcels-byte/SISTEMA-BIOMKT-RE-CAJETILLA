"use client";

import { useState, useEffect } from "react";

interface ObjetivoRow {
  id: string;
  objetivo: string;
  fecha: string;
  estado: 0 | 1 | 2 | 3;
}

const STORAGE_KEY = "biomarketing_objetivos_v2";
const ESTADO_COLOR: Record<number, string> = {
  0: "#d1d5db",
  1: "#ef4444",
  2: "#f59e0b",
  3: "#22c55e",
};

function uid() { return Math.random().toString(36).slice(2); }
function makeRows(n: number): ObjetivoRow[] {
  return Array.from({ length: n }, () => ({ id: uid(), objetivo: "", fecha: "", estado: 0 as const }));
}

interface SeccionData { faro: ObjetivoRow[]; meta: ObjetivoRow[]; objetivos: ObjetivoRow[]; }

const DEFAULT: SeccionData = {
  faro:      makeRows(1),
  meta:      makeRows(3),
  objetivos: makeRows(9),
};

export function ObjetivosView() {
  const [data, setData] = useState<SeccionData>(DEFAULT);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setData({
          faro:      Array.isArray(parsed.faro)      ? parsed.faro      : makeRows(1),
          meta:      Array.isArray(parsed.meta)      ? parsed.meta      : makeRows(3),
          objetivos: Array.isArray(parsed.objetivos) ? parsed.objetivos : makeRows(9),
        });
      }
    } catch {}
  }, []);

  function save(next: SeccionData) {
    setData(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  function updateRow(sec: keyof SeccionData, id: string, patch: Partial<ObjetivoRow>) {
    save({ ...data, [sec]: data[sec].map(r => r.id === id ? { ...r, ...patch } : r) });
  }

  function cycleEstado(sec: keyof SeccionData, id: string, cur: number) {
    const next = (cur >= 3 ? 0 : cur + 1) as ObjetivoRow["estado"];
    updateRow(sec, id, { estado: next });
  }

  const thCls = "text-left py-3 px-4 text-[12px] font-black text-white uppercase tracking-[0.08em]";

  function SectionHeader({ title }: { title: string }) {
    return (
      <tr className="bg-[#07152f]">
        <th className={thCls}>{title}</th>
        <th className={`${thCls} w-[160px]`}>Fecha</th>
        <th className={`${thCls} w-[100px] text-center`}>Estado</th>
      </tr>
    );
  }

  function Rows({ sec, rows }: { sec: keyof SeccionData; rows: ObjetivoRow[] }) {
    return (
      <>
        {rows.map((row, i) => (
          <tr key={row.id} className={i % 2 === 0 ? "bg-white dark:bg-transparent" : "bg-slate-50 dark:bg-white/[0.02]"}>
            <td className="py-2 px-4 border-b border-slate-100 dark:border-white/[0.04]">
              <input
                className="w-full bg-transparent outline-none text-[13px] text-slate-800 dark:text-slate-200 placeholder:text-slate-300 dark:placeholder:text-white/20"
                value={row.objetivo}
                onChange={e => updateRow(sec, row.id, { objetivo: e.target.value })}
                placeholder="—"
              />
            </td>
            <td className="py-2 px-4 border-b border-slate-100 dark:border-white/[0.04] w-[160px]">
              <input
                type="date" value={row.fecha}
                onChange={e => updateRow(sec, row.id, { fecha: e.target.value })}
                className="bg-transparent outline-none text-[13px] text-slate-600 dark:text-slate-400 cursor-pointer w-full"
                style={!row.fecha ? { color: "transparent" } : undefined}
              />
            </td>
            <td className="py-2 px-4 border-b border-slate-100 dark:border-white/[0.04] w-[100px] text-center">
              <button
                onClick={() => cycleEstado(sec, row.id, row.estado)}
                className="w-7 h-7 rounded-full border-none cursor-pointer transition-colors"
                style={{ background: ESTADO_COLOR[row.estado] }}
                title="Clic para cambiar estado"
              />
            </td>
          </tr>
        ))}
      </>
    );
  }

  return (
    <div className="p-6">
      <div className="bg-white dark:bg-[#0b1628] border border-slate-200 dark:border-white/[0.06] rounded-[18px] overflow-hidden">
        <table className="w-full border-collapse">
          <tbody>
            <SectionHeader title="Faro" />
            <Rows sec="faro" rows={data.faro} />
            <SectionHeader title="Meta" />
            <Rows sec="meta" rows={data.meta} />
            <SectionHeader title="Objetivos" />
            <Rows sec="objetivos" rows={data.objetivos} />
          </tbody>
        </table>
      </div>
    </div>
  );
}
