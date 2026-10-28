// Workout history, saved on the device only (CLAUDE.md rule 5).

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Feeling, WorkoutLog } from '@/engine/types';

interface HistoryState {
  logs: WorkoutLog[]; // oldest first
  hydrated: boolean; // true once the saved history has been loaded
  addLog: (log: WorkoutLog) => void;
  setFeeling: (id: string, feeling: Feeling) => void;
  clear: () => void;
}

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set) => ({
      logs: [],
      hydrated: false,
      addLog: (log) =>
        set((state) => ({ logs: [...state.logs.filter((l) => l.id !== log.id), log] })),
      setFeeling: (id, feeling) =>
        set((state) => ({
          logs: state.logs.map((l) => (l.id === id ? { ...l, feeling } : l)),
        })),
      clear: () => set({ logs: [] }),
    }),
    {
      name: 'sigo-history',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ logs: state.logs }),
      onRehydrateStorage: () => () => useHistoryStore.setState({ hydrated: true }),
    },
  ),
);
