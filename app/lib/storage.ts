import type { Study } from "@/lib/types";

const STORAGE_KEY = "el-protection:v1";

export function loadStudy(): Study | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Study;
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
