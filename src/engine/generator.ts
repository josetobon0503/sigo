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
const MAX_SECONDS = 25 * 60;
const MIN_MAIN = 5;
const MAX_LYING = 3; // exercises lying down per workout, cool-down included

const isLying = (e: Exercise) => e.position === 'lying';
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
// Exercises lying down only when `allowLying` and while fewer than 3 are planned.
function rankCandidates(pattern: Pattern, ctx: Context, allowLying = true): Exercise[] {
  const { profile, library, date, blocked, caution, usedLastTime, usedToday } = ctx;
  const lyingOk =
    allowLying && library.filter((e) => usedToday.has(e.id) && isLying(e)).length < MAX_LYING;
  const maxLevel = profile.levels[pattern];
  const cautionPenalty = (e: Exercise) =>
    loadsAny(e, caution) && e.position === 'standing' ? 1 : 0;
  return library
    .filter(
      (e) =>
        e.pattern === pattern &&
        e.level <= maxLevel &&
        !usedToday.has(e.id) &&
        (lyingOk || !isLying(e)) &&
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

  // The warm-up is never lying down. One mobility exercise stays free for the cool-down.
  const mobility = rankCandidates('mobility', ctx, false).slice(0, WARMUP_COUNT + COOLDOWN_COUNT);
  const warmup = mobility.slice(0, Math.max(1, mobility.length - COOLDOWN_COUNT));
  warmup.forEach((e) => ctx.usedToday.add(e.id));

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

  // Over 25 minutes: drop the second warm-up exercise, then the last main slot (keeping 5: the
  // first four slots cover every required group).
  let cooldown = pickCooldown(main, ctx);
  const seconds = () =>
    [...warmup, ...main, ...cooldown].reduce(
      (sum, e) => sum + estimateSeconds(e.dosage, e.perSide),
      0,
    );
  if (seconds() > MAX_SECONDS && warmup.length > 1) warmup.shift();
  while (seconds() > MAX_SECONDS && main.length > MIN_MAIN) main.pop();
  if (!main.some(isLying) && cooldown.some(isLying)) {
    cooldown.forEach((e) => ctx.usedToday.delete(e.id));
    cooldown = pickCooldown(main, ctx);
  }

  const plan = (section: WorkoutSection) => (e: Exercise) => ({
    exerciseId: e.id,
    section,
    dosage: e.dosage,
    perSide: e.perSide,
  });
  // Exercises lying down go together at the end of the main block, right before the cool-down.
  const items: PlannedItem[] = [
    ...warmup.map(plan('warmup')),
    ...main.filter((e) => !isLying(e)).map(plan('main')),
    ...main.filter(isLying).map(plan('main')),
    ...cooldown.map(plan('cooldown')),
  ];
  reduceSets(items);
  fillToMinimum(items, ctx);

  return { date: dayOf(date), items, skippedPatterns: [...skipped], estimatedSec: total(items) };
}

function total(items: PlannedItem[]): number {
  return items.reduce((sum, item) => sum + estimateSeconds(item.dosage, item.perSide), 0);
}

// The cool-down stays in bed (knee to chest) only when the main block ends lying down.
function pickCooldown(main: Exercise[], ctx: Context): Exercise[] {
  const candidates = rankCandidates('mobility', ctx, main.some(isLying));
  const pick = candidates.find(isLying) ?? candidates[0];
  if (!pick) return [];
  ctx.usedToday.add(pick.id);
  return [pick];
}

// Still over 25 minutes (3 sets from level 3 on): main exercises go from 3 sets to 2, starting
// from the end.
function reduceSets(items: PlannedItem[]): void {
  for (const item of [...items].reverse()) {
    if (total(items) <= MAX_SECONDS) return;
    if (item.section === 'main' && item.dosage.sets > 2) {
      item.dosage = { ...item.dosage, sets: 2 };
    }
  }
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
    const [extra] = rankCandidates('mobility', ctx, false);
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
