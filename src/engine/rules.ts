// Shared candidate rules used by the generator and the swap finder.

import type { BodyArea, Dosage, Equipment, Exercise, UserProfile } from './types';

// 'YYYY-MM-DD' part of an ISO date or date-time.
export function dayOf(iso: string): string {
  return iso.slice(0, 10);
}

// Light dumbbells can always stand in for water bottles.
const SUBSTITUTES: Partial<Record<Equipment, Equipment[]>> = {
  bottles: ['light_dumbbells'],
};

export function hasEquipment(owned: Equipment[], needed: Equipment[]): boolean {
  return needed.every(
    (item) => owned.includes(item) || (SUBSTITUTES[item] ?? []).some((s) => owned.includes(s)),
  );
}

// What the user will actually pick up for `item`: the item itself, or what stands in for it.
export function resolveEquipment(owned: Equipment[], item: Equipment): Equipment {
  if (owned.includes(item)) return item;
  return (SUBSTITUTES[item] ?? []).find((s) => owned.includes(s)) ?? item;
}

// An avoided exercise comes back on its `until` day.
export function isAvoided(
  profile: Pick<UserProfile, 'avoided'>,
  id: string,
  date: string,
): boolean {
  return profile.avoided.some((a) => a.exerciseId === id && dayOf(date) < dayOf(a.until));
}

export function loadsAny(exercise: Exercise, areas: Set<BodyArea>): boolean {
  return exercise.loads.some((area) => areas.has(area));
}

// Rules every exercise must pass, whatever slot it fills.
export function isAllowed(
  exercise: Exercise,
  profile: UserProfile,
  blocked: Set<BodyArea>,
  date: string,
): boolean {
  if (loadsAny(exercise, blocked)) return false;
  if (!hasEquipment(profile.equipment, exercise.equipment)) return false;
  if (isAvoided(profile, exercise.id, date)) return false;
  if (profile.seatedOnly && exercise.position !== 'seated') return false;
  // The floor only for users who can get down and up alone, and never below level 3.
  if (exercise.position === 'floor' && (!profile.floorOk || exercise.level < 3)) return false;
  // Gentle balance work (levels 1-2) always has something to hold on to.
  if (exercise.pattern === 'balance' && exercise.level <= 2 && exercise.position === 'standing') {
    return false;
  }
  return true;
}

// Rough time on screen: ~4 s per rep (6 s with the slow level 5 tempo), 30 s rest after each
// set, 15 s to get ready. A perSide exercise does the work twice in each set.
export const REP_SECONDS = 4;
export const SLOW_REP_SECONDS = 6;
export const REST_SECONDS = 30;
export const SETUP_SECONDS = 15;

export function estimateSeconds(dosage: Dosage, perSide = false): number {
  const work =
    (dosage.kind === 'reps'
      ? dosage.reps * (dosage.slow ? SLOW_REP_SECONDS : REP_SECONDS)
      : dosage.seconds) * (perSide ? 2 : 1);
  return SETUP_SECONDS + dosage.sets * (work + REST_SECONDS);
}
