import type { TripTimeResult } from "./types";

export type SampledPoint = { x: number; y: number };

// Log-spaced sampling of a trip-time/withstand-time function over a current
// range. Skips any point the function reports as invalid (e.g. below pickup,
// where an inverse-time denominator is zero/negative) rather than injecting
// NaN/Infinity into the resulting polyline.
export function sampleCurve(
  tripTimeFn: (current: number) => TripTimeResult,
  range: { currentMin: number; currentMax: number; pointsPerDecade?: number },
): SampledPoint[] {
  const pointsPerDecade = range.pointsPerDecade ?? 24;
  const decades = Math.log10(range.currentMax / range.currentMin);
  const totalSteps = Math.max(2, Math.round(decades * pointsPerDecade));
  const points: SampledPoint[] = [];
  for (let i = 0; i <= totalSteps; i++) {
    const logCurrent = Math.log10(range.currentMin) + (i / totalSteps) * decades;
    const current = 10 ** logCurrent;
    const result = tripTimeFn(current);
    if (result.valid) {
      points.push({ x: current, y: result.timeS });
    }
  }
  return points;
}
