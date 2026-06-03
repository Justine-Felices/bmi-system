import type { MealPlan } from '../types';

/** Monday-based week start (YYYY-MM-DD) for a given date string. */
export function getWeekStart(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00`);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

export function isSameCalendarWeek(dateA: string, dateB: string): boolean {
  return getWeekStart(dateA) === getWeekStart(dateB);
}

export function dateRangesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}

/** Existing plan that conflicts with a new plan for the same week / overlapping dates. */
export function findConflictingPlan(
  plans: MealPlan[],
  newStart: string,
  newEnd: string,
  excludePlanId?: string,
): MealPlan | null {
  for (const plan of plans) {
    if (plan.id === excludePlanId) continue;

    const sameWeek = isSameCalendarWeek(plan.startDate, newStart);
    const overlaps = dateRangesOverlap(plan.startDate, plan.endDate, newStart, newEnd);

    if (sameWeek || overlaps) return plan;
  }

  return null;
}

export function stripMealDaySuggestions<T extends { suggestion?: string }>(
  meals: T[],
): Omit<T, 'suggestion'>[] {
  return meals.map(({ suggestion: _s, ...day }) => day);
}

/** General tips stored on plan, or deduped from legacy per-day fields. */
export function getPlanLifestyleTips(plan: MealPlan): string[] {
  if (plan.lifestyleTips?.length) return plan.lifestyleTips;

  const seen = new Set<string>();
  const fromDays: string[] = [];
  for (const day of plan.meals) {
    const tip = day.suggestion?.trim();
    if (tip && !seen.has(tip)) {
      seen.add(tip);
      fromDays.push(tip);
    }
  }
  return fromDays;
}
