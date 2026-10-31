import { exercises } from '../../data/exercises';
import {
  ALL_AREAS,
  fakeExercise,
  levelsAt,
  makeProfile,
  mamaActiva,
  maria,
  pain,
  roberto,
} from '../__fixtures__/profiles';
import { generateWorkout } from '../generator';
import { estimateSeconds } from '../rules';
import { blockedAreas } from '../safety';
import type {
  Equipment,
  Exercise,
  GeneratedWorkout,
  Pattern,
  UserProfile,
  WorkoutLog,
} from '../types';

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

  it('never picks standing balance at level 2 or below', () => {
    const library = [
      fakeExercise({ id: 'free-stand', pattern: 'balance', position: 'standing', level: 2 }),
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

  it('balance without support is fine from level 3', () => {
    const library = [
      fakeExercise({ id: 'free-stand', pattern: 'balance', position: 'standing', level: 3 }),
    ];
    const ids = generateWorkout(makeProfile(), library, [], DATE).items.map((i) => i.exerciseId);
    expect(ids).toEqual(['free-stand']);
  });

  it('offers the floor only with floorOk, from level 3', () => {
    const library = [
      fakeExercise({ id: 'bridge', pattern: 'hinge', position: 'floor', level: 3 }),
      fakeExercise({ id: 'easy-floor', pattern: 'core', position: 'floor', level: 2 }),
    ];
    const ids = (floorOk: boolean) =>
      generateWorkout(makeProfile({ floorOk }), library, [], DATE).items.map((i) => i.exerciseId);
    expect(ids(false)).toEqual([]);
    expect(ids(true)).toEqual(['bridge']);
    const seated = generateWorkout(
      makeProfile({ floorOk: true, seatedOnly: true }),
      library,
      [],
      DATE,
    );
    expect(seated.items).toEqual([]);
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
    ['Mamá activa', mamaActiva],
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

  it('Maria (knee blocked) gets leg work lying down that keeps the load off her knee', () => {
    const LEG_WORK = ['straight-leg-raise', 'glute-bridge'];
    const legs = WEEK.flatMap((date) =>
      section(generateWorkout(maria, exercises, [], date), 'main'),
    ).filter((e) => e.pattern === 'squat' || e.pattern === 'hinge');
    expect(legs.some((e) => LEG_WORK.includes(e.id))).toBe(true);
    for (const e of legs) expect(e.loads).not.toContain('knee');
    // Every squat she gets is the straight leg raise: the knee stays straight.
    for (const e of legs.filter((x) => x.pattern === 'squat'))
      expect(e.id).toBe('straight-leg-raise');
  });

  it('without a bed, Maria still skips squats to protect her knee', () => {
    const noBed = { ...maria, equipment: maria.equipment.filter((e) => e !== 'bed') };
    for (const date of WEEK) {
      const workout = generateWorkout(noBed, exercises, [], date);
      expect(allExercises(workout).map((e) => e.pattern)).not.toContain('squat');
      expect(workout.skippedPatterns).toContain('squat');
    }
  });

  it.each(WEEK)(
    'Roberto with seatedOnly gets exercises lying down and nothing standing on %s',
    (date) => {
      const workout = generateWorkout(
        { ...roberto, seatedOnly: true, equipment: [...roberto.equipment, 'bed'] },
        exercises,
        [],
        date,
      );
      const positions = allExercises(workout).map((e) => e.position);
      expect(positions.every((p) => p === 'seated' || p === 'lying')).toBe(true);
    },
  );

  it('Roberto with seatedOnly gets at least one exercise lying down in the week', () => {
    const lying = WEEK.flatMap((date) =>
      allExercises(
        generateWorkout(
          { ...roberto, seatedOnly: true, equipment: [...roberto.equipment, 'bed'] },
          exercises,
          [],
          date,
        ),
      ),
    ).filter((e) => e.position === 'lying');
    expect(lying.length).toBeGreaterThan(0);
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

  const TWO_WEEKS = Array.from(
    { length: 14 },
    (_, i) => `2026-11-${String(i + 1).padStart(2, '0')}`,
  );

  it.each(TWO_WEEKS)(
    'Mamá activa (level 3) gets no seated or supported main exercise on %s, in 20-25 min',
    (date) => {
      const workout = generateWorkout(mamaActiva, exercises, [], date);
      for (const e of section(workout, 'main')) {
        expect({ id: e.id, position: e.position }).toEqual({
          id: e.id,
          position: expect.stringMatching(/^(standing|floor|lying)$/),
        });
        // Never something like a pelvic tilt in her main block.
        expect(e.level).toBeGreaterThanOrEqual(3);
      }
      expect(workout.estimatedSec).toBeGreaterThanOrEqual(20 * 60);
      expect(workout.estimatedSec).toBeLessThanOrEqual(25 * 60);
      expect(workout.skippedPatterns).toEqual([]);
    },
  );

  it('Mamá activa gets floor exercises only because she said yes', () => {
    const floorIn = (floorOk: boolean) =>
      WEEK.flatMap((date) =>
        allExercises(generateWorkout({ ...mamaActiva, floorOk }, exercises, [], date)),
      ).filter((e) => e.position === 'floor');
    expect(floorIn(false)).toEqual([]);
  });

  it('Roberto skips upper body to protect his shoulder', () => {
    const workout = generateWorkout(roberto, exercises, [], DATE);
    expect(workout.skippedPatterns).toEqual(expect.arrayContaining(['upper_push', 'upper_pull']));
  });
});

describe('estimateSeconds', () => {
  it('counts 4 s per rep, 6 s with the slow level 5 tempo, and both sides', () => {
    // 15 s to get ready + sets × (work + 30 s rest)
    expect(estimateSeconds({ kind: 'reps', sets: 2, reps: 10 })).toBe(15 + 2 * (40 + 30));
    expect(estimateSeconds({ kind: 'reps', sets: 3, reps: 8, slow: true })).toBe(
      15 + 3 * (48 + 30),
    );
    expect(estimateSeconds({ kind: 'reps', sets: 3, reps: 8, slow: true }, true)).toBe(
      15 + 3 * (96 + 30),
    );
  });
});

describe('generateWorkout: lying down', () => {
  const DAYS = Array.from({ length: 14 }, (_, i) => `2026-11-${String(i + 1).padStart(2, '0')}`);
  const profiles: [string, UserProfile][] = [
    ['seated only, level 2', makeProfile({ levels: levelsAt(2), seatedOnly: true })],
    ['level 1', makeProfile({ levels: levelsAt(1) })],
    ['level 2', makeProfile({ levels: levelsAt(2) })],
    ['Maria', maria],
    ['Roberto in bed', { ...roberto, seatedOnly: true, equipment: [...roberto.equipment, 'bed'] }],
  ];
  const cases = profiles.flatMap(([name, profile]) => DAYS.map((d) => [name, profile, d] as const));
  const position = (id: string) => exerciseOf(id).position;

  it.each(cases)(
    '%s on %s: lying exercises come together at the end, at most 3, never in the warm-up',
    (_name, profile, date) => {
      const { items } = generateWorkout(profile, exercises, [], date);
      const lying = items
        .map((i, n) => [n, position(i.exerciseId)] as const)
        .filter(([, p]) => p === 'lying');
      expect(lying.length).toBeLessThanOrEqual(3);
      // One block: no other exercise in between.
      if (lying.length > 0) {
        const first = lying[0][0];
        expect(lying.map(([n]) => n)).toEqual(lying.map((_, k) => first + k));
        // Only the cool-down may follow the block.
        for (const item of items.slice(first + lying.length)) expect(item.section).toBe('cooldown');
      }
      for (const item of items.filter((i) => i.section === 'warmup')) {
        expect(position(item.exerciseId)).not.toBe('lying');
      }
    },
  );

  it.each(cases)(
    '%s on %s: knee to chest only as the cool-down, after the block',
    (_n, profile, date) => {
      const { items } = generateWorkout(profile, exercises, [], date);
      const knee = items.find((i) => i.exerciseId === 'knee-to-chest');
      if (!knee) return;
      expect(knee.section).toBe('cooldown');
      expect(items.some((i) => i.section === 'main' && position(i.exerciseId) === 'lying')).toBe(
        true,
      );
    },
  );

  it('caps the workout at 3 exercises lying down', () => {
    const library = [
      ...['squat', 'hinge', 'upper_push', 'upper_pull', 'balance', 'core'].map((pattern) =>
        fakeExercise({ id: `lying-${pattern}`, pattern: pattern as Pattern, position: 'lying' }),
      ),
      fakeExercise({ id: 'lying-stretch', pattern: 'mobility', position: 'lying' }),
    ];
    const items = generateWorkout(makeProfile({ levels: levelsAt(1) }), library, [], DATE).items;
    expect(items.length).toBe(3);
    expect(items.every((i) => i.section === 'main')).toBe(true);
  });

  it('without a bed, needs floorOk and a towel', () => {
    const library = [
      fakeExercise({ id: 'lying', pattern: 'core', position: 'lying', equipment: ['bed'] }),
    ];
    const ids = (equipment: Equipment[], floorOk: boolean) =>
      generateWorkout(
        makeProfile({ equipment, floorOk, levels: levelsAt(1) }),
        library,
        [],
        DATE,
      ).items.map((i) => i.exerciseId);
    expect(ids(['bed'], false)).toEqual(['lying']);
    expect(ids(['towel'], true)).toEqual(['lying']);
    expect(ids(['towel'], false)).toEqual([]);
    expect(ids(['chair'], true)).toEqual([]);
  });

  it('lying down is fine with seatedOnly and needs no floorOk', () => {
    const library = [
      fakeExercise({ id: 'lying', pattern: 'core', position: 'lying', equipment: ['bed'] }),
    ];
    const profile = makeProfile({ seatedOnly: true, floorOk: false, levels: levelsAt(1) });
    expect(generateWorkout(profile, library, [], DATE).items.map((i) => i.exerciseId)).toEqual([
      'lying',
    ]);
  });
});
