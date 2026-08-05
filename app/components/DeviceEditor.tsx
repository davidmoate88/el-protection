"use client";

import { useState } from "react";
import type { Device } from "@/lib/types";

type Draft = {
  name: string;
  notes: string;
  family: Device["family"];
  shape: string;
  pickupA: string;
  tms: string;
  td: string;
  timeS: string;
  ratedCurrentA: string;
  kFactor: string;
  thermalConstantMin: string;
  priorLoadA: string;
};

function toDraft(device: Device): Draft {
  return {
    name: device.name,
    notes: device.notes ?? "",
    family: device.family,
    shape: device.family === "iec-inverse" || device.family === "ieee-inverse" || device.family === "mcb" ? device.shape : "SI",
    pickupA: "pickupA" in device ? String(device.pickupA) : "100",
    tms: device.family === "iec-inverse" ? String(device.tms) : "0.2",
    td: device.family === "ieee-inverse" ? String(device.td) : "1",
    timeS: device.family === "definite-time" ? String(device.timeS) : "0.5",
    ratedCurrentA:
      device.family === "thermal-replica" || device.family === "mcb" ? String(device.ratedCurrentA) : "100",
    kFactor: device.family === "thermal-replica" ? String(device.kFactor) : "1.1",
    thermalConstantMin: device.family === "thermal-replica" ? String(device.thermalConstantMin) : "10",
    priorLoadA: device.family === "thermal-replica" ? String(device.priorLoadA) : "0",
  };
}

function draftToDevice(draft: Draft, id: string, color: string): Device {
  const common = { id, name: draft.name.trim() || "Untitled device", notes: draft.notes.trim() || undefined, color };
  const num = (s: string) => Number(s) || 0;
  switch (draft.family) {
    case "iec-inverse":
      return { ...common, family: "iec-inverse", shape: draft.shape as "SI" | "VI" | "EI" | "LTI", pickupA: num(draft.pickupA), tms: num(draft.tms) };
    case "ieee-inverse":
      return { ...common, family: "ieee-inverse", shape: draft.shape as "MI" | "VI" | "EI", pickupA: num(draft.pickupA), td: num(draft.td) };
    case "definite-time":
      return { ...common, family: "definite-time", pickupA: num(draft.pickupA), timeS: num(draft.timeS) };
    case "thermal-replica":
      return {
        ...common,
        family: "thermal-replica",
        ratedCurrentA: num(draft.ratedCurrentA),
        kFactor: num(draft.kFactor),
        thermalConstantMin: num(draft.thermalConstantMin),
        priorLoadA: num(draft.priorLoadA),
      };
    case "mcb":
      return { ...common, family: "mcb", shape: draft.shape as "B" | "C" | "D", ratedCurrentA: num(draft.ratedCurrentA) };
  }
}

export function DeviceEditor({
  device,
  onSave,
  onCancel,
}: {
  device: Device;
  onSave: (device: Device) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<Draft>(() => toDraft(device));
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  return (
    <div style={{ border: "1px solid var(--rule)", padding: 12, marginBottom: 8 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <label>
          Name
          <input value={draft.name} onChange={(e) => set("name", e.target.value)} style={{ width: "100%" }} />
        </label>
        <label>
          Curve family
          <select
            value={draft.family}
            onChange={(e) => {
              const family = e.target.value as Device["family"];
              set("family", family);
              const shapesByFamily: Record<string, string[]> = {
                "iec-inverse": ["SI", "VI", "EI", "LTI"],
                "ieee-inverse": ["MI", "VI", "EI"],
                mcb: ["B", "C", "D"],
              };
              const validShapes = shapesByFamily[family];
              if (validShapes && !validShapes.includes(draft.shape)) {
                set("shape", validShapes[0]);
              }
            }}
            style={{ width: "100%" }}
          >
            <option value="iec-inverse">IEC inverse-time (60255-151)</option>
            <option value="ieee-inverse">IEEE inverse-time (C37.112)</option>
            <option value="definite-time">Definite time</option>
            <option value="thermal-replica">Thermal replica (60255-149)</option>
            <option value="mcb">MCB (BS/IEC 60898-1)</option>
          </select>
        </label>

        {(draft.family === "iec-inverse" || draft.family === "ieee-inverse" || draft.family === "mcb") && (
          <label>
            Shape
            <select value={draft.shape} onChange={(e) => set("shape", e.target.value)} style={{ width: "100%" }}>
              {(draft.family === "iec-inverse"
                ? ["SI", "VI", "EI", "LTI"]
                : draft.family === "ieee-inverse"
                  ? ["MI", "VI", "EI"]
                  : ["B", "C", "D"]
              ).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        )}

        {draft.family === "mcb" && (
          <label>
            Rated current In (A)
            <input type="number" value={draft.ratedCurrentA} onChange={(e) => set("ratedCurrentA", e.target.value)} style={{ width: "100%" }} />
          </label>
        )}

        {(draft.family === "iec-inverse" || draft.family === "ieee-inverse" || draft.family === "definite-time") && (
          <label>
            Pickup current (A)
            <input type="number" value={draft.pickupA} onChange={(e) => set("pickupA", e.target.value)} style={{ width: "100%" }} />
          </label>
        )}
        {draft.family === "iec-inverse" && (
          <label>
            TMS
            <input type="number" step="0.01" value={draft.tms} onChange={(e) => set("tms", e.target.value)} style={{ width: "100%" }} />
          </label>
        )}
        {draft.family === "ieee-inverse" && (
          <label>
            Time dial
            <input type="number" step="0.01" value={draft.td} onChange={(e) => set("td", e.target.value)} style={{ width: "100%" }} />
          </label>
        )}
        {draft.family === "definite-time" && (
          <label>
            Time (s)
            <input type="number" step="0.01" value={draft.timeS} onChange={(e) => set("timeS", e.target.value)} style={{ width: "100%" }} />
          </label>
        )}
        {draft.family === "thermal-replica" && (
          <>
            <label>
              Rated current I_B (A)
              <input type="number" value={draft.ratedCurrentA} onChange={(e) => set("ratedCurrentA", e.target.value)} style={{ width: "100%" }} />
            </label>
            <label>
              k factor
              <input type="number" step="0.01" value={draft.kFactor} onChange={(e) => set("kFactor", e.target.value)} style={{ width: "100%" }} />
            </label>
            <label>
              Thermal constant τ (min)
              <input type="number" value={draft.thermalConstantMin} onChange={(e) => set("thermalConstantMin", e.target.value)} style={{ width: "100%" }} />
            </label>
            <label>
              Prior load (A)
              <input type="number" value={draft.priorLoadA} onChange={(e) => set("priorLoadA", e.target.value)} style={{ width: "100%" }} />
            </label>
          </>
        )}

        <label style={{ gridColumn: "1 / -1" }}>
          Notes
          <input value={draft.notes} onChange={(e) => set("notes", e.target.value)} style={{ width: "100%" }} />
        </label>
      </div>

      <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
        <button type="button" className="primary" onClick={() => onSave(draftToDevice(draft, device.id, device.color ?? "var(--accent)"))}>
          Save
        </button>
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
