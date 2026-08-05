import type { FaultLocation, Study } from "@/lib/types";

const STORAGE_KEY = "el-protection:v1";

// Studies saved before the IEC 60909 fault-current engine was added have no
// `mode` field on FaultLocation - every fault location was implicitly what's
// now called "manual". A one-time migration at the localStorage read
// boundary, not a long-lived compatibility shim: it runs once per load and
// the rest of the app never has to think about the old shape again.
export function migrateFaultLocation(location: FaultLocation): FaultLocation {
  if (location.mode === "manual" || location.mode === "calculated") {
    return location;
  }
  const legacy = location as unknown as { id: string; name: string; ikMaxA: number; ikMinA: number };
  return { id: legacy.id, name: legacy.name, mode: "manual", ikMaxA: legacy.ikMaxA ?? 1000, ikMinA: legacy.ikMinA ?? 500 };
}

export function loadStudy(): Study | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const study = JSON.parse(raw) as Study;
    return { ...study, locations: study.locations.map(migrateFaultLocation) };
  } catch {
    return null;
  }
}

export function saveStudy(study: Study): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(study));
}

export function clearStudy(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

export function createEmptyStudy(name = "Untitled study"): Study {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name,
    createdAt: now,
    updatedAt: now,
    devices: [],
    damageCurves: [],
    locations: [],
    gradingChecks: [],
    violationChecks: [],
  };
}
