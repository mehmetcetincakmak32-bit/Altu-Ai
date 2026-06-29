"use client";

interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  data: DonutSlice[];
  size?: number;
  thickness?: number;
  formatValue?: (v: number) => string;
}

export default function DonutChart({
  data,
  size = 140,
  thickness = 28,
  formatValue = (v) => v.toLocaleString("tr-TR"),
}: DonutChartProps) {
  const total = data.reduce((s, d) => s + d.value, 0);

  if (total === 0) {
    return (
      <div className="flex items-center justify-center text-slate-400 text-sm" style={{ height: size }}>
        Veri yok
      </div>
    );
  }

  const cx = size / 2;
  const cy = size / 2;
  const r = (size - thickness) / 2;
  const circumference = 2 * Math.PI * r;

  let offset = 0;
  const slices = data.map((d) => {
    const pct = d.value / total;
    const dash = pct * circumference;
    const gap = circumference - dash;
    const currentOffset = offset;
    offset += dash;
    return { ...d, dash, gap, offset: currentOffset, pct };
  });

  return (
    <div className="flex items-center gap-4 flex-wrap">
      {/* Donut SVG */}
      <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size}>
          {/* Background circle */}
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="#f1f5f9"
            strokeWidth={thickness}
          />
          {/* Slices */}
          {slices.map((s, i) => (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={thickness}
              strokeDasharray={`${s.dash} ${s.gap}`}
              strokeDashoffset={-s.offset + circumference * 0.25}
              style={{ transition: "stroke-dasharray 0.6s ease" }}
              opacity={0.9}
            >
              <title>{`${s.label}: ${formatValue(s.value)}`}</title>
            </circle>
          ))}
        </svg>
        {/* Center text */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none"
        >
          <span className="text-xs font-bold text-slate-700">{data.length}</span>
          <span className="text-[9px] text-slate-400">kategori</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-col gap-1.5 flex-1 min-w-0">
        {slices.map((s, i) => (
          <div key={i} className="flex items-center gap-2 min-w-0">
            <span
              className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
              style={{ background: s.color }}
            />
            <span className="text-xs text-slate-600 truncate flex-1">{s.label}</span>
            <span className="text-xs font-semibold text-slate-700 flex-shrink-0">
              {formatValue(s.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
