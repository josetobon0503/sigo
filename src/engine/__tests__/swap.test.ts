import { exercises } from '../../data/exercises';
import { ALL_AREAS, fakeExercise, makeProfile, pain } from '../__fixtures__/profiles';
import { findSwap } from '../swap';
import type { Exercise, PainReport, SwapResult } from '../types';

const DATE = '2026-10-28';
const get = (id: string): Exercise => exercises.find((e) => e.id === id)!;
const report = (area: PainReport['area'], intensity = 3, kind: PainReport['kind'] = 'achy') => ({
  area,
  intensity,
  kind,
});
const swappedId = (result: SwapResult) =>
  result.type === 'swap' ? result.exercise.id : result.type;

describe('findSwap: red flags', () => {
  it('sharp pain goes to the Safety screen, never to a swap', () => {
    const result = findSwap(
      get('wall-push-up'),
      report('wrist', 2, 'sharp'),
      makeProfile(),
      exercises,
      [],
      DATE,
    );
    expect(result).toEqual({ type: 'safety' });
  });

  it('the worst pain (5) goes to the Safety screen', () => {
    const result = findSwap(
      get('wall-push-up'),
      report('wrist', 5),
      makeProfile(),
      exercises,
      [],
      DATE,
    );
    expect(result).toEqual({ type: 'safety' });
  });
});

describe('findSwap: candidates', () => {
  it('finds the same movement without the painful area', () => {
    const result = findSwap(
      get('wall-push-up'),
      report('wrist'),
      makeProfile(),
      exercises,
      [],
      DATE,
    );
    expect(result).toEqual({
      type: 'swap',
      exercise: get('seated-bottle-chest-press'),
      reasonKey: 'swap.reason.seatedVersion',
    });
  });

  it('prefers the same level', () => {
    const result = findSwap(
      get('supported-hip-abduction'),
      report('knee'),
      makeProfile(),
      exercises,
      [],
      DATE,
    );
    expect(result).toEqual({
      type: 'swap',
      exercise: get('supported-hip-hinge'),
      reasonKey: 'swap.reason.avoidsArea',
    });
  });

  it('also avoids areas already blocked in the profile', () => {
    const profile = makeProfile({ painAreas: [pain('lower_back', 3)] });
    const result = findSwap(
      get('supported-hip-abduction'),
      report('knee'),
      profile,
      exercises,
      [],
      DATE,
    );
    expect(result).toEqual({
      type: 'swap',
      exercise: get('seated-glute-squeeze'),
      reasonKey: 'swap.reason.seatedVersion',
    });
  });

  it('never offers a harder exercise', () => {
    for (const current of exercises) {
      for (const area of ALL_AREAS) {
        const result = findSwap(current, report(area), makeProfile(), exercises, [], DATE);
        if (result.type === 'swap' && result.exercise.pattern !== 'mobility') {
          expect(result.exercise.level).toBeLessThanOrEqual(current.level);
        }
      }
    }
  });

  it('respects seatedOnly', () => {
    const profile = makeProfile({ seatedOnly: true });
    const result = findSwap(
      get('sit-to-stand-with-hands'),
      report('hip'),
      profile,
      exercises,
      [],
      DATE,
    );
    expect(swappedId(result)).toBe('seated-knee-extension');
  });

  it('uses only equipment the user has', () => {
    const profile = makeProfile({ equipment: ['chair', 'wall'] });
    const result = findSwap(get('wall-push-up'), report('wrist'), profile, exercises, [], DATE);
    expect(
      result.type === 'swap' &&
        result.exercise.equipment.every((e) => e === 'chair' || e === 'wall'),
    ).toBe(true);
    expect(swappedId(result)).not.toBe('seated-bottle-chest-press');
  });

  it('skips an avoided exercise until its avoid period ends', () => {
    const avoided = makeProfile({
      avoided: [{ exerciseId: 'seated-bottle-chest-press', until: '2026-11-05' }],
    });
    const expired = makeProfile({
      avoided: [{ exerciseId: 'seated-bottle-chest-press', until: '2026-10-01' }],
    });
    expect(
      swappedId(findSwap(get('wall-push-up'), report('wrist'), avoided, exercises, [], DATE)),
    ).not.toBe('seated-bottle-chest-press');
    expect(
      swappedId(findSwap(get('wall-push-up'), report('wrist'), expired, exercises, [], DATE)),
    ).toBe('seated-bottle-chest-press');
  });

  it('never suggests the same exercise', () => {
    for (const current of exercises) {
      const result = findSwap(current, report('neck', 2), makeProfile(), exercises, [], DATE);
      expect(swappedId(result)).not.toBe(current.id);
    }
  });

  it('never suggests an exercise that loads the reported area', () => {
    for (const current of exercises) {
      for (const area of ALL_AREAS) {
        const result = findSwap(current, report(area), makeProfile(), exercises, [], DATE);
        if (result.type === 'swap') expect(result.exercise.loads).not.toContain(area);
      }
    }
  });
});

describe('findSwap: sort order', () => {
  const current = fakeExercise({ id: 'current', level: 3, position: 'standing', loads: ['knee'] });

  it('same level beats seated', () => {
    const library = [
      current,
      fakeExercise({ id: 'lower-seated', level: 2, position: 'seated' }),
      fakeExercise({ id: 'same-standing', level: 3, position: 'standing' }),
    ];
    expect(swappedId(findSwap(current, report('knee'), makeProfile(), library, [], DATE))).toBe(
      'same-standing',
    );
  });

  it('seated or supported beats standing at the same level', () => {
    const library = [
      current,
      fakeExercise({ id: 'a-standing', level: 3, position: 'standing' }),
      fakeExercise({ id: 'z-supported', level: 3, position: 'standing_supported' }),
    ];
    expect(swappedId(findSwap(current, report('knee'), makeProfile(), library, [], DATE))).toBe(
      'z-supported',
    );
  });

  it('prefers an exercise not used today', () => {
    const library = [
      current,
      fakeExercise({ id: 'a-used', level: 3 }),
      fakeExercise({ id: 'z-fresh', level: 3 }),
    ];
    expect(
      swappedId(findSwap(current, report('knee'), makeProfile(), library, ['a-used'], DATE)),
    ).toBe('z-fresh');
  });
});

describe('findSwap: sibling pattern', () => {
  it('a squat with knee pain gets a hip exercise that does not load the knee', () => {
    const result = findSwap(
      get('supported-mini-squat'),
      report('knee'),
      makeProfile(),
      exercises,
      [],
      DATE,
    );
    expect(result.type).toBe('swap');
    if (result.type === 'swap') {
      expect(result.exercise.pattern).toBe('hinge');
      expect(result.exercise.loads).not.toContain('knee');
      expect(result.reasonKey).toBe('swap.reason.similarMovement');
    }
  });

  const current = fakeExercise({ id: 'push', pattern: 'upper_push', level: 2, loads: ['wrist'] });
  const pull = fakeExercise({ id: 'pull', pattern: 'upper_pull', level: 2, loads: ['elbow'] });
  const stretch = fakeExercise({ id: 'stretch', pattern: 'mobility', level: 1 });

  it('push goes to pull when no push fits', () => {
    const library = [current, pull, stretch];
    expect(swappedId(findSwap(current, report('wrist'), makeProfile(), library, [], DATE))).toBe(
      'pull',
    );
  });

  it('prefers the same pattern over the sibling', () => {
    const otherPush = fakeExercise({ id: 'other-push', pattern: 'upper_push', level: 1 });
    const library = [current, pull, otherPush, stretch];
    expect(swappedId(findSwap(current, report('wrist'), makeProfile(), library, [], DATE))).toBe(
      'other-push',
    );
  });

  it('the sibling follows the same rules: no reported area, no harder level', () => {
    const sore = fakeExercise({ id: 'pull-wrist', pattern: 'upper_pull', loads: ['wrist'] });
    const harder = fakeExercise({ id: 'pull-hard', pattern: 'upper_pull', level: 3 });
    const library = [current, sore, harder, stretch];
    expect(swappedId(findSwap(current, report('wrist'), makeProfile(), library, [], DATE))).toBe(
      'stretch',
    );
  });

  it('core, balance and calf have no sibling: straight to mobility', () => {
    const core = fakeExercise({ id: 'core', pattern: 'core', loads: ['lower_back'] });
    const library = [core, pull, stretch];
    expect(swappedId(findSwap(core, report('lower_back'), makeProfile(), library, [], DATE))).toBe(
      'stretch',
    );
  });
});

describe('findSwap: floor', () => {
  const standing = fakeExercise({
    id: 'standing',
    pattern: 'core',
    level: 3,
    position: 'standing',
    loads: ['wrist'],
  });
  const floor = fakeExercise({ id: 'floor', pattern: 'core', level: 3, position: 'floor' });
  const lowFloor = fakeExercise({
    id: 'z-floor',
    pattern: 'core',
    level: 3,
    position: 'floor',
    loads: ['wrist'],
  });
  const profile = makeProfile({ floorOk: true });

  it('never sends the user down to the floor after a pain report', () => {
    expect(
      swappedId(findSwap(standing, report('wrist'), profile, [standing, floor], [], DATE)),
    ).toBe('rest');
  });

  it('a floor exercise can be swapped for another floor exercise', () => {
    expect(
      swappedId(findSwap(lowFloor, report('wrist'), profile, [lowFloor, floor], [], DATE)),
    ).toBe('floor');
  });
});

describe('findSwap: no candidates', () => {
  it('falls back to a mobility exercise that does not load the area', () => {
    const result = findSwap(
      get('wall-push-up'),
      report('shoulder', 4),
      makeProfile(),
      exercises,
      [],
      DATE,
    );
    expect(result.type).toBe('swap');
    if (result.type === 'swap') {
      expect(result.exercise.pattern).toBe('mobility');
      expect(result.exercise.loads).not.toContain('shoulder');
      expect(result.reasonKey).toBe('swap.reason.mobility');
    }
  });

  it('prefers a mobility exercise not used today', () => {
    const first = findSwap(
      get('wall-push-up'),
      report('shoulder', 4),
      makeProfile(),
      exercises,
      [],
      DATE,
    );
    const firstId = swappedId(first);
    const second = findSwap(
      get('wall-push-up'),
      report('shoulder', 4),
      makeProfile(),
      exercises,
      [firstId],
      DATE,
    );
    expect(swappedId(second)).not.toBe(firstId);
  });

  it('suggests rest when every area is blocked', () => {
    const profile = makeProfile({ painAreas: ALL_AREAS.map((area) => pain(area, 3)) });
    const result = findSwap(
      get('seated-belly-brace'),
      report('lower_back'),
      profile,
      exercises,
      [],
      DATE,
    );
    expect(result).toEqual({ type: 'rest' });
  });

  it('suggests rest with an empty library', () => {
    expect(findSwap(get('wall-push-up'), report('wrist'), makeProfile(), [], [], DATE)).toEqual({
      type: 'rest',
    });
  });
});
