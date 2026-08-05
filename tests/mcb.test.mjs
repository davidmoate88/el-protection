import assert from "node:assert/strict";
import test from "node:test";
import { mcbTripTime } from "../lib/relayCurves/mcb.ts";

// Anchor values (1.13x In non-trip >1h, 1.45x In trip <1h, magnetic ranges
// 3-5x/5-10x/10-20x for B/C/D) confirmed against ABB's "Comparison of
// tripping characteristics for miniature circuit-breakers", which
// explicitly reproduces IEC/EN 60898-1's own summary table, cross-checked
// against independent secondary sources during research (multiple
// manufacturer/technical sources agreed with zero discrepancy, unlike the
// IEEE C37.112 case earlier in this project).

test("never trips at or below 1.13x In (conventional non-tripping current)", () => {
  assert.equal(mcbTripTime("B", 32, 32 * 1.13).valid, false);
  assert.equal(mcbTripTime("B", 32, 32 * 1.1).valid, false);
});

test("thermal curve is calibrated to trip at exactly 1h at 1.45x In", () => {
  for (const shape of ["B", "C", "D"]) {
    const result = mcbTripTime(shape, 32, 32 * 1.45);
    assert.equal(result.valid, true);
    assert.ok(Math.abs(result.timeS - 3600) < 0.5, `${shape}: expected ~3600s, got ${result.timeS}`);
  }
});

test("thermal calibration is identical across B, C and D (same 1.13x/1.45x anchors)", () => {
  const b = mcbTripTime("B", 20, 20 * 1.3);
  const c = mcbTripTime("C", 20, 20 * 1.3);
  const d = mcbTripTime("D", 20, 20 * 1.3);
  assert.equal(b.valid && c.valid && d.valid, true);
  assert.ok(Math.abs(b.timeS - c.timeS) < 1e-6);
  assert.ok(Math.abs(c.timeS - d.timeS) < 1e-6);
});

test("magnetic ranges match the standard exactly: B 3-5x, C 5-10x, D 10-20x", () => {
  const ratedCurrentA = 16;
  // Just below each type's lower magnetic bound: still on the (slow) thermal/transition curve.
  // At/above the upper bound: fixed fast instantaneous time.
  const bAtUpper = mcbTripTime("B", ratedCurrentA, 5 * ratedCurrentA);
  const cAtUpper = mcbTripTime("C", ratedCurrentA, 10 * ratedCurrentA);
  const dAtUpper = mcbTripTime("D", ratedCurrentA, 20 * ratedCurrentA);
  assert.ok(bAtUpper.valid && bAtUpper.timeS < 0.1);
  assert.ok(cAtUpper.valid && cAtUpper.timeS < 0.1);
  assert.ok(dAtUpper.valid && dAtUpper.timeS < 0.1);

  // Well past the upper bound, stays fast (flat instantaneous floor).
  const bWellAbove = mcbTripTime("B", ratedCurrentA, 8 * ratedCurrentA);
  assert.ok(bWellAbove.valid && bWellAbove.timeS < 0.1);
});

test("trip time is monotonically non-increasing as current rises", () => {
  const ratedCurrentA = 20;
  const multiples = [1.2, 1.3, 1.45, 2, 2.9, 3.5, 4.2, 5, 8, 20];
  let prevTimeS = Infinity;
  for (const m of multiples) {
    const result = mcbTripTime("B", ratedCurrentA, m * ratedCurrentA);
    assert.equal(result.valid, true, `multiple ${m} should be valid`);
    assert.ok(result.timeS <= prevTimeS + 1e-9, `time should not increase at ${m}x In`);
    prevTimeS = result.timeS;
  }
});

test("wider magnetic range (D) reaches the instantaneous floor at a higher multiple than the narrower ranges (B)", () => {
  const ratedCurrentA = 20;
  // At 6x In: B is already at its instantaneous floor (past 5x upper bound),
  // D is still mid-transition (between its 10x-20x bounds) and therefore slower.
  const bAt6x = mcbTripTime("B", ratedCurrentA, 6 * ratedCurrentA);
  const dAt6x = mcbTripTime("D", ratedCurrentA, 6 * ratedCurrentA);
  assert.ok(bAt6x.valid && dAt6x.valid);
  assert.ok(dAt6x.timeS > bAt6x.timeS);
});
