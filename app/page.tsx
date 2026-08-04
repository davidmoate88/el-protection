"use client";

import { useEffect, useState } from "react";
import type { DamageCurve, Device, FaultLocation, Study } from "@/lib/types";
import { StudyChart } from "./components/StudyChart";
import { DeviceList } from "./components/DeviceList";
import { DamageCurveList } from "./components/DamageCurveList";
import { FaultLocationList } from "./components/FaultLocationEditor";
import { ConfirmButton } from "./components/ConfirmButton";
import { clearStudy, loadStudy, saveStudy } from "./lib/storage";

// First-run seed (only used when nothing is in localStorage yet) — a real,
// working example rather than a blank study, mirroring the Phase 3 demo.
function createSeedStudy(): Study {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name: "Example study",
    createdAt: now,
    updatedAt: now,
    devices: [
      { id: crypto.randomUUID(), name: "Feeder relay F1", color: "#2f5d8a", family: "iec-inverse", shape: "SI", pickupA: 100, tms: 0.15 },
      { id: crypto.randomUUID(), name: "Incomer relay I1", color: "#c96f2c", family: "iec-inverse", shape: "SI", pickupA: 200, tms: 0.35 },
    ],
    damageCurves: [
      {
        id: crypto.randomUUID(),
        name: "Feeder cable",
        color: "#3f8f5f",
        family: "cable-adiabatic",
        material: "copper",
        insulation: "xlpe",
        csaMm2: 95,
        parallelRuns: 1,
      },
    ],
    locations: [{ id: crypto.randomUUID(), name: "Feeder board", ikMaxA: 5000, ikMinA: 800 }],
    gradingChecks: [],
    violationChecks: [],
  };
}

export default function Home() {
  const [study, setStudy] = useState<Study | null>(null);
  const [activeLocationId, setActiveLocationId] = useState<string | null>(null);

  useEffect(() => {
    // localStorage doesn't exist during SSR, so the study can only be read
    // after mount — both server and client render the loading state below
    // on first paint, then this swaps in the real content, so there's no
    // server/client mismatch despite setting state from an effect.
    const loaded = loadStudy() ?? createSeedStudy();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStudy(loaded);
    setActiveLocationId(loaded.locations[0]?.id ?? null);
  }, []);

  useEffect(() => {
    if (study) saveStudy({ ...study, updatedAt: new Date().toISOString() });
  }, [study]);

  if (!study) {
    return (
      <main style={{ padding: 24 }}>
        <p>Loading…</p>
      </main>
    );
  }

  const update = (patch: Partial<Study>) => setStudy((s) => (s ? { ...s, ...patch } : s));
  const setDevices = (devices: Device[]) => update({ devices });
  const setDamageCurves = (damageCurves: DamageCurve[]) => update({ damageCurves });
  const setLocations = (locations: FaultLocation[]) => {
    update({ locations });
    if (!locations.some((l) => l.id === activeLocationId)) {
      setActiveLocationId(locations[0]?.id ?? null);
    }
  };
  const activeLocation = study.locations.find((l) => l.id === activeLocationId);

  return (
    <main style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h1>{study.name}</h1>
        <ConfirmButton
          label="Reset all saved data"
          confirmLabel="This clears the whole study."
          onConfirm={() => {
            clearStudy();
            const fresh = createSeedStudy();
            setStudy(fresh);
            setActiveLocationId(fresh.locations[0]?.id ?? null);
          }}
        />
      </div>

      <div style={{ marginBottom: 12 }}>
        <label>
          Fault location shown on chart:{" "}
          <select value={activeLocationId ?? ""} onChange={(e) => setActiveLocationId(e.target.value || null)}>
            <option value="">None</option>
            {study.locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <StudyChart devices={study.devices} damageCurves={study.damageCurves} faultLocation={activeLocation} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginTop: 24 }}>
        <DeviceList devices={study.devices} onChange={setDevices} />
        <DamageCurveList damageCurves={study.damageCurves} deviceCount={study.devices.length} onChange={setDamageCurves} />
      </div>

      <div style={{ marginTop: 24 }}>
        <FaultLocationList locations={study.locations} onChange={setLocations} />
      </div>
    </main>
  );
}
