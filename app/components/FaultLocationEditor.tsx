"use client";

import { useState } from "react";
import type { FaultLocation } from "@/lib/types";
import { resolveFaultCurrents } from "@/lib/faultCurrentEngine";
import { ConfirmButton } from "./ConfirmButton";

type CableDraft = { csaMm2: string; lengthM: string; resistancePerKmOhm: string; reactancePerKmOhm: string };

type Draft = {
  name: string;
  mode: "manual" | "calculated";
  ikMaxA: string;
  ikMinA: string;
  feederNominalVoltageKv: string;
  feederShortCircuitPowerMva: string;
  feederXrRatio: string;
  hasTransformer: boolean;
  transformerRatedKva: string;
  transformerRatedVoltageHvKv: string;
  transformerRatedVoltageLvKv: string;
  transformerUkPercent: string;
  transformerXrRatio: string;
  cables: CableDraft[];
};

function toDraft(location: FaultLocation): Draft {
  const t = location.mode === "calculated" ? location.transformer : undefined;
  return {
    name: location.name,
    mode: location.mode,
    ikMaxA: location.mode === "manual" ? String(location.ikMaxA) : "1000",
    ikMinA: location.mode === "manual" ? String(location.ikMinA) : "500",
    feederNominalVoltageKv: location.mode === "calculated" ? String(location.feeder.nominalVoltageKv) : "11",
    feederShortCircuitPowerMva: location.mode === "calculated" ? String(location.feeder.shortCircuitPowerMva) : "250",
    feederXrRatio: location.mode === "calculated" ? String(location.feeder.xrRatio) : "10",
    hasTransformer: t !== undefined,
    transformerRatedKva: t ? String(t.ratedKva) : "1000",
    transformerRatedVoltageHvKv: t ? String(t.ratedVoltageHvKv) : "11",
    transformerRatedVoltageLvKv: t ? String(t.ratedVoltageLvKv) : "0.415",
    transformerUkPercent: t ? String(t.ukPercent) : "6",
    transformerXrRatio: t ? String(t.xrRatio) : "5",
    cables:
      location.mode === "calculated"
        ? location.cables.map((c) => ({
            csaMm2: String(c.csaMm2),
            lengthM: String(c.lengthM),
            resistancePerKmOhm: String(c.resistancePerKmOhm),
            reactancePerKmOhm: String(c.reactancePerKmOhm),
          }))
        : [],
  };
}

function draftToLocation(draft: Draft, id: string): FaultLocation {
  const common = { id, name: draft.name.trim() || "Untitled location" };
  const num = (s: string) => Number(s) || 0;
  if (draft.mode === "manual") {
    return { ...common, mode: "manual", ikMaxA: num(draft.ikMaxA), ikMinA: num(draft.ikMinA) };
  }
  return {
    ...common,
    mode: "calculated",
    feeder: {
      nominalVoltageKv: num(draft.feederNominalVoltageKv),
      shortCircuitPowerMva: num(draft.feederShortCircuitPowerMva),
      xrRatio: num(draft.feederXrRatio),
    },
    transformer: draft.hasTransformer
      ? {
          ratedKva: num(draft.transformerRatedKva),
          ratedVoltageHvKv: num(draft.transformerRatedVoltageHvKv),
          ratedVoltageLvKv: num(draft.transformerRatedVoltageLvKv),
          ukPercent: num(draft.transformerUkPercent),
          xrRatio: num(draft.transformerXrRatio),
        }
      : undefined,
    cables: draft.cables.map((c) => ({
      csaMm2: num(c.csaMm2),
      lengthM: num(c.lengthM),
      resistancePerKmOhm: num(c.resistancePerKmOhm),
      reactancePerKmOhm: num(c.reactancePerKmOhm),
    })),
  };
}

function fmtA(a: number): string {
  return a >= 1000 ? `${(a / 1000).toFixed(2)}kA` : `${a.toFixed(0)}A`;
}

function Row({
  location,
  onSave,
  onCancel,
}: {
  location: FaultLocation;
  onSave: (location: FaultLocation) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<Draft>(() => toDraft(location));
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const setCable = (index: number, patch: Partial<CableDraft>) =>
    setDraft((d) => ({ ...d, cables: d.cables.map((c, i) => (i === index ? { ...c, ...patch } : c)) }));

  const preview = resolveFaultCurrents(draftToLocation(draft, location.id));

  return (
    <div style={{ border: "1px solid var(--rule)", padding: 12, marginBottom: 8 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <label>
          Name
          <input value={draft.name} onChange={(e) => set("name", e.target.value)} style={{ width: "100%" }} />
        </label>
        <label>
          Mode
          <select value={draft.mode} onChange={(e) => set("mode", e.target.value as Draft["mode"])} style={{ width: "100%" }}>
            <option value="manual">Manual entry</option>
            <option value="calculated">Calculated (IEC 60909)</option>
          </select>
        </label>
      </div>

      {draft.mode === "manual" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
          <label>
            Ik max (A)
            <input type="number" value={draft.ikMaxA} onChange={(e) => set("ikMaxA", e.target.value)} style={{ width: "100%" }} />
          </label>
          <label>
            Ik min (A)
            <input type="number" value={draft.ikMinA} onChange={(e) => set("ikMinA", e.target.value)} style={{ width: "100%" }} />
          </label>
        </div>
      )}

      {draft.mode === "calculated" && (
        <div style={{ marginTop: 8 }}>
          <p style={{ fontWeight: 600, margin: "8px 0 4px" }}>Network feeder</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            <label>
              Nominal voltage Un (kV)
              <input
                type="number"
                value={draft.feederNominalVoltageKv}
                onChange={(e) => set("feederNominalVoltageKv", e.target.value)}
                style={{ width: "100%" }}
              />
            </label>
            <label>
              Fault level Sk&quot; (MVA)
              <input
                type="number"
                value={draft.feederShortCircuitPowerMva}
                onChange={(e) => set("feederShortCircuitPowerMva", e.target.value)}
                style={{ width: "100%" }}
              />
            </label>
            <label>
              X/R ratio
              <input type="number" value={draft.feederXrRatio} onChange={(e) => set("feederXrRatio", e.target.value)} style={{ width: "100%" }} />
            </label>
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10 }}>
            <input type="checkbox" checked={draft.hasTransformer} onChange={(e) => set("hasTransformer", e.target.checked)} />
            Transformer between feeder and fault point
          </label>
          {draft.hasTransformer && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 6 }}>
              <label>
                Rated power (kVA)
                <input
                  type="number"
                  value={draft.transformerRatedKva}
                  onChange={(e) => set("transformerRatedKva", e.target.value)}
                  style={{ width: "100%" }}
                />
              </label>
              <label>
                HV voltage (kV)
                <input
                  type="number"
                  value={draft.transformerRatedVoltageHvKv}
                  onChange={(e) => set("transformerRatedVoltageHvKv", e.target.value)}
                  style={{ width: "100%" }}
                />
              </label>
              <label>
                LV voltage (kV)
                <input
                  type="number"
                  value={draft.transformerRatedVoltageLvKv}
                  onChange={(e) => set("transformerRatedVoltageLvKv", e.target.value)}
                  style={{ width: "100%" }}
                />
              </label>
              <label>
                Impedance voltage uk (%)
                <input
                  type="number"
                  value={draft.transformerUkPercent}
                  onChange={(e) => set("transformerUkPercent", e.target.value)}
                  style={{ width: "100%" }}
                />
              </label>
              <label>
                X/R ratio
                <input
                  type="number"
                  value={draft.transformerXrRatio}
                  onChange={(e) => set("transformerXrRatio", e.target.value)}
                  style={{ width: "100%" }}
                />
              </label>
            </div>
          )}

          <p style={{ fontWeight: 600, margin: "12px 0 4px" }}>Cable segments (in series, feeder to fault point)</p>
          {draft.cables.map((cable, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr auto", gap: 8, marginBottom: 6, alignItems: "end" }}>
              <label>
                CSA (mm²)
                <input type="number" value={cable.csaMm2} onChange={(e) => setCable(i, { csaMm2: e.target.value })} style={{ width: "100%" }} />
              </label>
              <label>
                Length (m)
                <input type="number" value={cable.lengthM} onChange={(e) => setCable(i, { lengthM: e.target.value })} style={{ width: "100%" }} />
              </label>
              <label>
                R&apos; (Ω/km)
                <input
                  type="number"
                  step="0.001"
                  value={cable.resistancePerKmOhm}
                  onChange={(e) => setCable(i, { resistancePerKmOhm: e.target.value })}
                  style={{ width: "100%" }}
                />
              </label>
              <label>
                X&apos; (Ω/km)
                <input
                  type="number"
                  step="0.001"
                  value={cable.reactancePerKmOhm}
                  onChange={(e) => setCable(i, { reactancePerKmOhm: e.target.value })}
                  style={{ width: "100%" }}
                />
              </label>
              <button type="button" onClick={() => set("cables", draft.cables.filter((_, idx) => idx !== i))}>
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              set("cables", [...draft.cables, { csaMm2: "185", lengthM: "30", resistancePerKmOhm: "0.0991", reactancePerKmOhm: "0.0783" }])
            }
          >
            + Add cable
          </button>

          <p style={{ marginTop: 12, padding: 8, background: "var(--panel)", border: "1px solid var(--rule)" }}>
            Calculated: Ik max = <strong>{fmtA(preview.ikMaxA)}</strong>, Ik min = <strong>{fmtA(preview.ikMinA)}</strong>
          </p>
        </div>
      )}

      <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
        <button type="button" className="primary" onClick={() => onSave(draftToLocation(draft, location.id))}>
          Save
        </button>
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export function FaultLocationList({
  locations,
  onChange,
}: {
  locations: FaultLocation[];
  onChange: (locations: FaultLocation[]) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftNew, setDraftNew] = useState<FaultLocation | null>(null);

  return (
    <section>
      <h3>Fault locations</h3>
      {locations.map((location) =>
        editingId === location.id ? (
          <Row
            key={location.id}
            location={location}
            onSave={(updated) => {
              onChange(locations.map((l) => (l.id === location.id ? updated : l)));
              setEditingId(null);
            }}
            onCancel={() => setEditingId(null)}
          />
        ) : (
          <div key={location.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid var(--rule)" }}>
            <span>
              {location.name} — Ik max {fmtA(resolveFaultCurrents(location).ikMaxA)}, Ik min {fmtA(resolveFaultCurrents(location).ikMinA)}
              {location.mode === "calculated" ? " (calculated)" : ""}
            </span>
            <span style={{ display: "flex", gap: 8 }}>
              <button type="button" onClick={() => setEditingId(location.id)}>
                Edit
              </button>
              <ConfirmButton label="Remove" onConfirm={() => onChange(locations.filter((l) => l.id !== location.id))} />
            </span>
          </div>
        ),
      )}

      {draftNew ? (
        <Row
          location={draftNew}
          onSave={(location) => {
            onChange([...locations, location]);
            setDraftNew(null);
          }}
          onCancel={() => setDraftNew(null)}
        />
      ) : (
        <button
          type="button"
          onClick={() => setDraftNew({ id: crypto.randomUUID(), name: "New fault location", mode: "manual", ikMaxA: 1000, ikMinA: 500 })}
          style={{ marginTop: 8 }}
        >
          + Add fault location
        </button>
      )}
    </section>
  );
}
