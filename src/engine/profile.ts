// Builds the user profile at the end of onboarding. Pure, no React imports.

import { applyScreening } from './safety';
import type {
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

export const EQUIPMENT: Equipment[] = ['chair', 'wall', 'bottles', 'towel', 'light_dumbbells'];

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

// Everyone starts at level 1, whatever their age: progression raises it.
export function initialLevels(): Record<Pattern, Level> {
  return Object.fromEntries(PATTERNS.map((p) => [p, 1])) as Record<Pattern, Level>;
}

export interface ProfileDraft {
  name: string;
  language: Lang;
  ageBand: AgeBand;
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
    equipment: [...draft.equipment],
    levels: initialLevels(),
    seatedOnly: false,
    painAreas: draft.painAreas.map((p) => ({ ...p, updatedAt: completedAt })),
    avoided: [],
    reminder: { ...draft.reminder, days: [...draft.reminder.days] },
    screening: null,
  };
  return applyScreening(profile, draft.screeningAnswers, completedAt);
}
