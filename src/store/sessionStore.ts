// The workout in progress. Kept in memory only; the result is saved to the history as soon as
// the session ends, finished or not.

import { create } from 'zustand';

import { exercises } from '@/data/exercises';
import { avoidExercise, raisePainArea } from '@/engine/pain';
import { updateLevels } from '@/engine/progression';
import * as session from '@/engine/session';
import type { Exercise, Feeling, GeneratedWorkout, ItemRating, PainReport } from '@/engine/types';

import { useHistoryStore } from './historyStore';
import { useProfileStore } from './profileStore';

interface SessionState {
  session: session.Session | null;
  logId: string | null; // set once the log is saved
  progressed: boolean; // levels already updated from this session's log
  updatedAt: number; // when the session last changed, so screens never show a stale clock
  start: (workout: GeneratedWorkout, seatedOnly: boolean) => void;
  startTimer: () => void;
  pauseTimer: () => void;
  completeSet: () => void;
  skipRest: () => void;
  reportPain: (report: PainReport) => void; // "It hurts": saved on the item and in the profile
  swapTo: (exercise: Exercise) => void; // replaces the current exercise, keeping the progress
  skipToRest: () => void; // leaves the current exercise: rest, then the next one
  rate: (index: number, rating: ItemRating) => void; // "How was it?"
  tooEasy: () => void; // "Too easy" on the current exercise counts as rating it "easy"
  applyProgression: () => void; // updates the profile levels once, from the saved log
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
    progressed: false,
    updatedAt: 0,
    start: (workout, seatedOnly) => {
      const now = Date.now();
      set({
        session: session.startSession(workout, exercises, seatedOnly, now),
        logId: null,
        progressed: false,
        updatedAt: now,
      });
    },
    startTimer: () => apply(session.startTimer),
    pauseTimer: () => apply(session.pauseTimer),
    completeSet: () => apply(session.completeSet),
    skipRest: () => apply((s) => session.skipRest(s)),
    reportPain: (report) => {
      const current = get().session;
      const item = current && session.currentItem(current);
      if (!current || !item) return;
      apply((s) => session.markPain(s, report));
      // The exercise is left out for 14 days and the area goes up in the profile.
      const { profile, updateProfile } = useProfileStore.getState();
      if (!profile) return;
      updateProfile({
        avoided: avoidExercise(profile.avoided, item.exerciseId, current.date),
        painAreas: raisePainArea(profile.painAreas, report, current.date),
      });
    },
    swapTo: (exercise) => apply((s) => session.replaceCurrent(s, exercise)),
    skipToRest: () => apply(session.skipToRest),
    rate: (index, rating) => apply((s) => session.rateItem(s, index, rating)),
    tooEasy: () => apply((s) => session.rateItem(s, s.index, 'easy')),
    applyProgression: () => {
      const { logId, progressed } = get();
      const { profile, updateProfile } = useProfileStore.getState();
      const { logs } = useHistoryStore.getState();
      const log = logs.find((l) => l.id === logId);
      if (progressed || !log || !profile) return;
      updateProfile({ levels: updateLevels(profile, log, logs, exercises) });
      set({ progressed: true });
    },
    tick: () => apply(session.tick),
    end: () => apply(session.endSession),
    setFeeling: (feeling) => {
      const { logId } = get();
      if (logId) useHistoryStore.getState().setFeeling(logId, feeling);
    },
    clear: () => set({ session: null, logId: null, progressed: false }),
  };
});

const exerciseById = new Map(exercises.map((e) => [e.id, e]));

// The exercise on screen right now, if a session is running.
export function useCurrentExercise(): Exercise | undefined {
  return useSessionStore((s) => {
    const item = s.session && session.currentItem(s.session);
    return item ? exerciseById.get(item.exerciseId) : undefined;
  });
}
