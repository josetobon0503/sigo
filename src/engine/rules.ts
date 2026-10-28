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
  // Gentle balance work always has something to hold on to.
  if (exercise.pattern === 'balance' && exercise.level <= 3 && exercise.position === 'standing') {
    return false;
  }
  return true;
}

// Rough time on screen: ~4 s per rep, 30 s rest after each set, 15 s to get ready.
export const REP_SECONDS = 4;
export const REST_SECONDS = 30;
export const SETUP_SECONDS = 15;

export function estimateSeconds(dosage: Dosage): number {
  const work = dosage.kind === 'reps' ? dosage.reps * REP_SECONDS : dosage.seconds;
  return SETUP_SECONDS + dosage.sets * (work + REST_SECONDS);
}
