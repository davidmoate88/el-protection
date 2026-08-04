import assert from "node:assert/strict";
import test from "node:test";
import { cableAdiabaticWithstandTime } from "../lib/damageCurves/cableAdiabatic.ts";

// k-factor table ported from cablegrid-uk/lib/cableEngine.ts (verified
// there); cablegrid-uk itself has no dedicated unit test for this constant,
// so this test is doing real verification work, not duplicating coverage.

test("copper/PVC 4mm^2 at 1000A", () => {
  const result = cableAdiabaticWithstandTime("copper", "pvc", 4, 1, 1000);
  assert.equal(result.valid, true);
  // (115 * 4 / 1000)^2 = 0.46^2
  assert.ok(Math.abs(result.timeS - 0.2116) < 1e-6);
});

test("k-factor table matches cablegrid-uk exactly", () => {
  const at = (material, insulation) => {
    const r = cableAdiabaticWithstandTime(material, insulation, 1, 1, 1);
    return Math.sqrt(r.timeS); // recovers k directly since S=1, I=1
  };
  assert.ok(Math.abs(at("copper", "pvc") - 115) < 1e-9);
  assert.ok(Math.abs(at("copper", "xlpe") - 143) < 1e-9);
  assert.ok(Math.abs(at("aluminium", "pvc") - 76) < 1e-9);
  assert.ok(Math.abs(at("aluminium", "xlpe") - 94) < 1e-9);
});

test("parallel runs scale the effective CSA", () => {
  const single = cableAdiabaticWithstandTime("copper", "pvc", 4, 1, 1000);
  const doubled = cableAdiabaticWithstandTime("copper", "pvc", 4, 2, 1000);
  assert.equal(single.valid, true);
  assert.equal(doubled.valid, true);
  // doubling effective CSA quadruples withstand time (squared relationship)
  assert.ok(Math.abs(doubled.timeS - single.timeS * 4) < 1e-6);
});
