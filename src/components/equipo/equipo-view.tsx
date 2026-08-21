"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useLeadsStore } from "@/store/leads";
import { useTeamStore } from "@/store/team";
import { useAppSettings } from "@/store/app-settings";
import { STATUS91_ITEMS } from "@/lib/constants";
import { todayBA, currentMonthBA, zodiacSign } from "@/lib/dates";
import { DatosModal } from "./datos-modal";
import { BirthdayCelebration } from "./birthday-celebration";
import type { TeamMember } from "@/types";

type Tab = "equipo" | "objetivos";

const RAINBOW_COLORS = ["#ef4444", "#22c55e", "#f6bf26", "#3b82f6"];

function rainbowText(text: string) {
  return [...text].map((char, i) => (
    <span key={i} style={{ color: RAINBOW_COLORS[i % RAINBOW_COLORS.length] }}>{char}</span>
  ));
}

function isBirthdayToday(member: TeamMember, todayMD: string) {
  return member.fechaNacimiento?.slice(5, 10) === todayMD;
}

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

const S91_SCORE: Record<string, number> = { red: 0, yellow: 1, green: 2, lime: 3 };
const S91_COLOR = ["#ff1616", "#ffc21a", "#157a4d", "#52ff00"];

function s91AverageColor(member: TeamMember): string {
  const vals = STATUS91_ITEMS.map((k) => member.status91?.[k] ?? "").filter((v) => v in S91_SCORE);
  if (vals.length === 0) return "#e2e8f0";
  const avg = vals.reduce((sum, v) => sum + S91_SCORE[v], 0) / vals.length;
  return S91_COLOR[Math.round(avg)];
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
      <span style={{ fontSize: 9, fontWeight: 900, color: "#94a3b8", textTransform: "uppercase", letterSpacing: ".06em", lineHeight: 1 }}>
        {label}
      </span>
      <span style={{ fontSize: 12, fontWeight: 700, color: "#07152f", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {value}
      </span>
    </div>
  );
}

function MemberCard({
  member,
  assignedLeads,
  onClick,
  isDragging,
  isDragOver,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: {
  member: TeamMember;
  assignedLeads: number;
  onClick: () => void;
  isDragging: boolean;
  isDragOver: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}) {
  const isActivo = member.activo !== false;
  const isBirthday = isBirthdayToday(member, todayBA().slice(5, 10));

  const sueldoNum = member.sueldo ? parseInt(member.sueldo.replace(/\D/g, ""), 10) : null;
  const sueldoLabel = sueldoNum ? `$${sueldoNum.toLocaleString("es-AR")}` : null;
  const signo = member.fechaNacimiento ? zodiacSign(member.fechaNacimiento) : member.signo ?? "";
  const s91Color = s91AverageColor(member);

  return (
    <div
      className="team-member"
      draggable
      onClick={onClick}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      style={{
        position: "relative",
        opacity: isDragging ? 0.35 : isActivo ? 1 : 0.6,
        outline: isDragOver ? "2px solid var(--amber, #f6bf26)" : "none",
        outlineOffset: isDragOver ? "-2px" : "0",
        cursor: "grab",
        transition: "opacity 0.15s, outline 0.1s",
      }}
    >
      {/* Drag handle */}
      <div
        style={{
          position: "absolute", top: 10, left: 10,
          color: "#cbd5e1", fontSize: 13, lineHeight: 1,
          pointerEvents: "none", userSelect: "none", letterSpacing: -1,
        }}
        title="Arrastrá para reordenar"
      >
        ⠿
      </div>

      {/* Círculo con el promedio del 9.1 */}
      <div
        className="client-progress-circle client-progress-circle-header"
        style={{ position: "absolute", top: 10, right: 10, "--pct": 100, "--progress-color": s91Color } as React.CSSProperties}
        title="Promedio 9.1"
      />

      <div style={{ paddingLeft: 14, paddingRight: 40 }}>
        <div className="team-member-name flex items-center gap-2">
          {isBirthday ? rainbowText(member.nombre) : member.nombre}
          {isBirthday && <span title="¡Cumpleaños!" style={{ marginLeft: 2 }}>🎂</span>}
          {sueldoLabel && (
            <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-amber/[0.12] text-amber-700 dark:text-amber">
              {sueldoLabel}
            </span>
          )}
        </div>
        <div className="team-member-meta">
          Asignado en {assignedLeads} lead{assignedLeads !== 1 ? "s" : ""}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {member.edad && <InfoLine label="Edad" value={`${member.edad} años`} />}
        {member.horarios && <InfoLine label="Horario" value={member.horarios} />}
        {signo && <InfoLine label="Signo" value={signo} />}
        {!member.edad && !member.horarios && !signo && (
          <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>Sin datos cargados</span>
        )}
      </div>
    </div>
  );
}

export function EquipoView() {
  const router = useRouter();
  const rows = useLeadsStore((s) => s.rows);
  const { members, addMember, updateMember } = useTeamStore();
  const [showAdd, setShowAdd] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const sortedMembers = useMemo(() => {
    return [...members].sort((a, b) => {
      const ao = a.teamOrder ?? Infinity;
      const bo = b.teamOrder ?? Infinity;
      return ao !== bo ? ao - bo : 0;
    });
  }, [members]);
  const activos   = sortedMembers.filter((m) => m.activo !== false);
  const inactivos = sortedMembers.filter((m) => m.activo === false);
  const todayMD = todayBA().slice(5, 10);
  const hasBirthdayToday = members.some((m) => isBirthdayToday(m, todayMD));

  function leadsFor(nombre: string) {
    return rows.filter(
      (r) => r.responsable1 === nombre || r.responsable2 === nombre
    ).length;
  }

  function handleCreate(patch: Partial<TeamMember>) {
    const nombre = (patch.nombre ?? "").trim().toUpperCase();
    if (!nombre) { alert("Ingresá un nombre."); return; }
    if (members.some((m) => m.nombre === nombre)) { alert("Ese integrante ya existe."); return; }
    addMember(nombre, patch);
    setShowAdd(false);
  }

  function handleDragStart(e: React.DragEvent, id: string) {
    setDragId(id);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(e: React.DragEvent, id: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (id !== dragId) setOverId(id);
  }

  function handleDrop(e: React.DragEvent, targetId: string) {
    e.preventDefault();
    if (!dragId || dragId === targetId) { setDragId(null); setOverId(null); return; }

    const combined = [...activos, ...inactivos];
    const fromIdx = combined.findIndex((m) => m.id === dragId);
    const toIdx   = combined.findIndex((m) => m.id === targetId);
    if (fromIdx === -1 || toIdx === -1) return;

    const reordered = [...combined];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);

    reordered.forEach((m, i) => {
      if (m.teamOrder !== i) updateMember(m.id, { teamOrder: i });
    });

    setDragId(null);
    setOverId(null);
  }

  function handleDragEnd() {
    setDragId(null);
    setOverId(null);
  }

  function renderCard(m: TeamMember) {
    return (
      <MemberCard
        key={m.id}
        member={m}
        assignedLeads={leadsFor(m.nombre)}
        onClick={() => !dragId && router.push(`/equipo/${m.id}`)}
        isDragging={dragId === m.id}
        isDragOver={overId === m.id}
        onDragStart={(e) => handleDragStart(e, m.id)}
        onDragOver={(e) => handleDragOver(e, m.id)}
        onDrop={(e) => handleDrop(e, m.id)}
        onDragEnd={handleDragEnd}
      />
    );
  }

  return (
    <section className="team-card">
      {hasBirthdayToday && <BirthdayCelebration />}
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
        {activos.map(renderCard)}
      </div>

      {inactivos.length > 0 && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "18px 20px 10px" }}>
            <div style={{ flex: 1, height: 1, background: "var(--slate-200, #e2e8f0)" }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
              Inactivos · {inactivos.length}
            </span>
            <div style={{ flex: 1, height: 1, background: "var(--slate-200, #e2e8f0)" }} />
          </div>
          <div className="team-body">
            {inactivos.map(renderCard)}
          </div>
        </>
      )}

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
