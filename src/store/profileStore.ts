// The user profile, saved on the device only (CLAUDE.md rule 5).

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { UserProfile } from '@/engine/types';

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
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ profile: state.profile }),
      onRehydrateStorage: () => () => useProfileStore.setState({ hydrated: true }),
    },
  ),
);
