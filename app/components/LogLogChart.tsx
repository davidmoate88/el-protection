// A log-log time-current chart. Evolved from a sibling project's
// LogLogChart.tsx (same coordinate mapping / gridline / tick logic), but
// generalized from single straight power-law segments (fine for a digitized
// standard figure's asymptote) to arbitrary sampled polylines, since a real
// relay/thermal trip curve is asymptotic near pickup and only approaches a
// straight line at high multiples — plotting it as one algebraic segment
// would be wrong. This component stays domain-agnostic: it knows nothing
// about IEC/IEEE curve math, only how to draw points it's given (see
// lib/curveSampling.ts for how a Device/DamageCurve becomes `points`).
export type SampledCurve = {
  key: string;
  label: string;
  color: string;
  points: { x: number; y: number }[];
  dashed?: boolean;
  strokeWidth?: number;
};

export type ReferenceLine = {
  key: string;
  label: string;
  value: number;
  color: string;
  dashed?: boolean;
};

export type ViolationRegion = {
  key: string;
  points: { x: number; y: number }[];
  color?: string;
};

export type ChartPoint = {
  x: number;
  y: number;
  label: string;
  color?: string;
};

const MARGIN = { top: 16, right: 16, bottom: 44, left: 56 };
const WIDTH = 720;
const HEIGHT = 480;

function decadeTicks(min: number, max: number): number[] {
  const ticks: number[] = [];
  for (let d = Math.round(min); d <= Math.round(max); d++) ticks.push(10 ** d);
  return ticks;
}

function formatTick(v: number): string {
  if (v >= 1) return v.toString();
  return v.toFixed(Math.max(0, -Math.floor(Math.log10(v))));
}

export function LogLogChart({
  xLabel,
  yLabel,
  xDecades,
  yDecades,
  curves,
  referenceLines = [],
  violationRegions = [],
  points = [],
  legend = true,
}: {
  xLabel: string;
  yLabel: string;
  xDecades: [number, number];
  yDecades: [number, number];
  curves: SampledCurve[];
  referenceLines?: ReferenceLine[];
  violationRegions?: ViolationRegion[];
  points?: ChartPoint[];
  legend?: boolean;
}) {
  const plotW = WIDTH - MARGIN.left - MARGIN.right;
  const plotH = HEIGHT - MARGIN.top - MARGIN.bottom;

  // Rounded to 2dp: full float precision here can serialize to a different
  // last digit between server and client JS engines for the same value
  // (observed directly as a real hydration mismatch on the polyline `points`
  // string), and sub-hundredth-pixel precision is invisible anyway.
  const round2 = (n: number) => Math.round(n * 100) / 100;
  const xToPx = (x: number) =>
    round2(MARGIN.left + ((Math.log10(x) - xDecades[0]) / (xDecades[1] - xDecades[0])) * plotW);
  const yToPx = (y: number) =>
    round2(MARGIN.top + (1 - (Math.log10(y) - yDecades[0]) / (yDecades[1] - yDecades[0])) * plotH);

  const xTicks = decadeTicks(xDecades[0], xDecades[1]);
  const yTicks = decadeTicks(yDecades[0], yDecades[1]);

  const clipId = "tcc-plot-clip";

  return (
    <div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        style={{ width: "100%", maxWidth: 900, height: "auto", background: "var(--panel)" }}
        role="img"
        aria-label={`Chart of ${yLabel} versus ${xLabel}`}
      >
        <defs>
          <clipPath id={clipId}>
            <rect x={MARGIN.left} y={MARGIN.top} width={plotW} height={plotH} />
          </clipPath>
        </defs>

        {/* Plot border */}
        <rect x={MARGIN.left} y={MARGIN.top} width={plotW} height={plotH} fill="none" stroke="var(--ink)" strokeWidth={1} />

        {/* Gridlines + tick labels */}
        {xTicks.map((t) => (
          <g key={`x-${t}`}>
            <line x1={xToPx(t)} y1={MARGIN.top} x2={xToPx(t)} y2={MARGIN.top + plotH} stroke="var(--rule)" strokeWidth={1} />
            <text x={xToPx(t)} y={MARGIN.top + plotH + 16} fontSize={11} textAnchor="middle" fill="var(--muted)">
              {formatTick(t)}
            </text>
          </g>
        ))}
        {yTicks.map((t) => (
          <g key={`y-${t}`}>
            <line x1={MARGIN.left} y1={yToPx(t)} x2={MARGIN.left + plotW} y2={yToPx(t)} stroke="var(--rule)" strokeWidth={1} />
            <text x={MARGIN.left - 8} y={yToPx(t) + 4} fontSize={11} textAnchor="end" fill="var(--muted)">
              {formatTick(t)}
            </text>
          </g>
        ))}

        {/* Axis labels */}
        <text x={MARGIN.left + plotW / 2} y={HEIGHT - 6} fontSize={12} textAnchor="middle" fill="var(--ink)">
          {xLabel}
        </text>
        <text
          x={14}
          y={MARGIN.top + plotH / 2}
          fontSize={12}
          textAnchor="middle"
          fill="var(--ink)"
          transform={`rotate(-90 14 ${MARGIN.top + plotH / 2})`}
        >
          {yLabel}
        </text>

        <g clipPath={`url(#${clipId})`}>
          {/* Violation regions render first, behind curves */}
          {violationRegions.map((region) =>
            region.points.length === 0 ? null : (
              <polygon
                key={region.key}
                points={region.points.map((p) => `${xToPx(p.x)},${yToPx(p.y)}`).join(" ")}
                fill={region.color ?? "var(--danger-bg)"}
                stroke="none"
              />
            ),
          )}

          {/* Reference lines (e.g. Ik max/min fault-current markers) */}
          {referenceLines.map((line) => (
            <line
              key={line.key}
              x1={xToPx(line.value)}
              y1={MARGIN.top}
              x2={xToPx(line.value)}
              y2={MARGIN.top + plotH}
              stroke={line.color}
              strokeWidth={1.5}
              strokeDasharray={line.dashed === false ? undefined : "5 4"}
            />
          ))}

          {/* Curves */}
          {curves.map((c) =>
            c.points.length < 2 ? null : (
              <polyline
                key={c.key}
                points={c.points.map((p) => `${xToPx(p.x)},${yToPx(p.y)}`).join(" ")}
                fill="none"
                stroke={c.color}
                strokeWidth={c.strokeWidth ?? 2.5}
                strokeDasharray={c.dashed ? "6 4" : undefined}
              />
            ),
          )}
        </g>

        {/* Reference line labels, drawn outside the clip so they're never cut off */}
        {referenceLines.map((line) => (
          <text
            key={`${line.key}-label`}
            x={xToPx(line.value) + 4}
            y={MARGIN.top + 12}
            fontSize={10}
            fill={line.color}
            fontWeight={700}
          >
            {line.label}
          </text>
        ))}

        {/* Point markers */}
        {points.map((p) => {
          const clampedX = Math.min(Math.max(p.x, 10 ** xDecades[0]), 10 ** xDecades[1]);
          const clampedY = Math.min(Math.max(p.y, 10 ** yDecades[0]), 10 ** yDecades[1]);
          const cx = xToPx(clampedX);
          const cy = yToPx(clampedY);
          return (
            <g key={p.label}>
              <circle cx={cx} cy={cy} r={5} fill={p.color ?? "var(--ink)"} stroke="var(--panel)" strokeWidth={1.5} />
              <text x={cx + 8} y={cy - 8} fontSize={11} fill={p.color ?? "var(--ink)"} fontWeight={700}>
                {p.label}
              </text>
            </g>
          );
        })}
      </svg>

      {legend && curves.length > 0 && (
        <ul
          style={{
            listStyle: "none",
            display: "flex",
            flexWrap: "wrap",
            gap: "6px 16px",
            margin: "8px 0 0 0",
            padding: 0,
          }}
        >
          {curves.map((c) => (
            <li key={c.key} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--ink)" }}>
              <span
                style={{
                  display: "inline-block",
                  width: 14,
                  height: 3,
                  background: c.color,
                  opacity: c.dashed ? 0.6 : 1,
                }}
              />
              {c.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
