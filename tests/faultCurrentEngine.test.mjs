import assert from "node:assert/strict";
import test from "node:test";
import { resolveFaultCurrents } from "../lib/faultCurrentEngine.ts";

// Full worked example (feeder + transformer + cable) hand-verified step by
// step against a published IEC 60909-0 walkthrough: 250MVA/11kV feeder
// (X/R=10), 1000kVA 11kV/415V Dyn11 transformer (uk=6%, X/R=0.2), 30m
// 185mm2 Cu/XLPE cable (R'=0.0991, X'=0.0783 Ohm/km) -> published Ik"=18.2kA
// at the 415V board. Every intermediate number in the source (feeder Z
// referred to LV=0.758mOhm, transformer Z=10.33mOhm, K_T=0.964, corrected
// transformer Z=9.96mOhm, cable Z=2.97+2.35j mOhm, total Z=13.81mOhm)
// reproduces exactly with this engine's formulas. The minimum-current value
// is NOT from the published source (which only gave the maximum-current
// case) - it's derived by hand using the same verified formulas with cmin
// substituted where the standard's own convention says it should be (see
// faultCurrentEngine.ts's header comment on K_T always using cmax).
const workedExample = {
  id: "loc-1",
  name: "MDB busbars",
  mode: "calculated",
  feeder: { nominalVoltageKv: 11, shortCircuitPowerMva: 250, xrRatio: 10 },
  // The source states the transformer's ratio as "R/X = 0.2" (typical for an
  // oil-filled transformer) - this engine's xrRatio field is X/R throughout
  // (matching the feeder's convention and the more common industry term), so
  // the equivalent value here is the reciprocal, 1/0.2 = 5.
  transformer: { ratedKva: 1000, ratedVoltageHvKv: 11, ratedVoltageLvKv: 0.415, ukPercent: 6, xrRatio: 5 },
  cables: [{ csaMm2: 185, lengthM: 30, resistancePerKmOhm: 0.0991, reactancePerKmOhm: 0.0783 }],
};

test("worked example: feeder+transformer+cable reproduces the published 18.2kA maximum fault current", () => {
  const { ikMaxA } = resolveFaultCurrents(workedExample);
  assert.ok(Math.abs(ikMaxA - 18220) < 50, `expected ~18220A, got ${ikMaxA}`);
});

test("worked example minimum current: hand-derived extension using cmin (16.56kA)", () => {
  const { ikMinA } = resolveFaultCurrents(workedExample);
  assert.ok(Math.abs(ikMinA - 16560) < 100, `expected ~16560A, got ${ikMinA}`);
});

test("manual mode passes through the entered values unchanged", () => {
  const result = resolveFaultCurrents({ id: "loc-2", name: "x", mode: "manual", ikMaxA: 12345, ikMinA: 6789 });
  assert.equal(result.ikMaxA, 12345);
  assert.equal(result.ikMinA, 6789);
});

test("minimum current is always below maximum current", () => {
  const { ikMaxA, ikMinA } = resolveFaultCurrents(workedExample);
  assert.ok(ikMinA < ikMaxA);
});

test("no transformer: fault directly at the feeder's own voltage matches a hand-calculated pure-feeder case", () => {
  // Z = cmax*Un^2/Sk" = 1.10*11^2/100 = 1.331 Ohm; Ik3"max = cmax*Un/(sqrt(3)*Z) = 5248.7A
  const location = {
    id: "loc-3",
    name: "MV switchboard",
    mode: "calculated",
    feeder: { nominalVoltageKv: 11, shortCircuitPowerMva: 100, xrRatio: 10 },
    cables: [],
  };
  const { ikMaxA } = resolveFaultCurrents(location);
  assert.ok(Math.abs(ikMaxA - 5248.7) < 5, `expected ~5248.7A, got ${ikMaxA}`);
});

test("longer cable strictly reduces the fault current (more impedance in the chain)", () => {
  const short = resolveFaultCurrents({ ...workedExample, cables: [{ ...workedExample.cables[0], lengthM: 10 }] });
  const long = resolveFaultCurrents({ ...workedExample, cables: [{ ...workedExample.cables[0], lengthM: 100 }] });
  assert.ok(long.ikMaxA < short.ikMaxA);
  assert.ok(long.ikMinA < short.ikMinA);
});

test("K_T is fixed at cmax regardless of min/max scenario: with negligible feeder impedance, Ik-max/Ik-min equals exactly cmax/cmin at the fault voltage", () => {
  // A huge Sk" makes the feeder impedance negligible, so total impedance is
  // dominated by the transformer (K_T always uses cmax) and cable (no c
  // dependence at all) - both identical between the max and min scenarios.
  // If K_T incorrectly varied with min/max, this ratio would NOT come out
  // to exactly cmax/cmin.
  const location = {
    ...workedExample,
    feeder: { nominalVoltageKv: 11, shortCircuitPowerMva: 1e9, xrRatio: 10 },
  };
  const { ikMaxA, ikMinA } = resolveFaultCurrents(location);
  const cmaxLv = 1.05;
  const cminLv = 0.95;
  assert.ok(Math.abs(ikMaxA / ikMinA - cmaxLv / cminLv) < 1e-6, `expected ratio ${cmaxLv / cminLv}, got ${ikMaxA / ikMinA}`);
});
