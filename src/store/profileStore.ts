// The user profile, saved on the device only (CLAUDE.md rule 5).

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { DEFAULT_WEEKLY_GOAL, painChanges } from '@/engine/stats';
import type { PainArea, UserProfile } from '@/engine/types';

import { localDay, useDevStore } from './devStore';
import { usePainHistoryStore } from './painHistoryStore';

type Persisted = { profile: UserProfile | null };

// Version 2 added the activity level: older profiles keep their levels and have no answer yet.
// Version 3 split "regular" into "daily" (same level 3) and "strength", and added floorOk (off).
// Version 4 added exercises lying down: the bed is checked, as it is in onboarding.
// Version 5 added the weekly goal: 2 days, the same default as onboarding.
// Version 6 added the body figure of the muscle map: female, the same default as a new profile.
export function migrateProfile(persisted: unknown, version: number): Persisted {
  const state = (persisted ?? { profile: null }) as Persisted;
  if (!state.profile) return state;
  let profile = state.profile;
  if (version < 2) profile = { ...profile, activity: profile.activity ?? null };
  if (version < 3) {
    const activity = (profile.activity as string | null) === 'regular' ? 'daily' : profile.activity;
    profile = { ...profile, activity, floorOk: profile.floorOk ?? false };
  }
  if (version < 4 && !profile.equipment.includes('bed')) {
    profile = { ...profile, equipment: [...profile.equipment, 'bed'] };
  }
  if (version < 5) profile = { ...profile, weeklyGoal: profile.weeklyGoal ?? DEFAULT_WEEKLY_GOAL };
  if (version < 6) profile = { ...profile, bodyFigure: profile.bodyFigure ?? 'female' };
  return { profile };
}

// Every change to the pain areas (onboarding, Pain tab, "It hurts") goes into the pain history.
function recordPain(prev: PainArea[], next: PainArea[]) {
  const history = usePainHistoryStore.getState();
  const today = localDay(new Date(), useDevStore.getState().dayOffset);
  history.add(painChanges(prev, next, today, history.entries));
}

interface ProfileState {
  profile: UserProfile | null; // null until onboarding is complete
  hydrated: boolean; // true once the saved profile has been loaded
  completeOnboarding: (profile: UserProfile) => void;
  updateProfile: (patch: Partial<UserProfile>) => void;
  resetOnboarding: () => void;
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set, get) => ({
      profile: null,
      hydrated: false,
      completeOnboarding: (profile) => {
        recordPain([], profile.painAreas);
        set({ profile });
      },
      updateProfile: (patch) => {
        const current = get().profile;
        if (!current) return;
        if (patch.painAreas) recordPain(current.painAreas, patch.painAreas);
        set({ profile: { ...current, ...patch } });
      },
      resetOnboarding: () => set({ profile: null }),
    }),
    {
      name: 'sigo-profile',
      version: 6,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ profile: state.profile }),
      migrate: (persisted, version) => migrateProfile(persisted, version),
      onRehydrateStorage: () => () => useProfileStore.setState({ hydrated: true }),
    },
  ),
);
