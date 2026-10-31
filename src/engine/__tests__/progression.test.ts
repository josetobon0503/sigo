import { fakeExercise, levelsAt, makeProfile } from '../__fixtures__/profiles';
import { updateLevels } from '../progression';
import type { Feeling, Level, WorkoutItem, WorkoutLog } from '../types';

const library = [
  fakeExercise({ id: 'squat-a', pattern: 'squat' }),
  fakeExercise({ id: 'squat-b', pattern: 'squat' }),
  fakeExercise({ id: 'push-a', pattern: 'upper_push' }),
];

const done = (exerciseId: string): WorkoutItem => ({ exerciseId, completed: true });
const hurt = (exerciseId: string): WorkoutItem => ({
  exerciseId,
  completed: false,
  painReported: { area: 'knee', intensity: 3, kind: 'achy' },
});

function log(id: string, date: string, items: WorkoutItem[], feeling?: Feeling): WorkoutLog {
  return { id, date, durationSec: 1200, items, feeling };
}

const profileAt = (level: Level) => makeProfile({ levels: levelsAt(level) });

describe('updateLevels', () => {
  it('pain on a pattern lowers it by 1', () => {
    const today = log('t', '2026-10-28', [hurt('squat-a'), done('push-a')], 'good');
    const levels = updateLevels(profileAt(3), today, [], library);
    expect(levels.squat).toBe(2);
  });

  it('never goes below 1', () => {
    const today = log('t', '2026-10-28', [hurt('squat-a')], 'sore');
    expect(updateLevels(profileAt(1), today, [], library).squat).toBe(1);
  });

  it('pain counts for the exercise that was swapped away', () => {
    const today = log('t', '2026-10-28', [
      {
        exerciseId: 'push-a',
        completed: true,
        swappedFrom: 'squat-a',
        painReported: hurt('squat-a').painReported,
      },
    ]);
    const levels = updateLevels(profileAt(3), today, [], library);
    expect(levels.squat).toBe(2);
  });

  it('sore in the last 2 workouts with the pattern lowers it by 1', () => {
    const before = log('b', '2026-10-26', [done('squat-a')], 'sore');
    const today = log('t', '2026-10-28', [done('squat-b')], 'sore');
    expect(updateLevels(profileAt(3), today, [before], library).squat).toBe(2);
  });

  it('only one sore workout does not lower the level', () => {
    const before = log('b', '2026-10-26', [done('squat-a')], 'good');
    const today = log('t', '2026-10-28', [done('squat-a')], 'sore');
    expect(updateLevels(profileAt(3), today, [before], library).squat).toBe(3);
  });

  it('only counts workouts that included the pattern', () => {
    const sorePush = log('p', '2026-10-27', [done('push-a')], 'sore');
    const goodSquat = log('b', '2026-10-26', [done('squat-a')], 'good');
    const today = log('t', '2026-10-28', [done('squat-a')], 'sore');
    expect(updateLevels(profileAt(3), today, [goodSquat, sorePush], library).squat).toBe(3);
  });

  it('great or good with no pain in the last 2 workouts raises it by 1', () => {
    const before = log('b', '2026-10-26', [done('squat-a')], 'ok');
    const today = log('t', '2026-10-28', [done('squat-a')], 'great');
    expect(updateLevels(profileAt(3), today, [before], library).squat).toBe(4);
    const good = { ...today, feeling: 'good' as const };
    expect(updateLevels(profileAt(3), good, [before], library).squat).toBe(4);
  });

  it('never goes above 5', () => {
    const before = log('b', '2026-10-26', [done('squat-a')], 'great');
    const today = log('t', '2026-10-28', [done('squat-a')], 'great');
    expect(updateLevels(profileAt(5), today, [before], library).squat).toBe(5);
  });

  it('does not go up after pain on that pattern in the previous workout', () => {
    const before = log('b', '2026-10-26', [hurt('squat-a')], 'ok');
    const today = log('t', '2026-10-28', [done('squat-a')], 'great');
    expect(updateLevels(profileAt(3), today, [before], library).squat).toBe(3);
  });

  it('does not go up after only one workout with that pattern', () => {
    const today = log('t', '2026-10-28', [done('squat-a')], 'great');
    expect(updateLevels(profileAt(3), today, [], library).squat).toBe(3);
  });

  it.each<Feeling | undefined>(['ok', 'tired', undefined])(
    'stays the same when feeling is %s',
    (feeling) => {
      const before = log('b', '2026-10-26', [done('squat-a')], 'great');
      const today = log('t', '2026-10-28', [done('squat-a')], feeling);
      expect(updateLevels(profileAt(3), today, [before], library).squat).toBe(3);
    },
  );

  it('leaves patterns that were not trained unchanged', () => {
    const before = log('b', '2026-10-26', [done('squat-a')], 'sore');
    const today = log('t', '2026-10-28', [hurt('squat-a')], 'sore');
    const levels = updateLevels(profileAt(3), today, [before], library);
    expect({ ...levels, squat: 3 }).toEqual(levelsAt(3));
  });

  it('never moves more than 1 level, even with pain and soreness together', () => {
    const before = log('b', '2026-10-26', [done('squat-a')], 'sore');
    const today = log('t', '2026-10-28', [hurt('squat-a')], 'sore');
    expect(updateLevels(profileAt(3), today, [before], library).squat).toBe(2);
  });

  it('does not count the current log twice if it is already in history', () => {
    const today = log('t', '2026-10-28', [done('squat-a')], 'great');
    expect(updateLevels(profileAt(3), today, [today], library).squat).toBe(3);
  });
});

describe('updateLevels: "How was it?"', () => {
  const rated = (exerciseId: string, rating: WorkoutItem['rating']): WorkoutItem => ({
    exerciseId,
    completed: true,
    rating,
  });

  it('"Very easy" raises the pattern by 1 right away, without waiting for 2 workouts', () => {
    const today = log('t', '2026-10-28', [rated('squat-a', 'easy'), done('push-a')]);
    const levels = updateLevels(profileAt(2), today, [], library);
    expect(levels.squat).toBe(3);
    expect(levels.upper_push).toBe(2);
  });

  it('never more than 1 level, even with two "easy" items of the same pattern', () => {
    const today = log(
      't',
      '2026-10-28',
      [rated('squat-a', 'easy'), rated('squat-b', 'easy')],
      'great',
    );
    expect(updateLevels(profileAt(2), today, [], library).squat).toBe(3);
  });

  it('"Hard" holds the level, even after good workouts', () => {
    const before = log('b', '2026-10-26', [done('squat-a')], 'great');
    const today = log('t', '2026-10-28', [rated('squat-a', 'hard')], 'great');
    expect(updateLevels(profileAt(3), today, [before], library).squat).toBe(3);
  });

  it('"Hard" wins over "easy" on the same pattern', () => {
    const today = log('t', '2026-10-28', [rated('squat-a', 'easy'), rated('squat-b', 'hard')]);
    expect(updateLevels(profileAt(3), today, [], library).squat).toBe(3);
  });

  it('pain wins over "easy"', () => {
    const today = log('t', '2026-10-28', [rated('squat-a', 'easy'), hurt('squat-b')]);
    expect(updateLevels(profileAt(3), today, [], library).squat).toBe(2);
  });

  it('two "sore" workouts win over "easy"', () => {
    const before = log('b', '2026-10-26', [done('squat-a')], 'sore');
    const today = log('t', '2026-10-28', [rated('squat-a', 'easy')], 'sore');
    expect(updateLevels(profileAt(3), today, [before], library).squat).toBe(2);
  });

  it('"easy" never goes above 5', () => {
    const today = log('t', '2026-10-28', [rated('squat-a', 'easy')]);
    expect(updateLevels(profileAt(5), today, [], library).squat).toBe(5);
  });

  it('"Too easy" on an exercise that was swapped for a harder one raises the pattern', () => {
    const today = log('t', '2026-10-28', [
      { exerciseId: 'squat-b', swappedFrom: 'squat-a', completed: true, rating: 'easy' },
    ]);
    expect(updateLevels(profileAt(2), today, [], library).squat).toBe(3);
  });

  it('items the user never got to do not count', () => {
    const before = log('b', '2026-10-26', [done('squat-a')], 'great');
    const today = log('t', '2026-10-28', [{ exerciseId: 'squat-a', completed: false }], 'great');
    expect(updateLevels(profileAt(3), today, [before], library).squat).toBe(3);
  });
});
