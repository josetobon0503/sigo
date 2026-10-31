import { SCREENING_QUESTIONS } from '../../data/screening';
import { levelsAt } from '../__fixtures__/profiles';
import { createProfile, levelsFor, setActivity, type ProfileDraft } from '../profile';
import type { ActivityLevel, AgeBand, Level } from '../types';

const NOW = '2026-10-28T10:00:00.000Z';
const allNo = Object.fromEntries(SCREENING_QUESTIONS.map((q) => [q, false]));

const draft: ProfileDraft = {
  name: '  María ',
  language: 'es',
  ageBand: '50-59',
  activity: 'low',
  floorOk: false,
  equipment: ['chair', 'towel'],
  painAreas: [
    { area: 'knee', side: 'left', intensity: 3, kind: 'achy' },
    { area: 'lower_back', side: 'both', intensity: 2, kind: 'stiff' },
  ],
  reminder: { enabled: true, hour: 9, minute: 0, days: [1, 3, 5] },
  screeningAnswers: allNo,
};

describe('createProfile', () => {
  it.each<[ActivityLevel, Level]>([
    ['low', 1],
    ['some', 2],
    ['daily', 3],
    ['strength', 4],
  ])('activity "%s" starts every pattern at level %i', (activity, level) => {
    expect(levelsFor(activity)).toEqual(levelsAt(level));
    const profile = createProfile({ ...draft, activity }, NOW);
    expect(profile.levels).toEqual(levelsAt(level));
    expect(profile.activity).toBe(activity);
  });

  it.each<AgeBand>(['under-50', '50-59', '60-69', '70-79', '80+'])(
    'the age band (%s) does not change the starting level',
    (ageBand) => {
      expect(createProfile({ ...draft, ageBand, activity: 'some' }, NOW).levels).toEqual(
        levelsAt(2),
      );
    },
  );

  it('copies the draft and stamps the pain areas', () => {
    const profile = createProfile(draft, NOW);
    expect(profile).toEqual({
      name: 'María',
      language: 'es',
      ageBand: '50-59',
      activity: 'low',
      floorOk: false,
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

  it('a "yes" in the screening wins over the activity level: level 1 and seatedOnly', () => {
    const profile = createProfile(
      { ...draft, activity: 'strength', screeningAnswers: { ...allNo, fallLastYear: true } },
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

describe('setActivity', () => {
  it('sets every pattern to the starting level of the new activity', () => {
    expect(setActivity('daily')).toEqual({ activity: 'daily', levels: levelsAt(3) });
    expect(setActivity('strength')).toEqual({ activity: 'strength', levels: levelsAt(4) });
    expect(setActivity('low')).toEqual({ activity: 'low', levels: levelsAt(1) });
  });
});
