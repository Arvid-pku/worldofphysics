"use client";

const SAFE = typeof window !== "undefined";

export function readJSON<T>(key: string, fallback: T): T {
  if (!SAFE) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJSON(key: string, value: unknown) {
  if (!SAFE) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export function readBool(key: string, fallback = false): boolean {
  if (!SAFE) return fallback;
  const v = window.localStorage.getItem(key);
  if (v === null) return fallback;
  return v === "1" || v === "true";
}

export function writeBool(key: string, value: boolean) {
  if (!SAFE) return;
  try {
    window.localStorage.setItem(key, value ? "1" : "0");
  } catch {}
}

export const STORAGE_KEYS = {
  welcomeSeen: "wop:welcomeSeen",
  scenes: "wop:scenes",
  preferredLang: "wop:lang"
} as const;
