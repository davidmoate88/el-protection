import assert from "node:assert/strict";
import test from "node:test";
import { ieeeInverseTripTime } from "../lib/relayCurves/ieeeInverse.ts";

// Constants are IEEE C37.112 Table III "Standard Constants" (the standard's
// main body — confirmed directly from the working-group paper that
// introduced the standard: Benmouyal et al., IEEE Trans. Power Delivery,
// vol.14, no.3, pp.868-872, Jul 1999). Expected values below are hand-computed
// from that table's exact constants at M=5 (the multiple the paper itself
// used to fit them) with TD=1 — deliberately NOT copied from the same
// paper's Tables I/II, which are informative per-relay-model curve fits
// (CO/IAC induction relays), not the standard's own values. The M=5 results
// below (MI 1.688s, VI 1.308s, EI 1.297s) sit close to but distinct from
// Table I/II's own M=5 entries, consistent with Table III being the
// arithmetic average of those two model fits.

test("Moderately Inverse at M=5, TD=1", () => {
  const result = ieeeInverseTripTime("MI", 10, 1, 50);
  assert.equal(result.valid, true);
  // 0.0515 / (5^0.02 - 1) + 0.114
  assert.ok(Math.abs(result.timeS - 1.6878) < 0.001);
});

test("Very Inverse at M=5, TD=1", () => {
  const result = ieeeInverseTripTime("VI", 10, 1, 50);
  assert.equal(result.valid, true);
  // 19.61 / (5^2 - 1) + 0.491
  assert.ok(Math.abs(result.timeS - 1.3077) < 0.001);
});

test("Extremely Inverse at M=5, TD=1", () => {
  const result = ieeeInverseTripTime("EI", 10, 1, 50);
  assert.equal(result.valid, true);
  // 28.2 / (5^2 - 1) + 0.1217
  assert.ok(Math.abs(result.timeS - 1.2967) < 0.001);
});

test("time dial scales trip time linearly", () => {
  const base = ieeeInverseTripTime("VI", 10, 1, 50);
  const doubled = ieeeInverseTripTime("VI", 10, 2, 50);
  assert.equal(base.valid, true);
  assert.equal(doubled.valid, true);
  assert.ok(Math.abs(doubled.timeS - base.timeS * 2) < 1e-9);
});

test("current at or below pickup is invalid, not a crash", () => {
  assert.equal(ieeeInverseTripTime("VI", 10, 1, 10).valid, false);
  assert.equal(ieeeInverseTripTime("VI", 10, 1, 5).valid, false);
});
