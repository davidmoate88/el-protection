"use client";

import { useState } from "react";
import type { Device } from "@/lib/types";
import { DeviceEditor } from "./DeviceEditor";
import { ConfirmButton } from "./ConfirmButton";
import { defaultDeviceForFamily } from "../lib/factories";
import { nextPaletteColor } from "../lib/palette";

export function DeviceList({
  devices,
  onChange,
}: {
  devices: Device[];
  onChange: (devices: Device[]) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftNew, setDraftNew] = useState<Device | null>(null);

  return (
    <section>
      <h3>Devices</h3>
      {devices.map((device) =>
        editingId === device.id ? (
          <DeviceEditor
            key={device.id}
            device={device}
            onSave={(updated) => {
              onChange(devices.map((d) => (d.id === device.id ? updated : d)));
              setEditingId(null);
            }}
            onCancel={() => setEditingId(null)}
          />
        ) : (
          <div key={device.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid var(--rule)" }}>
            <span>
              <span style={{ display: "inline-block", width: 10, height: 10, background: device.color, marginRight: 8 }} />
              {device.name}
            </span>
            <span style={{ display: "flex", gap: 8 }}>
              <button type="button" onClick={() => setEditingId(device.id)}>
                Edit
              </button>
              <ConfirmButton label="Remove" onConfirm={() => onChange(devices.filter((d) => d.id !== device.id))} />
            </span>
          </div>
        ),
      )}

      {draftNew ? (
        <DeviceEditor
          device={draftNew}
          onSave={(device) => {
            onChange([...devices, device]);
            setDraftNew(null);
          }}
          onCancel={() => setDraftNew(null)}
        />
      ) : (
        <button
          type="button"
          onClick={() =>
            setDraftNew(defaultDeviceForFamily("iec-inverse", crypto.randomUUID(), nextPaletteColor(devices.length)))
          }
          style={{ marginTop: 8 }}
        >
          + Add device
        </button>
      )}
    </section>
  );
}
