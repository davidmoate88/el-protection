import type { TripTimeResult } from "../types";

// I^2*t = constant, scaled from a nameplate-style rated short-time withstand
// (Ith at duration tk, e.g. "25 kA / 1 s") — the same equivalence principle
// IEC 60947-2 uses for breaker short-time ratings. Chosen over deriving from
// bar geometry/material constants because IEC 60865-1's 3rd edition (2011)
// reportedly relocated the thermal-equivalent-current subclause (with its
// AC/DC asymmetry factors) into IEC 60909-0, which is out of scope for this
// tool (no network fault-calculation engine).
export function busbarThermalWithstandTime(
  ratedWithstandKa: number,
  ratedDurationS: number,
  current: number,
): TripTimeResult {
  const ratedWithstandA = ratedWithstandKa * 1000;
  const timeS = ratedDurationS * (ratedWithstandA / current) ** 2;
  return { valid: true, timeS };
}
