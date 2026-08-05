import type { MccbSettings, TripTimeResult } from "../types";

// IEC 60947-2 MCCB electronic (LSI) trip units stage three independent
// protection functions - Long-time (L), Short-time (S, optional), and
// Instantaneous (I) - each with its own field-adjustable pickup, so unlike
// MCB or relay shapes there is no single "family curve" to calibrate
// against. What IS standard/verified is the *curve technology* each zone
// uses, per ABB's published trip-unit white paper ("Low voltage circuit
// breakers - Working with trip characteristic curves", which explicitly
// derives its L/S curves from the I2t=K let-through-energy relation, and
// gives a worked example: Tmax T4N250, PR222DS/P In 100, I1=100A, curves at
// t1=3/6/9/18s referenced at 6xI1=600A), cross-checked against independent
// Schneider/Eaton technical literature for the long-time reference point:
//   - Long-time (L): I2t = K, always active, cannot be excluded. The
//     long-time delay setting (t1) is specified as "the trip time AT 6x the
//     long-time pickup (I1/Ir)" - a reference multiple confirmed identical
//     across ABB, Schneider and Eaton technical literature for MCCB-class
//     trip units specifically (large power circuit breaker/ACB-class units,
//     e.g. ABB Emax, commonly use 3xIr instead - out of scope here).
//   - Short-time (S): optional (can be excluded, in which case L hands off
//     directly to I - a real, documented trip-unit configuration). Two
//     selectable curve shapes, exactly as every major manufacturer's
//     "I2t IN/OUT" setting offers: an I2t=K ramp (reference point at 8x the
//     RATED current In - not I1/Ir/I2/Isd - per ABB's white paper), or a
//     flat definite-time delay.
//   - Instantaneous (I): always active, no intentional delay. Modeled as a
//     fixed ~20ms floor, consistent with ABB's qualitative "some tens of
//     milliseconds" description of magnetic/instantaneous operation and the
//     same representative value already used for the analogous MCB
//     magnetic-instantaneous zone.
//
// Because every pickup here is a field setting rather than a standard-fixed
// value, every threshold is stored as a direct amps value - the same
// pickupA convention used for relay shapes elsewhere in this project -
// rather than as a multiplier of In or I1. This also sidesteps a genuine
// cross-manufacturer inconsistency in which base manufacturers normalize
// the short-time pickup against (ABB's I2 is a multiple of In; Schneider
// MicroLogic's equivalent Isd setting is a multiple of Ir).
const LONG_TIME_REFERENCE_MULTIPLE = 6; // t1 specified at 6x I1
const SHORT_TIME_REFERENCE_MULTIPLE = 8; // t2 (I2t ON) specified at 8x In
const INSTANTANEOUS_TRIP_TIME_S = 0.02; // "some tens of milliseconds", no intentional delay

function longTimeTripTimeS(longTimePickupA: number, longTimeDelayS: number, current: number): number {
  const referenceA = LONG_TIME_REFERENCE_MULTIPLE * longTimePickupA;
  const kL = longTimeDelayS * referenceA ** 2;
  return kL / current ** 2;
}

function shortTimeTripTimeS(settings: MccbSettings, current: number): number {
  if (!settings.shortTimeI2tRamp) {
    return settings.shortTimeDelayS;
  }
  const referenceA = SHORT_TIME_REFERENCE_MULTIPLE * settings.ratedCurrentA;
  const kS = settings.shortTimeDelayS * referenceA ** 2;
  return kS / current ** 2;
}

export function mccbTripTime(settings: MccbSettings, current: number): TripTimeResult {
  if (current <= settings.longTimePickupA) {
    return { valid: false, reason: "at or below the long-time pickup (I1)" };
  }

  const shortTimeZoneStart = settings.shortTimePickupA;
  const instantaneousZoneStart = settings.instantaneousPickupA;

  if (settings.shortTimeEnabled && current <= shortTimeZoneStart) {
    return { valid: true, timeS: longTimeTripTimeS(settings.longTimePickupA, settings.longTimeDelayS, current) };
  }
  if (settings.shortTimeEnabled && current <= instantaneousZoneStart) {
    return { valid: true, timeS: shortTimeTripTimeS(settings, current) };
  }
  if (!settings.shortTimeEnabled && current <= instantaneousZoneStart) {
    return { valid: true, timeS: longTimeTripTimeS(settings.longTimePickupA, settings.longTimeDelayS, current) };
  }
  return { valid: true, timeS: INSTANTANEOUS_TRIP_TIME_S };
}
