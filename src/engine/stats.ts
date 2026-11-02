// Numbers for the Progress tab and the level-change notice on Today. Pure, no React imports.
// Weeks run Monday to Sunday and are named by their Monday ('YYYY-MM-DD'), so a week that
// crosses New Year is still one week.

import { addDays } from './pain';
import { BODY_AREAS } from './profile';
import { dayOf } from './rules';
import type {
  BodyArea,
  Feeling,
  LevelChange,
  PainArea,
  PainHistoryEntry,
  PainIntensity,
  Pattern,
  UserProfile,
  WeeklyGoal,
  WorkoutLog,
} from './types';

export const WEEKLY_GOALS: WeeklyGoal[] = [2, 3, 4];

// "How do you feel?" from the green face to the red one.
export const FEELINGS: Feeling[] = ['great', 'good', 'ok', 'tired', 'sore'];
export const DEFAULT_WEEKLY_GOAL: WeeklyGoal = 2;

// Patterns shown in "Your levels" and in the level-change notice. Mobility is the warm-up and
// cool-down, not something the user levels up in.
export type ProgressPattern = Exclude<Pattern, 'mobility'>;
export const PROGRESS_PATTERNS: ProgressPattern[] = [
  'squat',
  'hinge',
  'upper_push',
  'upper_pull',
  'core',
  'balance',
  'calf',
];

// Oldest first; logs of the same day keep their saved order.
function byDate(logs: WorkoutLog[]): WorkoutLog[] {
  return [...logs].sort((a, b) => dayOf(a.date).localeCompare(dayOf(b.date)));
}

// 0 = Monday ... 6 = Sunday.
function weekdayIndex(day: string): number {
  const [y, m, d] = dayOf(day).split('-').map(Number);
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
}

export function weekStart(day: string): string {
  return addDays(day, -weekdayIndex(day));
}

export function weekDays(day: string): string[] {
  const monday = weekStart(day);
  return [0, 1, 2, 3, 4, 5, 6].map((i) => addDays(monday, i));
}

// A day counts once it has a workout with at least one finished exercise. Two workouts on the same
// day are still one day.
export function trainedDays(logs: WorkoutLog[]): Set<string> {
  return new Set(logs.filter((l) => l.items.some((i) => i.completed)).map((l) => dayOf(l.date)));
}

// The goal of a week is the one saved on its last workout, so changing the goal never changes a
// week that already happened. A week without workouts (or only older logs) uses the current goal.
export function weekGoal(weekLogs: WorkoutLog[], currentGoal: WeeklyGoal): WeeklyGoal {
  const withGoal = byDate(weekLogs).filter((l) => l.weeklyGoal !== undefined);
  return withGoal.length > 0 ? withGoal[withGoal.length - 1].weeklyGoal! : currentGoal;
}

function logsOfWeek(logs: WorkoutLog[], monday: string): WorkoutLog[] {
  return logs.filter((l) => weekStart(l.date) === monday);
}

// Workouts after today (possible with "Simulate another day") are left out.
function upTo(logs: WorkoutLog[], today: string): WorkoutLog[] {
  return logs.filter((l) => dayOf(l.date) <= dayOf(today));
}

export interface WeekSummary {
  days: { day: string; trained: boolean }[]; // Monday to Sunday
  count: number;
  goal: WeeklyGoal;
  met: boolean;
}

export function thisWeek(logs: WorkoutLog[], today: string, currentGoal: WeeklyGoal): WeekSummary {
  const past = upTo(logs, today);
  const trained = trainedDays(past);
  const days = weekDays(today).map((day) => ({ day, trained: trained.has(day) }));
  const count = days.filter((d) => d.trained).length;
  const goal = weekGoal(logsOfWeek(past, weekStart(today)), currentGoal);
  return { days, count, goal, met: count >= goal };
}

export interface Streak {
  weeks: number; // weeks in a row that reached their goal
  best: number; // the longest streak ever
  // This week: 'met' already counts, 'open' can still be met and does not break the streak,
  // 'missed' can no longer be met this week (the streak starts over next week).
  currentWeek: 'met' | 'open' | 'missed';
}

export function weekStreak(logs: WorkoutLog[], today: string, currentGoal: WeeklyGoal): Streak {
  const past = upTo(logs, today);
  const trained = trainedDays(past);
  const current = weekStart(today);
  const weekMet = (monday: string) => {
    const count = weekDays(monday).filter((d) => trained.has(d)).length;
    return count >= weekGoal(logsOfWeek(past, monday), currentGoal);
  };

  // Days left this week, today included unless it is already trained.
  const week = thisWeek(past, today, currentGoal);
  const left = 6 - weekdayIndex(today) + (trained.has(dayOf(today)) ? 0 : 1);
  const currentWeek = week.met ? 'met' : week.count + left >= week.goal ? 'open' : 'missed';

  // Every finished week, oldest first, from the week of the first workout.
  const first = byDate(past)[0];
  const finished: boolean[] = [];
  if (first) {
    for (let monday = weekStart(first.date); monday < current; monday = addDays(monday, 7)) {
      finished.push(weekMet(monday));
    }
  }
  const all = currentWeek === 'met' ? [...finished, true] : finished;

  let best = 0;
  let run = 0;
  for (const met of all) {
    run = met ? run + 1 : 0;
    best = Math.max(best, run);
  }

  let previous = 0;
  for (let i = finished.length - 1; i >= 0 && finished[i]; i--) previous++;
  const weeks = currentWeek === 'missed' ? 0 : previous + (currentWeek === 'met' ? 1 : 0);
  return { weeks, best, currentWeek };
}

export function minutes(logs: WorkoutLog[], today: string): { total: number; week: number } {
  const past = upTo(logs, today);
  const sum = (list: WorkoutLog[]) =>
    Math.round(list.reduce((acc, l) => acc + l.durationSec, 0) / 60);
  return { total: sum(past), week: sum(logsOfWeek(past, weekStart(today))) };
}

// The last `n` feelings, oldest first.
export function feelings(
  logs: WorkoutLog[],
  n = 10,
): { id: string; day: string; feeling: Feeling }[] {
  return byDate(logs)
    .filter((l) => l.feeling)
    .slice(-n)
    .map((l) => ({ id: l.id, day: dayOf(l.date), feeling: l.feeling! }));
}

export interface AreaHistory {
  area: BodyArea;
  points: { day: string; intensity: PainIntensity }[]; // oldest first, one per day
}

// Pain intensity over time for each area, in body order. An area the user had before the history
// was kept starts with its current value.
export function painHistory(
  entries: PainHistoryEntry[],
  current: PainArea[],
  n = 6,
): AreaHistory[] {
  const result: AreaHistory[] = [];
  for (const area of BODY_AREAS) {
    const own = entries
      .filter((e) => e.area === area)
      .map((e) => ({ day: dayOf(e.date), intensity: e.intensity }));
    const now = current.find((p) => p.area === area);
    if (own.length === 0 && now) own.push({ day: dayOf(now.updatedAt), intensity: now.intensity });
    if (own.length === 0) continue;
    // Stable sort: on the same day, the last change wins.
    own.sort((a, b) => a.day.localeCompare(b.day));
    const points = own.filter((p, i) => own[i + 1]?.day !== p.day);
    result.push({ area, points: points.slice(-n) });
  }
  return result;
}

// What changed between two lists of pain areas: a new or changed intensity, or 1 ("None") for an
// area that was removed. The first change of an area also keeps its value before the change, so
// the history does not start in the middle.
export function painChanges(
  prev: PainArea[],
  next: PainArea[],
  date: string,
  history: PainHistoryEntry[] = [],
): PainHistoryEntry[] {
  const out: PainHistoryEntry[] = [];
  const add = (area: BodyArea, intensity: PainIntensity) => {
    const before = prev.find((p) => p.area === area);
    if (before && !history.some((e) => e.area === area)) {
      out.push({ date: before.updatedAt, area, intensity: before.intensity });
    }
    out.push({ date, area, intensity });
  };
  for (const p of next) {
    const before = prev.find((b) => b.area === p.area);
    if (!before || before.intensity !== p.intensity) add(p.area, p.intensity);
  }
  for (const p of prev) {
    if (!next.some((n) => n.area === p.area)) add(p.area, 1);
  }
  return out;
}

export function levelChanges(
  before: UserProfile['levels'],
  after: UserProfile['levels'],
): LevelChange[] {
  return PROGRESS_PATTERNS.filter((p) => before[p] !== after[p]).map((pattern) => ({
    pattern,
    from: before[pattern],
    to: after[pattern],
  }));
}

// The changes from the last workout, shown on Today until the next one. A change is hidden once
// the level is something else (e.g. the activity level was changed in Profile).
export function visibleLevelChanges(
  logs: WorkoutLog[],
  levels: UserProfile['levels'],
): { up: ProgressPattern[]; down: ProgressPattern[] } {
  const sorted = byDate(logs);
  const last = sorted[sorted.length - 1];
  const changes = (last?.levelChanges ?? []).filter((c) => levels[c.pattern] === c.to);
  const shown = (keep: (c: LevelChange) => boolean) =>
    PROGRESS_PATTERNS.filter((p) => changes.some((c) => c.pattern === p && keep(c)));
  return { up: shown((c) => c.to > c.from), down: shown((c) => c.to < c.from) };
}
