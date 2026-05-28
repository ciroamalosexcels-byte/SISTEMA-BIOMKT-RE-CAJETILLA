"use client";

import { useState, useEffect } from "react";
import { useAppSettings } from "@/store/app-settings";
import { CONTENT_TYPES, PLAN_SERVICES, PLAN_NAMES } from "@/lib/constants";
import type { PlanItem } from "@/lib/constants";

export function SubtabPlanes() {
  const { settings, update, addNotification } = useAppSettings();

  const selectedService = settings.selectedPlanService || PLAN_SERVICES[0];
  const selectedPlan    = settings.selectedPlanName    || PLAN_NAMES[0];

  const [items, setItems] = useState<PlanItem[]>(() =>
    settings.servicePlans?.[selectedService]?.[selectedPlan] ?? []
  );

  useEffect(() => {
    setItems(settings.servicePlans?.[selectedService]?.[selectedPlan] ?? []);
  }, [selectedService, selectedPlan]);

  function handleServiceChange(v: string) {
    update({ selectedPlanService: v });
  }
  function handlePlanChange(v: string) {
    update({ selectedPlanName: v });
  }

  function addItem() {
    setItems((prev) => [...prev, { type: "HISTORIA", qty: 1, day: 1, idea: "" }]);
  }
  function removeItem(i: number) {
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  }
  function patchItem(i: number, p: Partial<PlanItem>) {
    setItems((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], ...p };
      return next;
    });
  }

  function save() {
    const plans: Record<string, Record<string, PlanItem[]>> = {
      ...(settings.servicePlans ?? {}),
    };
    if (!plans[selectedService]) plans[selectedService] = {};
    plans[selectedService] = { ...plans[selectedService], [selectedPlan]: items };
    update({ servicePlans: plans });
    addNotification("Plan guardado");
  }

  return (
    <section className="plans-panel-v30">
      <div className="panel-head">
        <div className="panel-title-row">
          <h2 className="panel-title">PLANES</h2>
          <div className="panel-subtitle">CONFIGURACIÓN DE 3 PLANES POR SERVICIO</div>
        </div>
        <div className="plans-controls-v30">
          <select
            className="field"
            value={selectedService}
            onChange={(e) => handleServiceChange(e.target.value)}
            style={{ maxWidth: 280 }}
          >
            {PLAN_SERVICES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select
            className="field"
            value={selectedPlan}
            onChange={(e) => handlePlanChange(e.target.value)}
            style={{ maxWidth: 180 }}
          >
            {PLAN_NAMES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <button className="btn btn-amber btn-sm" type="button" onClick={addItem}>
            ＋ Agregar contenido
          </button>
        </div>
      </div>

      <div className="plans-body-v30">
        <div className="fake-field">
          Configurá qué contenidos se cargan automáticamente cuando a un cliente
          se le asigna este servicio y este plan.
        </div>

        <div className="plan-items-v30">
          {items.length === 0 ? (
            <div className="empty">Este plan todavía no tiene contenidos configurados.</div>
          ) : (
            items.map((it, i) => (
              <div key={i} className="plan-row-v30">
                <select
                  className="field"
                  value={it.type}
                  onChange={(e) => patchItem(i, { type: e.target.value })}
                >
                  {CONTENT_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <input
                  className="field"
                  type="number"
                  min={1}
                  value={it.qty}
                  onChange={(e) => patchItem(i, { qty: Math.max(1, Number(e.target.value)) })}
                  placeholder="Cantidad"
                />
                <input
                  className="field"
                  type="number"
                  min={1}
                  max={31}
                  value={it.day}
                  onChange={(e) => patchItem(i, { day: Math.min(31, Math.max(1, Number(e.target.value))) })}
                  placeholder="Día"
                />
                <input
                  className="field"
                  value={it.idea}
                  onChange={(e) => patchItem(i, { idea: e.target.value })}
                  placeholder="Idea / objetivo"
                />
                <button
                  className="btn btn-danger btn-sm"
                  type="button"
                  onClick={() => removeItem(i)}
                >
                  Borrar
                </button>
              </div>
            ))
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
          <button className="btn btn-amber" type="button" onClick={save}>
            Guardar plan
          </button>
        </div>
      </div>
    </section>
  );
}
