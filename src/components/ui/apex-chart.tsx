"use client";

import dynamic from "next/dynamic";

/* ApexCharts usa window/document — no puede renderizarse en SSR */
const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
  loading: () => <div style={{ height: "100%", background: "transparent" }} />,
});

export { ReactApexChart };
