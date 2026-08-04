import type { TransformerC57109Settings, TripTimeResult } from "../types";

// IEEE C57.109-1993 (R2008) transformer through-fault withstand, per the
// worked tutorial in Patterson & Price, "Transformer Overcurrent Protection
// Coordination" (IEEE PSRC), which reproduces the standard's Table 1
// (category boundaries), Table 2 (thermal capability anchor points) and
// worked mechanical-capability examples for Category II/III.

type Category = "I" | "II" | "III" | "IV";

function deriveCategory(kva: number, phases: 1 | 3): Category {
  if (phases === 1) {
    if (kva <= 500) return "I";
    if (kva <= 1667) return "II";
    if (kva <= 10000) return "III";
    return "IV";
  }
  if (kva <= 500) return "I";
  if (kva <= 5000) return "II";
  if (kva <= 30000) return "III";
  return "IV";
}

// Table 2: [times rated current, time (s)]. I^2*t is NOT constant across
// this whole range (it runs 7200 at 2x down to ~1250 by 11.3x+) — the real
// standard curve is only asymptotically I^2*t=const at higher multiples, not
// a single closed-form equation throughout, so this is modeled as piecewise
// log-log interpolation between the standard's own anchor points rather than
// one formula.
const THERMAL_CAPABILITY_BASE: [number, number][] = [
  [2, 1800],
  [3, 300],
  [4.75, 60],
  [6.3, 30],
  [11.3, 10],
  [25, 2],
];
// Category I only ("Curve extended, t = 1250/I^2" per the standard's own
// Appendix A chart) — the pure I^2*t=1250 asymptote already holds by I=25,
// so this is a straight extension, not a new anchor shape.
const THERMAL_CAPABILITY_CATEGORY_I_EXTENSION: [number, number][] = [
  [35, 1.02],
  [40, 0.78],
];

function thermalCapabilityTimeAtMultiple(category: Category, multiple: number): TripTimeResult {
  const points =
    category === "I"
      ? [...THERMAL_CAPABILITY_BASE, ...THERMAL_CAPABILITY_CATEGORY_I_EXTENSION]
      : THERMAL_CAPABILITY_BASE;
  const maxMultiple = points[points.length - 1][0];
  if (multiple < points[0][0]) {
    return { valid: false, reason: "below the thermal capability curve's defined range (< 2x rated current)" };
  }
  if (multiple > maxMultiple) {
    return { valid: false, reason: `above the thermal capability curve's defined range (> ${maxMultiple}x rated current)` };
  }
  for (let i = 0; i < points.length - 1; i++) {
    const [m0, t0] = points[i];
    const [m1, t1] = points[i + 1];
    if (multiple >= m0 && multiple <= m1) {
      const frac = (Math.log(multiple) - Math.log(m0)) / (Math.log(m1) - Math.log(m0));
      const logT = Math.log(t0) + frac * (Math.log(t1) - Math.log(t0));
      return { valid: true, timeS: Math.exp(logT) };
    }
  }
  return { valid: false, reason: "unreachable: multiple not bracketed by any table segment" };
}

// Table 3: mechanical-capability limit applies only for II/III when this
// device is the primary (only) through-fault protection and faults are
// frequent (>10 for II, >5 for III, above the defined % of Imax, in the
// transformer's lifetime); always for IV; never for I.
function mechanicalSegmentApplies(
  category: Category,
  role: "primary" | "backup",
  faultFrequency: "frequent" | "infrequent",
): boolean {
  if (category === "I") return false;
  if (category === "IV") return true;
  return role === "primary" && faultFrequency === "frequent";
}

// Imax is defined as the winding's max through-fault withstand at 2 seconds,
// so I^2*t at the reference point is Imax^2 * 2 — confirmed against the
// worked examples: Category II 5000kVA/Z_T=7.6% -> Imax=13.2pu,
// I^2t=348.5 (13.2^2*2=348.48 [OK]), 70%Imax=9.24pu -> t=4.08s
// (348.5/9.24^2=4.08 [OK]); Category III 15MVA/Z_T+Z_S=8.56% -> Imax=11.68pu,
// I^2t=272.8, 50%Imax=5.84pu -> t=8.0s (272.8/5.84^2=8.0 [OK]).
function mechanicalCapabilityTimeAtMultiple(
  category: Category,
  role: "primary" | "backup",
  faultFrequency: "frequent" | "infrequent",
  iMaxMultiple: number,
  multiple: number,
): TripTimeResult {
  if (!mechanicalSegmentApplies(category, role, faultFrequency)) {
    return { valid: false, reason: "mechanical capability limit does not apply for this category/role/fault-frequency" };
  }
  const lowerFraction = category === "II" ? 0.7 : 0.5;
  const lowerBoundMultiple = lowerFraction * iMaxMultiple;
  if (multiple < lowerBoundMultiple || multiple > iMaxMultiple) {
    return {
      valid: false,
      reason: `mechanical limit only defined between ${lowerFraction * 100}% and 100% of Imax`,
    };
  }
  const iSquaredT = iMaxMultiple ** 2 * 2;
  return { valid: true, timeS: iSquaredT / multiple ** 2 };
}

export function transformerC57109WithstandTime(
  settings: TransformerC57109Settings,
  current: number,
): TripTimeResult {
  const category = deriveCategory(settings.kva, settings.phases);
  const ratedCurrentA =
    settings.phases === 3
      ? settings.kva / (Math.sqrt(3) * settings.ratedVoltageKv)
      : settings.kva / settings.ratedVoltageKv;
  const multiple = current / ratedCurrentA;

  const thermal = thermalCapabilityTimeAtMultiple(category, multiple);

  const zT = settings.transformerImpedancePercent / 100;
  const zS = settings.sourceImpedancePercent / 100;
  const iMaxMultiple = category === "II" ? 1 / zT : 1 / (zT + zS);
  const mechanical = mechanicalCapabilityTimeAtMultiple(
    category,
    settings.role,
    settings.faultFrequency,
    iMaxMultiple,
    multiple,
  );

  if (thermal.valid && mechanical.valid) {
    return { valid: true, timeS: Math.min(thermal.timeS, mechanical.timeS) };
  }
  if (thermal.valid) return thermal;
  if (mechanical.valid) return mechanical;
  return { valid: false, reason: thermal.reason };
}
