import { Trip, ExpenseItem } from "../types";
import { getTaiwanTimeInfo } from "./taiwanTime";

export function normalizeDate(dateStr?: string): string {
  if (!dateStr) return "";
  const cleaned = String(dateStr).trim().split("T")[0].replace(/\//g, "-");
  const parts = cleaned.split("-");
  if (parts.length === 3) {
    return `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
  }
  return cleaned;
}

export function isTripOngoingToday(
  trip: Trip,
  today: string = getTaiwanTimeInfo().dateStr
): boolean {
  if (!trip.startDate) return false;
  const start = normalizeDate(trip.startDate);
  const end = trip.endDate ? normalizeDate(trip.endDate) : "";
  const cur = normalizeDate(today);
  if (end) return cur >= start && cur <= end;
  return cur >= start;
}

export function getPrimaryOngoingTrip(
  tripList: Trip[],
  today: string = getTaiwanTimeInfo().dateStr
): Trip | null {
  const ongoingList = tripList.filter((t) => isTripOngoingToday(t, today));
  if (ongoingList.length === 0) return null;
  if (ongoingList.length === 1) return ongoingList[0];
  return [...ongoingList].sort((a, b) => {
    const hasEndA = Boolean(a.endDate?.trim());
    const hasEndB = Boolean(b.endDate?.trim());
    if (hasEndA !== hasEndB) return hasEndA ? -1 : 1;
    return normalizeDate(b.startDate).localeCompare(normalizeDate(a.startDate));
  })[0];
}

export function getUpcomingTrip(
  tripList: Trip[],
  today: string = getTaiwanTimeInfo().dateStr
): Trip | null {
  const cur = normalizeDate(today);
  const futureTrips = tripList
    .filter((t) => t.startDate && normalizeDate(t.startDate) > cur)
    .sort((a, b) => normalizeDate(a.startDate).localeCompare(normalizeDate(b.startDate)));
  return futureTrips[0] || null;
}

export interface TripBudgetMetrics {
  totalSpentTwd: number;
  tripDays: number;
  elapsedDays: number;
  remainingDays: number;
  dailyAverageTwd: number;
  remainingBudgetTwd: number | null;
  dailyRemainingBudgetTwd: number | null;
  burnRatePct: number | null;
}

export function computeTripBudgetMetrics(
  trip: Trip,
  expenses: ExpenseItem[],
  today: string = getTaiwanTimeInfo().dateStr
): TripBudgetMetrics {
  const totalSpentTwd = expenses.reduce((sum, e) => sum + (e.amountTwd || 0), 0);
  const start = normalizeDate(trip.startDate);
  const end = trip.endDate ? normalizeDate(trip.endDate) : start;

  const msPerDay = 86400000;
  const startMs = start ? new Date(`${start}T00:00:00Z`).getTime() : 0;
  const endMs = end ? new Date(`${end}T00:00:00Z`).getTime() : startMs;
  const todayMs = new Date(`${normalizeDate(today)}T00:00:00Z`).getTime();

  const tripDays = startMs && endMs >= startMs ? Math.floor((endMs - startMs) / msPerDay) + 1 : 1;

  let elapsedDays = tripDays;
  let remainingDays = 0;
  if (startMs) {
    if (todayMs < startMs) {
      elapsedDays = 1;
      remainingDays = tripDays;
    } else if (todayMs <= endMs) {
      elapsedDays = Math.floor((todayMs - startMs) / msPerDay) + 1;
      remainingDays = Math.max(1, Math.floor((endMs - todayMs) / msPerDay) + 1);
    }
  }

  const dailyAverageTwd = Math.round(totalSpentTwd / Math.max(1, elapsedDays));
  const budget = trip.budgetTwd && trip.budgetTwd > 0 ? trip.budgetTwd : null;
  const remainingBudgetTwd = budget !== null ? Math.round(budget - totalSpentTwd) : null;
  const dailyRemainingBudgetTwd =
    remainingBudgetTwd !== null && remainingDays > 0
      ? Math.round(remainingBudgetTwd / remainingDays)
      : null;
  const burnRatePct =
    budget !== null ? Math.min(100, Math.round((totalSpentTwd / budget) * 100)) : null;

  return {
    totalSpentTwd,
    tripDays,
    elapsedDays,
    remainingDays,
    dailyAverageTwd,
    remainingBudgetTwd,
    dailyRemainingBudgetTwd,
    burnRatePct,
  };
}
