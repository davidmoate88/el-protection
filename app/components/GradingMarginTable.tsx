"use client";

import { useState } from "react";
import type { Device, FaultLocation, GradingCheck } from "@/lib/types";
import { deviceTripTime } from "@/lib/deviceEngine";
import { computeGradingMargin } from "@/lib/gradingEngine";
import { resolveFaultCurrents } from "@/lib/faultCurrentEngine";
import { ConfirmButton } from "./ConfirmButton";

// Margin is the minimum separation between the upstream and downstream
// device's trip-time curves across the fault location's Ik min-max range —
// the binding constraint on coordination is wherever separation is
// tightest, not necessarily at either endpoint. "Target margin" is a
// user-set typical-practice value (commonly 0.2-0.4s for relay-relay
// coordination), not a value mandated by any single standard — shown
// plainly as an adjustable target rather than a pass/fail rule this tool
// asserts on its own authority.
function MarginRow({
  check,
  devices,
  locations,
  targetMarginS,
  onRemove,
}: {
  check: GradingCheck;
  devices: Device[];
  locations: FaultLocation[];
  targetMarginS: number;
  onRemove: () => void;
}) {
  const upstream = devices.find((d) => d.id === check.upstreamDeviceId);
  const downstream = devices.find((d) => d.id === check.downstreamDeviceId);
  const location = locations.find((l) => l.id === check.faultLocationId);
  if (!upstream || !downstream || !location) return null;

  const { ikMinA, ikMaxA } = resolveFaultCurrents(location);
  const result = computeGradingMargin(
    (current) => deviceTripTime(upstream, current),
    (current) => deviceTripTime(downstream, current),
    { currentMin: ikMinA, currentMax: ikMaxA },
  );

  const status = !result.valid ? "no-overlap" : result.minMarginS <= 0 ? "fail" : result.minMarginS < targetMarginS ? "warn" : "pass";
  const statusColor = { "no-overlap": "var(--muted)", fail: "var(--danger)", warn: "#c9962c", pass: "var(--ok)" }[status];
  const statusLabel = { "no-overlap": "No overlap", fail: "Miscoordinated", warn: "Below target", pass: "OK" }[status];

  return (
    <tr>
      <td>{upstream.name}</td>
      <td>{downstream.name}</td>
      <td>{location.name}</td>
      <td>{result.valid ? `${result.minMarginS.toFixed(3)}s` : "—"}</td>
      <td>{result.valid ? `${result.atCurrentA.toFixed(0)}A` : "—"}</td>
      <td style={{ color: statusColor, fontWeight: 700 }}>{statusLabel}</td>
      <td>
        <ConfirmButton label="Remove" onConfirm={onRemove} />
      </td>
    </tr>
  );
}

export function GradingMarginTable({
  devices,
  locations,
  checks,
  onChange,
}: {
  devices: Device[];
  locations: FaultLocation[];
  checks: GradingCheck[];
  onChange: (checks: GradingCheck[]) => void;
}) {
  const [targetMarginS, setTargetMarginS] = useState(0.3);
  const [upstreamId, setUpstreamId] = useState("");
  const [downstreamId, setDownstreamId] = useState("");
  const [locationId, setLocationId] = useState("");

  const canAdd = devices.length >= 2 && locations.length >= 1;

  return (
    <section>
      <h3>Grading margin checks</h3>
      <label>
        Target margin (s), typical practice — not standard-mandated:{" "}
        <input
          type="number"
          step="0.05"
          value={targetMarginS}
          onChange={(e) => setTargetMarginS(Number(e.target.value) || 0)}
          style={{ width: 80 }}
        />
      </label>

      {checks.length > 0 && (
        <table style={{ marginTop: 8 }}>
          <thead>
            <tr>
              <th>Upstream</th>
              <th>Downstream</th>
              <th>Fault location</th>
              <th>Min margin</th>
              <th>At current</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {checks.map((check) => (
              <MarginRow
                key={check.id}
                check={check}
                devices={devices}
                locations={locations}
                targetMarginS={targetMarginS}
                onRemove={() => onChange(checks.filter((c) => c.id !== check.id))}
              />
            ))}
          </tbody>
        </table>
      )}

      {canAdd ? (
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end", marginTop: 8, flexWrap: "wrap" }}>
          <label>
            Upstream
            <select value={upstreamId} onChange={(e) => setUpstreamId(e.target.value)}>
              <option value="">Select…</option>
              {devices.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Downstream
            <select value={downstreamId} onChange={(e) => setDownstreamId(e.target.value)}>
              <option value="">Select…</option>
              {devices.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
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
            disabled={!upstreamId || !downstreamId || !locationId}
            onClick={() => {
              onChange([...checks, { id: crypto.randomUUID(), upstreamDeviceId: upstreamId, downstreamDeviceId: downstreamId, faultLocationId: locationId }]);
              setUpstreamId("");
              setDownstreamId("");
              setLocationId("");
            }}
          >
            + Add grading check
          </button>
        </div>
      ) : (
        <p style={{ color: "var(--muted)", fontSize: "0.85rem" }}>Add at least 2 devices and 1 fault location to declare a grading check.</p>
      )}
    </section>
  );
}
