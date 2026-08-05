import assert from "node:assert/strict";
import test from "node:test";
import { migrateFaultLocation } from "../app/lib/storage.ts";

// Real bug caught during browser verification: studies saved before the
// IEC 60909 fault-current engine was added have no `mode` field on
// FaultLocation, and resolveFaultCurrents() crashed trying to read
// `.feeder.nominalVoltageKv` off a location that fell through to the
// "calculated" branch by default. Every pre-existing location was
// implicitly what's now called "manual".

test("a legacy fault location with no mode field is migrated to manual", () => {
  const legacy = { id: "loc-1", name: "Feeder board", ikMaxA: 5000, ikMinA: 800 };
  const migrated = migrateFaultLocation(legacy);
  assert.deepEqual(migrated, { id: "loc-1", name: "Feeder board", mode: "manual", ikMaxA: 5000, ikMinA: 800 });
});

test("an already-manual location passes through unchanged", () => {
  const location = { id: "loc-2", name: "x", mode: "manual", ikMaxA: 1, ikMinA: 2 };
  assert.equal(migrateFaultLocation(location), location);
});

test("an already-calculated location passes through unchanged", () => {
  const location = {
    id: "loc-3",
    name: "x",
    mode: "calculated",
    feeder: { nominalVoltageKv: 11, shortCircuitPowerMva: 250, xrRatio: 10 },
    cables: [],
  };
  assert.equal(migrateFaultLocation(location), location);
});
