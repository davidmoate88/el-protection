import assert from "node:assert/strict";
import test from "node:test";
import { busbarThermalWithstandTime } from "../lib/damageCurves/busbarThermal.ts";

test("at the rated withstand current, time equals the rated duration", () => {
  const result = busbarThermalWithstandTime(25, 1, 25000);
  assert.equal(result.valid, true);
  assert.ok(Math.abs(result.timeS - 1) < 1e-9);
});

test("half the rated current withstands 4x as long (I^2*t = constant)", () => {
  const result = busbarThermalWithstandTime(25, 1, 12500);
  assert.equal(result.valid, true);
  assert.ok(Math.abs(result.timeS - 4) < 1e-9);
});

test("double the rated duration doubles withstand time at any given current", () => {
  const oneSecond = busbarThermalWithstandTime(25, 1, 20000);
  const threeSecond = busbarThermalWithstandTime(25, 3, 20000);
  assert.equal(oneSecond.valid, true);
  assert.equal(threeSecond.valid, true);
  assert.ok(Math.abs(threeSecond.timeS - oneSecond.timeS * 3) < 1e-9);
});
