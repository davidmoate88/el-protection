import type { TripTimeResult } from "../types";

// IEC 60255-151 §4.4.1.2: independent (definite) time characteristic,
// t(G) = t_op for G > Gs.
export function definiteTimeTripTime(
  pickupA: number,
  timeS: number,
  current: number,
): TripTimeResult {
  if (current <= pickupA) {
    return { valid: false, reason: "current at or below pickup" };
  }
  return { valid: true, timeS };
}
