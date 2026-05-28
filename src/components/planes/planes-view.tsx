"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePlansStore } from "@/store/plans";
import type { Plan } from "@/types";

/* ── Add plan modal ─────────────────────────────────────────────────── */
function AddPlanModal({ onAdd, onClose }: {
  onAdd: (nombre: string, descripcion?: string) => void;
  onClose: () => void;
}) {
  const [nombre, setNombre]   = useState("");
  const [desc,   setDesc]     = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) return;
    onAdd(nombre.trim(), desc.trim() || undefined);
  }

  return (
    <div className="modal-backdrop open" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Nuevo plan</h2>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>
        <form id="add-plan-form" onSubmit={submit} style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="field-group" style={{ margin: 0 }}>
            <label className="field-label">Nombre del plan *</label>
            <input autoFocus className="field" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: Plan mensual redes…" required />
          </div>
          <div className="field-group" style={{ margin: 0 }}>
            <label className="field-label">Descripción</label>
            <textarea className="textarea" value={desc} onChange={e => setDesc(e.target.value)} placeholder="Descripción opcional…" rows={3} />
          </div>
        </form>
        <div className="modal-footer">
          <button type="button" className="btn btn-sm btn-outline" onClick={onClose}>Cancelar</button>
          <button type="submit" form="add-plan-form" className="btn btn-sm btn-amber">Crear plan</button>
        </div>
      </div>
    </div>
  );
}

/* ── Plan card ──────────────────────────────────────────────────────── */
function PlanCard({ plan, eventCount, onClick }: {
  plan: Plan;
  eventCount: number;
  onClick: () => void;
}) {
  return (
    <div className="client-card-v11" onClick={onClick}>
      <div className="client-card-main-v11">
        <div className="client-card-text-v11">
          <h3 style={{ margin: 0 }}>{plan.nombre}</h3>
          {plan.descripcion && (
            <div className="client-card-v11-service">{plan.descripcion}</div>
          )}
          <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, marginTop: 3 }}>
            {eventCount} contenido{eventCount !== 1 ? "s" : ""}
          </div>
        </div>
      </div>
      <div style={{ marginTop: "auto", paddingTop: 10 }}>
        <span style={{ fontSize: 10, fontWeight: 600, color: "#94a3b8" }}>
          Creado {new Date(plan.createdAt).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })}
        </span>
      </div>
    </div>
  );
}

/* ── Main view ──────────────────────────────────────────────────────── */
export function PlanesView() {
  const router   = useRouter();
  const { plans, planEvents, addPlan } = usePlansStore();
  const [showAdd, setShowAdd] = useState(false);

  return (
    <section className="card">
      <div className="table-top">
        <div className="table-top-left">
          <div className="table-title-row">
            <h2 className="table-section-title">PLANES</h2>
            <div className="table-section-subtitle">PLANES DE CONTENIDO ESTRATÉGICOS</div>
          </div>
        </div>
        <div className="table-top-right">
          <button className="btn btn-amber btn-sm" type="button" onClick={() => setShowAdd(true)}>
            + Agregar plan
          </button>
        </div>
      </div>

      <div>
        {plans.length === 0 ? (
          <div className="empty" style={{ padding: "60px 20px" }}>
            No hay planes creados.{" "}
            <button type="button" onClick={() => setShowAdd(true)} style={{ color: "var(--amber)", fontWeight: 900, textDecoration: "underline", cursor: "pointer" }}>
              Crear el primero
            </button>
          </div>
        ) : (
          <div className="client-grid-v11">
            {plans.map(plan => (
              <PlanCard
                key={plan.id}
                plan={plan}
                eventCount={planEvents.filter(e => e.planId === plan.id).length}
                onClick={() => router.push(`/planes/${plan.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      {showAdd && (
        <AddPlanModal
          onAdd={(nombre, desc) => { addPlan(nombre, desc); setShowAdd(false); }}
          onClose={() => setShowAdd(false)}
        />
      )}
    </section>
  );
}
