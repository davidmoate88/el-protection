import type { CalculatedFaultSettings, FaultCableSettings, FaultLocation, FaultTransformerSettings, NetworkFeederSettings } from "./types";

// IEC 60909-0:2016 equivalent-voltage-source method, three-phase fault only
// (Ik3"). Confirmed against the standard's own text (definitions 3.6, 3.14,
// 3.15 read directly from the standard preview: the equivalent voltage
// source c*Un/sqrt(3) is applied "at the short-circuit location", and
// "Sk"Q=sqrt(3)*UnQ*Ik"Q or ZQ=c*UnQ^2/Sk"Q" is given verbatim for a network
// feeder's impedance) and hand-verified end-to-end, step by step, against a
// full published worked example (11kV/415V 1000kVA Dyn11 transformer,
// 250MVA feeder, 30m 185mm2 Cu/XLPE cable -> 18.2kA) — every intermediate
// number in that example (feeder impedance referred to LV, transformer
// impedance, K_T, corrected transformer impedance, cable impedance, total
// impedance, final current) reproduces exactly with the formulas below. That
// hand-verification is also what caught a real, non-obvious detail: the
// transformer correction factor K_T always uses cmax (never cmin, even when
// computing the *minimum* fault current) at the FAULT location's voltage
// tier — not the transformer's own HV-side tier. Using the transformer's own
// tier there gives a K_T about 4-5% off, which the worked example's stated
// K_T=0.964 (not the ~1.009 the wrong tier produces) makes unambiguous.
//
// Only the three-phase fault is modelled. Line-to-line (Ik2" = sqrt(3)/2 *
// Ik3" for a passive network with no rotating machines) is a simple enough
// addition later if wanted, but nothing in the app consumes it yet, so it's
// left out rather than built unused. Line-to-earth (Ik1") needs
// zero-sequence impedance data (transformer earthing arrangement/vector
// group dependent) and is a meaningfully bigger addition — deferred. Radial
// chains only: this models "one feeder, at most one transformer, cables in
// series" — meshed/multi-source networks are out of scope, consistent with
// this tool having no shared network topology (see types.ts).

type ComplexImpedance = { r: number; x: number };

// IEC 60909-0 Table 1 (Voltage factor c), confirmed via the standard's own
// clause 3.15 (definition + "values given in Table 1") plus two independent
// technical sources, in exact agreement: LV (<=1kV) cmax=1.05/cmin=0.95;
// MV (>1kV-35kV) and HV (>35kV) both cmax=1.10/cmin=1.00.
function voltageFactor(nominalVoltageKv: number, which: "max" | "min"): number {
  if (nominalVoltageKv <= 1) {
    return which === "max" ? 1.05 : 0.95;
  }
  return which === "max" ? 1.1 : 1.0;
}

function splitByXrRatio(zMagnitudeOhm: number, xrRatio: number): ComplexImpedance {
  const r = zMagnitudeOhm / Math.sqrt(1 + xrRatio ** 2);
  return { r, x: r * xrRatio };
}

// Z = c*Un^2/Sk" (kV and MVA in, Ohm out — the 10^6 factors in kV^2 and MVA
// cancel exactly). Un/c are the FEEDER's own voltage tier here, then the
// result is referred to the fault-side voltage via the turns-ratio squared.
// Verified: 11kV/250MVA/cmax=1.10 -> 0.5324 Ohm, referred to 415V ->
// 0.758 mOhm, matching the worked example exactly.
function feederImpedanceAtFaultVoltage(
  feeder: NetworkFeederSettings,
  which: "max" | "min",
  faultVoltageKv: number,
): ComplexImpedance {
  const c = voltageFactor(feeder.nominalVoltageKv, which);
  const zAtFeederKv = (c * feeder.nominalVoltageKv ** 2) / feeder.shortCircuitPowerMva;
  const referredZ = zAtFeederKv * (faultVoltageKv / feeder.nominalVoltageKv) ** 2;
  return splitByXrRatio(referredZ, feeder.xrRatio);
}

// Z_T = (uk%/100)*Un_LV^2/Sr, corrected by K_T = 0.95*cmax/(1+0.6*xT) where
// xT is the transformer's own per-unit reactance and cmax is fixed at the
// FAULT location's voltage tier (see file header). Verified against the
// worked example: 1000kVA/6%/415V -> Z_T=10.33 mOhm, xrRatio=0.2 ->
// R_T=2.03/X_T=10.13 mOhm, K_T=0.964 -> corrected R_T=1.96/X_T=9.77 mOhm.
function transformerImpedanceAtFaultVoltage(
  transformer: FaultTransformerSettings,
  faultVoltageKv: number,
): ComplexImpedance {
  const srMva = transformer.ratedKva / 1000;
  const zBase = transformer.ratedVoltageLvKv ** 2 / srMva;
  const zT = (transformer.ukPercent / 100) * zBase;
  const { r, x } = splitByXrRatio(zT, transformer.xrRatio);
  const xTPerUnit = x / zBase;
  const cMaxAtFault = voltageFactor(faultVoltageKv, "max");
  const kT = (0.95 * cMaxAtFault) / (1 + 0.6 * xTPerUnit);
  return { r: r * kT, x: x * kT };
}

// R'/X' (Ohm/km) x length, no voltage-referring needed — a cable's physical
// impedance is already expressed in real Ohms at whatever voltage it
// operates at. Verified: 185mm2 Cu/XLPE, 0.0991/0.0783 Ohm/km, 30m ->
// R=2.97/X=2.35 mOhm.
function cableImpedance(cable: FaultCableSettings): ComplexImpedance {
  const lengthKm = cable.lengthM / 1000;
  return { r: cable.resistancePerKmOhm * lengthKm, x: cable.reactancePerKmOhm * lengthKm };
}

// A transformer changes the reference voltage for everything downstream of
// it; a cable doesn't. With at most one transformer in the chain (v1 scope),
// the fault-side voltage is simply the transformer's LV rating if present,
// else the feeder's own voltage.
function faultReferenceVoltageKv(settings: CalculatedFaultSettings): number {
  return settings.transformer?.ratedVoltageLvKv ?? settings.feeder.nominalVoltageKv;
}

function totalImpedance(settings: CalculatedFaultSettings, which: "max" | "min"): ComplexImpedance {
  const faultVoltageKv = faultReferenceVoltageKv(settings);
  let { r, x } = feederImpedanceAtFaultVoltage(settings.feeder, which, faultVoltageKv);
  if (settings.transformer) {
    const t = transformerImpedanceAtFaultVoltage(settings.transformer, faultVoltageKv);
    r += t.r;
    x += t.x;
  }
  for (const cable of settings.cables) {
    const c = cableImpedance(cable);
    r += c.r;
    x += c.x;
  }
  return { r, x };
}

// Ik3" = c*Un/(sqrt(3)*Zk). Un in kV, Zk in Ohm -> *1000 for amps. Verified:
// total Z=13.81 mOhm at 415V, cmax=1.05 -> 18.22 kA (matches the worked
// example's stated 18.2kA).
function threePhaseFaultCurrentA(settings: CalculatedFaultSettings, which: "max" | "min"): number {
  const faultVoltageKv = faultReferenceVoltageKv(settings);
  const { r, x } = totalImpedance(settings, which);
  const zMagnitude = Math.sqrt(r ** 2 + x ** 2);
  const c = voltageFactor(faultVoltageKv, which);
  return (c * faultVoltageKv * 1000) / (Math.sqrt(3) * zMagnitude);
}

export function resolveFaultCurrents(location: FaultLocation): { ikMaxA: number; ikMinA: number } {
  if (location.mode === "manual") {
    return { ikMaxA: location.ikMaxA, ikMinA: location.ikMinA };
  }
  return {
    ikMaxA: threePhaseFaultCurrentA(location, "max"),
    ikMinA: threePhaseFaultCurrentA(location, "min"),
  };
}
