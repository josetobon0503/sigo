import { pain } from '../__fixtures__/profiles';
import { addDays, avoidExercise, raisePainArea, removePainArea, upsertPainArea } from '../pain';

const DATE = '2026-10-28';

describe('addDays', () => {
  it('crosses months and years', () => {
    expect(addDays('2026-10-28', 14)).toBe('2026-11-11');
    expect(addDays('2026-12-25T10:00:00.000Z', 14)).toBe('2027-01-08');
  });
});

describe('raisePainArea', () => {
  it('adds a new area on both sides', () => {
    expect(raisePainArea([], { area: 'knee', intensity: 3, kind: 'achy' }, DATE)).toEqual([
      { area: 'knee', side: 'both', intensity: 3, kind: 'achy', updatedAt: DATE },
    ]);
  });

  it('raises an existing area and keeps its side', () => {
    const result = raisePainArea(
      [pain('knee', 2, 'stiff', 'left'), pain('neck', 2)],
      { area: 'knee', intensity: 4, kind: 'achy' },
      DATE,
    );
    expect(result).toEqual([
      { area: 'knee', side: 'left', intensity: 4, kind: 'stiff', updatedAt: DATE },
      pain('neck', 2),
    ]);
  });

  it('never lowers the intensity', () => {
    const [knee] = raisePainArea(
      [pain('knee', 4)],
      { area: 'knee', intensity: 2, kind: 'achy' },
      DATE,
    );
    expect(knee.intensity).toBe(4);
  });

  it('sharp pain makes the area sharp, and stays sharp', () => {
    const [sharp] = raisePainArea(
      [pain('knee', 2)],
      { area: 'knee', intensity: 2, kind: 'sharp' },
      DATE,
    );
    expect(sharp.kind).toBe('sharp');
    const [still] = raisePainArea([sharp], { area: 'knee', intensity: 2, kind: 'achy' }, DATE);
    expect(still.kind).toBe('sharp');
  });

  it('keeps the intensity in 1-5', () => {
    const [knee] = raisePainArea([], { area: 'knee', intensity: 9, kind: 'achy' }, DATE);
    expect(knee.intensity).toBe(5);
  });
});

describe('avoidExercise', () => {
  it('avoids the exercise for 14 days', () => {
    expect(avoidExercise([], 'wall-push-up', DATE)).toEqual([
      { exerciseId: 'wall-push-up', until: '2026-11-11' },
    ]);
  });

  it('starts the 14 days over when reported again', () => {
    const avoided = [
      { exerciseId: 'wall-push-up', until: '2026-11-01' },
      { exerciseId: 'seated-marching', until: '2026-11-02' },
    ];
    expect(avoidExercise(avoided, 'wall-push-up', DATE)).toEqual([
      { exerciseId: 'seated-marching', until: '2026-11-02' },
      { exerciseId: 'wall-push-up', until: '2026-11-11' },
    ]);
  });
});

describe('Pain tab edits', () => {
  it('upsertPainArea adds or replaces', () => {
    const list = upsertPainArea([pain('neck', 2)], pain('knee', 3));
    expect(list).toEqual([pain('neck', 2), pain('knee', 3)]);
    expect(upsertPainArea(list, pain('neck', 4, 'stiff'))).toEqual([
      pain('neck', 4, 'stiff'),
      pain('knee', 3),
    ]);
  });

  it('removePainArea removes only that area', () => {
    expect(removePainArea([pain('neck', 2), pain('knee', 3)], 'neck')).toEqual([pain('knee', 3)]);
  });
});
