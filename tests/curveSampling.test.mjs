import assert from "node:assert/strict";
import test from "node:test";
import { sampleCurve } from "../lib/curveSampling.ts";

test("produces ascending, log-spaced x values across the requested range", () => {
  const points = sampleCurve((current) => ({ valid: true, timeS: 1000 / current }), {
    currentMin: 10,
    currentMax: 1000,
  });
  assert.ok(points.length > 2);
  for (let i = 1; i < points.length; i++) {
    assert.ok(points[i].x > points[i - 1].x);
  }
  assert.ok(Math.abs(points[0].x - 10) < 1e-6);
  assert.ok(Math.abs(points[points.length - 1].x - 1000) < 1e-6);
});

test("skips invalid points instead of injecting NaN/Infinity", () => {
  const points = sampleCurve(
    (current) => (current < 100 ? { valid: false, reason: "below pickup" } : { valid: true, timeS: 5 }),
    { currentMin: 10, currentMax: 1000 },
  );
  assert.ok(points.every((p) => p.x >= 100));
  assert.ok(points.every((p) => Number.isFinite(p.y)));
});

test("pointsPerDecade increases sample density", () => {
  const sparse = sampleCurve(() => ({ valid: true, timeS: 1 }), {
    currentMin: 1,
    currentMax: 100,
    pointsPerDecade: 4,
  });
  const dense = sampleCurve(() => ({ valid: true, timeS: 1 }), {
    currentMin: 1,
    currentMax: 100,
    pointsPerDecade: 40,
  });
  assert.ok(dense.length > sparse.length);
});
