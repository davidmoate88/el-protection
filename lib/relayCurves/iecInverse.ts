import type { TripTimeResult } from "../types";

// IEC 60255-151:2009 §4.4.1.3, Eq (1): t(G) = TMS * [ k/((G/Gs)^alpha - 1) + c ]
// (confirmed directly from the standard text). k, c have units of seconds;
// alpha is dimensionless. The standard defines six curves (Annex A, labeled
// A-F) — SI/VI/EI/LTI below is the near-universal industry naming for four of
// them, with identical constants implemented by SEL/GE/Siemens/Schneider/ABB
// relays and multiple independent secondary sources; c=0 for all four per
// every source checked. The standard's own Annex A table itself wasn't
// available in the primary-source preview read for this project, so the
// letter-to-name mapping is not independently confirmed — only the constants
// themselves, which is what the trip-time math actually depends on.
const IEC_INVERSE_CONSTANTS: Record<
  "SI" | "VI" | "EI" | "LTI",
  { k: number; c: number; alpha: number }
> = {
  SI: { k: 0.14, c: 0, alpha: 0.02 },
  VI: { k: 13.5, c: 0, alpha: 1 },
  EI: { k: 80, c: 0, alpha: 2 },
  LTI: { k: 120, c: 0, alpha: 1 },
};

export function iecInverseTripTime(
  shape: "SI" | "VI" | "EI" | "LTI",
  pickupA: number,
  tms: number,
  current: number,
): TripTimeResult {
  if (current <= pickupA) {
    return { valid: false, reason: "current at or below pickup" };
  }
  const { k, c, alpha } = IEC_INVERSE_CONSTANTS[shape];
  const ratio = current / pickupA;
  const timeS = tms * (k / (ratio ** alpha - 1) + c);
  return { valid: true, timeS };
}
