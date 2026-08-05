import assert from "node:assert/strict";
import test from "node:test";
import { computeGradingMargin, computeViolationRegion } from "../lib/gradingEngine.ts";

test("finds the minimum-margin point across the overlapping range, not just an endpoint", () => {
  // margin is a smooth parabola in log-current space, bottoming out at
  // exactly 1s right at current=500 — the minimum is not at either endpoint.
  const targetLog = Math.log10(500);
  const upstream = (current) => ({
    valid: true,
    timeS: 2 + (Math.log10(current) - targetLog) ** 2,
  });
  const downstream = () => ({ valid: true, timeS: 1 });

  const result = computeGradingMargin(upstream, downstream, {
    currentMin: 100,
    currentMax: 1000,
    samples: 900,
  });
  assert.equal(result.valid, true);
  assert.ok(Math.abs(result.minMarginS - 1) < 0.01);
  assert.ok(Math.abs(result.atCurrentA - 500) / 500 < 0.02);
});

test("reports invalid when the two devices never overlap in valid range", () => {
  const upstream = () => ({ valid: false, reason: "below pickup" });
  const downstream = () => ({ valid: true, timeS: 1 });
  const result = computeGradingMargin(upstream, downstream, { currentMin: 100, currentMax: 1000 });
  assert.equal(result.valid, false);
});

test("violation region is empty when the device always stays below the damage curve", () => {
  const device = () => ({ valid: true, timeS: 1 });
  const damage = () => ({ valid: true, timeS: 10 });
  const region = computeViolationRegion(device, damage, { currentMin: 10, currentMax: 100 });
  assert.equal(region.length, 0);
});

test("violation region is non-empty exactly where the device curve exceeds the damage curve", () => {
  // device exceeds damage curve only above current=500
  const device = (current) => ({ valid: true, timeS: current > 500 ? 10 : 1 });
  const damage = () => ({ valid: true, timeS: 5 });
  const region = computeViolationRegion(device, damage, { currentMin: 100, currentMax: 1000, samples: 900 });
  assert.ok(region.length > 0);
  assert.ok(region.every((p) => p.x > 400)); // comfortably above the 500 threshold given sampling granularity
});

test("computeGradingMargin(damageFn, deviceFn) catches a violation that only occurs over part of the range", () => {
  // Regression test for a real bug found during Phase 5 browser verification:
  // calling this with (deviceFn, damageFn) instead of (damageFn, deviceFn)
  // finds the *safest* point in range (min of device-damage) instead of the
  // worst-case spare time (min of damage-device), and can report a device as
  // fully "protected" even when it violates the damage curve over part of
  // the range, as long as it's comfortably safe elsewhere. A device that's
  // safe at low current (1s vs a 10s damage curve, 9s spare) but violates at
  // high current (20s vs 10s, -10s spare) must resolve to the -10s worst case.
  const damage = () => ({ valid: true, timeS: 10 });
  const device = (current) => ({ valid: true, timeS: current < 500 ? 1 : 20 });

  const result = computeGradingMargin(damage, device, { currentMin: 100, currentMax: 1000, samples: 900 });
  assert.equal(result.valid, true);
  assert.ok(Math.abs(result.minMarginS - -10) < 0.01, `expected worst-case margin -10, got ${result.minMarginS}`);
  assert.ok(result.atCurrentA >= 500);

  // Reproduces the exact original bug: computeGradingMargin(deviceFn, damageFn)
  // paired with a `minMarginS > 0` violation check. Its minimum (device-damage)
  // is dominated by the *safe* low-current point (1-10=-9, more negative than
  // the violating point's 20-10=+10), so the buggy check concludes "not
  // violated" even though a real violation exists at current >= 500.
  const buggyResult = computeGradingMargin(device, damage, { currentMin: 100, currentMax: 1000, samples: 900 });
  const buggyVerdictSaysViolated = buggyResult.valid && buggyResult.minMarginS > 0;
  assert.equal(buggyVerdictSaysViolated, false, "confirms the original bug's logic misses this violation");
});
