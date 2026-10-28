import { ALL_AREAS, ALL_PATTERNS } from '../../engine/__fixtures__/profiles';
import type { BodyArea, Pattern } from '../../engine/types';
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
];

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

  it('keeps balance at level 3 or below seated or supported', () => {
    for (const e of exercises.filter((x) => x.pattern === 'balance' && x.level <= 3)) {
      expect(e.position).not.toBe('standing');
    }
  });

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
