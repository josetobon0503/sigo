// Builds today's workout (CLAUDE.md section 6). Pure and deterministic: same inputs = same output.

import { blockedAreas, cautionAreas } from './safety';
import { dayOf, estimateSeconds, isAllowed, loadsAny } from './rules';
import type {
  BodyArea,
  Exercise,
  GeneratedWorkout,
  Pattern,
  PlannedItem,
  UserProfile,
  WorkoutLog,
  WorkoutSection,
} from './types';

const WARMUP_COUNT = 2;
const COOLDOWN_COUNT = 1;
const MIN_SECONDS = 15 * 60;
const MAX_SETS = 3;

// FNV-1a: a stable tie-breaker so the same date always gives the same workout.
function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function dayNumber(date: string): number {
  const [y, m, d] = dayOf(date).split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
}

// Each slot lists the patterns it may use, in order of preference. The first pattern rotates by day,
// and the last two slots take the opposite choice, so every pattern is trained across the week.
function mainSlots(day: number): Pattern[][] {
  const lower: Pattern[] = day % 2 === 0 ? ['squat', 'hinge'] : ['hinge', 'squat'];
  const upper: Pattern[] =
    Math.floor(day / 2) % 2 === 0 ? ['upper_push', 'upper_pull'] : ['upper_pull', 'upper_push'];
  const coreOrCalf: Pattern[] = day % 2 === 0 ? ['core', 'calf'] : ['calf', 'core'];
  return [lower, upper, ['balance'], coreOrCalf, [...lower].reverse(), [...upper].reverse()];
}

function previousWorkout(history: WorkoutLog[], date: string): WorkoutLog | undefined {
  return history
    .filter((log) => dayOf(log.date) < dayOf(date))
    .reduce<WorkoutLog | undefined>(
      (latest, log) => (!latest || log.date > latest.date ? log : latest),
      undefined,
    );
}

interface Context {
  profile: UserProfile;
  library: Exercise[];
  date: string;
  blocked: Set<BodyArea>;
  caution: Set<BodyArea>;
  usedLastTime: Set<string>;
  usedToday: Set<string>;
}

// Candidates for a pattern, best first: the user's level (or the closest lower one), then
// seated / supported if it loads a caution area, then not used last time, then the date seed.
function rankCandidates(pattern: Pattern, ctx: Context): Exercise[] {
  const { profile, library, date, blocked, caution, usedLastTime, usedToday } = ctx;
  const maxLevel = profile.levels[pattern];
  const cautionPenalty = (e: Exercise) =>
    loadsAny(e, caution) && e.position === 'standing' ? 1 : 0;
  return library
    .filter(
      (e) =>
        e.pattern === pattern &&
        e.level <= maxLevel &&
        !usedToday.has(e.id) &&
        isAllowed(e, profile, blocked, date),
    )
    .sort(
      (a, b) =>
        b.level - a.level ||
        cautionPenalty(a) - cautionPenalty(b) ||
        Number(usedLastTime.has(a.id)) - Number(usedLastTime.has(b.id)) ||
        hash(dayOf(date) + a.id) - hash(dayOf(date) + b.id),
    );
}

export function generateWorkout(
  profile: UserProfile,
  library: Exercise[],
  history: WorkoutLog[],
  date: string,
): GeneratedWorkout {
  const previous = previousWorkout(history, date);
  const ctx: Context = {
    profile,
    library,
    date,
    blocked: blockedAreas(profile),
    caution: cautionAreas(profile),
    usedLastTime: new Set(previous?.items.map((i) => i.exerciseId) ?? []),
    usedToday: new Set(),
  };

  const mobility = rankCandidates('mobility', ctx).slice(0, WARMUP_COUNT + COOLDOWN_COUNT);
  const warmup = mobility.slice(0, Math.max(1, mobility.length - COOLDOWN_COUNT));
  const cooldown = mobility.slice(warmup.length);
  mobility.forEach((e) => ctx.usedToday.add(e.id));

  const main: Exercise[] = [];
  const skipped = new Set<Pattern>();
  // A pattern tried with no safe option counts as skipped, even if the slot falls back to its
  // other pattern (e.g. no squat for a blocked knee, so the slot uses a hinge instead).
  for (const slot of mainSlots(dayNumber(date))) {
    for (const pattern of slot) {
      const [pick] = rankCandidates(pattern, ctx);
      if (!pick) {
        skipped.add(pattern);
        continue;
      }
      main.push(pick);
      ctx.usedToday.add(pick.id);
      break;
    }
  }
  if (mobility.length === 0) skipped.add('mobility');
  main.forEach((e) => skipped.delete(e.pattern));

  const plan = (section: WorkoutSection) => (e: Exercise) => ({
    exerciseId: e.id,
    section,
    dosage: e.dosage,
    perSide: e.perSide,
  });
  const items: PlannedItem[] = [
    ...warmup.map(plan('warmup')),
    ...main.map(plan('main')),
    ...cooldown.map(plan('cooldown')),
  ];
  fillToMinimum(items, ctx);

  return { date: dayOf(date), items, skippedPatterns: [...skipped], estimatedSec: total(items) };
}

function total(items: PlannedItem[]): number {
  return items.reduce((sum, item) => sum + estimateSeconds(item.dosage, item.perSide), 0);
}

// A workout under 15 minutes first gets one more set on each main exercise (up to 3 sets),
// round by round, and then extra safe mobility exercises at the end.
function fillToMinimum(items: PlannedItem[], ctx: Context): void {
  let grew = true;
  while (grew && total(items) < MIN_SECONDS) {
    grew = false;
    for (const item of items) {
      if (total(items) >= MIN_SECONDS) return;
      if (item.section !== 'main' || item.dosage.sets >= MAX_SETS) continue;
      item.dosage = { ...item.dosage, sets: item.dosage.sets + 1 };
      grew = true;
    }
  }
  while (total(items) < MIN_SECONDS) {
    const [extra] = rankCandidates('mobility', ctx);
    if (!extra) return;
    ctx.usedToday.add(extra.id);
    items.push({
      exerciseId: extra.id,
      section: 'cooldown',
      dosage: extra.dosage,
      perSide: extra.perSide,
    });
  }
}
