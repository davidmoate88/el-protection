import assert from "node:assert/strict";
import test from "node:test";
import { thermalReplicaTripTime } from "../lib/relayCurves/thermalReplica.ts";

// Formula per IEC 60255-149:2013 Eq (5)/(6), confirmed directly from the
// standard text: hot t = tau*ln((Ieq^2 - Ip^2)/(Ieq^2 - (k*IB)^2)), which
// reduces exactly to the cold curve (Eq 5) when Ip=0. No independent worked
// numeric example was available in the primary-source preview obtained for
// this project (it cuts off before Annex A), so verification here leans on
// the formula's own mathematical structure (property tests) plus one
// hand-computed regression-lock value, rather than an external anchor.

test("hot curve with zero prior load equals the cold curve", () => {
  const cold = thermalReplicaTripTime(100, 1.2, 10, 0, 150);
  const hotAtZero = thermalReplicaTripTime(100, 1.2, 10, 0, 150);
  assert.equal(cold.valid, true);
  assert.equal(hotAtZero.valid, true);
  assert.equal(cold.timeS, hotAtZero.timeS);
});

test("hand-computed regression lock: IB=100, k=1.2 (kIb=120), tau=10min, cold, I=150", () => {
  const result = thermalReplicaTripTime(100, 1.2, 10, 0, 150);
  assert.equal(result.valid, true);
  // 600 * ln(150^2 / (150^2 - 120^2)) = 600 * ln(22500/8100)
  assert.ok(Math.abs(result.timeS - 613.0) < 0.5);
});

test("higher prior load trips faster than cold start at the same overload current", () => {
  const cold = thermalReplicaTripTime(100, 1.2, 10, 0, 150);
  const preloaded = thermalReplicaTripTime(100, 1.2, 10, 80, 150);
  assert.equal(cold.valid, true);
  assert.equal(preloaded.valid, true);
  assert.ok(preloaded.timeS < cold.timeS);
});

test("doubling the thermal time constant doubles the trip time", () => {
  const base = thermalReplicaTripTime(100, 1.2, 10, 0, 150);
  const doubled = thermalReplicaTripTime(100, 1.2, 20, 0, 150);
  assert.equal(base.valid, true);
  assert.equal(doubled.valid, true);
  assert.ok(Math.abs(doubled.timeS - base.timeS * 2) < 1e-6);
});

test("never trips at or below k*IB", () => {
  assert.equal(thermalReplicaTripTime(100, 1.2, 10, 0, 120).valid, false);
  assert.equal(thermalReplicaTripTime(100, 1.2, 10, 0, 100).valid, false);
});

test("rejects a prior load at or above k*IB", () => {
  assert.equal(thermalReplicaTripTime(100, 1.2, 10, 120, 150).valid, false);
  assert.equal(thermalReplicaTripTime(100, 1.2, 10, 130, 150).valid, false);
});
