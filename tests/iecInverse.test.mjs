import assert from "node:assert/strict";
import test from "node:test";
import { iecInverseTripTime } from "../lib/relayCurves/iecInverse.ts";

// Formula per IEC 60255-151:2009 Eq (1), confirmed directly from the
// standard text: t = TMS * [ k/((I/Is)^alpha - 1) + c ], c=0 for SI/VI/EI/LTI.
// Expected values below are hand-computed directly from that formula with
// the confirmed constants (SI k=0.14/a=0.02, VI k=13.5/a=1, EI k=80/a=2,
// LTI k=120/a=1) — this locks the implementation to the verified formula,
// not to an external worked example (none was available in the
// primary-source preview obtained for this project).

test("SI at 10x pickup, TMS=1 matches the commonly-cited ~2.97s reference point", () => {
  const result = iecInverseTripTime("SI", 10, 1, 100);
  assert.equal(result.valid, true);
  // 0.14 / (10^0.02 - 1)
  assert.ok(Math.abs(result.timeS - 2.9709) < 0.001);
});

test("VI at 2x pickup, TMS=1", () => {
  const result = iecInverseTripTime("VI", 10, 1, 20);
  assert.equal(result.valid, true);
  // 13.5 / (2^1 - 1) = 13.5
  assert.ok(Math.abs(result.timeS - 13.5) < 1e-9);
});

test("EI at 2x pickup, TMS=1", () => {
  const result = iecInverseTripTime("EI", 10, 1, 20);
  assert.equal(result.valid, true);
  // 80 / (2^2 - 1) = 80/3
  assert.ok(Math.abs(result.timeS - 80 / 3) < 1e-9);
});

test("LTI at 2x pickup, TMS=1", () => {
  const result = iecInverseTripTime("LTI", 10, 1, 20);
  assert.equal(result.valid, true);
  // 120 / (2^1 - 1) = 120
  assert.ok(Math.abs(result.timeS - 120) < 1e-9);
});

test("TMS scales trip time linearly", () => {
  const base = iecInverseTripTime("SI", 10, 1, 100);
  const doubled = iecInverseTripTime("SI", 10, 2, 100);
  assert.equal(base.valid, true);
  assert.equal(doubled.valid, true);
  assert.ok(Math.abs(doubled.timeS - base.timeS * 2) < 1e-9);
});

test("current at or below pickup is invalid, not a crash", () => {
  assert.equal(iecInverseTripTime("SI", 10, 1, 10).valid, false);
  assert.equal(iecInverseTripTime("SI", 10, 1, 5).valid, false);
});
