import { exercises } from '../../data/exercises';
import { fakeExercise, makeProfile, pain } from '../__fixtures__/profiles';
import { findHarder } from '../harder';
import type { Exercise, HarderResult } from '../types';

const DATE = '2026-10-28';
const get = (id: string): Exercise => exercises.find((e) => e.id === id)!;
const pickedId = (result: HarderResult) => (result.type === 'harder' ? result.exercise.id : 'top');

const current = fakeExercise({ id: 'current', pattern: 'squat', level: 2 });
const squat = (id: string, level: Exercise['level'], extra: Partial<Exercise> = {}) =>
  fakeExercise({ id, pattern: 'squat', level, position: 'standing', ...extra });

describe('findHarder', () => {
  it('picks the closest higher level of the same pattern', () => {
    const library = [
      current,
      squat('level-4', 4),
      squat('level-3', 3),
      fakeExercise({ id: 'other-pattern', pattern: 'hinge', level: 3 }),
    ];
    expect(pickedId(findHarder(current, makeProfile(), library, [], DATE))).toBe('level-3');
  });

  it('skips a missing level', () => {
    const library = [current, squat('level-5', 5)];
    expect(pickedId(findHarder(current, makeProfile(), library, [], DATE))).toBe('level-5');
  });

  it('says "top" when nothing harder fits', () => {
    const library = [current, squat('same', 2)];
    expect(findHarder(current, makeProfile(), library, [], DATE)).toEqual({ type: 'top' });
  });

  it('never loads a blocked area', () => {
    const library = [current, squat('knee', 3, { loads: ['knee'] })];
    const profile = makeProfile({ painAreas: [pain('knee', 3)] });
    expect(findHarder(current, profile, library, [], DATE)).toEqual({ type: 'top' });
  });

  it('uses only equipment the user has', () => {
    const library = [current, squat('backpack', 3, { equipment: ['backpack'] })];
    const profile = makeProfile({ equipment: ['chair'] });
    expect(findHarder(current, profile, library, [], DATE)).toEqual({ type: 'top' });
  });

  it('skips an avoided exercise until its avoid period ends', () => {
    const library = [current, squat('harder', 3)];
    const avoided = makeProfile({ avoided: [{ exerciseId: 'harder', until: '2026-11-05' }] });
    const expired = makeProfile({ avoided: [{ exerciseId: 'harder', until: '2026-10-01' }] });
    expect(pickedId(findHarder(current, avoided, library, [], DATE))).toBe('top');
    expect(pickedId(findHarder(current, expired, library, [], DATE))).toBe('harder');
  });

  it('respects seatedOnly', () => {
    const seated = squat('seated', 1, { position: 'seated' });
    const library = [
      seated,
      squat('standing', 3),
      squat('seated-harder', 4, { position: 'seated' }),
    ];
    const profile = makeProfile({ seatedOnly: true });
    expect(pickedId(findHarder(seated, profile, library, [], DATE))).toBe('seated-harder');
  });

  it('offers the floor only with floorOk', () => {
    const library = [current, squat('floor', 3, { position: 'floor' })];
    expect(pickedId(findHarder(current, makeProfile({ floorOk: false }), library, [], DATE))).toBe(
      'top',
    );
    expect(pickedId(findHarder(current, makeProfile({ floorOk: true }), library, [], DATE))).toBe(
      'floor',
    );
  });

  it('keeps gentle balance held: no free-standing balance at level 2', () => {
    const balance = fakeExercise({ id: 'seated-balance', pattern: 'balance', level: 1 });
    const library = [
      balance,
      fakeExercise({ id: 'free', pattern: 'balance', level: 2, position: 'standing' }),
    ];
    expect(findHarder(balance, makeProfile(), library, [], DATE)).toEqual({ type: 'top' });
  });

  it('prefers a supported exercise, then one not used today', () => {
    const library = [
      current,
      squat('a-standing', 3),
      squat('b-floor', 3, { position: 'floor' }),
      squat('z-supported', 3, { position: 'standing_supported' }),
    ];
    const profile = makeProfile({ floorOk: true });
    expect(pickedId(findHarder(current, profile, library, [], DATE))).toBe('z-supported');
    const noSupport = library.filter((e) => e.id !== 'z-supported');
    expect(pickedId(findHarder(current, profile, noSupport, ['a-standing'], DATE))).toBe('b-floor');
  });

  it('with the real library, sit-to-stand with hands leads to a level 3 squat', () => {
    const result = findHarder(get('sit-to-stand-with-hands'), makeProfile(), exercises, [], DATE);
    expect(result.type === 'harder' && result.exercise.level).toBe(3);
  });

  it('the hardest exercises of a pattern are "top"', () => {
    const profile = makeProfile({ floorOk: true });
    for (const e of exercises.filter((x) => x.pattern === 'squat' && x.level === 5)) {
      expect(findHarder(e, profile, exercises, [], DATE)).toEqual({ type: 'top' });
    }
  });
});
