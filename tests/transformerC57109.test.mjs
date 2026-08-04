import assert from "node:assert/strict";
import test from "node:test";
import { transformerC57109WithstandTime } from "../lib/damageCurves/transformerC57109.ts";

// Worked examples are from Patterson & Price, "Transformer Overcurrent
// Protection Coordination" (IEEE PSRC tutorial paper), which reproduces
// IEEE C57.109's Table 1/Table 2 and works two full mechanical-capability
// examples end to end. Category is derived (not entered), so ratedVoltageKv
// is chosen freely per test purely to get a concrete amps figure — the
// underlying pu-multiple math is what's actually being checked, and the
// rated current cancels out of multiple = current / ratedCurrentA regardless
// of which voltage is used, as long as it's used consistently to build the
// test's `current` input.

test("thermal capability anchors match Table 2 exactly (Category I, small kVA)", () => {
  const settings = {
    family: "transformer-c57109",
    kva: 100,
    phases: 1,
    ratedVoltageKv: 1,
    transformerImpedancePercent: 5,
    sourceImpedancePercent: 0,
    faultFrequency: "infrequent",
    role: "backup",
  };
  const ratedCurrentA = 100 / 1; // 1-phase, 1kV base -> 100A
  const at = (multiple) => transformerC57109WithstandTime(settings, multiple * ratedCurrentA);

  assert.ok(Math.abs(at(2).timeS - 1800) < 1e-6);
  assert.ok(Math.abs(at(3).timeS - 300) < 1e-6);
  assert.ok(Math.abs(at(25).timeS - 2) < 1e-6);
  // Category I extension (beyond the base table, "Curve extended, t=1250/I^2")
  assert.ok(Math.abs(at(35).timeS - 1.02) < 1e-6);
  assert.ok(Math.abs(at(40).timeS - 0.78) < 1e-6);
});

test("Category II worked example: 5000kVA 3ph, Z_T=7.6%, primary, frequent faults", () => {
  const ratedVoltageKv = 12.47;
  const settings = {
    family: "transformer-c57109",
    kva: 5000,
    phases: 3,
    ratedVoltageKv,
    transformerImpedancePercent: 7.6,
    sourceImpedancePercent: 0,
    faultFrequency: "frequent",
    role: "primary",
  };
  const ratedCurrentA = 5000 / (Math.sqrt(3) * ratedVoltageKv);
  const imaxMultiple = 1 / 0.076; // paper: 13.2 pu (rounded)

  // At 70% of Imax the paper computes t=4.08s from I^2t=348.5
  const result = transformerC57109WithstandTime(settings, 0.7 * imaxMultiple * ratedCurrentA);
  assert.equal(result.valid, true);
  assert.ok(Math.abs(result.timeS - 4.08) / 4.08 < 0.02);
});

test("Category III worked example: 15MVA 3ph, Z_T+Z_S=8.56%, primary, frequent faults", () => {
  const ratedVoltageKv = 13.2;
  const settings = {
    family: "transformer-c57109",
    kva: 15000,
    phases: 3,
    ratedVoltageKv,
    transformerImpedancePercent: 8.5,
    sourceImpedancePercent: 0.06,
    faultFrequency: "frequent",
    role: "primary",
  };
  const ratedCurrentA = 15000 / (Math.sqrt(3) * ratedVoltageKv);
  const imaxMultiple = 1 / 0.0856; // paper: 11.68 pu

  // At 50% of Imax the paper computes t=8.0s from I^2t=272.8
  const result = transformerC57109WithstandTime(settings, 0.5 * imaxMultiple * ratedCurrentA);
  assert.equal(result.valid, true);
  assert.ok(Math.abs(result.timeS - 8.0) / 8.0 < 0.02);
});

test("category is derived from kVA+phases per Table 1 boundaries", () => {
  const withKva = (kva, phases) => ({
    family: "transformer-c57109",
    kva,
    phases,
    ratedVoltageKv: 11,
    transformerImpedancePercent: 6,
    sourceImpedancePercent: 0,
    faultFrequency: "frequent",
    role: "primary",
  });
  // Category I never has a mechanical segment; III/IV always resolve it when frequent+primary.
  // Use behavior at 90% of a very generous Imax range as an indirect probe of category.
  const iSettings = withKva(500, 3);
  const ivSettings = withKva(30001, 3);
  const ratedCurrentAiv = 30001 / (Math.sqrt(3) * 11);
  // Category IV: mechanical always applies (frequent or infrequent) -> valid deep into high multiples.
  const ivResult = transformerC57109WithstandTime(ivSettings, 0.9 * (1 / 0.06) * ratedCurrentAiv);
  assert.equal(ivResult.valid, true);
  // Category I: thermal table (with its 35x/40x extension) tops out at 40x
  // and never has a mechanical segment -> invalid above 40x.
  const ratedCurrentAi = 500 / (Math.sqrt(3) * 11);
  const iResult = transformerC57109WithstandTime(iSettings, 45 * ratedCurrentAi);
  assert.equal(iResult.valid, false);
});

test("mechanical segment is the binding (shorter) constraint near Imax only when frequent+primary", () => {
  const base = {
    family: "transformer-c57109",
    kva: 5000,
    phases: 3,
    ratedVoltageKv: 12.47,
    transformerImpedancePercent: 7.6,
    sourceImpedancePercent: 0,
  };
  const ratedCurrentA = 5000 / (Math.sqrt(3) * 12.47);
  const imaxMultiple = 1 / 0.076;
  // 90% of Imax is still within the thermal table's 2x-25x span here, so
  // both scenarios return a valid time either way — what should differ is
  // which curve binds: mechanical (when it applies) is tighter near Imax
  // than the thermal backbone alone.
  const currentAt90pctImax = 0.9 * imaxMultiple * ratedCurrentA;

  const primaryFrequent = transformerC57109WithstandTime(
    { ...base, faultFrequency: "frequent", role: "primary" },
    currentAt90pctImax,
  );
  const infrequent = transformerC57109WithstandTime(
    { ...base, faultFrequency: "infrequent", role: "primary" },
    currentAt90pctImax,
  );
  const backup = transformerC57109WithstandTime(
    { ...base, faultFrequency: "frequent", role: "backup" },
    currentAt90pctImax,
  );
  assert.equal(primaryFrequent.valid, true);
  assert.equal(infrequent.valid, true);
  assert.equal(backup.valid, true);
  assert.ok(primaryFrequent.timeS < infrequent.timeS);
  assert.ok(primaryFrequent.timeS < backup.timeS);
});
