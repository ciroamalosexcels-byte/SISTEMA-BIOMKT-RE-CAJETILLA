"use client";

import { useState } from "react";
import { LeadsTable } from "./leads-table";
import { NewLeadModal } from "./new-lead-modal";
import type { TabKey } from "@/types";

const META: Record<string, { title: string; subtitle: string }> = {
  CRM: { title: "CRM GENERAL", subtitle: "PROSPECCIÓN, PRIMER CONTACTO Y CARGA DE LEADS" },
  REUNION_1: { title: "REUNIÓN 1", subtitle: "AUDITORÍA, PRESUPUESTADO Y CIERRE" },
  REUNION_2: { title: "REUNIÓN 2", subtitle: "ENTREGA DE PRESUPUESTO Y CIERRE" },
  SEGUIMIENTO: { title: "SEGUIMIENTO", subtitle: "LLAMADAS, RECORDATORIOS Y REACTIVACIÓN" },
  BASE: { title: "BASE DE DATOS", subtitle: "VISTA GLOBAL DE TODOS LOS REGISTROS" },
};

interface Props {
  tab: TabKey;
}

export function CrmView({ tab }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [query, setQuery]         = useState("");
  const meta = META[tab] ?? { title: tab, subtitle: "" };

  return (
    <>
      <div className="card">
        <div className="table-top">
          <div className="table-top-left">
            <div className="table-title-row">
              <h2 className="table-section-title">{meta.title}</h2>
              <div className="table-section-subtitle">{meta.subtitle}</div>
            </div>
          </div>
          <div className="table-top-right">
            <div className="filters">
              <div className="search-wrap">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
                </svg>
                <input
                  className="search-input"
                  placeholder="Buscar por nombre, empresa..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <button
                onClick={() => setModalOpen(true)}
                className="btn btn-amber btn-sm"
                type="button"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 5v14"/><path d="M5 12h14"/>
                </svg>
                <span>Nuevo lead</span>
              </button>
            </div>
          </div>
        </div>

        <LeadsTable tab={tab} query={query} />
      </div>

      <NewLeadModal
        tab={tab === "BASE" ? "CRM" : tab}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}
