// A workout session as a pure state machine. Time always comes in as `now` (ms since epoch),
// and timers store when they end (`endsAt`) instead of counting down second by second. If the
// screen sleeps or the app goes to the background (a WhatsApp message comes in), `tick` catches
// up on everything that ended in the meantime and lands on the right step.

import { REST_SECONDS } from './rules';
import type {
  Exercise,
  Feeling,
  GeneratedWorkout,
  ItemRating,
  PainReport,
  PlannedItem,
  WorkoutLog,
} from './types';

export const GENTLE_REST_SECONDS = 45; // after a level 1 exercise, or for seated-only users
export const SWITCH_SIDE_SECONDS = 5; // time to change sides in a timed perSide set

export interface SessionItem extends PlannedItem {
  level: Exercise['level'];
  setsDone: number;
  swappedFrom?: string; // the planned exercise, if it was replaced
  painReported?: PainReport;
  rating?: ItemRating;
}

export type Timer =
  | { status: 'idle' }
  | { status: 'running'; endsAt: number }
  | { status: 'paused'; remainingMs: number };

export type SessionPhase =
  | { kind: 'exercise'; timer: Timer } // the timer is only used by timed exercises
  | { kind: 'rest'; endsAt: number }
  | { kind: 'finished' };

export interface Session {
  date: string; // the workout day, 'YYYY-MM-DD'
  startedAt: number;
  endedAt: number | null;
  items: SessionItem[];
  index: number; // current item
  set: number; // current set, 1-based
  side: 1 | 2; // current side of a timed perSide set
  seatedOnly: boolean;
  phase: SessionPhase;
}

const IDLE: Timer = { status: 'idle' };

export function startSession(
  workout: GeneratedWorkout,
  library: Exercise[],
  seatedOnly: boolean,
  now: number,
): Session {
  const levels = new Map(library.map((e) => [e.id, e.level]));
  const items = workout.items.map((item) => ({
    ...item,
    level: levels.get(item.exerciseId) ?? 1,
    setsDone: 0,
  }));
  return {
    date: workout.date,
    startedAt: now,
    endedAt: items.length === 0 ? now : null,
    items,
    index: 0,
    set: 1,
    side: 1,
    seatedOnly,
    phase: items.length === 0 ? { kind: 'finished' } : { kind: 'exercise', timer: IDLE },
  };
}

export function currentItem(session: Session): SessionItem | undefined {
  return session.items[session.index];
}

export function restSeconds(item: Pick<SessionItem, 'level'>, seatedOnly: boolean): number {
  return item.level === 1 || seatedOnly ? GENTLE_REST_SECONDS : REST_SECONDS;
}

// Total length of the current timed set from where the timer starts: one side, or for side 2
// of a perSide set, the side switch plus the second side.
function setDurationMs(item: SessionItem, side: 1 | 2): number {
  if (item.dosage.kind !== 'time') return 0;
  const switchSec = side === 2 ? SWITCH_SIDE_SECONDS : 0;
  return (switchSec + item.dosage.seconds) * 1000;
}

export function startTimer(session: Session, now: number): Session {
  const item = currentItem(session);
  const { phase } = session;
  if (!item || item.dosage.kind !== 'time' || phase.kind !== 'exercise') return session;
  if (phase.timer.status === 'running') return session;
  const remaining =
    phase.timer.status === 'paused' ? phase.timer.remainingMs : setDurationMs(item, session.side);
  return {
    ...session,
    phase: { kind: 'exercise', timer: { status: 'running', endsAt: now + remaining } },
  };
}

export function pauseTimer(session: Session, now: number): Session {
  const { phase } = session;
  if (phase.kind !== 'exercise' || phase.timer.status !== 'running') return session;
  const remainingMs = Math.max(0, phase.timer.endsAt - now);
  return { ...session, phase: { kind: 'exercise', timer: { status: 'paused', remainingMs } } };
}

// The current set is done: rest before the next one, or finish after the very last set.
export function completeSet(session: Session, now: number): Session {
  const item = currentItem(session);
  if (!item || session.phase.kind !== 'exercise') return session;
  const items = session.items.map((it, i) =>
    i === session.index ? { ...it, setsDone: it.setsDone + 1 } : it,
  );
  const isLast = session.index === items.length - 1 && session.set >= item.dosage.sets;
  if (isLast) return { ...session, items, endedAt: now, phase: { kind: 'finished' } };
  const endsAt = now + restSeconds(item, session.seatedOnly) * 1000;
  return { ...session, items, phase: { kind: 'rest', endsAt } };
}

// What comes after the current rest: the next set of the same exercise, or the next exercise.
export function nextStep(session: Session): { index: number; set: number } {
  const item = currentItem(session);
  if (item && session.set < item.dosage.sets) return { index: session.index, set: session.set + 1 };
  return { index: session.index + 1, set: 1 };
}

// "It hurts": the report stays with the current item, whatever happens next.
export function markPain(session: Session, report: PainReport): Session {
  if (!currentItem(session)) return session;
  const items = session.items.map((it, i) =>
    i === session.index ? { ...it, painReported: { ...report } } : it,
  );
  return { ...session, items };
}

// "How was it?" for any item; the last answer wins ("Too easy" first, then "Hard" means hard).
export function rateItem(session: Session, index: number, rating: ItemRating): Session {
  if (!session.items[index]) return session;
  const items = session.items.map((it, i) => (i === index ? { ...it, rating } : it));
  return { ...session, items };
}

// The rest that follows the last set of a finished main exercise asks "How was it?" about it.
export function ratingAsked(session: Session): boolean {
  const item = currentItem(session);
  return (
    session.phase.kind === 'rest' &&
    !!item &&
    item.section === 'main' &&
    item.setsDone >= item.dosage.sets
  );
}

// Puts another exercise in place of the current one. The sets already done and the planned number
// of sets are kept, so the session goes on where it was; reps or seconds come from the new exercise.
export function replaceCurrent(session: Session, exercise: Exercise): Session {
  const item = currentItem(session);
  if (!item || session.phase.kind !== 'exercise' || item.exerciseId === exercise.id) return session;
  const next: SessionItem = {
    ...item,
    exerciseId: exercise.id,
    level: exercise.level,
    perSide: exercise.perSide,
    dosage: { ...exercise.dosage, sets: item.dosage.sets },
    swappedFrom: item.swappedFrom ?? item.exerciseId,
  };
  const items = session.items.map((it, i) => (i === session.index ? next : it));
  return { ...session, items, side: 1, phase: { kind: 'exercise', timer: IDLE } };
}

// Leaves the current exercise without finishing it: rest, then the next exercise. After the last
// exercise the session ends.
export function skipToRest(session: Session, now: number): Session {
  const item = currentItem(session);
  if (!item || session.phase.kind !== 'exercise') return session;
  if (session.index === session.items.length - 1) {
    return { ...session, endedAt: now, phase: { kind: 'finished' } };
  }
  const endsAt = now + restSeconds(item, session.seatedOnly) * 1000;
  return { ...session, set: item.dosage.sets, phase: { kind: 'rest', endsAt } };
}

export function skipRest(session: Session): Session {
  if (session.phase.kind !== 'rest') return session;
  const { index, set } = nextStep(session);
  return { ...session, index, set, side: 1, phase: { kind: 'exercise', timer: IDLE } };
}

// Applies every timer that has ended by `now`, in order. Returns the same object when nothing
// changed, so a store can skip needless updates.
export function tick(session: Session, now: number): Session {
  let s = session;
  for (;;) {
    const { phase } = s;
    const item = currentItem(s);
    if (phase.kind === 'exercise' && phase.timer.status === 'running' && item) {
      const { endsAt } = phase.timer;
      if (now < endsAt) return s;
      if (item.perSide && s.side === 1) {
        // Side 1 is done: change sides, then the timer goes on for side 2 by itself.
        const timer: Timer = { status: 'running', endsAt: endsAt + setDurationMs(item, 2) };
        s = { ...s, side: 2, phase: { kind: 'exercise', timer } };
      } else {
        s = completeSet(s, endsAt);
      }
      continue;
    }
    if (phase.kind === 'rest' && now >= phase.endsAt) {
      s = skipRest(s);
      continue;
    }
    return s;
  }
}

// What the big timer shows. During the side switch, `switching` is true and `remainingMs` is the
// time left to change sides.
export function timerView(
  session: Session,
  now: number,
): { remainingMs: number; running: boolean; switching: boolean } {
  const item = currentItem(session);
  const { phase } = session;
  if (!item || item.dosage.kind !== 'time' || phase.kind !== 'exercise') {
    return { remainingMs: 0, running: false, switching: false };
  }
  const { timer } = phase;
  const total =
    timer.status === 'running'
      ? Math.max(0, timer.endsAt - now)
      : timer.status === 'paused'
        ? timer.remainingMs
        : setDurationMs(item, session.side);
  const sideMs = item.dosage.seconds * 1000;
  const switching = session.side === 2 && total > sideMs;
  return {
    remainingMs: switching ? total - sideMs : total,
    running: timer.status === 'running',
    switching,
  };
}

export function restRemainingMs(session: Session, now: number): number {
  return session.phase.kind === 'rest' ? Math.max(0, session.phase.endsAt - now) : 0;
}

// Whole seconds for display: 29.2 s left shows 30, and 0 only at the very end.
export function displaySeconds(ms: number): number {
  return Math.ceil(ms / 1000);
}

export function completedSets(session: Session): number {
  return session.items.reduce((sum, item) => sum + item.setsDone, 0);
}

export function completedExercises(session: Session): number {
  return session.items.filter((item) => item.setsDone >= item.dosage.sets).length;
}

// The user leaves early: the session ends where it is.
export function endSession(session: Session, now: number): Session {
  if (session.phase.kind === 'finished') return session;
  return { ...session, endedAt: now, phase: { kind: 'finished' } };
}

// An item counts as completed only when all its sets were done.
export function buildLog(session: Session, id: string, now: number, feeling?: Feeling): WorkoutLog {
  const end = session.endedAt ?? now;
  return {
    id,
    date: session.date,
    durationSec: Math.max(0, Math.round((end - session.startedAt) / 1000)),
    items: session.items.map((item) => ({
      exerciseId: item.exerciseId,
      completed: item.setsDone >= item.dosage.sets,
      ...(item.swappedFrom ? { swappedFrom: item.swappedFrom } : {}),
      ...(item.painReported ? { painReported: item.painReported } : {}),
      ...(item.rating ? { rating: item.rating } : {}),
    })),
    ...(feeling ? { feeling } : {}),
  };
}
