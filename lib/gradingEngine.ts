import type { TripTimeResult } from "./types";

export type GradingRange = { currentMin: number; currentMax: number; samples?: number };

export type MarginResult =
  | { valid: true; minMarginS: number; atCurrentA: number; upstreamTimeS: number; downstreamTimeS: number }
  | { valid: false; reason: string };

// Margin is computed across the two devices' overlapping sampled current
// range, reporting the minimum-margin point (current + value) rather than
// checking at one fixed current — the binding constraint on coordination is
// wherever separation is tightest, which isn't necessarily at either curve's
// endpoint.
export function computeGradingMargin(
  upstreamFn: (current: number) => TripTimeResult,
  downstreamFn: (current: number) => TripTimeResult,
  range: GradingRange,
): MarginResult {
  const samples = range.samples ?? 200;
  const decades = Math.log10(range.currentMax / range.currentMin);
  let best: { marginS: number; currentA: number; upstreamTimeS: number; downstreamTimeS: number } | null = null;

  for (let i = 0; i <= samples; i++) {
    const current = 10 ** (Math.log10(range.currentMin) + (i / samples) * decades);
    const up = upstreamFn(current);
    const down = downstreamFn(current);
    if (!up.valid || !down.valid) continue;
    const marginS = up.timeS - down.timeS;
    if (best === null || marginS < best.marginS) {
      best = { marginS, currentA: current, upstreamTimeS: up.timeS, downstreamTimeS: down.timeS };
    }
  }

  if (best === null) {
    return { valid: false, reason: "no overlapping current range where both devices operate" };
  }
  return {
    valid: true,
    minMarginS: best.marginS,
    atCurrentA: best.currentA,
    upstreamTimeS: best.upstreamTimeS,
    downstreamTimeS: best.downstreamTimeS,
  };
}

// Points tracing where a device's trip time exceeds a damage curve's
// withstand time (device too slow -> damage occurs first), for shading on
// the chart. Empty when the device never violates the damage curve.
export function computeViolationRegion(
  deviceFn: (current: number) => TripTimeResult,
  damageFn: (current: number) => TripTimeResult,
  range: GradingRange,
): { x: number; y: number }[] {
  const samples = range.samples ?? 100;
  const decades = Math.log10(range.currentMax / range.currentMin);
  const topEdge: { x: number; y: number }[] = [];
  const bottomEdge: { x: number; y: number }[] = [];

  for (let i = 0; i <= samples; i++) {
    const current = 10 ** (Math.log10(range.currentMin) + (i / samples) * decades);
    const device = deviceFn(current);
    const damage = damageFn(current);
    if (!device.valid || !damage.valid) continue;
    if (device.timeS > damage.timeS) {
      topEdge.push({ x: current, y: device.timeS });
      bottomEdge.push({ x: current, y: damage.timeS });
    }
  }

  if (topEdge.length === 0) return [];
  return [...topEdge, ...bottomEdge.reverse()];
}
