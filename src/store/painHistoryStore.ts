// Pain intensity of each area over time, for the Progress tab. Saved on the device only
// (CLAUDE.md rule 5). The profile store adds an entry whenever a pain area changes.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { PainHistoryEntry } from '@/engine/types';

interface PainHistoryState {
  entries: PainHistoryEntry[]; // oldest first
  add: (entries: PainHistoryEntry[]) => void;
  clear: () => void;
}

export const usePainHistoryStore = create<PainHistoryState>()(
  persist(
    (set) => ({
      entries: [],
      add: (entries) =>
        set((state) => (entries.length ? { entries: [...state.entries, ...entries] } : state)),
      clear: () => set({ entries: [] }),
    }),
    {
      name: 'sigo-pain-history',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ entries: state.entries }),
    },
  ),
);
