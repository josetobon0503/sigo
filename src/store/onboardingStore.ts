// First-run draft. Lives in memory only: nothing is saved until the last step.

import { create } from 'zustand';

import type { ProfileDraft } from '@/engine/profile';
import type { ActivityLevel, AgeBand, Equipment, Lang, UserProfile } from '@/engine/types';
import { getDeviceLanguage } from '@/i18n';

import type { PainSelection } from './painSelection';

export interface OnboardingDraft {
  name: string;
  language: Lang;
  ageBand: AgeBand | null;
  activity: ActivityLevel | null;
  floorOk: boolean | null;
  equipment: Equipment[];
  painAreas: PainSelection[];
  reminder: UserProfile['reminder'];
  screeningAnswers: Record<string, boolean>;
}

// Almost everyone has a chair and a towel, so they start checked.
export const DEFAULT_EQUIPMENT: Equipment[] = ['chair', 'towel'];

export function initialDraft(): OnboardingDraft {
  return {
    name: '',
    language: getDeviceLanguage(),
    ageBand: null,
    activity: null,
    floorOk: null,
    equipment: [...DEFAULT_EQUIPMENT],
    painAreas: [],
    reminder: { enabled: true, hour: 9, minute: 0, days: [1, 2, 3, 4, 5] },
    screeningAnswers: {},
  };
}

// The draft is ready for createProfile once the age band, the activity level, the floor answer
// and every pain intensity are set.
export function toProfileDraft(draft: OnboardingDraft): ProfileDraft | null {
  if (!draft.ageBand || !draft.activity || draft.floorOk === null) return null;
  const painAreas = [];
  for (const p of draft.painAreas) {
    if (p.intensity === null) return null;
    painAreas.push({ ...p, intensity: p.intensity });
  }
  return {
    ...draft,
    ageBand: draft.ageBand,
    activity: draft.activity,
    floorOk: draft.floorOk,
    painAreas,
  };
}

interface OnboardingState {
  draft: OnboardingDraft;
  update: (patch: Partial<OnboardingDraft>) => void;
  reset: () => void;
}

export const useOnboardingStore = create<OnboardingState>()((set) => ({
  draft: initialDraft(),
  update: (patch) => set((state) => ({ draft: { ...state.draft, ...patch } })),
  reset: () => set({ draft: initialDraft() }),
}));
