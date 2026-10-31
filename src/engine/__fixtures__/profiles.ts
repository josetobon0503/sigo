// Test profiles shared by the engine tests.

import type {
  BodyArea,
  Equipment,
  Exercise,
  Level,
  PainArea,
  PainKind,
  PainIntensity,
  Pattern,
  UserProfile,
} from '../types';

export const ALL_PATTERNS: Pattern[] = [
  'squat',
  'hinge',
  'upper_push',
  'upper_pull',
  'core',
  'balance',
  'mobility',
  'calf',
];

export const ALL_AREAS: BodyArea[] = [
  'neck',
  'shoulder',
  'elbow',
  'wrist',
  'upper_back',
  'lower_back',
  'hip',
  'knee',
  'ankle',
  'foot',
];

export const ALL_EQUIPMENT: Equipment[] = [
  'chair',
  'wall',
  'bottles',
  'towel',
  'light_dumbbells',
  'backpack',
  'step',
  'band',
];

export function levelsAt(level: Level): Record<Pattern, Level> {
  return Object.fromEntries(ALL_PATTERNS.map((p) => [p, level])) as Record<Pattern, Level>;
}

export function pain(
  area: BodyArea,
  intensity: PainIntensity,
  kind: PainKind = 'achy',
  side: PainArea['side'] = 'both',
): PainArea {
  return { area, side, intensity, kind, updatedAt: '2026-10-01' };
}

export function makeProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    name: 'Test',
    language: 'es',
    ageBand: '60-69',
    activity: 'daily',
    floorOk: false,
    equipment: ALL_EQUIPMENT,
    levels: levelsAt(3),
    seatedOnly: false,
    painAreas: [],
    avoided: [],
    reminder: { enabled: false, hour: 9, minute: 0, days: [] },
    screening: null,
    ...overrides,
  };
}

// Maria, 52: left knee 3 (achy), lower back 2, chair + wall + bottles.
export const maria = makeProfile({
  name: 'María',
  ageBand: '50-59',
  equipment: ['chair', 'wall', 'bottles'],
  levels: levelsAt(2),
  painAreas: [pain('knee', 3, 'achy', 'left'), pain('lower_back', 2)],
});

// Roberto, 72: lower back 3, right shoulder 3, chair + light dumbbells.
export const roberto = makeProfile({
  name: 'Roberto',
  ageBand: '70-79',
  equipment: ['chair', 'light_dumbbells'],
  levels: levelsAt(1),
  seatedOnly: false,
  painAreas: [pain('lower_back', 3), pain('shoulder', 3, 'achy', 'right')],
});

// "Active mom", 57: walks every day (level 3), nothing hurts, can get down to the floor.
export const mamaActiva = makeProfile({
  name: 'Mamá',
  ageBand: '50-59',
  activity: 'daily',
  floorOk: true,
  equipment: ['chair', 'towel', 'bottles', 'backpack', 'step'],
  levels: levelsAt(3),
  painAreas: [],
});

// Minimal exercise for synthetic libraries.
export function fakeExercise(overrides: Partial<Exercise> & Pick<Exercise, 'id'>): Exercise {
  return {
    name: { es: overrides.id, en: overrides.id },
    pattern: 'squat',
    position: 'seated',
    level: 1,
    loads: [],
    equipment: [],
    dosage: { kind: 'reps', sets: 2, reps: 10 },
    perSide: false,
    purpose: { es: 'x', en: 'x' },
    steps: { es: ['a', 'b', 'c'], en: ['a', 'b', 'c'] },
    mistakes: { es: ['a', 'b'], en: ['a', 'b'] },
    video: {},
    reviewedByProfessional: false,
    ...overrides,
  };
}
