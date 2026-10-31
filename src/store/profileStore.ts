// The user profile, saved on the device only (CLAUDE.md rule 5).

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { UserProfile } from '@/engine/types';

type Persisted = { profile: UserProfile | null };

// Version 2 added the activity level: older profiles keep their levels and have no answer yet.
// Version 3 split "regular" into "daily" (same level 3) and "strength", and added floorOk (off).
// Version 4 added exercises lying down: the bed is checked, as it is in onboarding.
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
  return { profile };
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
    (set) => ({
      profile: null,
      hydrated: false,
      completeOnboarding: (profile) => set({ profile }),
      updateProfile: (patch) =>
        set((state) => (state.profile ? { profile: { ...state.profile, ...patch } } : state)),
      resetOnboarding: () => set({ profile: null }),
    }),
    {
      name: 'sigo-profile',
      version: 4,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ profile: state.profile }),
      migrate: (persisted, version) => migrateProfile(persisted, version),
      onRehydrateStorage: () => () => useProfileStore.setState({ hydrated: true }),
    },
  ),
);
