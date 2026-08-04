"use client";

import type { DamageCurve, Device, FaultLocation } from "@/lib/types";
import { StudyChart } from "./components/StudyChart";

// Phase 3 demo data — exercises the full engine -> sampling -> chart
// pipeline with real curve families before any study CRUD/persistence UI
// exists (that lands in a later phase). Replaced by real state then.
const DEMO_DEVICES: Device[] = [
  {
    id: "d1",
    family: "iec-inverse",
    name: "Feeder relay F1",
    shape: "SI",
    pickupA: 100,
    tms: 0.15,
  },
  {
    id: "d2",
    family: "iec-inverse",
    name: "Incomer relay I1",
    shape: "SI",
    pickupA: 200,
    tms: 0.35,
  },
];

const DEMO_DAMAGE_CURVES: DamageCurve[] = [
  {
    id: "c1",
    family: "cable-adiabatic",
    name: "Feeder cable",
    material: "copper",
    insulation: "xlpe",
    csaMm2: 95,
    parallelRuns: 1,
  },
];

const DEMO_LOCATION: FaultLocation = {
  id: "l1",
  name: "Feeder board",
  ikMaxA: 5000,
  ikMinA: 800,
};

export default function Home() {
  return (
    <main style={{ padding: 24, maxWidth: 1000, margin: "0 auto" }}>
      <h1>Protection Grading &amp; Damage Curve Studio</h1>
      <p style={{ color: "var(--muted)" }}>
        Demo study — feeder/incomer relay grading against a cable damage curve. Study creation and
        editing land in a later phase; this proves the curve engine and chart render correctly.
      </p>
      <StudyChart devices={DEMO_DEVICES} damageCurves={DEMO_DAMAGE_CURVES} faultLocation={DEMO_LOCATION} />
    </main>
  );
}
