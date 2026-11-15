import { Trip, ExpenseItem, BackupPayload } from "../types";

export const KEY_TRIPS = "lovetravel_trips_v2";
export const KEY_EXPENSES = "lovetravel_expenses_v2";
export const KEY_RATES = "lovetravel_rates_v2";
export const KEY_GAS_URL = "lovetravel_gas_sync_url";

export function mergeTrips(localTrips: Trip[], remoteTrips: Trip[]): Trip[] {
  const map = new Map<string, Trip>();
  for (const t of remoteTrips) map.set(t.id, t);
  for (const t of localTrips) {
    const existing = map.get(t.id);
    if (!existing || (t.updatedAt && (!existing.updatedAt || t.updatedAt >= existing.updatedAt))) {
      map.set(t.id, t);
    }
  }
  return Array.from(map.values()).sort((a, b) => (b.startDate || "").localeCompare(a.startDate || ""));
}

export function mergeExpenses(localExpenses: ExpenseItem[], remoteExpenses: ExpenseItem[]): ExpenseItem[] {
  const map = new Map<string, ExpenseItem>();
  for (const e of remoteExpenses) map.set(e.id, e);
  for (const e of localExpenses) map.set(e.id, e);
  return Array.from(map.values()).sort((a, b) => (b.date || "").localeCompare(a.date || "") || (b.createdAt || 0) - (a.createdAt || 0));
}

export async function fetchSeedData(): Promise<BackupPayload | null> {
  try {
    const base = import.meta.env.BASE_URL || "/";
    const res = await fetch(`${base}data/seed.json?t=${Date.now()}`);
    if (!res.ok) return null;
    return (await res.json()) as BackupPayload;
  } catch {
    return null;
  }
}

export async function pullFromGas(gasUrl: string): Promise<{ trips: Trip[]; expenses: ExpenseItem[] } | null> {
  if (!gasUrl) return null;
  try {
    const res = await fetch(`${gasUrl}?action=pull&t=${Date.now()}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (Array.isArray(data.trips) && Array.isArray(data.expenses)) {
      return { trips: data.trips, expenses: data.expenses };
    }
    return null;
  } catch {
    return null;
  }
}

export async function pushToGas(gasUrl: string, trips: Trip[], expenses: ExpenseItem[]): Promise<boolean> {
  if (!gasUrl) return false;
  try {
    const res = await fetch(gasUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "sync", trips, expenses }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
