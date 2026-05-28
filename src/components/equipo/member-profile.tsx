"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLeadsStore } from "@/store/leads";
import { useTeamStore } from "@/store/team";
import { useAppSettings } from "@/store/app-settings";
import { BADGES, STATUS91_ITEMS } from "@/lib/constants";
import { DatosModal } from "./datos-modal";
import { MemberMetricsCharts } from "./member-metrics";
import { zodiacSign, chineseZodiac, formatDateDisplay, baParts } from "@/lib/dates";
import type { TeamMember, StatusColor, BadgeKey, MonthlyPoint } from "@/types";

/* ── Color dot picker ────────────────────────────────────────────── */
const DOT_COLORS: { value: StatusColor; bg: string; label: string }[] = [
  { value: "red",    bg: "#ff1616", label: "Rojo" },
  { value: "yellow", bg: "#ffc21a", label: "Amarillo" },
  { value: "green",  bg: "#157a4d", label: "Verde" },
  { value: "lime",   bg: "#52ff00", label: "Lima" },
];

function ColorDotPicker({ value, onChange }: { value: string; onChange: (v: StatusColor) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const current = DOT_COLORS.find((c) => c.value === value);

  return (
    <div className="cdp-wrap" ref={ref}>
      <button
        type="button"
        className="cdp-trigger"
        style={{ background: current?.bg ?? "#e5e7eb" }}
        onClick={() => setOpen((o) => !o)}
        title={current?.label ?? "Sin color"}
      />
      {open && (
        <div className="cdp-popover">
          <button
            type="button"
            className={`cdp-dot cdp-none${!value ? " cdp-selected" : ""}`}
            onClick={() => { onChange("" as StatusColor); setOpen(false); }}
            title="Sin color"
          />
          {DOT_COLORS.map((c) => (
            <button
              key={c.value}
              type="button"
              className={`cdp-dot${value === c.value ? " cdp-selected" : ""}`}
              style={{ background: c.bg }}
              onClick={() => { onChange(c.value); setOpen(false); }}
              title={c.label}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Helpers ─────────────────────────────────────────────────────── */

function makeMonthRows(existing: MonthlyPoint[] | undefined): MonthlyPoint[] {
  const base = Array.isArray(existing) ? existing : [];
  const rows = Array.from({ length: 12 }, (_, i) => ({
    puntos:   String(base[i]?.puntos   ?? ""),
    detalles: String(base[i]?.detalles ?? ""),
    fecha:    String(base[i]?.fecha    ?? ""),
    estado:   (base[i]?.estado ?? "") as MonthlyPoint["estado"],
  }));
  return rows;
}

/** Earned badges with count (grouped by key) */
function earnedGroups(badges: BadgeKey[]) {
  const counts: Partial<Record<BadgeKey, number>> = {};
  for (const k of badges) counts[k] = (counts[k] ?? 0) + 1;
  return BADGES.filter((b) => (counts[b.key as BadgeKey] ?? 0) > 0).map((b) => ({
    ...b,
    count: counts[b.key as BadgeKey] ?? 0,
  }));
}

interface Props { memberId: string; }

export function MemberProfile({ memberId }: Props) {
  const router = useRouter();
  const rows = useLeadsStore((s) => s.rows);
  const { members, updateMember, awardBadge, revokeBadge, save: teamSave } = useTeamStore();
  const { settings } = useAppSettings();

  const raw = members.find((m) => m.id === memberId);
  const member = raw ? { ...raw, badges: Array.isArray(raw.badges) ? raw.badges : [] } : undefined;
  const [datosOpen, setDatosOpen] = useState(false);

  if (!member) {
    return (
      <div className="empty" style={{ padding: "60px 20px" }}>
        Integrante no encontrado.{" "}
        <button onClick={() => router.push("/equipo")} style={{ color: "var(--dark)", textDecoration: "underline", fontWeight: 700 }}>
          Volver
        </button>
      </div>
    );
  }

  const totalClientes = rows.filter(
    (r) => r.tab === "CLIENTES" && (r.responsable1 === member.nombre || r.responsable2 === member.nombre)
  ).length;

  function patch(p: Partial<TeamMember>) { updateMember(memberId, p); }
  function patchStatus(key: string, value: StatusColor) {
    patch({ status91: { ...(member?.status91 ?? {}), [key]: value, updatedAt: new Date().toISOString() } });
  }

  const monthRows = makeMonthRows(member.monthlyPoints);
  function patchMonthRow(i: number, p: Partial<MonthlyPoint>) {
    const updated = [...monthRows];
    updated[i] = { ...updated[i], ...p };
    patch({ monthlyPoints: updated });
  }

  const signoAuto = member.fechaNacimiento ? zodiacSign(member.fechaNacimiento) : member.signo ?? "";
  const signoChAuto = member.fechaNacimiento ? chineseZodiac(member.fechaNacimiento) : member.signoChino ?? "";

  const infoRows = [
    { label: "Nombre",       value: member.nombre },
    { label: "Edad",         value: member.edad ? `${member.edad} años` : "" },
    { label: "Nacimiento",   value: member.fechaNacimiento ? formatDateDisplay(member.fechaNacimiento) : "" },
    { label: "Equipo",       value: member.equipo ?? "" },
    { label: "Teléfono",     value: member.telefono ?? "" },
    { label: "Sueño",        value: member.sueno ?? "" },
    { label: "Roles",        value: member.roles ?? "" },
    { label: "Horarios",     value: member.horarios ?? "" },
    { label: "Signo",        value: signoAuto },
    { label: "Signo chino",  value: signoChAuto },
  ];

  const earned = earnedGroups(member.badges);

  return (
    <div className="team-panel-page mock-team-v23">
      {/* Header */}
      <div className="team-panel-head">
        <div className="team-panel-title-wrap">
          <h2 className="team-panel-title">{member.nombre}</h2>
          <div className="team-panel-sub">PANEL PERSONAL DEL INTEGRANTE</div>
        </div>

        {/* All medals in header — lit if earned, locked if not */}
        <div className="mp-head-medals">
          {BADGES.map((b) => {
            const g = earned.find((e) => e.key === b.key);
            const isEarned = !!g;
            return (
              <span
                key={b.key}
                className={`mp-head-medal-icon badge${isEarned ? ` ${b.className}` : " locked"}`}
                title={`${b.label}${isEarned && g!.count > 1 ? ` ×${g!.count}` : ""}`}
              >
                {b.icon}{isEarned && g!.count > 1 ? <sup>×{g!.count}</sup> : null}
              </span>
            );
          })}
        </div>

        <div className="team-panel-actions">
          <button className="btn btn-amber" type="button" onClick={() => setDatosOpen(true)}>
            Datos del integrante
          </button>
          <button className="btn btn-outline" type="button" onClick={() => router.push("/equipo")}>
            Volver
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="team-panel-body">
        <div className="team-clone-layout-v27">

          {/* Row 1: compact info strip */}
          <div className="team-clone-info-v27">
            <div className="mp-info-strip">
              <div className="mp-info-title">DATOS DEL INTEGRANTE</div>
              <div className="mp-info-grid">
                {infoRows.map((r) => (
                  <div key={r.label} className="mp-info-cell">
                    <span className="mp-info-label">{r.label}</span>
                    <b className="mp-info-val">{r.value || "—"}</b>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Row 2: Status 9.1 + Monthly table (same height) */}
          <div className="team-clone-main-v27" style={{ alignItems: "stretch" }}>

            {/* Status 9.1 with color dots */}
            <div className="team-clone-status-v27" style={{ display: "flex", flexDirection: "column" }}>
              <div className="status91-card mp-status91" style={{ flex: 1, maxWidth: "none" }}>
                <div className="status91-head">
                  <div className="status91-head-title">9.1</div>
                  <div className="status91-updated">
                    {(() => {
                      const raw = member.status91.updatedAt;
                      if (!raw) return "Sin actualizar";
                      try {
                        const d = new Date(raw);
                        const p = baParts(d);
                        return `${p.day}/${p.month} ${p.hour}:${p.minute}`;
                      } catch { return "—"; }
                    })()}
                  </div>
                </div>
                {STATUS91_ITEMS.map((k) => (
                  <div key={k} className="status91-row">
                    <div className="status91-label">{k}</div>
                    <div className="status91-cell">
                      <ColorDotPicker
                        value={(member.status91[k] as StatusColor) || ""}
                        onChange={(v) => patchStatus(k, v)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Monthly points table */}
            <div className="team-clone-monthly-v27" style={{ display: "flex", flexDirection: "column" }}>
              <section className="team-monthly-card-v23" style={{ flex: 1 }}>
                <table className="team-monthly-table-v23">
                  <colgroup><col /><col /><col /><col /></colgroup>
                  <thead>
                    <tr>
                      <th>PUNTOS MENSUALES</th>
                      <th>DETALLES</th>
                      <th>FECHA</th>
                      <th>ESTADO</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthRows.map((row, i) => (
                      <tr key={i}>
                        <td><input className="team-monthly-input-v23" value={row.puntos} onChange={(e) => patchMonthRow(i, { puntos: e.target.value })} placeholder="—" /></td>
                        <td><input className="team-monthly-input-v23" value={row.detalles} onChange={(e) => patchMonthRow(i, { detalles: e.target.value })} placeholder="—" /></td>
                        <td><input type="date" className="team-monthly-date-v23" value={row.fecha} onChange={(e) => patchMonthRow(i, { fecha: e.target.value })} /></td>
                        <td>
                          <div className="team-monthly-state-wrap-v23" style={{ justifyContent: "center" }}>
                            <ColorDotPicker
                              value={row.estado || ""}
                              onChange={(v) => patchMonthRow(i, { estado: v })}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            </div>
          </div>
        </div>

        {/* Metrics charts */}
        <MemberMetricsCharts nombre={member.nombre} rows={rows} />

        {/* MEDALLAS ACUMULADAS */}
        <div className="team-medals-footer">
          <div className="team-medals-title">MEDALLAS ACUMULADAS</div>
          <div className="team-medals-list">
            {BADGES.map((b) => {
              const count = member.badges.filter((k) => k === b.key).length;
              const isEarned = count > 0;
              return (
                <button
                  key={b.key}
                  onClick={() => isEarned ? revokeBadge(memberId, b.key as BadgeKey) : awardBadge(memberId, b.key as BadgeKey)}
                  className={`badge${isEarned ? ` ${b.className}` : " locked"}`}
                  title={`${isEarned ? "Revocar" : "Otorgar"} — requiere ${settings.badgeRequirements[b.key]} cierres (total: ${totalClientes})`}
                >
                  {b.icon} {b.label}:{count}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {datosOpen && (
        <DatosModal
          member={member}
          onClose={() => setDatosOpen(false)}
          onSave={(p) => { patch(p); setDatosOpen(false); teamSave(); }}
        />
      )}
    </div>
  );
}
