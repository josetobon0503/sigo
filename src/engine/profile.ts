// Builds the user profile at the end of onboarding. Pure, no React imports.

import { applyScreening } from './safety';
import type {
  ActivityLevel,
  AgeBand,
  BodyArea,
  Equipment,
  Lang,
  Level,
  PainArea,
  Pattern,
  UserProfile,
} from './types';

export const PATTERNS: Pattern[] = [
  'squat',
  'hinge',
  'upper_push',
  'upper_pull',
  'core',
  'balance',
  'mobility',
  'calf',
];

export const AGE_BANDS: AgeBand[] = ['under-50', '50-59', '60-69', '70-79', '80+'];

export const EQUIPMENT: Equipment[] = [
  'chair',
  'wall',
  'bottles',
  'towel',
  'light_dumbbells',
  'backpack',
  'step',
  'band',
];

export function toggleEquipment(list: Equipment[], item: Equipment): Equipment[] {
  return list.includes(item) ? list.filter((e) => e !== item) : [...list, item];
}

export const BODY_AREAS: BodyArea[] = [
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

export const PAIRED_AREAS = new Set<BodyArea>([
  'shoulder',
  'elbow',
  'wrist',
  'hip',
  'knee',
  'ankle',
  'foot',
]);

export const ACTIVITY_LEVELS: ActivityLevel[] = ['low', 'some', 'daily', 'strength'];

// Starting level from "How active are you?", the same for every pattern, whatever the age.
export const ACTIVITY_START_LEVEL: Record<ActivityLevel, Level> = {
  low: 1,
  some: 2,
  daily: 3,
  strength: 4,
};

export function levelsAt(level: Level): Record<Pattern, Level> {
  return Object.fromEntries(PATTERNS.map((p) => [p, level])) as Record<Pattern, Level>;
}

export function levelsFor(activity: ActivityLevel): Record<Pattern, Level> {
  return levelsAt(ACTIVITY_START_LEVEL[activity]);
}

// Changing the activity level in Profile resets every pattern to its starting level.
export function setActivity(activity: ActivityLevel): Pick<UserProfile, 'activity' | 'levels'> {
  return { activity, levels: levelsFor(activity) };
}

export interface ProfileDraft {
  name: string;
  language: Lang;
  ageBand: AgeBand;
  activity: ActivityLevel;
  floorOk: boolean;
  equipment: Equipment[];
  painAreas: Omit<PainArea, 'updatedAt'>[];
  reminder: UserProfile['reminder'];
  screeningAnswers: Record<string, boolean>;
}

export function createProfile(draft: ProfileDraft, completedAt: string): UserProfile {
  const profile: UserProfile = {
    name: draft.name.trim(),
    language: draft.language,
    ageBand: draft.ageBand,
    activity: draft.activity,
    floorOk: draft.floorOk,
    equipment: [...draft.equipment],
    levels: levelsFor(draft.activity),
    seatedOnly: false,
    painAreas: draft.painAreas.map((p) => ({ ...p, updatedAt: completedAt })),
    avoided: [],
    reminder: { ...draft.reminder, days: [...draft.reminder.days] },
    screening: null,
  };
  // A "yes" in the screening wins over the activity level: level 1 and seated only.
  return applyScreening(profile, draft.screeningAnswers, completedAt);
}
