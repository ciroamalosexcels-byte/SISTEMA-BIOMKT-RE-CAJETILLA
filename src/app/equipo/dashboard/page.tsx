"use client";

import { Users2, Trophy, BarChart3, TrendingUp } from "lucide-react";

export default function DashboardEquipoPage() {
  return (
    <div className="p-8 min-h-full">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-1">
          Dashboard Equipo
        </h1>
        <p className="text-sm text-slate-400 dark:text-slate-500">
          Métricas de desempeño, badges y status del equipo de ventas
        </p>
      </div>

      <div className="grid grid-cols-3 gap-5 mb-6">
        {[
          { label: "Desempeño",  icon: TrendingUp, color: "#22c55e", desc: "Puntos · Objetivos · Tendencia" },
          { label: "Badges",     icon: Trophy,     color: "#f6bf26", desc: "Madera · Bronce · Plata · Oro" },
          { label: "Equipo",     icon: Users2,     color: "#3b82f6", desc: "Status 9.1 · Colaboradores" },
        ].map(({ label, icon: Icon, color, desc }) => (
          <div key={label} className="bg-white dark:bg-[#0b1628] border border-slate-200 dark:border-white/[0.06] rounded-[18px] p-6 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}18` }}>
                <Icon size={20} style={{ color }} />
              </div>
              <div>
                <div className="text-[13px] font-bold text-slate-900 dark:text-white">{label}</div>
                <div className="text-[11px] text-slate-400 dark:text-slate-500">{desc}</div>
              </div>
            </div>
            <div className="h-20 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-dashed border-slate-200 dark:border-white/[0.06] flex items-center justify-center">
              <span className="text-[11px] text-slate-300 dark:text-slate-700 font-medium">Próximamente</span>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-[#0b1628] border border-slate-200 dark:border-white/[0.06] rounded-[18px] p-6">
        <div className="flex items-center gap-3 mb-4">
          <BarChart3 size={18} className="text-slate-400" />
          <span className="text-[13px] font-bold text-slate-900 dark:text-white">Rendimiento mensual del equipo</span>
        </div>
        <div className="h-32 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-dashed border-slate-200 dark:border-white/[0.06] flex items-center justify-center">
          <span className="text-[12px] text-slate-300 dark:text-slate-700 font-medium">Gráfico en desarrollo</span>
        </div>
      </div>
    </div>
  );
}
