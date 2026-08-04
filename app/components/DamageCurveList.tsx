"use client";

import { useState } from "react";
import type { DamageCurve } from "@/lib/types";
import { DamageCurveEditor } from "./DamageCurveEditor";
import { ConfirmButton } from "./ConfirmButton";
import { defaultDamageCurveForFamily } from "../lib/factories";
import { nextPaletteColor } from "../lib/palette";

export function DamageCurveList({
  damageCurves,
  deviceCount,
  onChange,
}: {
  damageCurves: DamageCurve[];
  deviceCount: number;
  onChange: (curves: DamageCurve[]) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftNew, setDraftNew] = useState<DamageCurve | null>(null);

  return (
    <section>
      <h3>Damage / withstand curves</h3>
      {damageCurves.map((curve) =>
        editingId === curve.id ? (
          <DamageCurveEditor
            key={curve.id}
            curve={curve}
            onSave={(updated) => {
              onChange(damageCurves.map((c) => (c.id === curve.id ? updated : c)));
              setEditingId(null);
            }}
            onCancel={() => setEditingId(null)}
          />
        ) : (
          <div key={curve.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid var(--rule)" }}>
            <span>
              <span style={{ display: "inline-block", width: 10, height: 10, background: curve.color, marginRight: 8 }} />
              {curve.name}
            </span>
            <span style={{ display: "flex", gap: 8 }}>
              <button type="button" onClick={() => setEditingId(curve.id)}>
                Edit
              </button>
              <ConfirmButton label="Remove" onConfirm={() => onChange(damageCurves.filter((c) => c.id !== curve.id))} />
            </span>
          </div>
        ),
      )}

      {draftNew ? (
        <DamageCurveEditor
          curve={draftNew}
          onSave={(curve) => {
            onChange([...damageCurves, curve]);
            setDraftNew(null);
          }}
          onCancel={() => setDraftNew(null)}
        />
      ) : (
        <button
          type="button"
          onClick={() =>
            setDraftNew(
              defaultDamageCurveForFamily(
                "cable-adiabatic",
                crypto.randomUUID(),
                nextPaletteColor(deviceCount + damageCurves.length),
              ),
            )
          }
          style={{ marginTop: 8 }}
        >
          + Add damage curve
        </button>
      )}
    </section>
  );
}
