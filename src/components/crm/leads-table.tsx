"use client";

import { useState, useMemo } from "react";
import { useLeadsStore } from "@/store/leads";
import { useTeamStore } from "@/store/team";
import { EMPRESA_BIO_OPTS, MEDIO_OPTS } from "@/lib/constants";
import { formatDateDisplay } from "@/lib/dates";
import type { Lead, TabKey } from "@/types";

interface Props {
  tab: TabKey;
}

const TAB_MOVE_TARGETS: Partial<Record<TabKey, { label: string; to: TabKey }[]>> = {
  CRM: [
    { label: "R1", to: "REUNION_1" },
    { label: "Seguimiento", to: "SEGUIMIENTO" },
    { label: "Cliente", to: "CLIENTES" },
  ],
  REUNION_1: [
    { label: "R2", to: "REUNION_2" },
    { label: "Seguimiento", to: "SEGUIMIENTO" },
    { label: "Cliente", to: "CLIENTES" },
  ],
  REUNION_2: [
    { label: "Seguimiento", to: "SEGUIMIENTO" },
    { label: "Cliente", to: "CLIENTES" },
  ],
  SEGUIMIENTO: [
    { label: "R1", to: "REUNION_1" },
    { label: "Cliente", to: "CLIENTES" },
  ],
};

export function LeadsTable({ tab }: Props) {
  const rows = useLeadsStore((s) => s.rows);
  const { updateLead, deleteLead, moveLeadTo, dirty, saving, save } = useLeadsStore();
  const members = useTeamStore((s) => s.members);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return rows.filter(
      (r) =>
        r.tab === tab &&
        (!q ||
          r.nombre.toLowerCase().includes(q) ||
          r.empresa.toLowerCase().includes(q) ||
          r.observaciones.toLowerCase().includes(q) ||
          r.telefono.toLowerCase().includes(q))
    );
  }, [rows, tab, query]);

  const memberNames = members.map((m) => m.nombre);
  const moveTargets = TAB_MOVE_TARGETS[tab] ?? [];

  return (
    <div className="bg-white border border-slate-200 rounded-[28px] shadow-[var(--shadow)] overflow-hidden">
      {/* Table toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap px-3 py-2.5 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <input
            className="w-[240px] px-3 py-2 text-[13px] border border-slate-200 rounded-xl outline-none"
            placeholder="Buscar…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <span className="text-[12px] font-bold text-slate-500">
            {filtered.length} registro{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>
        <button
          onClick={() => save()}
          disabled={!dirty || saving}
          className={[
            "flex items-center gap-2 px-4 py-2.5 rounded-[18px] text-[13px] font-bold transition-all",
            dirty
              ? "bg-[var(--dark)] text-white hover:-translate-y-px"
              : "bg-slate-100 text-slate-400 cursor-default",
          ].join(" ")}
        >
          {saving ? "Guardando…" : dirty ? "Guardar en Sheets" : "Guardado ✓"}
        </button>
      </div>

      {/* Table */}
      <div className="overflow-auto -webkit-overflow-scrolling-touch">
        <table className="w-full border-separate border-spacing-y-1 min-w-[1200px] table-fixed text-[12px]">
          <thead>
            <tr>
              {[
                ["nombre", "Nombre", "135px"],
                ["empresa", "Empresa / Negocio", "190px"],
                ["observaciones", "Observaciones", "240px"],
                ["telefono", "Teléfono", "110px"],
                ["responsable1", "Responsable 1", "130px"],
                ["responsable2", "Responsable 2", "130px"],
                ["fechaContacto", "Primer Contacto", "120px"],
                ["empresaBio", "Empresa Bio", "120px"],
                ["medio", "Medio", "110px"],
                ["actions", "Pasar a / Acciones", "200px"],
              ].map(([key, label, w]) => (
                <th
                  key={key}
                  style={{ width: w }}
                  className="sticky top-0 z-10 bg-[var(--dark-2)] text-white text-left px-2.5 py-2 font-extrabold text-[13px] border-r border-slate-800 first:rounded-tl-xl last:rounded-tr-xl last:border-r-0"
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={10} className="text-center py-10 text-slate-400 font-bold">
                  Sin registros
                </td>
              </tr>
            )}
            {filtered.map((row) => (
              <LeadRow
                key={row.id}
                row={row}
                memberNames={memberNames}
                moveTargets={moveTargets}
                onUpdate={(patch) => updateLead(row.id, patch)}
                onDelete={() => deleteLead(row.id)}
                onMove={(to) => moveLeadTo(row.id, to)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface RowProps {
  row: Lead;
  memberNames: string[];
  moveTargets: { label: string; to: TabKey }[];
  onUpdate: (patch: Partial<Lead>) => void;
  onDelete: () => void;
  onMove: (to: TabKey) => void;
}

function LeadRow({ row, memberNames, moveTargets, onUpdate, onDelete, onMove }: RowProps) {
  const cell = "border-t border-b border-r border-slate-200 bg-white align-middle p-0";
  const inp = "w-full border-none bg-transparent px-2.5 py-1 outline-none text-[12px] text-[var(--text)] focus:bg-[#fffbeb] min-h-[22px]";

  return (
    <tr className="group hover:![&>td]:bg-[#fff7d6]">
      {/* nombre */}
      <td className={`${cell} rounded-tl-xl rounded-bl-xl border-l`}>
        <input
          className={inp}
          value={row.nombre}
          onChange={(e) => onUpdate({ nombre: e.target.value })}
          placeholder="Nombre"
        />
      </td>

      {/* empresa */}
      <td className={cell}>
        <input
          className={inp}
          value={row.empresa}
          onChange={(e) => onUpdate({ empresa: e.target.value })}
          placeholder="Empresa"
        />
      </td>

      {/* observaciones */}
      <td className={cell}>
        <input
          className={inp}
          value={row.observaciones}
          onChange={(e) => onUpdate({ observaciones: e.target.value })}
          placeholder="Observaciones"
        />
      </td>

      {/* telefono */}
      <td className={cell}>
        <input
          className={inp}
          value={row.telefono}
          onChange={(e) => onUpdate({ telefono: e.target.value })}
          placeholder="Teléfono"
        />
      </td>

      {/* responsable1 */}
      <td className={cell}>
        <select
          className={`${inp} ${!row.responsable1 ? "text-slate-400" : ""}`}
          value={row.responsable1}
          onChange={(e) => onUpdate({ responsable1: e.target.value })}
        >
          <option value="">—</option>
          {memberNames.map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </td>

      {/* responsable2 */}
      <td className={cell}>
        <select
          className={`${inp} ${!row.responsable2 ? "text-slate-400" : ""}`}
          value={row.responsable2}
          onChange={(e) => onUpdate({ responsable2: e.target.value })}
        >
          <option value="">—</option>
          {memberNames.map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </td>

      {/* fechaContacto */}
      <td className={cell}>
        <span className="px-2.5 py-1 block text-[12px] text-slate-500">
          {formatDateDisplay(row.fechaContacto)}
        </span>
      </td>

      {/* empresaBio */}
      <td className={cell}>
        <select
          className={inp}
          value={row.empresaBio}
          onChange={(e) => onUpdate({ empresaBio: e.target.value as Lead["empresaBio"] })}
        >
          {EMPRESA_BIO_OPTS.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      </td>

      {/* medio */}
      <td className={cell}>
        <select
          className={`${inp} ${!row.medio ? "text-slate-400" : ""}`}
          value={row.medio}
          onChange={(e) => onUpdate({ medio: e.target.value as Lead["medio"] })}
        >
          <option value="">—</option>
          {MEDIO_OPTS.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      </td>

      {/* actions */}
      <td className={`${cell} rounded-tr-xl rounded-br-xl border-r`}>
        <div className="flex gap-1.5 flex-wrap items-center px-1.5 py-1">
          {moveTargets.map((t) => (
            <button
              key={t.to}
              onClick={() => onMove(t.to)}
              className="px-2 py-1 rounded-full text-[11px] font-extrabold bg-[#16284d] text-white leading-none"
            >
              {t.label}
            </button>
          ))}
          <button
            onClick={() => {
              if (confirm(`¿Eliminar "${row.nombre || "este registro"}"?`)) onDelete();
            }}
            className="px-2 py-1 rounded-full text-[11px] font-extrabold bg-[#fff1f2] text-[#be123c] border border-[#fecdd3] leading-none"
          >
            ✕
          </button>
        </div>
      </td>
    </tr>
  );
}
