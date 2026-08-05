import type { TripTimeResult } from "../types";

// BS/IEC 60898-1 defines B/C/D characteristics via test *points*, not a
// closed-form equation (confirmed against ABB's published summary table,
// "Comparison of tripping characteristics for miniature circuit-breakers",
// which explicitly cites and reproduces the standard's own clause values):
//   - thermal (bimetal) release: must NOT trip at 1.13xIn within 1h
//     ("conventional non-tripping current"), MUST trip at 1.45xIn within 1h
//     ("conventional tripping current") - identical for B, C and D
//   - electromagnetic release: instantaneous trip within the range
//     3-5xIn (B), 5-10xIn (C), 10-20xIn (D); guaranteed <0.1s by the upper
//     bound of each range
//
// A real device's exact curve sits somewhere inside that compliance
// envelope and varies by manufacturer/model - the standard doesn't define
// one. The curve below is an illustrative one built honestly from the
// standard's own two defined thermal test points (not a specific
// manufacturer's exact published curve): the thermal portion reuses the
// same closed-form equation already verified for IEC 60255-149's thermal
// replica (t = tau*ln(I^2/(I^2-pickup^2))), calibrated so t(1.45xIn)
// lands exactly on the standard's 1h boundary, with 1.13xIn as the
// "never trips" asymptote. Because both calibration anchors are expressed
// as multiples of In, tau comes out identical for B, C and D (only the
// magnetic range differs) - this is a real, checkable consequence of the
// standard's own numbers, not a modeling shortcut.
const THERMAL_PICKUP_MULTIPLE = 1.13;
const THERMAL_TRIP_MULTIPLE = 1.45;
const THERMAL_TRIP_TIME_S = 3600; // 1 hour, per the standard
const THERMAL_TAU_S =
  THERMAL_TRIP_TIME_S /
  Math.log(THERMAL_TRIP_MULTIPLE ** 2 / (THERMAL_TRIP_MULTIPLE ** 2 - THERMAL_PICKUP_MULTIPLE ** 2));

// Comfortably under the standard's "<0.1s" guarantee at the upper bound of
// each magnetic range - not itself a standard-mandated exact value.
const MAGNETIC_TRIP_TIME_S = 0.02;

const MCB_MAGNETIC_RANGE: Record<"B" | "C" | "D", { lower: number; upper: number }> = {
  B: { lower: 3, upper: 5 },
  C: { lower: 5, upper: 10 },
  D: { lower: 10, upper: 20 },
};

function thermalTripTimeS(pickupA: number, current: number): number {
  return THERMAL_TAU_S * Math.log(current ** 2 / (current ** 2 - pickupA ** 2));
}

export function mcbTripTime(shape: "B" | "C" | "D", ratedCurrentA: number, current: number): TripTimeResult {
  const pickupA = THERMAL_PICKUP_MULTIPLE * ratedCurrentA;
  if (current <= pickupA) {
    return { valid: false, reason: "at or below the conventional non-tripping current (1.13x In)" };
  }

  const { lower, upper } = MCB_MAGNETIC_RANGE[shape];
  const magLowerA = lower * ratedCurrentA;
  const magUpperA = upper * ratedCurrentA;

  if (current < magLowerA) {
    return { valid: true, timeS: thermalTripTimeS(pickupA, current) };
  }
  if (current >= magUpperA) {
    return { valid: true, timeS: MAGNETIC_TRIP_TIME_S };
  }
  // Between the two magnetic-band bounds the standard only guarantees a
  // wide time envelope (e.g. 0.1-45s at 3xIn for a B-type), not an exact
  // value - log-log interpolate between the thermal curve's own value at
  // the lower bound and the fixed instantaneous time at the upper bound for
  // a smooth, monotonic, clearly-illustrative transition through that zone.
  const tAtLower = thermalTripTimeS(pickupA, magLowerA);
  const frac = (Math.log(current) - Math.log(magLowerA)) / (Math.log(magUpperA) - Math.log(magLowerA));
  const logT = Math.log(tAtLower) + frac * (Math.log(MAGNETIC_TRIP_TIME_S) - Math.log(tAtLower));
  return { valid: true, timeS: Math.exp(logT) };
}
