"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLeadsStore } from "@/store/leads";
import { useTeamStore } from "@/store/team";
import { useAppSettings } from "@/store/app-settings";
import { BADGES, STATUS91_ITEMS } from "@/lib/constants";
import { DatosModal } from "./datos-modal";
import type { TeamMember } from "@/types";

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

    /* Immediately apply the rest of the profile data */
    const created = useTeamStore.getState().members.find((m) => m.nombre === nombre);
    if (created) {
      updateMember(created.id, { ...patch, nombre });
    }

    setShowAdd(false);
    teamSave();
  }

  return (
    <section className="team-card">
      {/* Header */}
      <div className="team-top table-top">
        <div className="table-title-row">
          <h2 className="table-section-title">EQUIPO</h2>
          <div className="table-section-subtitle">RACHAS, MEDALLAS E INTEGRANTES</div>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn btn-amber btn-sm" type="button">
          + Agregar integrante
        </button>
      </div>

      {/* Member cards */}
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

      {/* Full datos modal for new member */}
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
