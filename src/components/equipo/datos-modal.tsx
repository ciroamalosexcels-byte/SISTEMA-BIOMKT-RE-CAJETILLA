"use client";

import { useState } from "react";
import { zodiacSign, chineseZodiac } from "@/lib/dates";
import { calcAge } from "@/lib/dates";
import type { TeamMember } from "@/types";

const XIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
  </svg>
);

interface Props {
  member: TeamMember;
  onClose: () => void;
  onSave: (patch: Partial<TeamMember>) => void;
}

export function DatosModal({ member, onClose, onSave }: Props) {
  const [nombre, setNombre] = useState(member.nombre);
  const [fechaNacimiento, setFechaNacimiento] = useState(member.fechaNacimiento ?? "");
  const [equipo, setEquipo] = useState(member.equipo ?? "");
  const [telefono, setTelefono] = useState(member.telefono ?? "");
  const [sueno, setSueno] = useState(member.sueno ?? "");
  const [roles, setRoles] = useState(member.roles ?? "");
  const [horarios, setHorarios] = useState(member.horarios ?? "");
  const [mail, setMail] = useState(member.mail ?? "");
  const [direccion, setDireccion] = useState(member.direccion ?? "");
  const [notas, setNotas] = useState(member.notas ?? "");

  /* Auto-derived values — recompute on render so they update live */
  const edad = calcAge(fechaNacimiento);
  const signoAstro = fechaNacimiento ? zodiacSign(fechaNacimiento) : "";
  const signoChino = fechaNacimiento ? chineseZodiac(fechaNacimiento) : "";

  function handleSave() {
    onSave({
      nombre: nombre.trim().toUpperCase() || member.nombre,
      edad,
      fechaNacimiento,
      equipo,
      telefono,
      sueno,
      roles,
      horarios,
      mail,
      direccion,
      notas,
      signo: signoAstro,
      signoChino,
    });
  }

  return (
    <div className="modal-backdrop open reference-data-modal" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Datos del integrante</h2>
          <button className="icon-btn" type="button" onClick={onClose}><XIcon /></button>
        </div>

        <div className="modal-body" style={{ display: "block", padding: 24, overflowY: "auto", maxHeight: "calc(92vh - 164px)" }}>
          <div className="team-data-grid">
            {/* Nombre */}
            <input
              className="field"
              type="text"
              placeholder="Nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              autoFocus
            />

            {/* Edad (readonly, auto) */}
            <input
              className="field"
              type="text"
              placeholder="Edad automática"
              value={edad}
              readOnly
              style={{ color: "var(--slate-500)", cursor: "default" }}
            />

            {/* Fecha de nacimiento — full width */}
            <input
              className="field"
              type="date"
              value={fechaNacimiento}
              onChange={(e) => setFechaNacimiento(e.target.value)}
              style={{ gridColumn: "1 / -1" }}
            />

            {/* Equipo */}
            <select className="field" value={equipo} onChange={(e) => setEquipo(e.target.value)} style={{ cursor: "pointer" }}>
              <option value="">— Equipo —</option>
              <option value="BIOMARKETING">BIOMARKETING</option>
              <option value="BIOESTRATEGIA">BIOESTRATEGIA</option>
            </select>

            {/* Teléfono */}
            <input className="field" type="text" placeholder="Teléfono" value={telefono} onChange={(e) => setTelefono(e.target.value)} />

            {/* Sueño */}
            <input className="field" type="text" placeholder="Sueño" value={sueno} onChange={(e) => setSueno(e.target.value)} />

            {/* Roles */}
            <input className="field" type="text" placeholder="Roles" value={roles} onChange={(e) => setRoles(e.target.value)} />

            {/* Mail */}
            <input className="field" type="email" placeholder="Mail" value={mail} onChange={(e) => setMail(e.target.value)} />

            {/* Dirección */}
            <input className="field" type="text" placeholder="Dirección" value={direccion} onChange={(e) => setDireccion(e.target.value)} />

            {/* Horarios — full width textarea */}
            <textarea
              className="textarea"
              placeholder="Horarios laborales"
              value={horarios}
              onChange={(e) => setHorarios(e.target.value)}
              style={{ gridColumn: "1 / -1" }}
            />

            {/* Notas — full width textarea */}
            <textarea
              className="textarea"
              placeholder="Notas"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              style={{ gridColumn: "1 / -1" }}
            />

            {/* Zodiac box — full width, 2 columns */}
            <div className="team-zodiac-box">
              <div>
                SIGNO ASTROLÓGICO: {signoAstro || "—"}
              </div>
              <div>
                SIGNO CHINO: {signoChino || "—"}
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-outline" type="button" onClick={onClose}>Cancelar</button>
          <button className="btn btn-amber" type="button" onClick={handleSave}>Guardar</button>
        </div>
      </div>
    </div>
  );
}
