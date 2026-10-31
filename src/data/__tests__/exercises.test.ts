import { ALL_AREAS, ALL_PATTERNS } from '../../engine/__fixtures__/profiles';
import type { BodyArea, Dosage, Exercise, Pattern } from '../../engine/types';
import { FORBIDDEN_WORDS } from '../../i18n/forbiddenWords';
import { exercises } from '../exercises';

// Pattern -> areas that EVERY exercise of that pattern honestly loads. For these, the generator
// skips the slot when the area is blocked, which is the right call. Never drop an area from
// `loads` to shrink this list.
const COVERAGE_EXCEPTIONS: Partial<Record<Pattern, BodyArea[]>> = {
  squat: ['knee'], // standing up and sitting down always bends the knee under load
  hinge: ['hip'], // a hinge is a hip movement by definition
  upper_push: ['shoulder', 'elbow'], // pushing moves the arm at the shoulder and straightens the elbow
  upper_pull: ['shoulder'], // pulling always moves the shoulder blade and upper arm
  calf: ['ankle', 'foot'], // heel raises work through the ankle and the ball of the foot
};

// Standing on one leg, even briefly and with support, loads that leg's ankle, foot, knee and hip.
const SINGLE_LEG = [
  'supported-single-leg-stand',
  'supported-hip-extension',
  'supported-hip-abduction',
  'supported-standing-march',
  'supported-heel-to-toe-walk',
  'supported-single-leg-heel-raise',
  'supported-single-leg-deadlift',
  'backpack-single-leg-deadlift',
  'step-up',
  'single-leg-stand',
  'single-leg-reach',
  'single-leg-heel-raise',
  'backpack-single-leg-heel-raise',
  'counter-plank-leg-lift',
];

// CLAUDE.md section 6: sets, reps and seconds follow the level. Mobility is a 1-set warm-up.
function expectedDosage(e: Exercise): Dosage {
  if (e.dosage.kind === 'time') {
    const [sets, seconds] = [
      [2, 20],
      [2, 30],
      [3, 30],
      [3, 30],
      [3, 40],
    ][e.level - 1];
    return { kind: 'time', sets, seconds };
  }
  if (e.level === 5) return { kind: 'reps', sets: 3, reps: 8, slow: true };
  if (e.level === 4) return { kind: 'reps', sets: 3, reps: e.perSide ? 8 : 10 };
  const [sets, reps] = [
    [2, 8],
    [2, 10],
    [3, 10],
  ][e.level - 1];
  return { kind: 'reps', sets, reps };
}

const KEBAB = /^[a-z]+(-[a-z]+)*$/;

function texts(): string[] {
  return exercises.flatMap((e) => [
    e.name.es,
    e.name.en,
    e.purpose.es,
    e.purpose.en,
    ...e.steps.es,
    ...e.steps.en,
    ...e.mistakes.es,
    ...e.mistakes.en,
  ]);
}

describe('exercise library', () => {
  it('has at least 30 exercises with unique kebab-case ids', () => {
    expect(exercises.length).toBeGreaterThanOrEqual(30);
    const ids = exercises.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(KEBAB);
  });

  it.each(exercises.map((e) => [e.id, e] as const))(
    '%s is complete in Spanish and English',
    (_id, e) => {
      for (const lang of ['es', 'en'] as const) {
        expect(e.name[lang].trim()).not.toBe('');
        expect(e.purpose[lang].trim()).not.toBe('');
        expect(e.steps[lang].length).toBeGreaterThanOrEqual(3);
        expect(e.steps[lang].length).toBeLessThanOrEqual(5);
        expect(e.mistakes[lang].length).toBeGreaterThanOrEqual(2);
        expect(e.mistakes[lang].length).toBeLessThanOrEqual(3);
      }
      expect(e.steps.es).toHaveLength(e.steps.en.length);
      expect(e.mistakes.es).toHaveLength(e.mistakes.en.length);
    },
  );

  it('never uses medical claims', () => {
    for (const text of texts()) {
      for (const pattern of FORBIDDEN_WORDS) expect(text).not.toMatch(pattern);
    }
  });

  it('is not reviewed by a professional yet', () => {
    for (const e of exercises) expect(e.reviewedByProfessional).toBe(false);
  });

  it('has sensible dosage and no repeated loads', () => {
    for (const e of exercises) {
      expect(e.dosage.sets).toBeGreaterThan(0);
      expect(e.dosage.kind === 'reps' ? e.dosage.reps : e.dosage.seconds).toBeGreaterThan(0);
      expect(new Set(e.loads).size).toBe(e.loads.length);
    }
  });

  it.each(exercises.filter((e) => e.pattern !== 'mobility').map((e) => [e.id, e] as const))(
    '%s follows the dosage for its level',
    (_id, e) => {
      expect(e.dosage).toEqual(expectedDosage(e));
    },
  );

  it('keeps mobility as a short warm-up', () => {
    for (const e of exercises.filter((x) => x.pattern === 'mobility')) {
      expect(e.dosage.sets).toBe(1);
    }
  });

  it('level 1 is seated, and holding on for balance is level 2 at most', () => {
    for (const e of exercises) {
      if (e.position === 'seated')
        expect({ id: e.id, level: e.level }).toEqual({ id: e.id, level: 1 });
      if (e.position === 'standing_supported') expect(e.level).toBe(2);
      if (e.level === 1) expect(e.position).toBe('seated');
    }
  });

  it('floor exercises are level 3 or more', () => {
    const floor = exercises.filter((e) => e.position === 'floor');
    expect(floor.length).toBeGreaterThan(0);
    for (const e of floor) expect(e.level).toBeGreaterThanOrEqual(3);
  });

  it('keeps balance at level 2 or below seated or supported', () => {
    for (const e of exercises.filter((x) => x.pattern === 'balance' && x.level <= 2)) {
      expect(e.position).not.toBe('standing');
    }
  });

  it('balance without support (level 3+) is done next to a chair, and says so', () => {
    const free = exercises.filter((x) => x.pattern === 'balance' && x.level >= 3);
    expect(free.length).toBeGreaterThan(0);
    for (const e of free) {
      expect(e.equipment).toContain('chair');
      expect(e.steps.es.join(' ')).toMatch(/junto a una silla firme por seguridad/);
      expect(e.steps.en.join(' ')).toMatch(/next to a sturdy chair for safety/);
    }
  });

  it.each(ALL_PATTERNS.filter((p) => p !== 'mobility'))(
    '%s has standing exercises without support at levels 3, 4 and 5',
    (pattern) => {
      for (const level of [3, 4, 5]) {
        expect(
          exercises.some(
            (e) => e.pattern === pattern && e.level === level && e.position === 'standing',
          ),
        ).toBe(true);
      }
    },
  );

  it.each(ALL_PATTERNS)('%s has a seated version and more than one level', (pattern) => {
    const ofPattern = exercises.filter((e) => e.pattern === pattern);
    expect(ofPattern.some((e) => e.position === 'seated')).toBe(true);
    if (pattern !== 'mobility') {
      expect(new Set(ofPattern.map((e) => e.level)).size).toBeGreaterThan(1);
    }
  });

  it('starts every pattern at level 1', () => {
    for (const pattern of ALL_PATTERNS) {
      expect(exercises.some((e) => e.pattern === pattern && e.level === 1)).toBe(true);
    }
  });

  it.each(SINGLE_LEG)('%s loads the standing leg', (id) => {
    const e = exercises.find((x) => x.id === id)!;
    expect(e.loads).toEqual(expect.arrayContaining(['ankle', 'foot', 'knee', 'hip']));
  });

  // "10 per side": a one-foot or one-hand exercise must say so, or the user does half the work.
  it('marks every one-sided exercise as perSide', () => {
    const ONE_SIDE_ES = /\b(un pie|una mano|un brazo|una pierna)\b/i;
    const ONE_SIDE_EN = /\b(one[- ](foot|hand|arm|leg)|single[- ](leg|arm))\b/i;
    const oneSided = exercises.filter(
      (e) => ONE_SIDE_ES.test(e.name.es) || ONE_SIDE_EN.test(e.name.en),
    );
    expect(oneSided.length).toBeGreaterThan(0);
    for (const e of oneSided)
      expect({ id: e.id, perSide: e.perSide }).toEqual({ id: e.id, perSide: true });
  });

  it.each([
    'supported-hip-extension',
    'supported-hip-abduction',
    'supported-single-leg-stand',
    'supported-single-leg-heel-raise',
    'seated-look-side-to-side',
  ])('%s is done one side at a time', (id) => {
    expect(exercises.find((x) => x.id === id)!.perSide).toBe(true);
  });

  it('supported hip extension loads the lower back and warns about arching', () => {
    const e = exercises.find((x) => x.id === 'supported-hip-extension')!;
    expect(e.loads).toContain('lower_back');
    expect(e.mistakes.es[0]).toMatch(/^No arquees la espalda/);
    expect(e.mistakes.en[0]).toMatch(/^Don't arch your back/);
  });

  it('wall plank is on the forearms and says so', () => {
    const e = exercises.find((x) => x.id === 'wall-plank')!;
    expect(e.loads).not.toContain('wrist');
    expect(e.steps.es.join(' ')).toMatch(/antebrazos.*no las manos/);
    expect(e.steps.en.join(' ')).toMatch(/forearms.*not your hands/);
  });

  it('keeps neck mobility to a short range, never full circles', () => {
    const neck = exercises.filter((e) => e.pattern === 'mobility' && e.loads.includes('neck'));
    expect(neck.length).toBeGreaterThan(0);
    for (const e of neck) {
      expect(e.id).not.toMatch(/circle/);
      expect(e.mistakes.es.join(' ')).toMatch(/círculos completos/);
      expect(e.mistakes.en.join(' ')).toMatch(/full circles/);
    }
  });
});

describe('library coverage', () => {
  const cases = ALL_PATTERNS.flatMap((pattern) =>
    ALL_AREAS.map((area) => [pattern, area] as const),
  );

  it.each(cases)('%s has an exercise that does not load the %s', (pattern, area) => {
    if (COVERAGE_EXCEPTIONS[pattern]?.includes(area)) return;
    expect(exercises.some((e) => e.pattern === pattern && !e.loads.includes(area))).toBe(true);
  });

  // Keeps the exception list honest: drop an entry as soon as the library covers it.
  it.each(
    Object.entries(COVERAGE_EXCEPTIONS).flatMap(([pattern, areas]) =>
      areas.map((area) => [pattern, area] as const),
    ),
  )('exception %s -> %s is still needed', (pattern, area) => {
    expect(exercises.some((e) => e.pattern === pattern && !e.loads.includes(area))).toBe(false);
  });
});
