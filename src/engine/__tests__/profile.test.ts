import { SCREENING_QUESTIONS } from '../../data/screening';
import { levelsAt } from '../__fixtures__/profiles';
import { createProfile, initialLevels, type ProfileDraft } from '../profile';
import type { AgeBand } from '../types';

const NOW = '2026-10-28T10:00:00.000Z';
const allNo = Object.fromEntries(SCREENING_QUESTIONS.map((q) => [q, false]));

const draft: ProfileDraft = {
  name: '  María ',
  language: 'es',
  ageBand: '50-59',
  equipment: ['chair', 'towel'],
  painAreas: [
    { area: 'knee', side: 'left', intensity: 3, kind: 'achy' },
    { area: 'lower_back', side: 'both', intensity: 2, kind: 'stiff' },
  ],
  reminder: { enabled: true, hour: 9, minute: 0, days: [1, 3, 5] },
  screeningAnswers: allNo,
};

describe('createProfile', () => {
  it('starts every pattern at level 1', () => {
    expect(initialLevels()).toEqual(levelsAt(1));
  });

  it.each<AgeBand>(['under-50', '50-59', '60-69', '70-79', '80+'])(
    'starts at level 1 for age %s',
    (ageBand) => {
      expect(createProfile({ ...draft, ageBand }, NOW).levels).toEqual(levelsAt(1));
    },
  );

  it('copies the draft and stamps the pain areas', () => {
    const profile = createProfile(draft, NOW);
    expect(profile).toEqual({
      name: 'María',
      language: 'es',
      ageBand: '50-59',
      equipment: ['chair', 'towel'],
      levels: levelsAt(1),
      seatedOnly: false,
      painAreas: [
        { area: 'knee', side: 'left', intensity: 3, kind: 'achy', updatedAt: NOW },
        { area: 'lower_back', side: 'both', intensity: 2, kind: 'stiff', updatedAt: NOW },
      ],
      avoided: [],
      reminder: { enabled: true, hour: 9, minute: 0, days: [1, 3, 5] },
      screening: { completedAt: NOW, anyYes: false },
    });
  });

  it('a "yes" in the screening turns on seatedOnly', () => {
    const profile = createProfile(
      { ...draft, screeningAnswers: { ...allNo, fallLastYear: true } },
      NOW,
    );
    expect(profile.seatedOnly).toBe(true);
    expect(profile.levels).toEqual(levelsAt(1));
    expect(profile.screening).toEqual({ completedAt: NOW, anyYes: true });
  });

  it('does not share arrays with the draft', () => {
    const profile = createProfile(draft, NOW);
    profile.equipment.push('wall');
    profile.reminder.days.push(0);
    expect(draft.equipment).toEqual(['chair', 'towel']);
    expect(draft.reminder.days).toEqual([1, 3, 5]);
  });
});
