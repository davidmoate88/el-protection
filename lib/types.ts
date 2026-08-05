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

// MCCB (IEC 60947-2) electronic (LSI) trip unit. Unlike MCB, every threshold
// is a field-adjustable setting (like a relay's pickupA), so there's no
// single standard-fixed curve to calibrate against - see mccb.ts for what IS
// standard/verified (the curve technology each zone uses).
export type MccbSettings = {
  family: "mccb";
  ratedCurrentA: number; // In, the trip unit's rated/sensor current
  longTimePickupA: number; // I1 / Ir - long-time (overload) pickup
  longTimeDelayS: number; // t1, the trip time at 6x I1
  shortTimeEnabled: boolean; // false: L hands off directly to instantaneous
  shortTimePickupA: number; // I2 / Isd - short-time pickup (only used if enabled)
  shortTimeDelayS: number; // t2 - flat delay (I2t off) or trip time at 8x In (I2t on)
  shortTimeI2tRamp: boolean; // true = I2t=K ramp ("I2t ON"), false = flat delay ("I2t OFF")
  instantaneousPickupA: number; // I3 / Ii
};

export type Device = DeviceCommon &
  (
    | IecInverseSettings
    | IeeeInverseSettings
    | DefiniteTimeSettings
    | ThermalReplicaSettings
    | McbSettings
    | MccbSettings
  );

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

// IEC 60909-0 radial-chain fault-current calculation. This is deliberately
// NOT a shared network topology graph (nodes/edges reused across fault
// locations) — each fault location owns its own chain from a network feeder,
// through an optional transformer, through zero or more cable segments in
// series, to the fault point. That keeps the tool's "no topology model" shape
// (see the note below) while still letting the fault current itself be
// calculated instead of typed in by hand. See lib/faultCurrentEngine.ts for
// the verified formulas.
export type NetworkFeederSettings = {
  nominalVoltageKv: number; // Un at the connection point
  shortCircuitPowerMva: number; // Sk" at the connection point
  xrRatio: number; // X/R ratio — enter the DNO/utility's value if given
};

export type FaultTransformerSettings = {
  ratedKva: number;
  ratedVoltageHvKv: number; // reference only (not used in the calculation)
  ratedVoltageLvKv: number; // the side the fault current is calculated on
  ukPercent: number; // uk, the rated short-circuit (impedance) voltage
  xrRatio: number; // X/R ratio of the transformer's own impedance
};

// R'/X' are entered directly (matching this project's established
// discipline of transcribing real datasheet values rather than deriving
// them from a lookup table) since AC resistance/reactance per unit length
// depend on cable construction/spacing, not just CSA and material.
export type FaultCableSettings = {
  csaMm2: number; // reference only (not used in the calculation)
  lengthM: number;
  resistancePerKmOhm: number; // R'
  reactancePerKmOhm: number; // X'
};

export type ManualFaultSettings = {
  mode: "manual";
  ikMaxA: number;
  ikMinA: number;
};

export type CalculatedFaultSettings = {
  mode: "calculated";
  feeder: NetworkFeederSettings;
  transformer?: FaultTransformerSettings;
  cables: FaultCableSettings[];
};

export type FaultLocation = {
  id: string;
  name: string;
} & (ManualFaultSettings | CalculatedFaultSettings);

// Explicit, user-declared pairs — NOT auto-inferred from matching locationId.
// A downstream cable's damage curve is routinely checked against an upstream
// device at a different network point; same-location matching would miss
// exactly that case, and this tool has no shared network topology (each
// FaultLocation's own calculated chain, above, is self-contained — there's
// still no cross-location topology graph). locationId on Device/DamageCurve
// stays only as a UI default-prefill for these.
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
