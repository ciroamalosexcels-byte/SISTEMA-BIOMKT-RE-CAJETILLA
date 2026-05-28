"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useLeadsStore } from "@/store/leads";
import { useContentEventsStore } from "@/store/content-events";
import type { Lead } from "@/types";

function progressClass(pct: number) {
  if (pct >= 0.8) return "progress-green";
  if (pct >= 0.4) return "progress-amber";
  return "progress-red";
}

function ClientCard({ lead, progress, contentCount, onClick }: {
  lead: Lead;
  progress: number;
  contentCount: number;
  onClick: () => void;
}) {
  const title  = lead.empresa || lead.nombre || "Sin nombre";
  const service = lead.servicio || "—";
  const pct    = Math.round(progress * 100);
  const activo = lead.activo ?? true;

  return (
    <div className="client-card-v11" onClick={onClick} style={{ opacity: activo ? 1 : 0.55, display: "flex", flexDirection: "column" }}>
      <div className="client-card-main-v11">
        <div className="client-card-text-v11">
          <h3 style={{ margin: 0 }}>{title}</h3>
          <div className="client-card-v11-service">{service}</div>
          <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, marginTop: 3 }}>
            {contentCount} contenido{contentCount !== 1 ? "s" : ""}
          </div>
        </div>
        <div
          className={`client-progress-circle ${progressClass(progress)}`}
          style={{ "--pct": pct } as React.CSSProperties}
        >
          <span>{pct}%</span>
        </div>
      </div>
      <div style={{ marginTop: "auto", paddingTop: 10 }}>
        {activo ? (
          <span style={{ fontSize: 10, fontWeight: 700, color: "#16a34a", background: "#dcfce7", border: "1px solid #86efac", borderRadius: 20, padding: "2px 10px" }}>
            Activo
          </span>
        ) : (
          <span style={{ fontSize: 10, fontWeight: 700, color: "#64748b", background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: 20, padding: "2px 10px" }}>
            Inactivo
          </span>
        )}
      </div>
    </div>
  );
}

export function ClientesView() {
  const rows             = useLeadsStore((s) => s.rows);
  const managementEvents = useContentEventsStore((s) => s.managementEvents);
  const contentEvents    = useContentEventsStore((s) => s.contentEvents);
  const router           = useRouter();

  const clients = useMemo(() => rows.filter((r) => r.tab === "CLIENTES"), [rows]);

  function getProgress(clientId: string) {
    const events = managementEvents.filter((e) => e.clientId === clientId);
    if (events.length === 0) return 0;
    return events.filter((e) => e.done).length / events.length;
  }

  function getContentCount(clientId: string) {
    return contentEvents.filter((e) => e.clientId === clientId).length;
  }

  return (
    <div className="clients-v11-panel">
      <div className="panel-head">
        <div className="panel-title-row">
          <h2 className="panel-title">CLIENTES</h2>
          <div className="panel-subtitle">
            {clients.length} ACTIVO{clients.length !== 1 ? "S" : ""}
          </div>
        </div>
      </div>

      {clients.length === 0 ? (
        <div className="empty" style={{ padding: "60px 24px" }}>
          Sin clientes aún — mové leads a la etapa CLIENTES para verlos aquí.
        </div>
      ) : (
        <div className="client-grid-v11">
          {clients.map((lead) => (
            <ClientCard
              key={lead.id}
              lead={lead}
              progress={getProgress(lead.id)}
              contentCount={getContentCount(lead.id)}
              onClick={() => router.push(`/clientes/${lead.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
