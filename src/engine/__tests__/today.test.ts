import { exercises } from '../../data/exercises';
import { fakeExercise, makeProfile, pain } from '../__fixtures__/profiles';
import { consideredAreas, equipmentNeeded, skipReasons, trainedOn } from '../today';
import type { PlannedItem, WorkoutLog } from '../types';

const DATE = '2026-10-28';

describe('consideredAreas', () => {
  it('lists blocked and caution areas, not mild-free ones, without repeats', () => {
    const profile = makeProfile({
      painAreas: [
        pain('knee', 3, 'achy', 'left'),
        pain('neck', 1),
        pain('lower_back', 2),
        pain('knee', 2, 'achy', 'right'),
      ],
    });
    expect(consideredAreas(profile)).toEqual(['knee', 'lower_back']);
  });

  it('is empty with no pain', () => {
    expect(consideredAreas(makeProfile())).toEqual([]);
  });
});

describe('skipReasons', () => {
  it('blames the blocked area that rules out every option', () => {
    const profile = makeProfile({ painAreas: [pain('knee', 4), pain('wrist', 4)] });
    expect(skipReasons(['squat'], profile, exercises, DATE)).toEqual({ squat: ['knee'] });
  });

  it('does not blame pain when the pattern was skipped for lack of equipment', () => {
    const library = [
      fakeExercise({ id: 'x', pattern: 'calf', loads: ['knee'], equipment: ['wall'] }),
    ];
    const profile = makeProfile({ equipment: ['chair'], painAreas: [pain('knee', 4)] });
    expect(skipReasons(['calf'], profile, library, DATE)).toEqual({ calf: [] });
  });
});

describe('equipmentNeeded', () => {
  const library = [
    fakeExercise({ id: 'a', equipment: ['chair', 'bottles'] }),
    fakeExercise({ id: 'b', equipment: ['wall', 'chair'] }),
  ];
  const items: PlannedItem[] = ['a', 'b'].map((id) => ({
    exerciseId: id,
    section: 'main',
    dosage: { kind: 'reps', sets: 1, reps: 1 },
    perSide: false,
  }));

  it('lists each item once, in a stable order', () => {
    expect(equipmentNeeded(items, library, ['chair', 'wall', 'bottles'])).toEqual([
      'chair',
      'wall',
      'bottles',
    ]);
  });

  it('shows dumbbells when they stand in for bottles', () => {
    expect(equipmentNeeded(items, library, ['chair', 'wall', 'light_dumbbells'])).toEqual([
      'chair',
      'wall',
      'light_dumbbells',
    ]);
  });
});

describe('trainedOn', () => {
  const log = (date: string, completed: boolean): WorkoutLog => ({
    id: date,
    date,
    durationSec: 60,
    items: [{ exerciseId: 'a', completed }],
  });

  it('is true when that day has a finished exercise', () => {
    expect(trainedOn([log(DATE, true)], DATE)).toBe(true);
    expect(trainedOn([log(`${DATE}T09:00:00.000Z`, true)], DATE)).toBe(true);
  });

  it('ignores a session left before finishing any exercise, and other days', () => {
    expect(trainedOn([log(DATE, false), log('2026-10-27', true)], DATE)).toBe(false);
  });
});
