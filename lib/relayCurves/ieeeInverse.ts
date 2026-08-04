import type { TripTimeResult } from "../types";

// IEEE C37.112, trip equation for M > 1: t(I) = TD * [ A/(M^p - 1) + B ]
// where M = I/Ipickup. Constants are Table III "Standard Constants" —
// confirmed directly from Benmouyal et al., "IEEE Standard Inverse-Time
// Characteristic Equations for Overcurrent Relays," IEEE Trans. Power
// Delivery, vol.14, no.3, pp.868-872, Jul 1999 (the working-group paper that
// introduced the standard; Table III is explicitly confirmed in the paper's
// published discussion as belonging to the standard's main body).
//
// Deliberately NOT the paper's Tables I/II, which are informative-Annex-A
// per-relay-model curve fits (CO/IAC induction relay emulation, time dial 5
// specifically) — a plausible mix-up, since a general web search surfaced
// Table I's values (e.g. moderately inverse A=0.047) instead of Table III's
// during this project's planning, a live example of exactly the
// secondary-source risk this project's verification discipline exists to
// catch.
const IEEE_INVERSE_CONSTANTS: Record<"MI" | "VI" | "EI", { a: number; b: number; p: number }> = {
  MI: { a: 0.0515, b: 0.114, p: 0.02 },
  VI: { a: 19.61, b: 0.491, p: 2 },
  EI: { a: 28.2, b: 0.1217, p: 2 },
};

export function ieeeInverseTripTime(
  shape: "MI" | "VI" | "EI",
  pickupA: number,
  td: number,
  current: number,
): TripTimeResult {
  if (current <= pickupA) {
    return { valid: false, reason: "current at or below pickup" };
  }
  const { a, b, p } = IEEE_INVERSE_CONSTANTS[shape];
  const m = current / pickupA;
  const timeS = td * (a / (m ** p - 1) + b);
  return { valid: true, timeS };
}
