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
} from './types';

const WARMUP_COUNT = 2;
const COOLDOWN_COUNT = 1;

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

  const items: PlannedItem[] = [
    ...warmup.map((e) => ({ exerciseId: e.id, section: 'warmup' as const })),
    ...main.map((e) => ({ exerciseId: e.id, section: 'main' as const })),
    ...cooldown.map((e) => ({ exerciseId: e.id, section: 'cooldown' as const })),
  ];
  const estimatedSec = [...warmup, ...main, ...cooldown].reduce(
    (total, e) => total + estimateSeconds(e.dosage),
    0,
  );

  return { date: dayOf(date), items, skippedPatterns: [...skipped], estimatedSec };
}
