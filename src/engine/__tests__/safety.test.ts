import { SCREENING_QUESTIONS } from '../../data/screening';
import { levelsAt, makeProfile, pain } from '../__fixtures__/profiles';
import {
  RED_FLAG_SYMPTOMS,
  applyScreening,
  blockedAreas,
  cautionAreas,
  isBlocked,
  isCaution,
  isRedFlagReport,
} from '../safety';

describe('blocked and caution areas', () => {
  it('blocks intensity >= 3', () => {
    expect(isBlocked(pain('knee', 3))).toBe(true);
    expect(isBlocked(pain('knee', 5))).toBe(true);
    expect(isBlocked(pain('knee', 2))).toBe(false);
  });

  it('blocks sharp pain at any intensity', () => {
    expect(isBlocked(pain('knee', 1, 'sharp'))).toBe(true);
  });

  it('marks intensity 2 (not sharp) as caution', () => {
    expect(isCaution(pain('hip', 2))).toBe(true);
    expect(isCaution(pain('hip', 2, 'stiff'))).toBe(true);
    expect(isCaution(pain('hip', 2, 'sharp'))).toBe(false);
    expect(isCaution(pain('hip', 1))).toBe(false);
    expect(isCaution(pain('hip', 3))).toBe(false);
  });

  it('collects blocked and caution areas from the profile', () => {
    const profile = makeProfile({ painAreas: [pain('knee', 3), pain('lower_back', 2)] });
    expect([...blockedAreas(profile)]).toEqual(['knee']);
    expect([...cautionAreas(profile)]).toEqual(['lower_back']);
  });

  it('keeps an area blocked when one side is blocked and the other is caution', () => {
    const profile = makeProfile({
      painAreas: [pain('knee', 3, 'achy', 'left'), pain('knee', 2, 'achy', 'right')],
    });
    expect(blockedAreas(profile).has('knee')).toBe(true);
    expect(cautionAreas(profile).has('knee')).toBe(false);
  });
});

describe('red flags', () => {
  it('stops for sharp pain or the worst pain', () => {
    expect(isRedFlagReport({ intensity: 2, kind: 'sharp' })).toBe(true);
    expect(isRedFlagReport({ intensity: 5, kind: 'achy' })).toBe(true);
    expect(isRedFlagReport({ intensity: 4, kind: 'achy' })).toBe(false);
  });

  it('lists chest pain, dizziness and shortness of breath', () => {
    expect(RED_FLAG_SYMPTOMS).toEqual(['chest_pain', 'dizziness', 'short_breath']);
  });
});

describe('applyScreening', () => {
  const allNo = Object.fromEntries(SCREENING_QUESTIONS.map((q) => [q, false]));

  it('keeps levels and seatedOnly when every answer is no', () => {
    const profile = makeProfile({ levels: levelsAt(3) });
    const result = applyScreening(profile, allNo, '2026-10-28');
    expect(result.levels).toEqual(levelsAt(3));
    expect(result.seatedOnly).toBe(false);
    expect(result.screening).toEqual({ completedAt: '2026-10-28', anyYes: false });
  });

  it.each(SCREENING_QUESTIONS)('a "yes" to %s sets all levels to 1 and seatedOnly', (question) => {
    const profile = makeProfile({ levels: levelsAt(4) });
    const result = applyScreening(profile, { ...allNo, [question]: true }, '2026-10-28');
    expect(result.levels).toEqual(levelsAt(1));
    expect(result.seatedOnly).toBe(true);
    expect(result.screening).toEqual({ completedAt: '2026-10-28', anyYes: true });
  });

  it('does not change the original profile', () => {
    const profile = makeProfile();
    applyScreening(profile, { ...allNo, chestPain: true }, '2026-10-28');
    expect(profile.seatedOnly).toBe(false);
    expect(profile.screening).toBeNull();
  });
});
