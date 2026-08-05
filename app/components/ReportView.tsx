import type { DamageCurve, Device, Study } from "@/lib/types";
import { damageCurveWithstandTime, deviceTripTime } from "@/lib/deviceEngine";
import { computeGradingMargin } from "@/lib/gradingEngine";
import { StudyChart } from "./StudyChart";

function deviceSummary(device: Device): string {
  switch (device.family) {
    case "iec-inverse":
      return `IEC ${device.shape} — pickup ${device.pickupA}A, TMS ${device.tms}`;
    case "ieee-inverse":
      return `IEEE ${device.shape} — pickup ${device.pickupA}A, TD ${device.td}`;
    case "definite-time":
      return `Definite time — pickup ${device.pickupA}A, ${device.timeS}s`;
    case "thermal-replica":
      return `Thermal replica — IB ${device.ratedCurrentA}A, k ${device.kFactor}, τ ${device.thermalConstantMin}min, prior load ${device.priorLoadA}A`;
    case "mcb":
      return `MCB ${device.shape} (BS/IEC 60898-1) — In ${device.ratedCurrentA}A`;
    case "mccb": {
      const s = device.shortTimeEnabled
        ? `, I2 ${device.shortTimePickupA}A/${device.shortTimeDelayS}s (I²t ${device.shortTimeI2tRamp ? "ON" : "OFF"})`
        : ", S excluded";
      return `MCCB (IEC 60947-2 LSI) — In ${device.ratedCurrentA}A, I1 ${device.longTimePickupA}A/${device.longTimeDelayS}s@6xI1${s}, I3 ${device.instantaneousPickupA}A`;
    }
  }
}

function damageCurveSummary(curve: DamageCurve): string {
  switch (curve.family) {
    case "cable-adiabatic":
      return `Cable adiabatic — ${curve.csaMm2}mm² ${curve.material}/${curve.insulation}${curve.parallelRuns > 1 ? ` x${curve.parallelRuns} runs` : ""}`;
    case "transformer-c57109":
      return `Transformer C57.109 — ${curve.kva}kVA ${curve.phases}ph, ${curve.ratedVoltageKv}kV, Z_T ${curve.transformerImpedancePercent}%, ${curve.faultFrequency} faults, ${curve.role}`;
    case "busbar-thermal":
      return `Busbar rated withstand — ${curve.ratedWithstandKa}kA / ${curve.ratedDurationS}s`;
  }
}

export function ReportView({ study }: { study: Study }) {
  return (
    <div className="report">
      <div className="report-header">
        <h1>{study.name}</h1>
        <p className="report-meta">Protection grading &amp; damage curve study — printed {new Date().toLocaleDateString()}</p>
      </div>

      <section>
        <h2>Devices</h2>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Setting</th>
            </tr>
          </thead>
          <tbody>
            {study.devices.map((d) => (
              <tr key={d.id}>
                <td>{d.name}</td>
                <td>{deviceSummary(d)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2>Damage / withstand curves</h2>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Setting</th>
            </tr>
          </thead>
          <tbody>
            {study.damageCurves.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>{damageCurveSummary(c)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2>Fault locations</h2>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Ik max</th>
              <th>Ik min</th>
            </tr>
          </thead>
          <tbody>
            {study.locations.map((l) => (
              <tr key={l.id}>
                <td>{l.name}</td>
                <td>{l.ikMaxA}A</td>
                <td>{l.ikMinA}A</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="report-chart">
        <h2>Time-current curves</h2>
        <StudyChart devices={study.devices} damageCurves={study.damageCurves} />
      </section>

      <section>
        <h2>Grading margin checks</h2>
        {study.gradingChecks.length === 0 ? (
          <p className="report-meta">No grading checks declared.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Upstream</th>
                <th>Downstream</th>
                <th>Fault location</th>
                <th>Worst-case margin</th>
                <th>At current</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {study.gradingChecks.map((check) => {
                const upstream = study.devices.find((d) => d.id === check.upstreamDeviceId);
                const downstream = study.devices.find((d) => d.id === check.downstreamDeviceId);
                const location = study.locations.find((l) => l.id === check.faultLocationId);
                if (!upstream || !downstream || !location) return null;
                const result = computeGradingMargin(
                  (current) => deviceTripTime(upstream, current),
                  (current) => deviceTripTime(downstream, current),
                  { currentMin: location.ikMinA, currentMax: location.ikMaxA },
                );
                return (
                  <tr key={check.id}>
                    <td>{upstream.name}</td>
                    <td>{downstream.name}</td>
                    <td>{location.name}</td>
                    <td>{result.valid ? `${result.minMarginS.toFixed(3)}s` : "no overlap"}</td>
                    <td>{result.valid ? `${result.atCurrentA.toFixed(0)}A` : "—"}</td>
                    <td>{result.valid ? (result.minMarginS <= 0 ? "Miscoordinated" : "OK") : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      <section>
        <h2>Damage-curve violation checks</h2>
        {study.violationChecks.length === 0 ? (
          <p className="report-meta">No violation checks declared.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Device</th>
                <th>Damage curve</th>
                <th>Fault location</th>
                <th>Worst-case spare time</th>
                <th>At current</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {study.violationChecks.map((check) => {
                const device = study.devices.find((d) => d.id === check.deviceId);
                const damageCurve = study.damageCurves.find((c) => c.id === check.damageCurveId);
                const location = study.locations.find((l) => l.id === check.faultLocationId);
                if (!device || !damageCurve || !location) return null;
                const result = computeGradingMargin(
                  (current) => damageCurveWithstandTime(damageCurve, current),
                  (current) => deviceTripTime(device, current),
                  { currentMin: location.ikMinA, currentMax: location.ikMaxA },
                );
                return (
                  <tr key={check.id}>
                    <td>{device.name}</td>
                    <td>{damageCurve.name}</td>
                    <td>{location.name}</td>
                    <td>{result.valid ? `${result.minMarginS.toFixed(3)}s` : "no overlap"}</td>
                    <td>{result.valid ? `${result.atCurrentA.toFixed(0)}A` : "—"}</td>
                    <td>{result.valid ? (result.minMarginS <= 0 ? "Damage before clearance" : "Protected") : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
