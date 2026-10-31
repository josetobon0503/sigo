import { fakeExercise } from '../__fixtures__/profiles';
import {
  buildLog,
  completeSet,
  completedExercises,
  completedSets,
  displaySeconds,
  endSession,
  GENTLE_REST_SECONDS,
  markPain,
  nextStep,
  rateItem,
  ratingAsked,
  pauseTimer,
  restRemainingMs,
  replaceCurrent,
  restSeconds,
  skipRest,
  skipToRest,
  startSession,
  startTimer,
  SWITCH_SIDE_SECONDS,
  tick,
  timerView,
  type Session,
} from '../session';
import type { Dosage, Exercise, GeneratedWorkout } from '../types';

const T0 = 1_000_000;
const sec = (s: number) => s * 1000;

const reps: Dosage = { kind: 'reps', sets: 2, reps: 10 };
const timed: Dosage = { kind: 'time', sets: 2, seconds: 20 };

const library: Exercise[] = [
  fakeExercise({ id: 'reps-a', level: 3, dosage: reps }),
  fakeExercise({ id: 'timed-b', level: 2, dosage: timed }),
  fakeExercise({ id: 'gentle-c', level: 1, dosage: { kind: 'reps', sets: 1, reps: 8 } }),
  fakeExercise({
    id: 'side-d',
    level: 3,
    perSide: true,
    dosage: { kind: 'time', sets: 1, seconds: 15 },
  }),
];

function workout(ids: string[]): GeneratedWorkout {
  return {
    date: '2026-10-28',
    items: ids.map((id) => {
      const e = library.find((x) => x.id === id)!;
      return { exerciseId: id, section: 'main', dosage: e.dosage, perSide: e.perSide };
    }),
    skippedPatterns: [],
    estimatedSec: 0,
  };
}

const start = (ids: string[], seatedOnly = false) =>
  startSession(workout(ids), library, seatedOnly, T0);

describe('rest length', () => {
  it('is 30 s normally and 45 s after a level 1 exercise or for seated-only users', () => {
    expect(restSeconds({ level: 3 }, false)).toBe(30);
    expect(restSeconds({ level: 1 }, false)).toBe(GENTLE_REST_SECONDS);
    expect(restSeconds({ level: 3 }, true)).toBe(GENTLE_REST_SECONDS);
  });
});

describe('reps exercises', () => {
  it('rests between sets, then moves to the next exercise', () => {
    let s = start(['reps-a', 'gentle-c']);
    expect(s.phase).toEqual({ kind: 'exercise', timer: { status: 'idle' } });

    s = completeSet(s, T0 + sec(40));
    expect(s.phase).toEqual({ kind: 'rest', endsAt: T0 + sec(70) });
    expect(nextStep(s)).toEqual({ index: 0, set: 2 });

    s = skipRest(s);
    expect([s.index, s.set]).toEqual([0, 2]);

    s = completeSet(s, T0 + sec(100));
    expect(nextStep(s)).toEqual({ index: 1, set: 1 });
    s = tick(s, T0 + sec(130));
    expect([s.index, s.set, s.phase.kind]).toEqual([1, 1, 'exercise']);
  });

  it('rests 45 s after a level 1 exercise', () => {
    let s = start(['gentle-c', 'reps-a']);
    s = completeSet(s, T0);
    expect(restRemainingMs(s, T0)).toBe(sec(45));
  });

  it('rests 45 s for seated-only users', () => {
    let s = start(['reps-a'], true);
    s = completeSet(s, T0);
    expect(restRemainingMs(s, T0)).toBe(sec(45));
  });

  it('goes straight to finished after the very last set, with no rest', () => {
    let s = start(['gentle-c']);
    s = completeSet(s, T0 + sec(30));
    expect(s.phase.kind).toBe('finished');
    expect(s.endedAt).toBe(T0 + sec(30));
  });

  it('does nothing when a set is completed outside the exercise phase', () => {
    let s = start(['reps-a']);
    s = completeSet(s, T0);
    expect(completeSet(s, T0 + 1)).toBe(s);
  });
});

describe('timed exercises', () => {
  it('counts down from endsAt, pauses and resumes exactly', () => {
    let s = start(['timed-b']);
    expect(timerView(s, T0).remainingMs).toBe(sec(20));

    s = startTimer(s, T0);
    expect(timerView(s, T0 + 7_300)).toMatchObject({ remainingMs: 12_700, running: true });
    expect(displaySeconds(12_700)).toBe(13);

    s = pauseTimer(s, T0 + sec(8));
    // Paused time does not count, however long the pause.
    expect(timerView(s, T0 + sec(500))).toMatchObject({ remainingMs: sec(12), running: false });

    s = startTimer(s, T0 + sec(600));
    s = tick(s, T0 + sec(611));
    expect(s.phase.kind).toBe('exercise');
    s = tick(s, T0 + sec(612));
    expect(s.phase).toEqual({ kind: 'rest', endsAt: T0 + sec(642) });
    expect(s.items[0].setsDone).toBe(1);
  });

  it('starting a running timer again changes nothing', () => {
    const s = startTimer(start(['timed-b']), T0);
    expect(startTimer(s, T0 + sec(5))).toBe(s);
  });

  it('does not start a timer for a reps exercise', () => {
    const s = start(['reps-a']);
    expect(startTimer(s, T0)).toBe(s);
  });

  it('runs side 2 after a short switch, by itself', () => {
    let s = start(['side-d', 'reps-a']);
    s = startTimer(s, T0);
    s = tick(s, T0 + sec(15));
    expect(s.side).toBe(2);
    expect(s.items[0].setsDone).toBe(0);
    expect(timerView(s, T0 + sec(16))).toMatchObject({ switching: true, remainingMs: sec(4) });
    expect(timerView(s, T0 + sec(20))).toMatchObject({ switching: false, remainingMs: sec(15) });

    s = tick(s, T0 + sec(15 + SWITCH_SIDE_SECONDS + 15));
    expect(s.phase.kind).toBe('rest');
    expect(s.items[0].setsDone).toBe(1);
  });
});

describe('catching up after the background', () => {
  it('lands on the right step when the app comes back much later', () => {
    let s = start(['timed-b', 'reps-a']);
    s = startTimer(s, T0);
    // Set 1 ends at 20 s, rest to 50 s; set 2 waits for "Start", so the app stops there.
    s = tick(s, T0 + sec(300));
    expect([s.index, s.set, s.phase.kind]).toEqual([0, 2, 'exercise']);
    expect(s.items[0].setsDone).toBe(1);
  });

  it('a rest that ended in the background opens the next exercise', () => {
    let s = start(['reps-a', 'timed-b']);
    s = completeSet(s, T0);
    s = completeSet(skipRest(s), T0 + sec(40));
    s = tick(s, T0 + sec(1000));
    expect([s.index, s.set]).toEqual([1, 1]);
    expect(s.phase).toEqual({ kind: 'exercise', timer: { status: 'idle' } });
  });

  it('a timed last set that ended in the background finishes at its real end time', () => {
    let s = start(['side-d']);
    s = startTimer(s, T0);
    s = tick(s, T0 + sec(3600));
    expect(s.phase.kind).toBe('finished');
    expect(s.endedAt).toBe(T0 + sec(15 + SWITCH_SIDE_SECONDS + 15));
  });

  it('returns the same object when nothing has ended', () => {
    const s = startTimer(start(['timed-b']), T0);
    expect(tick(s, T0 + sec(5))).toBe(s);
  });
});

describe('ending and the log', () => {
  function finished(): Session {
    let s = start(['reps-a', 'gentle-c']);
    s = completeSet(s, T0 + sec(40));
    s = completeSet(skipRest(s), T0 + sec(100));
    s = completeSet(skipRest(s), T0 + sec(150));
    return s;
  }

  it('logs every item as completed after a full workout', () => {
    const s = finished();
    expect(completedSets(s)).toBe(3);
    expect(completedExercises(s)).toBe(2);
    expect(buildLog(s, 'log-1', T0 + sec(999), 'good')).toEqual({
      id: 'log-1',
      date: '2026-10-28',
      durationSec: 150,
      items: [
        { exerciseId: 'reps-a', completed: true },
        { exerciseId: 'gentle-c', completed: true },
      ],
      feeling: 'good',
    });
  });

  it('marks unfinished items as not completed when the user leaves early', () => {
    let s = start(['reps-a', 'gentle-c']);
    s = completeSet(s, T0 + sec(40)); // only 1 of 2 sets
    s = endSession(s, T0 + sec(60));
    expect(s.phase.kind).toBe('finished');
    const log = buildLog(s, 'log-2', T0 + sec(500));
    expect(log.durationSec).toBe(60);
    expect(log.items).toEqual([
      { exerciseId: 'reps-a', completed: false },
      { exerciseId: 'gentle-c', completed: false },
    ]);
    expect(log).not.toHaveProperty('feeling');
  });

  it('an empty workout is finished from the start', () => {
    const s = start([]);
    expect(s.phase.kind).toBe('finished');
    expect(buildLog(s, 'x', T0).items).toEqual([]);
  });
});

describe('"It hurts" changes', () => {
  const knee = { area: 'knee' as const, intensity: 3, kind: 'achy' as const };

  it('markPain keeps the report on the current item', () => {
    const s = markPain(start(['reps-a', 'timed-b']), knee);
    expect(s.items[0].painReported).toEqual(knee);
    expect(s.items[1].painReported).toBeUndefined();
  });

  it('replaceCurrent keeps the sets done and the planned number of sets', () => {
    let s = start(['reps-a', 'timed-b']);
    s = skipRest(completeSet(s, T0)); // set 1 of reps-a done, now on set 2
    s = replaceCurrent(s, library[2]); // gentle-c: 1 set of 8 reps in the library
    const item = s.items[0];
    expect(item.exerciseId).toBe('gentle-c');
    expect(item.swappedFrom).toBe('reps-a');
    expect(item.level).toBe(1);
    expect(item.setsDone).toBe(1);
    expect(item.dosage).toEqual({ kind: 'reps', sets: 2, reps: 8 });
    expect(s.set).toBe(2);
    expect(s.phase).toEqual({ kind: 'exercise', timer: { status: 'idle' } });
  });

  it('replaceCurrent resets a running timer and the side', () => {
    let s = start(['side-d', 'reps-a']);
    s = tick(startTimer(s, T0), T0 + sec(16));
    expect(s.side).toBe(2);
    s = replaceCurrent(s, library[1]);
    expect(s.side).toBe(1);
    expect(s.phase).toEqual({ kind: 'exercise', timer: { status: 'idle' } });
    expect(s.items[0]).toMatchObject({ perSide: false, dosage: { kind: 'time', seconds: 20 } });
  });

  it('a second swap still remembers the planned exercise', () => {
    let s = replaceCurrent(start(['reps-a']), library[1]);
    s = replaceCurrent(s, library[2]);
    expect(s.items[0]).toMatchObject({ exerciseId: 'gentle-c', swappedFrom: 'reps-a' });
  });

  it('skipToRest rests, then opens the next exercise', () => {
    let s = skipToRest(start(['reps-a', 'timed-b']), T0);
    expect(s.phase).toEqual({ kind: 'rest', endsAt: T0 + sec(30) });
    expect(nextStep(s)).toEqual({ index: 1, set: 1 });
    s = tick(s, T0 + sec(30));
    expect(s.index).toBe(1);
    expect(s.items[0].setsDone).toBe(0);
  });

  it('skipToRest on the last exercise ends the session', () => {
    const s = skipToRest(start(['reps-a']), T0 + sec(5));
    expect(s.phase).toEqual({ kind: 'finished' });
    expect(s.endedAt).toBe(T0 + sec(5));
  });

  it('the log keeps swappedFrom and painReported', () => {
    let s = markPain(start(['reps-a', 'timed-b']), knee);
    s = replaceCurrent(s, library[2]);
    s = endSession(s, T0 + sec(60));
    expect(buildLog(s, 'log', T0 + sec(60)).items).toEqual([
      { exerciseId: 'gentle-c', completed: false, swappedFrom: 'reps-a', painReported: knee },
      { exerciseId: 'timed-b', completed: false },
    ]);
  });
});

describe('"How was it?"', () => {
  it('rateItem saves the rating, the last answer wins, and the log keeps it', () => {
    let s = start(['reps-a', 'timed-b']);
    s = rateItem(s, 0, 'easy');
    s = rateItem(s, 0, 'hard');
    expect(s.items[0].rating).toBe('hard');
    expect(buildLog(endSession(s, T0), 'log', T0).items[0]).toMatchObject({ rating: 'hard' });
    expect(rateItem(s, 9, 'good')).toBe(s);
  });

  it('is asked in the rest after the last set of a main exercise only', () => {
    let s = start(['reps-a', 'timed-b']);
    s = completeSet(s, T0); // set 1 of 2: rest, not asked yet
    expect(ratingAsked(s)).toBe(false);
    s = completeSet(skipRest(s), T0); // last set
    expect(ratingAsked(s)).toBe(true);
  });

  it('is not asked after skipping an exercise', () => {
    expect(ratingAsked(skipToRest(start(['reps-a', 'timed-b']), T0))).toBe(false);
  });

  it('is not asked for the warm-up', () => {
    const plan = workout(['gentle-c', 'reps-a']);
    const items = plan.items.map(
      (i, n) => ({ ...i, section: n === 0 ? 'warmup' : 'main' }) as const,
    );
    const s = startSession({ ...plan, items }, library, false, T0);
    expect(ratingAsked(completeSet(s, T0))).toBe(false);
  });
});
