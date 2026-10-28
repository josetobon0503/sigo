import { exercises } from '../../data/exercises';
import {
  ALL_AREAS,
  fakeExercise,
  levelsAt,
  makeProfile,
  maria,
  pain,
  roberto,
} from '../__fixtures__/profiles';
import { generateWorkout } from '../generator';
import { blockedAreas } from '../safety';
import type { Exercise, GeneratedWorkout, Pattern, UserProfile, WorkoutLog } from '../types';

const DATE = '2026-10-28';
const WEEK = [
  '2026-10-26',
  '2026-10-27',
  '2026-10-28',
  '2026-10-29',
  '2026-10-30',
  '2026-10-31',
  '2026-11-01',
];
const LOWER_BODY: Pattern[] = ['squat', 'hinge', 'calf'];

const byId = new Map(exercises.map((e) => [e.id, e]));
const exerciseOf = (id: string, library: Exercise[] = exercises): Exercise =>
  library.find((e) => e.id === id) ?? byId.get(id)!;

function section(
  workout: GeneratedWorkout,
  name: 'warmup' | 'main' | 'cooldown',
  library?: Exercise[],
) {
  return workout.items
    .filter((i) => i.section === name)
    .map((i) => exerciseOf(i.exerciseId, library));
}

function allExercises(workout: GeneratedWorkout, library?: Exercise[]): Exercise[] {
  return workout.items.map((i) => exerciseOf(i.exerciseId, library));
}

function logOf(id: string, date: string, ids: string[]): WorkoutLog {
  return {
    id,
    date,
    durationSec: 1200,
    items: ids.map((exerciseId) => ({ exerciseId, completed: true })),
  };
}

describe('generateWorkout: structure', () => {
  it.each([1, 3, 5] as const)('builds warm-up, 5-6 main and cool-down at level %i', (level) => {
    const workout = generateWorkout(makeProfile({ levels: levelsAt(level) }), exercises, [], DATE);
    expect(section(workout, 'warmup').length).toBeGreaterThanOrEqual(1);
    expect(section(workout, 'warmup').length).toBeLessThanOrEqual(2);
    expect(section(workout, 'main').length).toBeGreaterThanOrEqual(5);
    expect(section(workout, 'main').length).toBeLessThanOrEqual(6);
    expect(section(workout, 'cooldown')).toHaveLength(1);
    expect(workout.skippedPatterns).toEqual([]);
  });

  it.each([1, 3, 5] as const)('lasts 15-25 minutes at level %i', (level) => {
    const workout = generateWorkout(makeProfile({ levels: levelsAt(level) }), exercises, [], DATE);
    expect(workout.estimatedSec).toBeGreaterThanOrEqual(15 * 60);
    expect(workout.estimatedSec).toBeLessThanOrEqual(25 * 60);
  });

  it('warm-up and cool-down are mobility, with no repeated exercise', () => {
    const workout = generateWorkout(makeProfile(), exercises, [], DATE);
    for (const e of [...section(workout, 'warmup'), ...section(workout, 'cooldown')]) {
      expect(e.pattern).toBe('mobility');
    }
    const ids = workout.items.map((i) => i.exerciseId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(WEEK)('main block always covers the required groups on %s', (date) => {
    const patterns = section(generateWorkout(makeProfile(), exercises, [], date), 'main').map(
      (e) => e.pattern,
    );
    expect(patterns.some((p) => p === 'squat' || p === 'hinge')).toBe(true);
    expect(patterns.some((p) => p === 'upper_push' || p === 'upper_pull')).toBe(true);
    expect(patterns).toContain('balance');
    expect(patterns.some((p) => p === 'core' || p === 'calf')).toBe(true);
  });

  it('trains every pattern across a week', () => {
    const trained = new Set(
      WEEK.flatMap((date) => allExercises(generateWorkout(makeProfile(), exercises, [], date))).map(
        (e) => e.pattern,
      ),
    );
    expect([...trained].sort()).toEqual(
      ['balance', 'calf', 'core', 'hinge', 'mobility', 'squat', 'upper_pull', 'upper_push'].sort(),
    );
  });
});

describe('generateWorkout: rules for each exercise', () => {
  it.each(ALL_AREAS)('never loads a blocked %s', (area) => {
    const profile = makeProfile({ painAreas: [pain(area, 3)] });
    for (const date of WEEK) {
      for (const e of allExercises(generateWorkout(profile, exercises, [], date))) {
        expect(e.loads).not.toContain(area);
      }
    }
  });

  it('treats sharp pain as blocked even at intensity 1', () => {
    const profile = makeProfile({ painAreas: [pain('knee', 1, 'sharp')] });
    for (const e of allExercises(generateWorkout(profile, exercises, [], DATE))) {
      expect(e.loads).not.toContain('knee');
    }
  });

  it('uses only equipment the user has', () => {
    const profile = makeProfile({ equipment: ['chair'] });
    for (const e of allExercises(generateWorkout(profile, exercises, [], DATE))) {
      expect(e.equipment.every((item) => item === 'chair')).toBe(true);
    }
  });

  it('lets light dumbbells stand in for bottles', () => {
    const library = [
      fakeExercise({ id: 'bottle-press', pattern: 'upper_push', equipment: ['bottles'] }),
    ];
    const withDumbbells = makeProfile({ equipment: ['light_dumbbells'] });
    const withNothing = makeProfile({ equipment: [] });
    expect(
      generateWorkout(withDumbbells, library, [], DATE).items.map((i) => i.exerciseId),
    ).toEqual(['bottle-press']);
    expect(generateWorkout(withNothing, library, [], DATE).items).toEqual([]);
  });

  it('with seatedOnly, every exercise is seated', () => {
    const profile = makeProfile({ seatedOnly: true, levels: levelsAt(1) });
    const workout = generateWorkout(profile, exercises, [], DATE);
    expect(section(workout, 'main').length).toBeGreaterThanOrEqual(5);
    for (const e of allExercises(workout)) {
      expect(e.position).toBe('seated');
    }
  });

  it('never goes above the user level and picks the closest lower level', () => {
    const library = [
      fakeExercise({ id: 'squat-1', level: 1 }),
      fakeExercise({ id: 'squat-2', level: 2 }),
      fakeExercise({ id: 'squat-4', level: 4 }),
    ];
    const profile = makeProfile({ levels: { ...levelsAt(3), squat: 3 } });
    const [first] = generateWorkout(profile, library, [], '2026-10-26').items; // squat slot first
    expect(first.exerciseId).toBe('squat-2');
  });

  it('skips a pattern when only harder exercises exist', () => {
    const library = [fakeExercise({ id: 'squat-4', level: 4 })];
    const profile = makeProfile({ levels: levelsAt(2) });
    const workout = generateWorkout(profile, library, [], DATE);
    expect(workout.items).toEqual([]);
    expect(workout.skippedPatterns).toContain('squat');
  });

  it('never picks standing balance at level 3 or below', () => {
    const library = [
      fakeExercise({ id: 'free-stand', pattern: 'balance', position: 'standing', level: 3 }),
      fakeExercise({
        id: 'held-stand',
        pattern: 'balance',
        position: 'standing_supported',
        level: 2,
      }),
    ];
    const ids = generateWorkout(makeProfile(), library, [], DATE).items.map((i) => i.exerciseId);
    expect(ids).toEqual(['held-stand']);
  });

  it('allows standing balance from level 4', () => {
    const library = [
      fakeExercise({ id: 'free-stand', pattern: 'balance', position: 'standing', level: 4 }),
    ];
    const ids = generateWorkout(makeProfile({ levels: levelsAt(4) }), library, [], DATE).items.map(
      (i) => i.exerciseId,
    );
    expect(ids).toEqual(['free-stand']);
  });

  it('prefers a supported variant when it loads a caution area', () => {
    const library = [
      fakeExercise({ id: 'a-standing', position: 'standing', loads: ['knee'] }),
      fakeExercise({ id: 'z-supported', position: 'standing_supported', loads: ['knee'] }),
    ];
    const profile = makeProfile({ levels: levelsAt(1), painAreas: [pain('knee', 2)] });
    for (const date of WEEK) {
      const main = generateWorkout(profile, library, [], date).items;
      expect(main[0].exerciseId).toBe('z-supported');
    }
  });
});

describe('generateWorkout: avoided exercises', () => {
  const profile = makeProfile();
  const plain = generateWorkout(profile, exercises, [], DATE);
  const target = section(plain, 'main')[0].id;

  it('leaves out an exercise that is still avoided', () => {
    const avoided = makeProfile({ avoided: [{ exerciseId: target, until: '2026-11-05' }] });
    const ids = generateWorkout(avoided, exercises, [], DATE).items.map((i) => i.exerciseId);
    expect(ids).not.toContain(target);
  });

  it('brings it back once the avoid period has ended', () => {
    const expired = makeProfile({ avoided: [{ exerciseId: target, until: '2026-10-20' }] });
    expect(generateWorkout(expired, exercises, [], DATE)).toEqual(plain);
  });

  it('brings it back on the until day', () => {
    const endsToday = makeProfile({ avoided: [{ exerciseId: target, until: DATE }] });
    expect(generateWorkout(endsToday, exercises, [], DATE)).toEqual(plain);
  });
});

describe('generateWorkout: variety', () => {
  it('avoids exercises from the previous workout when an alternative exists', () => {
    const library = ['s1', 's2', 's3'].map((id) => fakeExercise({ id }));
    const history = [logOf('prev', '2026-10-27', ['s1', 's2'])];
    const ids = generateWorkout(makeProfile(), library, history, '2026-10-28').items.map(
      (i) => i.exerciseId,
    );
    expect(ids[0]).toBe('s3');
  });

  it('repeats an exercise when there is no alternative', () => {
    const library = [fakeExercise({ id: 'only' })];
    const history = [logOf('prev', '2026-10-27', ['only'])];
    const ids = generateWorkout(makeProfile(), library, history, DATE).items.map(
      (i) => i.exerciseId,
    );
    expect(ids).toEqual(['only']);
  });

  it('ignores logs from the same day or later', () => {
    const library = ['s1', 's2', 's3'].map((id) => fakeExercise({ id }));
    const plain = generateWorkout(makeProfile(), library, [], DATE);
    const future = [logOf('later', '2026-10-29', ['s1', 's2', 's3'])];
    expect(generateWorkout(makeProfile(), library, future, DATE)).toEqual(plain);
  });
});

describe('generateWorkout: determinism', () => {
  it('gives the same workout for the same inputs', () => {
    const a = generateWorkout(maria, exercises, [], DATE);
    const b = generateWorkout(maria, exercises, [], DATE);
    expect(a).toEqual(b);
  });

  it('ignores the time of day', () => {
    expect(generateWorkout(maria, exercises, [], '2026-10-28T07:00:00Z')).toEqual(
      generateWorkout(maria, exercises, [], '2026-10-28T21:30:00Z'),
    );
  });

  it('does not change the inputs', () => {
    const profile = makeProfile();
    const snapshot = JSON.stringify(profile);
    generateWorkout(profile, exercises, [], DATE);
    expect(JSON.stringify(profile)).toBe(snapshot);
  });
});

describe('generateWorkout: minimum duration', () => {
  const squat = fakeExercise({ id: 'squat', dosage: { kind: 'reps', sets: 2, reps: 10 } });
  const mobility = (n: number) =>
    Array.from({ length: n }, (_, i) =>
      fakeExercise({
        id: `mob-${i}`,
        pattern: 'mobility',
        dosage: { kind: 'reps', sets: 1, reps: 10 },
      }),
    );

  it('adds sets to main exercises first, up to 3', () => {
    const workout = generateWorkout(makeProfile(), [squat, ...mobility(3)], [], DATE);
    const main = workout.items.filter((i) => i.section === 'main');
    expect(main.map((i) => i.dosage.sets)).toEqual([3]);
    expect(workout.items).toHaveLength(4); // no mobility left to add
  });

  it('then adds safe mobility exercises at the end', () => {
    const library = [
      squat,
      ...mobility(12),
      fakeExercise({ id: 'mob-hurts', pattern: 'mobility', loads: ['knee'] }),
    ];
    const profile = makeProfile({ painAreas: [pain('knee', 3)] });
    const workout = generateWorkout(profile, library, [], DATE);
    expect(workout.estimatedSec).toBeGreaterThanOrEqual(15 * 60);
    expect(workout.items.at(-1)?.section).toBe('cooldown');
    expect(workout.items.map((i) => i.exerciseId)).not.toContain('mob-hurts');
  });

  it('keeps the normal dosage when the workout is already long enough', () => {
    const workout = generateWorkout(makeProfile(), exercises, [], DATE);
    for (const item of workout.items) {
      expect(item.dosage).toEqual(exerciseOf(item.exerciseId).dosage);
    }
  });
});

describe('generateWorkout: edge cases', () => {
  it('when every area is blocked, only exercises that load nothing remain', () => {
    const profile = makeProfile({ painAreas: ALL_AREAS.map((area) => pain(area, 4)) });
    const workout = generateWorkout(profile, exercises, [], DATE);
    for (const e of allExercises(workout)) {
      expect(e.loads).toEqual([]);
    }
    expect(workout.skippedPatterns).toEqual(
      expect.arrayContaining(['squat', 'hinge', 'upper_push', 'upper_pull', 'balance', 'mobility']),
    );
  });

  it('returns an empty workout and lists every skipped pattern with an empty library', () => {
    const workout = generateWorkout(makeProfile(), [], [], DATE);
    expect(workout.items).toEqual([]);
    expect(workout.estimatedSec).toBe(0);
    expect([...workout.skippedPatterns].sort()).toEqual(
      ['balance', 'calf', 'core', 'hinge', 'mobility', 'squat', 'upper_pull', 'upper_push'].sort(),
    );
  });
});

describe('generateWorkout: personas', () => {
  const personas: [string, UserProfile][] = [
    ['Maria', maria],
    ['Roberto', roberto],
  ];

  describe.each(personas)('%s', (_name, profile) => {
    const blocked = blockedAreas(profile);

    it.each(WEEK)(
      'on %s gets at least 4 main exercises, none on a blocked area, with lower body',
      (date) => {
        const workout = generateWorkout(profile, exercises, [], date);
        const main = section(workout, 'main');
        expect(main.length).toBeGreaterThanOrEqual(4);
        for (const e of allExercises(workout)) {
          expect(e.loads.filter((area) => blocked.has(area))).toEqual([]);
          expect(e.level).toBeLessThanOrEqual(profile.levels[e.pattern]);
        }
        expect(main.some((e) => LOWER_BODY.includes(e.pattern))).toBe(true);
      },
    );
  });

  it('Maria never gets a squat while her knee is blocked', () => {
    for (const date of WEEK) {
      const workout = generateWorkout(maria, exercises, [], date);
      expect(allExercises(workout).map((e) => e.pattern)).not.toContain('squat');
      expect(workout.skippedPatterns).toContain('squat');
    }
  });

  it.each(WEEK)('Roberto gets at least 15 minutes on %s, never more than 3 sets', (date) => {
    const workout = generateWorkout(roberto, exercises, [], date);
    expect(workout.estimatedSec).toBeGreaterThanOrEqual(15 * 60);
    for (const item of workout.items) {
      const e = exerciseOf(item.exerciseId);
      expect(item.dosage.sets).toBeGreaterThanOrEqual(e.dosage.sets);
      expect(item.dosage.sets).toBeLessThanOrEqual(Math.max(3, e.dosage.sets));
      expect(e.loads.filter((area) => blockedAreas(roberto).has(area))).toEqual([]);
    }
    const ids = workout.items.map((i) => i.exerciseId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('Roberto skips upper body to protect his shoulder', () => {
    const workout = generateWorkout(roberto, exercises, [], DATE);
    expect(workout.skippedPatterns).toEqual(expect.arrayContaining(['upper_push', 'upper_pull']));
  });
});
