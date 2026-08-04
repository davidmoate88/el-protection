"use client";

import { useState } from "react";
import type { DamageCurve } from "@/lib/types";

type Draft = {
  name: string;
  notes: string;
  family: DamageCurve["family"];
  material: string;
  insulation: string;
  csaMm2: string;
  parallelRuns: string;
  kva: string;
  phases: string;
  ratedVoltageKv: string;
  transformerImpedancePercent: string;
  sourceImpedancePercent: string;
  faultFrequency: string;
  role: string;
  ratedWithstandKa: string;
  ratedDurationS: string;
};

function toDraft(curve: DamageCurve): Draft {
  return {
    name: curve.name,
    notes: curve.notes ?? "",
    family: curve.family,
    material: curve.family === "cable-adiabatic" ? curve.material : "copper",
    insulation: curve.family === "cable-adiabatic" ? curve.insulation : "pvc",
    csaMm2: curve.family === "cable-adiabatic" ? String(curve.csaMm2) : "95",
    parallelRuns: curve.family === "cable-adiabatic" ? String(curve.parallelRuns) : "1",
    kva: curve.family === "transformer-c57109" ? String(curve.kva) : "1000",
    phases: curve.family === "transformer-c57109" ? String(curve.phases) : "3",
    ratedVoltageKv: curve.family === "transformer-c57109" ? String(curve.ratedVoltageKv) : "11",
    transformerImpedancePercent: curve.family === "transformer-c57109" ? String(curve.transformerImpedancePercent) : "6",
    sourceImpedancePercent: curve.family === "transformer-c57109" ? String(curve.sourceImpedancePercent) : "0",
    faultFrequency: curve.family === "transformer-c57109" ? curve.faultFrequency : "infrequent",
    role: curve.family === "transformer-c57109" ? curve.role : "backup",
    ratedWithstandKa: curve.family === "busbar-thermal" ? String(curve.ratedWithstandKa) : "25",
    ratedDurationS: curve.family === "busbar-thermal" ? String(curve.ratedDurationS) : "1",
  };
}

function draftToDamageCurve(draft: Draft, id: string, color: string): DamageCurve {
  const common = { id, name: draft.name.trim() || "Untitled damage curve", notes: draft.notes.trim() || undefined, color };
  const num = (s: string) => Number(s) || 0;
  switch (draft.family) {
    case "cable-adiabatic":
      return {
        ...common,
        family: "cable-adiabatic",
        material: draft.material as "copper" | "aluminium",
        insulation: draft.insulation as "pvc" | "xlpe",
        csaMm2: num(draft.csaMm2),
        parallelRuns: num(draft.parallelRuns) || 1,
      };
    case "transformer-c57109":
      return {
        ...common,
        family: "transformer-c57109",
        kva: num(draft.kva),
        phases: (num(draft.phases) === 1 ? 1 : 3) as 1 | 3,
        ratedVoltageKv: num(draft.ratedVoltageKv),
        transformerImpedancePercent: num(draft.transformerImpedancePercent),
        sourceImpedancePercent: num(draft.sourceImpedancePercent),
        faultFrequency: draft.faultFrequency as "frequent" | "infrequent",
        role: draft.role as "primary" | "backup",
      };
    case "busbar-thermal":
      return { ...common, family: "busbar-thermal", ratedWithstandKa: num(draft.ratedWithstandKa), ratedDurationS: num(draft.ratedDurationS) };
  }
}

export function DamageCurveEditor({
  curve,
  onSave,
  onCancel,
}: {
  curve: DamageCurve;
  onSave: (curve: DamageCurve) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<Draft>(() => toDraft(curve));
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  return (
    <div style={{ border: "1px solid var(--rule)", padding: 12, marginBottom: 8 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <label>
          Name
          <input value={draft.name} onChange={(e) => set("name", e.target.value)} style={{ width: "100%" }} />
        </label>
        <label>
          Damage curve family
          <select value={draft.family} onChange={(e) => set("family", e.target.value as DamageCurve["family"])} style={{ width: "100%" }}>
            <option value="cable-adiabatic">Cable (adiabatic, BS 7671-style)</option>
            <option value="transformer-c57109">Transformer through-fault (IEEE C57.109)</option>
            <option value="busbar-thermal">Busbar / bare conductor (rated withstand)</option>
          </select>
        </label>

        {draft.family === "cable-adiabatic" && (
          <>
            <label>
              Material
              <select value={draft.material} onChange={(e) => set("material", e.target.value)} style={{ width: "100%" }}>
                <option value="copper">Copper</option>
                <option value="aluminium">Aluminium</option>
              </select>
            </label>
            <label>
              Insulation
              <select value={draft.insulation} onChange={(e) => set("insulation", e.target.value)} style={{ width: "100%" }}>
                <option value="pvc">PVC</option>
                <option value="xlpe">XLPE</option>
              </select>
            </label>
            <label>
              CSA (mm²)
              <input type="number" value={draft.csaMm2} onChange={(e) => set("csaMm2", e.target.value)} style={{ width: "100%" }} />
            </label>
            <label>
              Parallel runs
              <input type="number" value={draft.parallelRuns} onChange={(e) => set("parallelRuns", e.target.value)} style={{ width: "100%" }} />
            </label>
          </>
        )}

        {draft.family === "transformer-c57109" && (
          <>
            <label>
              Rating (kVA)
              <input type="number" value={draft.kva} onChange={(e) => set("kva", e.target.value)} style={{ width: "100%" }} />
            </label>
            <label>
              Phases
              <select value={draft.phases} onChange={(e) => set("phases", e.target.value)} style={{ width: "100%" }}>
                <option value="3">Three-phase</option>
                <option value="1">Single-phase</option>
              </select>
            </label>
            <label>
              Rated voltage, this side (kV, line-to-line)
              <input type="number" value={draft.ratedVoltageKv} onChange={(e) => set("ratedVoltageKv", e.target.value)} style={{ width: "100%" }} />
            </label>
            <label>
              Transformer impedance Z_T (%)
              <input type="number" value={draft.transformerImpedancePercent} onChange={(e) => set("transformerImpedancePercent", e.target.value)} style={{ width: "100%" }} />
            </label>
            <label>
              Source impedance Z_S (%) — category III/IV only
              <input type="number" value={draft.sourceImpedancePercent} onChange={(e) => set("sourceImpedancePercent", e.target.value)} style={{ width: "100%" }} />
            </label>
            <label>
              Fault frequency
              <select value={draft.faultFrequency} onChange={(e) => set("faultFrequency", e.target.value)} style={{ width: "100%" }}>
                <option value="infrequent">Infrequent</option>
                <option value="frequent">Frequent</option>
              </select>
            </label>
            <label>
              This device&apos;s role
              <select value={draft.role} onChange={(e) => set("role", e.target.value)} style={{ width: "100%" }}>
                <option value="backup">Backup</option>
                <option value="primary">Primary (only) through-fault protection</option>
              </select>
            </label>
          </>
        )}

        {draft.family === "busbar-thermal" && (
          <>
            <label>
              Rated withstand I_th (kA)
              <input type="number" value={draft.ratedWithstandKa} onChange={(e) => set("ratedWithstandKa", e.target.value)} style={{ width: "100%" }} />
            </label>
            <label>
              Rated duration t_k (s)
              <input type="number" value={draft.ratedDurationS} onChange={(e) => set("ratedDurationS", e.target.value)} style={{ width: "100%" }} />
            </label>
          </>
        )}

        <label style={{ gridColumn: "1 / -1" }}>
          Notes
          <input value={draft.notes} onChange={(e) => set("notes", e.target.value)} style={{ width: "100%" }} />
        </label>
      </div>

      <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
        <button type="button" className="primary" onClick={() => onSave(draftToDamageCurve(draft, curve.id, curve.color ?? "var(--muted)"))}>
          Save
        </button>
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
