// The workout in progress. Kept in memory only; the result is saved to the history as soon as
// the session ends, finished or not.

import { create } from 'zustand';

import { exercises } from '@/data/exercises';
import * as session from '@/engine/session';
import type { Feeling, GeneratedWorkout } from '@/engine/types';

import { useHistoryStore } from './historyStore';

interface SessionState {
  session: session.Session | null;
  logId: string | null; // set once the log is saved
  updatedAt: number; // when the session last changed, so screens never show a stale clock
  start: (workout: GeneratedWorkout, seatedOnly: boolean) => void;
  startTimer: () => void;
  pauseTimer: () => void;
  completeSet: () => void;
  skipRest: () => void;
  tick: () => void; // applies timers that ended, e.g. after coming back from the background
  end: () => void; // the user leaves early
  setFeeling: (feeling: Feeling) => void;
  clear: () => void;
}

export const useSessionStore = create<SessionState>()((set, get) => {
  // Every change goes through here, so the log is saved the moment the session finishes.
  const apply = (fn: (s: session.Session, now: number) => session.Session) => {
    const { session: current, logId } = get();
    if (!current) return;
    const now = Date.now();
    const next = fn(current, now);
    if (next === current) return;
    if (next.phase.kind === 'finished' && !logId) {
      const id = `${next.date}-${next.startedAt}`;
      useHistoryStore.getState().addLog(session.buildLog(next, id, now));
      set({ session: next, logId: id, updatedAt: now });
      return;
    }
    set({ session: next, updatedAt: now });
  };

  return {
    session: null,
    logId: null,
    updatedAt: 0,
    start: (workout, seatedOnly) => {
      const now = Date.now();
      set({
        session: session.startSession(workout, exercises, seatedOnly, now),
        logId: null,
        updatedAt: now,
      });
    },
    startTimer: () => apply(session.startTimer),
    pauseTimer: () => apply(session.pauseTimer),
    completeSet: () => apply(session.completeSet),
    skipRest: () => apply((s) => session.skipRest(s)),
    tick: () => apply(session.tick),
    end: () => apply(session.endSession),
    setFeeling: (feeling) => {
      const { logId } = get();
      if (logId) useHistoryStore.getState().setFeeling(logId, feeling);
    },
    clear: () => set({ session: null, logId: null }),
  };
});
