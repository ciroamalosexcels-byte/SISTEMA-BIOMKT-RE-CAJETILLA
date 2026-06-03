"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLeadsStore } from "@/store/leads";
import { useTeamStore } from "@/store/team";
import { useAppSettings } from "@/store/app-settings";
import { BADGES, STATUS91_ITEMS } from "@/lib/constants";
import { todayBA, currentMonthBA } from "@/lib/dates";
import { DatosModal } from "./datos-modal";
import type { TeamMember } from "@/types";

type Tab = "equipo" | "objetivos";

/* ── Semáforo ─────────────────────────────────────────────────────── */
function Semaforo({ pct }: { pct: number }) {
  const color = pct >= 100 ? "#22c55e" : pct >= 70 ? "#f59e0b" : "#ef4444";
  const label = pct >= 100 ? "Cumplido" : pct >= 70 ? "En camino" : "Atrasado";
  return (
    <div className="flex items-center gap-2">
      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: color }} />
      <span className="text-[12px] font-bold" style={{ color }}>{label}</span>
    </div>
  );
}

/* ── Tab Objetivos ────────────────────────────────────────────────── */
function ObjetivosTab() {
  const rows     = useLeadsStore((s) => s.rows);
  const members  = useTeamStore((s) => s.members);
  const { settings, update } = useAppSettings();

  const today = todayBA();
  const month = currentMonthBA();

  const monthRows = rows.filter((r) => r.fechaContacto?.startsWith(month));
  const isR1R2    = (r: typeof rows[0]) => r.tab === "REUNION_1" || r.tab === "REUNION_2";
  const isCli     = (r: typeof rows[0]) => r.tab === "CLIENTES";

  const goals: Record<string, number> = settings.objetivosEquipo ?? {};
  const setGoal = (key: string, val: number) =>
    update({ objetivosEquipo: { ...goals, [key]: val } });

  const FARO: { key: string; label: string; value: number }[] = [
    { key: "contactos_mes",  label: "Contactos del mes",  value: monthRows.length },
    { key: "reuniones_mes",  label: "Reuniones del mes",  value: monthRows.filter(isR1R2).length },
    { key: "cierres_mes",    label: "Cierres del mes",    value: monthRows.filter(isCli).length },
  ];

  const memberGoals = members.map((m) => {
    const contactos = monthRows.filter((r) => r.responsable1 === m.nombre || r.responsable2 === m.nombre).length;
    const meta      = goals[`contactos_${m.nombre}`] ?? 0;
    const pct       = meta > 0 ? Math.round((contactos / meta) * 100) : 0;
    return { nombre: m.nombre, contactos, meta, pct };
  });

  const inputCls = "w-16 text-center bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.06] rounded-md py-1 text-[13px] font-black outline-none focus:border-amber";

  return (
    <div className="flex flex-col gap-6 p-6">

      {/* ── Faro del mes ──────────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#0b1628] border border-slate-200 dark:border-white/[0.06] rounded-[18px] overflow-hidden">
        <div className="px-5 py-3 bg-[#07152f] flex items-center justify-between">
          <span className="text-[13px] font-black text-amber uppercase tracking-[0.1em]">Faro del mes — {month.slice(0,7)}</span>
          <span className="text-[11px] text-white/30 font-bold">Editá las metas haciendo clic en el número</span>
        </div>
        <div className="p-5 flex flex-col gap-3">
          {FARO.map(({ key, label, value }) => {
            const meta = goals[key] ?? 0;
            const pct  = meta > 0 ? Math.round((value / meta) * 100) : 0;
            return (
              <div key={key} className="flex items-center gap-4">
                <div className="w-[180px] text-[13px] font-bold text-slate-700 dark:text-slate-300">{label}</div>
                <div className="text-[22px] font-black text-slate-900 dark:text-white w-10 text-right">{value}</div>
                <div className="text-[12px] text-slate-400">/</div>
                <input
                  type="number" min={0}
                  className={inputCls}
                  value={meta || ""}
                  onChange={e => setGoal(key, Number(e.target.value))}
                  placeholder="meta"
                />
                <div className="flex-1" />
                {meta > 0 ? <Semaforo pct={pct} /> : <span className="text-[11px] text-slate-300 dark:text-slate-600">Sin meta definida</span>}
                {meta > 0 && <span className="text-[13px] font-black text-slate-400 w-12 text-right">{pct}%</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Objetivos por integrante ───────────────────────────────── */}
      <div className="bg-white dark:bg-[#0b1628] border border-slate-200 dark:border-white/[0.06] rounded-[18px] overflow-hidden">
        <div className="px-5 py-3 bg-[#07152f]">
          <span className="text-[13px] font-black text-amber uppercase tracking-[0.1em]">Contactos por integrante</span>
        </div>
        <div className="p-5 flex flex-col gap-3">
          {memberGoals.map(({ nombre, contactos, meta, pct }) => (
            <div key={nombre} className="flex items-center gap-4">
              <div className="w-[180px] text-[13px] font-bold text-slate-700 dark:text-slate-300">{nombre}</div>
              <div className="text-[22px] font-black text-slate-900 dark:text-white w-10 text-right">{contactos}</div>
              <div className="text-[12px] text-slate-400">/</div>
              <input
                type="number" min={0}
                className={inputCls}
                value={meta || ""}
                onChange={e => setGoal(`contactos_${nombre}`, Number(e.target.value))}
                placeholder="meta"
              />
              <div className="flex-1">
                {meta > 0 && (
                  <div className="flex-1 bg-slate-100 dark:bg-white/[0.04] rounded-full h-1.5 overflow-hidden ml-2">
                    <div className="h-full rounded-full transition-all" style={{
                      width: `${Math.min(pct, 100)}%`,
                      background: pct >= 100 ? "#22c55e" : pct >= 70 ? "#f59e0b" : "#ef4444"
                    }} />
                  </div>
                )}
              </div>
              {meta > 0 ? <Semaforo pct={pct} /> : <span className="text-[11px] text-slate-300 dark:text-slate-600">Sin meta</span>}
              {meta > 0 && <span className="text-[13px] font-black text-slate-400 w-12 text-right">{pct}%</span>}
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

const EMPTY_MEMBER: TeamMember = {
  id: "__new__",
  nombre: "",
  status91: Object.fromEntries(STATUS91_ITEMS.map((k) => [k, ""])),
  badges: [],
  monthlyPoints: [],
};

function MemberCard({
  member,
  closings,
  onClick,
  onDelete,
}: {
  member: TeamMember;
  closings: number;
  onClick: () => void;
  onDelete: () => void;
}) {
  const { settings } = useAppSettings();

  return (
    <div className="team-member" onClick={onClick}>
      <div className="team-member-head">
        <div>
          <div className="team-member-name">{member.nombre}</div>
          <div className="team-member-meta">
            Asignado en {closings} lead{closings !== 1 ? "s" : ""}
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (confirm(`¿Eliminar a ${member.nombre}?`)) onDelete();
          }}
          className="btn btn-sm btn-danger"
          type="button"
        >
          Eliminar
        </button>
      </div>

      <div className="badges">
        {BADGES.map((b) => {
          const badges = Array.isArray(member.badges) ? member.badges : [];
          const earned = badges.includes(b.key);
          return (
            <span
              key={b.key}
              className={`badge${earned ? ` ${b.className}` : " locked"}`}
              title={`${b.label} — ${settings.badgeRequirements[b.key]} cierres`}
            >
              {b.icon} {b.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}

export function EquipoView() {
  const router = useRouter();
  const rows = useLeadsStore((s) => s.rows);
  const { members, addMember, updateMember, deleteMember, save: teamSave } = useTeamStore();
  const [showAdd, setShowAdd] = useState(false);

  function closingsFor(nombre: string) {
    return rows.filter(
      (r) => r.tab === "CLIENTES" && (r.responsable1 === nombre || r.responsable2 === nombre)
    ).length;
  }

  function handleCreate(patch: Partial<TeamMember>) {
    const nombre = (patch.nombre ?? "").trim().toUpperCase();
    if (!nombre) { alert("Ingresá un nombre."); return; }
    if (members.some((m) => m.nombre === nombre)) { alert("Ese integrante ya existe."); return; }
    addMember(nombre);
    const created = useTeamStore.getState().members.find((m) => m.nombre === nombre);
    if (created) updateMember(created.id, { ...patch, nombre });
    setShowAdd(false);
    teamSave();
  }

  return (
    <section className="team-card">
      <div className="team-top table-top">
        <div className="table-title-row">
          <h2 className="table-section-title">EQUIPO</h2>
          <div className="table-section-subtitle">RACHAS, MEDALLAS E INTEGRANTES</div>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn btn-amber btn-sm" type="button">
          + Agregar integrante
        </button>
      </div>
      <div className="team-body">
        {members.map((m) => (
          <MemberCard
            key={m.id}
            member={m}
            closings={closingsFor(m.nombre)}
            onClick={() => router.push(`/equipo/${m.id}`)}
            onDelete={() => { deleteMember(m.id); teamSave(); }}
          />
        ))}
      </div>
      {showAdd && (
        <DatosModal
          member={EMPTY_MEMBER}
          onClose={() => setShowAdd(false)}
          onSave={handleCreate}
        />
      )}
    </section>
  );
}
