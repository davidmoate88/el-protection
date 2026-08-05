// Deliberately the same {valid:true,...}|{valid:false,reason} shape used
// throughout this project's sibling tools — safe here because this file is
// real .ts (not .mjs+JSDoc), so TS actually narrows on `.valid` correctly.
export type TripTimeResult =
  | { valid: true; timeS: number }
  | { valid: false; reason: string };

type DeviceCommon = {
  id: string;
  name: string;
  locationId?: string;
  color?: string;
  notes?: string;
};

// IEC 60255-151 standard inverse-time curves. Named SI/VI/EI/LTI per
// near-universal industry convention (identical constants implemented by
// SEL/GE/Siemens/Schneider/ABB relays), c=0 for all four.
export type IecInverseSettings = {
  family: "iec-inverse";
  shape: "SI" | "VI" | "EI" | "LTI";
  pickupA: number; // Is
  tms: number; // Time Multiplier Setting
};

// IEEE C37.112 inverse-time curves.
export type IeeeInverseSettings = {
  family: "ieee-inverse";
  shape: "MI" | "VI" | "EI";
  pickupA: number; // Ipickup
  td: number; // Time Dial
};

export type DefiniteTimeSettings = {
  family: "definite-time";
  pickupA: number;
  timeS: number;
};

// IEC 60255-149 thermal replica with memory.
export type ThermalReplicaSettings = {
  family: "thermal-replica";
  ratedCurrentA: number; // IB, the basic/setting current
  kFactor: number; // k, typically 1.0-1.5 — k*IB is the max permissible continuous current
  thermalConstantMin: number; // tau, minutes
  priorLoadA: number; // Ip, steady current before the overload step (0 = cold curve)
};

// MCB (BS/IEC 60898-1) B/C/D characteristics. Fixed-characteristic devices
// (not field-adjustable like a relay) - only shape and rated current apply.
export type McbSettings = {
  family: "mcb";
  shape: "B" | "C" | "D";
  ratedCurrentA: number; // In
};

export type Device = DeviceCommon &
  (IecInverseSettings | IeeeInverseSettings | DefiniteTimeSettings | ThermalReplicaSettings | McbSettings);

type DamageCurveCommon = {
  id: string;
  name: string;
  locationId?: string;
  color?: string;
  notes?: string;
};

export type CableAdiabaticSettings = {
  family: "cable-adiabatic";
  material: "copper" | "aluminium";
  insulation: "pvc" | "xlpe";
  csaMm2: number;
  parallelRuns: number;
};

// IEEE C57.109 transformer through-fault withstand.
export type TransformerC57109Settings = {
  family: "transformer-c57109";
  kva: number;
  phases: 1 | 3;
  ratedVoltageKv: number; // line-to-line voltage of the side the curve is expressed on
  transformerImpedancePercent: number; // Z_T
  sourceImpedancePercent: number; // Z_S — only used for category III/IV; enter 0 if unknown/negligible
  faultFrequency: "frequent" | "infrequent";
  role: "primary" | "backup"; // gates the mechanical-limit segment for category II/III
};

// Nameplate-style rated short-time withstand (e.g. "25 kA / 1 s"), scaled via
// I^2*t = constant — see busbarThermal.ts for why this was chosen over a
// first-principles bar-geometry derivation.
export type BusbarThermalSettings = {
  family: "busbar-thermal";
  ratedWithstandKa: number; // Ith
  ratedDurationS: number; // tk
};

export type DamageCurve = DamageCurveCommon &
  (CableAdiabaticSettings | TransformerC57109Settings | BusbarThermalSettings);

export type FaultLocation = {
  id: string;
  name: string;
  ikMaxA: number;
  ikMinA: number;
};

// Explicit, user-declared pairs — NOT auto-inferred from matching locationId.
// A downstream cable's damage curve is routinely checked against an upstream
// device at a different network point; same-location matching would miss
// exactly that case, and this tool has no topology model (by design — no
// fault-calc engine). locationId on Device/DamageCurve stays only as a UI
// default-prefill for these.
export type GradingCheck = {
  id: string;
  upstreamDeviceId: string;
  downstreamDeviceId: string;
  faultLocationId: string;
};

export type ViolationCheck = {
  id: string;
  deviceId: string;
  damageCurveId: string;
  faultLocationId: string;
};

export type Study = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  devices: Device[];
  damageCurves: DamageCurve[];
  locations: FaultLocation[];
  gradingChecks: GradingCheck[];
  violationChecks: ViolationCheck[];
};
