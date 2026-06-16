"use client";

import { ReactApexChart } from "@/components/ui/apex-chart";
import type { ApexOptions } from "apexcharts";

const SERIES_NAMES = ["Contactos", "Reuniones", "Cierres"] as const;
const CHART_ID = "welcome-area-chart";

function getChart() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (window as any).ApexCharts?.getChartByID?.(CHART_ID);
}

export function WelcomeAreaChart({
  categories, contactos, reuniones, cierres, title, dark, actions, tooltipLabels,
}: {
  categories: string[]; contactos: number[]; reuniones: number[];
  cierres: number[]; title: string; dark: boolean;
  actions?: React.ReactNode;
  tooltipLabels?: string[];
}) {
  const maxVal = Math.max(...contactos, ...reuniones, ...cierres, 1);

  const opts: ApexOptions = {
    chart: {
      id: CHART_ID,
      type: "area",
      background: "transparent",
      toolbar: { show: false },
      zoom: { enabled: false },
      animations: { enabled: true, speed: 800 },
    },
    theme: { mode: dark ? "dark" : "light" },
    colors: ["#f6bf26", "#3b82f6", "#22c55e"],
    stroke: { curve: "smooth", width: 2.5 },
    fill: {
      type: "gradient",
      gradient: { shadeIntensity: 1, opacityFrom: 0.2, opacityTo: 0.01, stops: [0, 100] },
    },
    dataLabels: { enabled: false },
    markers: { size: 0, hover: { size: 5 } },
    xaxis: {
      categories,
      labels: {
        style: { fontSize: "11px", fontFamily: "Poppins, sans-serif", colors: dark ? "#334155" : "#94a3b8", fontWeight: 700 },
        rotate: 0,
        hideOverlappingLabels: false,
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
      tickAmount: categories.length,
    },
    yaxis: {
      min: 0,
      max: maxVal,
      tickAmount: Math.min(6, maxVal),
      labels: {
        style: { fontSize: "11px", fontFamily: "Poppins, sans-serif", colors: dark ? "#334155" : "#94a3b8", fontWeight: 700 },
        formatter: (v: number) => Math.floor(v).toString(),
        offsetX: -15,
      },
    },
    grid: {
      borderColor: dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.05)",
      strokeDashArray: 3,
      padding: { left: 40, right: 30, top: -15, bottom: 5 },
    },
    legend: { show: false },
    tooltip: {
      theme: dark ? "dark" : "light",
      shared: true,
      intersect: false,
      x: {
        formatter: (v: string | number, opts?: { dataPointIndex?: number }) =>
          tooltipLabels?.[opts?.dataPointIndex ?? -1] ?? `Día ${v}`,
      },
    },
  };

  return (
    <div className="bg-white dark:bg-[#0b1628] border border-slate-200 dark:border-white/[0.06] rounded-[18px]">
      <div className="px-5 py-2.5 bg-[#111827] flex items-center justify-between gap-4">
        <span className="text-[13px] font-black text-white uppercase tracking-[0.02em]">{title}</span>
        <div className="flex items-center gap-4 flex-shrink-0">
          {[
            { label: "Contactos", color: "#f6bf26" },
            { label: "Reuniones", color: "#3b82f6" },
            { label: "Cierres",   color: "#22c55e" },
          ].map(({ label, color }) => (
            <div
              key={label}
              className="flex items-center gap-1.5 cursor-pointer"
              onMouseEnter={() => {
                const chart = getChart();
                SERIES_NAMES.filter(s => s !== label).forEach(s => chart?.hideSeries(s));
              }}
              onMouseLeave={() => {
                const chart = getChart();
                SERIES_NAMES.forEach(s => chart?.showSeries(s));
              }}
            >
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
              <span className="text-[11px] font-bold" style={{ color }}>{label}</span>
            </div>
          ))}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      </div>
      <div className="p-[15px] pb-1" style={{ overflow: "visible" }}>
        <div style={{ overflow: "visible" }}>
          <ReactApexChart
            type="area"
            series={[
              { name: "Contactos", data: contactos },
              { name: "Reuniones", data: reuniones },
              { name: "Cierres",   data: cierres },
            ]}
            options={opts}
            height={187}
          />
        </div>
      </div>
    </div>
  );
}
