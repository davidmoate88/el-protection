import type { DamageCurve, Device, TripTimeResult } from "./types";
import { iecInverseTripTime } from "./relayCurves/iecInverse";
import { ieeeInverseTripTime } from "./relayCurves/ieeeInverse";
import { definiteTimeTripTime } from "./relayCurves/definiteTime";
import { thermalReplicaTripTime } from "./relayCurves/thermalReplica";
import { mcbTripTime } from "./relayCurves/mcb";
import { mccbTripTime } from "./relayCurves/mccb";
import { cableAdiabaticWithstandTime } from "./damageCurves/cableAdiabatic";
import { transformerC57109WithstandTime } from "./damageCurves/transformerC57109";
import { busbarThermalWithstandTime } from "./damageCurves/busbarThermal";

// The one place that knows every device family — adding a new family (e.g. a
// future LV fuse/MCB/MCCB curve, sourced from real manufacturer data) means
// one new union arm on Device plus one new case here. Nothing else in the
// app (Study, gradingEngine, the chart, the generic list UI) needs to know
// how a family computes a trip time.
export function deviceTripTime(device: Device, current: number): TripTimeResult {
  switch (device.family) {
    case "iec-inverse":
      return iecInverseTripTime(device.shape, device.pickupA, device.tms, current);
    case "ieee-inverse":
      return ieeeInverseTripTime(device.shape, device.pickupA, device.td, current);
    case "definite-time":
      return definiteTimeTripTime(device.pickupA, device.timeS, current);
    case "thermal-replica":
      return thermalReplicaTripTime(
        device.ratedCurrentA,
        device.kFactor,
        device.thermalConstantMin,
        device.priorLoadA,
        current,
      );
    case "mcb":
      return mcbTripTime(device.shape, device.ratedCurrentA, current);
    case "mccb":
      return mccbTripTime(device, current);
  }
}

export function damageCurveWithstandTime(curve: DamageCurve, current: number): TripTimeResult {
  switch (curve.family) {
    case "cable-adiabatic":
      return cableAdiabaticWithstandTime(curve.material, curve.insulation, curve.csaMm2, curve.parallelRuns, current);
    case "transformer-c57109":
      return transformerC57109WithstandTime(curve, current);
    case "busbar-thermal":
      return busbarThermalWithstandTime(curve.ratedWithstandKa, curve.ratedDurationS, current);
  }
}
