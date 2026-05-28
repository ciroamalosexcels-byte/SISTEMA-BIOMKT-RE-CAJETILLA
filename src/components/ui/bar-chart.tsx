"use client";

interface BarDatum {
  name: string;
  value: number;
}

interface BarChartProps {
  data: BarDatum[];
  color: string;
  label: string;
  height?: number;
}

export function BarChart({ data, color, label, height = 110 }: BarChartProps) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const barW = 38;
  const gap = 10;
  const totalW = Math.max(data.length * (barW + gap) - gap, 60);

  return (
    <div className="flex flex-col gap-2">
      <span className="text-[11px] font-extrabold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <svg
        width={totalW}
        height={height + 30}
        className="overflow-visible"
        style={{ minWidth: totalW }}
      >
        {data.map((d, i) => {
          const bh = Math.max((d.value / max) * height, d.value > 0 ? 4 : 0);
          const x = i * (barW + gap);
          const y = height - bh;
          return (
            <g key={d.name}>
              <rect x={x} y={y} width={barW} height={bh || 2} fill={bh ? color : "#e2e8f0"} rx={5} opacity={0.9} />
              {d.value > 0 && (
                <text
                  x={x + barW / 2}
                  y={y - 4}
                  textAnchor="middle"
                  fontSize={11}
                  fontWeight="800"
                  fill={color}
                >
                  {d.value}
                </text>
              )}
              <text
                x={x + barW / 2}
                y={height + 16}
                textAnchor="middle"
                fontSize={9.5}
                fontWeight="700"
                fill="#64748b"
              >
                {d.name.slice(0, 7)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
