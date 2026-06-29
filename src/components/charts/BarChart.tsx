"use client";

interface BarChartProps {
  data: { label: string; value: number }[];
  color?: string;
  height?: number;
  formatValue?: (v: number) => string;
}

export default function BarChart({
  data,
  color = "#3b82f6",
  height = 160,
  formatValue = (v) => v.toLocaleString("tr-TR"),
}: BarChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center text-slate-400 text-sm" style={{ height }}>
        Veri yok
      </div>
    );
  }

  const max = Math.max(...data.map((d) => d.value), 1);
  const barWidth = 100 / data.length;
  const padding = 6;

  return (
    <div style={{ height }} className="relative">
      <svg
        viewBox={`0 0 100 100`}
        preserveAspectRatio="none"
        className="w-full h-full"
        style={{ overflow: "visible" }}
      >
        {/* Y-axis grid lines */}
        {[0, 25, 50, 75, 100].map((pct) => (
          <line
            key={pct}
            x1="0"
            y1={100 - pct}
            x2="100"
            y2={100 - pct}
            stroke="#e2e8f0"
            strokeWidth="0.3"
          />
        ))}

        {/* Bars */}
        {data.map((d, i) => {
          const barH = (d.value / max) * 88;
          const x = i * barWidth + padding / 2;
          const w = barWidth - padding;
          const y = 100 - barH;
          const rx = 1.2;

          return (
            <g key={i}>
              {/* Background bar */}
              <rect
                x={x}
                y={5}
                width={w}
                height={90}
                fill="#f1f5f9"
                rx={rx}
              />
              {/* Value bar */}
              <rect
                x={x}
                y={y}
                width={w}
                height={barH}
                fill={color}
                rx={rx}
                opacity={0.85 + i * 0.01}
                style={{
                  transition: "height 0.6s ease, y 0.6s ease",
                }}
              />
            </g>
          );
        })}
      </svg>

      {/* Labels */}
      <div className="flex mt-1">
        {data.map((d, i) => (
          <div
            key={i}
            className="flex flex-col items-center"
            style={{ width: `${100 / data.length}%` }}
          >
            <span className="text-[9px] text-slate-500 truncate w-full text-center">
              {d.label}
            </span>
          </div>
        ))}
      </div>

      {/* Tooltip (hover) via CSS only — shown as title */}
      <div className="absolute inset-0 flex">
        {data.map((d, i) => (
          <div
            key={i}
            className="flex-1 group relative cursor-default"
            title={`${d.label}: ${formatValue(d.value)}`}
          >
            <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-slate-800 text-white text-[10px] rounded px-2 py-1 whitespace-nowrap z-10 pointer-events-none">
              {formatValue(d.value)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
