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
  const meta = META[tab] ?? { title: tab, subtitle: "" };

  return (
    <>
      <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
        <div>
          <h2 className="text-[27px] font-black tracking-[-0.03em] uppercase text-[var(--dark)] m-0 leading-none">
            {meta.title}
          </h2>
          <p className="text-[12px] font-extrabold text-[#102a56] uppercase tracking-wide mt-1 m-0">
            {meta.subtitle}
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-3 rounded-[18px] bg-[var(--dark)] text-white font-bold text-[13px] hover:-translate-y-px transition-all shadow-[var(--shadow)]"
        >
          + Nuevo Lead
        </button>
      </div>

      <LeadsTable tab={tab} />

      <NewLeadModal
        tab={tab}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}
