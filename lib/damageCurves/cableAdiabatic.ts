import type { TripTimeResult } from "../types";

// Adiabatic short-circuit withstand: t = (k*S/I)^2 (S in mm^2, I in A).
// k-factor table ported from cablegrid-uk/lib/cableEngine.ts (verified
// there, confirmed by direct read 2026-08-04) rather than re-derived here.
const CABLE_K_FACTOR: Record<"copper" | "aluminium", Record<"pvc" | "xlpe", number>> = {
  copper: { pvc: 115, xlpe: 143 },
  aluminium: { pvc: 76, xlpe: 94 },
};

export function cableAdiabaticWithstandTime(
  material: "copper" | "aluminium",
  insulation: "pvc" | "xlpe",
  csaMm2: number,
  parallelRuns: number,
  current: number,
): TripTimeResult {
  const k = CABLE_K_FACTOR[material][insulation];
  const effectiveCsaMm2 = csaMm2 * Math.max(1, parallelRuns);
  const timeS = ((k * effectiveCsaMm2) / current) ** 2;
  return { valid: true, timeS };
}
