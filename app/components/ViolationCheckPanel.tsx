"use client";

import { useState } from "react";
import type { DamageCurve, Device, FaultLocation, ViolationCheck } from "@/lib/types";
import { damageCurveWithstandTime, deviceTripTime } from "@/lib/deviceEngine";
import { computeGradingMargin } from "@/lib/gradingEngine";
import { ConfirmButton } from "./ConfirmButton";

function ViolationRow({
  check,
  devices,
  damageCurves,
  locations,
  onRemove,
}: {
  check: ViolationCheck;
  devices: Device[];
  damageCurves: DamageCurve[];
  locations: FaultLocation[];
  onRemove: () => void;
}) {
  const device = devices.find((d) => d.id === check.deviceId);
  const damageCurve = damageCurves.find((c) => c.id === check.damageCurveId);
  const location = locations.find((l) => l.id === check.faultLocationId);
  if (!device || !damageCurve || !location) return null;

  // Reuse the margin engine with damage-time as the "upstream" curve and
  // device-time as "downstream": minMarginS is then damage.timeS -
  // device.timeS, minimized across the range — the worst-case *spare* time
  // before damage, found at whichever current makes the device closest to
  // (or past) the damage curve. Getting this argument order backwards would
  // instead find the *safest* point in range and could silently miss a
  // violation that only occurs over part of the range (caught by hand-
  // verifying against the curve formulas directly during Phase 5
  // verification — the first version had exactly this bug).
  const result = computeGradingMargin(
    (current) => damageCurveWithstandTime(damageCurve, current),
    (current) => deviceTripTime(device, current),
    { currentMin: location.ikMinA, currentMax: location.ikMaxA },
  );
  const violates = result.valid && result.minMarginS <= 0;
  const status = !result.valid ? "no-overlap" : violates ? "violation" : "protected";
  const statusColor = { "no-overlap": "var(--muted)", violation: "var(--danger)", protected: "var(--ok)" }[status];
  const statusLabel = { "no-overlap": "No overlap", violation: "Damage before clearance", protected: "Protected" }[status];

  return (
    <tr>
      <td>{device.name}</td>
      <td>{damageCurve.name}</td>
      <td>{location.name}</td>
      <td>{result.valid ? `${result.minMarginS.toFixed(3)}s spare (worst case, at ${result.atCurrentA.toFixed(0)}A)` : "—"}</td>
      <td style={{ color: statusColor, fontWeight: 700 }}>{statusLabel}</td>
      <td>
        <ConfirmButton label="Remove" onConfirm={onRemove} />
      </td>
    </tr>
  );
}

export function ViolationCheckPanel({
  devices,
  damageCurves,
  locations,
  checks,
  onChange,
}: {
  devices: Device[];
  damageCurves: DamageCurve[];
  locations: FaultLocation[];
  checks: ViolationCheck[];
  onChange: (checks: ViolationCheck[]) => void;
}) {
  const [deviceId, setDeviceId] = useState("");
  const [damageCurveId, setDamageCurveId] = useState("");
  const [locationId, setLocationId] = useState("");

  const canAdd = devices.length >= 1 && damageCurves.length >= 1 && locations.length >= 1;

  return (
    <section>
      <h3>Damage-curve violation checks</h3>
      {checks.length > 0 && (
        <table style={{ marginTop: 8 }}>
          <thead>
            <tr>
              <th>Device</th>
              <th>Damage curve</th>
              <th>Fault location</th>
              <th>Margin</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {checks.map((check) => (
              <ViolationRow
                key={check.id}
                check={check}
                devices={devices}
                damageCurves={damageCurves}
                locations={locations}
                onRemove={() => onChange(checks.filter((c) => c.id !== check.id))}
              />
            ))}
          </tbody>
        </table>
      )}

      {canAdd ? (
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end", marginTop: 8, flexWrap: "wrap" }}>
          <label>
            Device
            <select value={deviceId} onChange={(e) => setDeviceId(e.target.value)}>
              <option value="">Select…</option>
              {devices.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Damage curve
            <select value={damageCurveId} onChange={(e) => setDamageCurveId(e.target.value)}>
              <option value="">Select…</option>
              {damageCurves.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Fault location
            <select value={locationId} onChange={(e) => setLocationId(e.target.value)}>
              <option value="">Select…</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={!deviceId || !damageCurveId || !locationId}
            onClick={() => {
              onChange([...checks, { id: crypto.randomUUID(), deviceId, damageCurveId, faultLocationId: locationId }]);
              setDeviceId("");
              setDamageCurveId("");
              setLocationId("");
            }}
          >
            + Add violation check
          </button>
        </div>
      ) : (
        <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>Add at least 1 device, 1 damage curve and 1 fault location to declare a check.</p>
      )}
    </section>
  );
}
