import {
  isZoneSelected,
  setIntensity,
  setKind,
  setSide,
  toggleArea,
  toggleZone,
  type PainSelection,
} from '../painSelection';

const knee = (side: PainSelection['side']): PainSelection => ({
  area: 'knee',
  side,
  intensity: null,
  kind: 'achy',
});

describe('toggleZone (body map)', () => {
  it('adds a paired area on the tapped side', () => {
    expect(toggleZone([], 'knee', 'left')).toEqual([knee('left')]);
  });

  it('removes it when the same side is tapped again', () => {
    expect(toggleZone([knee('left')], 'knee', 'left')).toEqual([]);
  });

  it('becomes both sides when the other side is tapped', () => {
    expect(toggleZone([knee('left')], 'knee', 'right')).toEqual([knee('both')]);
  });

  it('keeps the other side when one side of "both" is tapped', () => {
    expect(toggleZone([knee('both')], 'knee', 'left')).toEqual([knee('right')]);
  });

  it('toggles unpaired areas on and off', () => {
    const added = toggleZone([], 'lower_back', null);
    expect(added).toEqual([{ area: 'lower_back', side: 'both', intensity: null, kind: 'achy' }]);
    expect(toggleZone(added, 'lower_back', null)).toEqual([]);
  });

  it('keeps intensity and kind when the side changes', () => {
    const start = [{ ...knee('left'), intensity: 3 as const, kind: 'stiff' as const }];
    expect(toggleZone(start, 'knee', 'right')).toEqual([
      { area: 'knee', side: 'both', intensity: 3, kind: 'stiff' },
    ]);
  });
});

describe('chips and setters', () => {
  it('toggleArea adds both sides or removes the area', () => {
    expect(toggleArea([], 'knee')).toEqual([knee('both')]);
    expect(toggleArea([knee('left')], 'knee')).toEqual([]);
  });

  it('sets side, intensity and kind for one area only', () => {
    const list: PainSelection[] = [knee('both'), { ...knee('both'), area: 'hip' }];
    expect(setSide(list, 'knee', 'right')[0].side).toBe('right');
    expect(setIntensity(list, 'knee', 4)[0].intensity).toBe(4);
    expect(setKind(list, 'knee', 'sharp')[0].kind).toBe('sharp');
    expect(setKind(list, 'knee', 'sharp')[1].kind).toBe('achy');
  });

  it('isZoneSelected follows the side', () => {
    expect(isZoneSelected([knee('left')], 'knee', 'left')).toBe(true);
    expect(isZoneSelected([knee('left')], 'knee', 'right')).toBe(false);
    expect(isZoneSelected([knee('both')], 'knee', 'right')).toBe(true);
    expect(isZoneSelected([], 'knee', 'left')).toBe(false);
  });
});
