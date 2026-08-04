import type { TripTimeResult } from "../types";

// IEC 60255-149:2013 §4.4.4.2/4.4.4.3, Eq (5) cold curve / Eq (6) hot curve
// (confirmed directly from the standard text):
//   cold: t(Ieq) = tau * ln( Ieq^2 / (Ieq^2 - (k*IB)^2) )
//   hot:  t(Ieq) = tau * ln( (Ieq^2 - Ip^2) / (Ieq^2 - (k*IB)^2) )
// The hot-curve form reduces exactly to the cold curve when Ip=0, so a
// single implementation covers both. The relay never trips for current at or
// below k*IB (the thermal protection's own continuous-current threshold, not
// a pickup in the overcurrent-relay sense) — Section 4.4.2 requires the k
// setting to "include a range of at least 1.0 to 1.5" where k is a setting.
export function thermalReplicaTripTime(
  ratedCurrentA: number,
  kFactor: number,
  thermalConstantMin: number,
  priorLoadA: number,
  current: number,
): TripTimeResult {
  const kIb = kFactor * ratedCurrentA;
  if (priorLoadA < 0 || priorLoadA >= kIb) {
    return { valid: false, reason: "prior load must be between 0 and k*IB" };
  }
  if (current <= kIb || current <= priorLoadA) {
    return { valid: false, reason: "current must exceed both k*IB and the prior load" };
  }
  const tauS = thermalConstantMin * 60;
  const timeS = tauS * Math.log((current ** 2 - priorLoadA ** 2) / (current ** 2 - kIb ** 2));
  return { valid: true, timeS };
}
