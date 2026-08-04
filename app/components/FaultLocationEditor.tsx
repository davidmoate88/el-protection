"use client";

import { useState } from "react";
import type { FaultLocation } from "@/lib/types";
import { ConfirmButton } from "./ConfirmButton";

function Row({
  location,
  onSave,
  onCancel,
}: {
  location: FaultLocation;
  onSave: (location: FaultLocation) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(location.name);
  const [ikMaxA, setIkMaxA] = useState(String(location.ikMaxA));
  const [ikMinA, setIkMinA] = useState(String(location.ikMinA));

  return (
    <div style={{ border: "1px solid var(--rule)", padding: 12, marginBottom: 8, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
      <label>
        Name
        <input value={name} onChange={(e) => setName(e.target.value)} style={{ width: "100%" }} />
      </label>
      <label>
        Ik max (A)
        <input type="number" value={ikMaxA} onChange={(e) => setIkMaxA(e.target.value)} style={{ width: "100%" }} />
      </label>
      <label>
        Ik min (A)
        <input type="number" value={ikMinA} onChange={(e) => setIkMinA(e.target.value)} style={{ width: "100%" }} />
      </label>
      <div style={{ gridColumn: "1 / -1", display: "flex", gap: 8 }}>
        <button
          type="button"
          className="primary"
          onClick={() =>
            onSave({ ...location, name: name.trim() || "Untitled location", ikMaxA: Number(ikMaxA) || 0, ikMinA: Number(ikMinA) || 0 })
          }
        >
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
              {location.name} — Ik max {location.ikMaxA}A, Ik min {location.ikMinA}A
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
          onClick={() => setDraftNew({ id: crypto.randomUUID(), name: "New fault location", ikMaxA: 1000, ikMinA: 500 })}
          style={{ marginTop: 8 }}
        >
          + Add fault location
        </button>
      )}
    </section>
  );
}
