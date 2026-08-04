import type { DamageCurve, Device, FaultLocation } from "@/lib/types";
import { damageCurveWithstandTime, deviceTripTime } from "@/lib/deviceEngine";
import { sampleCurve } from "@/lib/curveSampling";
import { LogLogChart, type ReferenceLine, type SampledCurve } from "./LogLogChart";
import { CURVE_PALETTE } from "../lib/palette";

// Shared sampling range for every curve on the chart. Curves that are only
// valid above some threshold (relay pickup, k*IB, a transformer's thermal
// table range) simply produce no points below it — sampleCurve already
// skips invalid points — so one shared range naturally clips each curve to
// its own valid domain without this component needing family-specific logic.
const CURRENT_RANGE = { currentMin: 1, currentMax: 100000 };
const X_DECADES: [number, number] = [0, 5]; // 1 A - 100,000 A
const Y_DECADES: [number, number] = [-2, 4]; // 0.01 s - 10,000 s

function deviceLabel(device: Device): string {
  switch (device.family) {
    case "iec-inverse":
      return `${device.name} (IEC ${device.shape}, ${device.pickupA}A, TMS ${device.tms})`;
    case "ieee-inverse":
      return `${device.name} (IEEE ${device.shape}, ${device.pickupA}A, TD ${device.td})`;
    case "definite-time":
      return `${device.name} (DT, ${device.pickupA}A, ${device.timeS}s)`;
    case "thermal-replica":
      return `${device.name} (thermal, ${device.ratedCurrentA}A x${device.kFactor})`;
  }
}

function damageCurveLabel(curve: DamageCurve): string {
  switch (curve.family) {
    case "cable-adiabatic":
      return `${curve.name} (${curve.csaMm2}mm² ${curve.material}/${curve.insulation})`;
    case "transformer-c57109":
      return `${curve.name} (${curve.kva}kVA transformer)`;
    case "busbar-thermal":
      return `${curve.name} (${curve.ratedWithstandKa}kA/${curve.ratedDurationS}s)`;
  }
}

export function StudyChart({
  devices,
  damageCurves,
  faultLocation,
  xDecades = X_DECADES,
  yDecades = Y_DECADES,
}: {
  devices: Device[];
  damageCurves: DamageCurve[];
  faultLocation?: FaultLocation;
  xDecades?: [number, number];
  yDecades?: [number, number];
}) {
  const deviceCurves: SampledCurve[] = devices.map((device, i) => ({
    key: device.id,
    label: deviceLabel(device),
    color: device.color ?? CURVE_PALETTE[i % CURVE_PALETTE.length],
    points: sampleCurve((current) => deviceTripTime(device, current), CURRENT_RANGE),
  }));

  const damageCurveCurves: SampledCurve[] = damageCurves.map((curve, i) => ({
    key: curve.id,
    label: damageCurveLabel(curve),
    color: curve.color ?? CURVE_PALETTE[(devices.length + i) % CURVE_PALETTE.length],
    dashed: true,
    strokeWidth: 2,
    points: sampleCurve((current) => damageCurveWithstandTime(curve, current), CURRENT_RANGE),
  }));

  const referenceLines: ReferenceLine[] = faultLocation
    ? [
        {
          key: `${faultLocation.id}-max`,
          label: `Ik max – ${faultLocation.name}`,
          value: faultLocation.ikMaxA,
          color: "var(--danger)",
        },
        {
          key: `${faultLocation.id}-min`,
          label: `Ik min – ${faultLocation.name}`,
          value: faultLocation.ikMinA,
          color: "var(--muted)",
        },
      ]
    : [];

  return (
    <LogLogChart
      xLabel="Current (A)"
      yLabel="Time (s)"
      xDecades={xDecades}
      yDecades={yDecades}
      curves={[...deviceCurves, ...damageCurveCurves]}
      referenceLines={referenceLines}
    />
  );
}
