import assert from "node:assert/strict";
import test from "node:test";
import { mccbTripTime } from "../lib/relayCurves/mccb.ts";

// Curve technology (I2t=K for both L and S, selectable flat delay for S,
// flat instantaneous floor for I) and the long-time reference multiple
// (6x I1) confirmed against ABB's "Low voltage circuit breakers - Working
// with trip characteristic curves" white paper, including its own worked
// example: Tmax T4N250 with trip unit PR222DS/P In 100, I1=1xIn=100A
// (6xI1=600A), offering long-time delay curves at t1=3/6/9/18s referenced
// at 6xI1. The short-time reference multiple (8x In) is also from that
// document. The 6xI1 long-time convention was independently cross-checked
// against Schneider/Eaton technical literature (UL 489's own definition of
// "long-time delay": "referenced in seconds at 600 percent of the current
// setting (Ir)" - i.e. 6x - and multiple manufacturer application notes
// describing "trip time at 6xIr" as the standard long-time delay spec).

const base = {
  family: "mccb",
  ratedCurrentA: 100,
  longTimePickupA: 100,
  longTimeDelayS: 6,
  shortTimeEnabled: false,
  shortTimePickupA: 400,
  shortTimeDelayS: 0.3,
  shortTimeI2tRamp: true,
  instantaneousPickupA: 2000,
};

test("never trips at or below the long-time pickup (I1)", () => {
  assert.equal(mccbTripTime(base, 100).valid, false);
  assert.equal(mccbTripTime(base, 90).valid, false);
});

test("worked example: T4N250/PR222DS In 100, I1=100A, long-time delay curves at 6xI1=600A", () => {
  for (const t1 of [3, 6, 9, 18]) {
    const settings = { ...base, longTimeDelayS: t1, shortTimeEnabled: false, instantaneousPickupA: 5000 };
    const result = mccbTripTime(settings, 600);
    assert.equal(result.valid, true);
    assert.ok(Math.abs(result.timeS - t1) < 1e-9, `t1=${t1}: expected ${t1}s at 6xI1, got ${result.timeS}`);
  }
});

test("long-time zone follows I2t=K: doubling current quarters the trip time", () => {
  const settings = { ...base, shortTimeEnabled: false, instantaneousPickupA: 5000 };
  const at600 = mccbTripTime(settings, 600);
  const at1200 = mccbTripTime(settings, 1200);
  assert.equal(at600.valid && at1200.valid, true);
  assert.ok(Math.abs(at1200.timeS - at600.timeS / 4) < 1e-6);
});

test("short-time I2t-ON zone is referenced at 8x In, independent of I1/I2", () => {
  const settings = { ...base, shortTimeEnabled: true, shortTimePickupA: 300, shortTimeDelayS: 0.5, shortTimeI2tRamp: true };
  // 8 x ratedCurrentA(100) = 800A, which is between shortTimePickupA(300) and instantaneousPickupA(2000).
  const result = mccbTripTime(settings, 800);
  assert.equal(result.valid, true);
  assert.ok(Math.abs(result.timeS - 0.5) < 1e-9);
});

test("short-time I2t-OFF zone is a flat delay across the whole S band", () => {
  const settings = { ...base, shortTimeEnabled: true, shortTimePickupA: 300, shortTimeDelayS: 0.2, shortTimeI2tRamp: false };
  const lower = mccbTripTime(settings, 400);
  const upper = mccbTripTime(settings, 1900);
  assert.equal(lower.valid && upper.valid, true);
  assert.equal(lower.timeS, 0.2);
  assert.equal(upper.timeS, 0.2);
});

test("short-time protection can be excluded: long-time zone extends directly to the instantaneous pickup", () => {
  const settings = { ...base, shortTimeEnabled: false, shortTimePickupA: 300, instantaneousPickupA: 2000 };
  const result = mccbTripTime(settings, 1000);
  assert.equal(result.valid, true);
  // longTimeDelayS(6) * (6*I1)^2 / current^2 = 6 * 600^2 / 1000^2 = 2.16s
  assert.ok(Math.abs(result.timeS - 2.16) < 1e-9);
});

test("instantaneous zone is a flat ~20ms floor above I3, regardless of current", () => {
  const settings = { ...base, shortTimeEnabled: false, instantaneousPickupA: 1000 };
  const a = mccbTripTime(settings, 1500);
  const b = mccbTripTime(settings, 5000);
  assert.equal(a.valid && b.valid, true);
  assert.equal(a.timeS, 0.02);
  assert.equal(b.timeS, 0.02);
});

test("trip time is monotonically non-increasing across L, S and I zones together", () => {
  const settings = {
    family: "mccb",
    ratedCurrentA: 100,
    longTimePickupA: 100,
    longTimeDelayS: 6,
    shortTimeEnabled: true,
    shortTimePickupA: 400,
    shortTimeDelayS: 0.3,
    shortTimeI2tRamp: true,
    instantaneousPickupA: 1200,
  };
  const currents = [110, 150, 200, 300, 400, 500, 700, 900, 1200, 1500, 3000];
  let prevTimeS = Infinity;
  for (const current of currents) {
    const result = mccbTripTime(settings, current);
    assert.equal(result.valid, true, `current ${current}A should be valid`);
    assert.ok(result.timeS <= prevTimeS + 1e-9, `time should not increase at ${current}A`);
    prevTimeS = result.timeS;
  }
});
