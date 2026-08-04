import type { DamageCurve, Device } from "@/lib/types";

// Sensible starting defaults per family for the "add new" flow — the user
// edits from here rather than facing blank/zero fields.
export function defaultDeviceForFamily(family: Device["family"], id: string, color: string): Device {
  const common = { id, name: "New device", color };
  switch (family) {
    case "iec-inverse":
      return { ...common, family, shape: "SI", pickupA: 100, tms: 0.2 };
    case "ieee-inverse":
      return { ...common, family, shape: "MI", pickupA: 100, td: 1 };
    case "definite-time":
      return { ...common, family, pickupA: 100, timeS: 0.5 };
    case "thermal-replica":
      return { ...common, family, ratedCurrentA: 100, kFactor: 1.1, thermalConstantMin: 10, priorLoadA: 0 };
  }
}

export function defaultDamageCurveForFamily(
  family: DamageCurve["family"],
  id: string,
  color: string,
): DamageCurve {
  const common = { id, name: "New damage curve", color };
  switch (family) {
    case "cable-adiabatic":
      return { ...common, family, material: "copper", insulation: "pvc", csaMm2: 95, parallelRuns: 1 };
    case "transformer-c57109":
      return {
        ...common,
        family,
        kva: 1000,
        phases: 3,
        ratedVoltageKv: 11,
        transformerImpedancePercent: 6,
        sourceImpedancePercent: 0,
        faultFrequency: "infrequent",
        role: "backup",
      };
    case "busbar-thermal":
      return { ...common, family, ratedWithstandKa: 25, ratedDurationS: 1 };
  }
}
