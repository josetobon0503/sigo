import AsyncStorage from '@react-native-async-storage/async-storage';

import { makeProfile } from '@/engine/__fixtures__/profiles';

import {
  DEFAULT_EQUIPMENT,
  initialDraft,
  toProfileDraft,
  useOnboardingStore,
} from '../onboardingStore';
import { useHistoryStore } from '../historyStore';
import { migrateProfile, useProfileStore } from '../profileStore';

describe('onboarding draft', () => {
  beforeEach(() => useOnboardingStore.getState().reset());

  it('starts with chair, towel and bed checked', () => {
    expect(DEFAULT_EQUIPMENT).toEqual(['chair', 'towel', 'bed']);
    expect(useOnboardingStore.getState().draft.equipment).toEqual(['chair', 'towel', 'bed']);
  });

  it('is not ready without an age band', () => {
    expect(toProfileDraft({ ...initialDraft(), activity: 'some', floorOk: false })).toBeNull();
  });

  it('is not ready without an activity level or the floor answer', () => {
    const base = { ...initialDraft(), ageBand: '50-59' as const };
    expect(toProfileDraft({ ...base, floorOk: false })).toBeNull();
    expect(toProfileDraft({ ...base, activity: 'some' })).toBeNull();
    expect(toProfileDraft({ ...base, activity: 'some', floorOk: false })).toMatchObject({
      activity: 'some',
      floorOk: false,
    });
  });

  it('is not ready while a pain area has no intensity', () => {
    const draft = {
      ...initialDraft(),
      ageBand: '50-59' as const,
      activity: 'low' as const,
      floorOk: true,
      painAreas: [
        { area: 'knee' as const, side: 'left' as const, intensity: null, kind: 'achy' as const },
      ],
    };
    expect(toProfileDraft(draft)).toBeNull();
    const done = { ...draft, painAreas: [{ ...draft.painAreas[0], intensity: 3 as const }] };
    expect(toProfileDraft(done)?.painAreas).toEqual([
      { area: 'knee', side: 'left', intensity: 3, kind: 'achy' },
    ]);
  });

  it('reset clears the draft', () => {
    useOnboardingStore.getState().update({ name: 'María' });
    useOnboardingStore.getState().reset();
    expect(useOnboardingStore.getState().draft.name).toBe('');
  });
});

describe('profile migration', () => {
  it('version 1 profiles get no activity level, floor off, and keep their levels', () => {
    const {
      activity: _a,
      floorOk: _f,
      ...old
    } = makeProfile({
      levels: { ...makeProfile().levels, squat: 4 },
    });
    const migrated = migrateProfile({ profile: old }, 1);
    expect(migrated.profile?.activity).toBeNull();
    expect(migrated.profile?.floorOk).toBe(false);
    expect(migrated.profile?.levels.squat).toBe(4);
  });

  it('version 3 profiles get the bed, once', () => {
    const old = makeProfile({ equipment: ['chair', 'towel'] });
    expect(migrateProfile({ profile: old }, 3).profile?.equipment).toEqual([
      'chair',
      'towel',
      'bed',
    ]);
    const withBed = makeProfile({ equipment: ['bed', 'chair'] });
    expect(migrateProfile({ profile: withBed }, 3).profile?.equipment).toEqual(['bed', 'chair']);
  });

  it('version 2 "regular" becomes "daily" (both level 3)', () => {
    const { floorOk: _f, ...old } = makeProfile();
    const migrated = migrateProfile({ profile: { ...old, activity: 'regular' } }, 2);
    expect(migrated.profile).toMatchObject({ activity: 'daily', floorOk: false });
  });

  it('keeps an empty profile', () => {
    expect(migrateProfile({ profile: null }, 1)).toEqual({ profile: null });
  });
});

describe('profile store', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    useProfileStore.setState({ profile: null });
  });

  it('saves the profile on the device', async () => {
    useProfileStore.getState().completeOnboarding(makeProfile({ name: 'María' }));
    const saved = JSON.parse((await AsyncStorage.getItem('sigo-profile')) ?? '{}');
    expect(saved.state.profile.name).toBe('María');
    expect(saved.state.hydrated).toBeUndefined();
  });

  it('loads the saved profile and marks itself hydrated', async () => {
    useProfileStore.setState({ hydrated: false });
    await AsyncStorage.setItem(
      'sigo-profile',
      JSON.stringify({ state: { profile: makeProfile({ name: 'Roberto' }) }, version: 1 }),
    );
    await useProfileStore.persist.rehydrate();
    expect(useProfileStore.getState().profile?.name).toBe('Roberto');
    expect(useProfileStore.getState().hydrated).toBe(true);
  });

  it('updates fields and ignores updates with no profile', () => {
    useProfileStore.getState().updateProfile({ name: 'Nadie' });
    expect(useProfileStore.getState().profile).toBeNull();
    useProfileStore.getState().completeOnboarding(makeProfile());
    useProfileStore.getState().updateProfile({ seatedOnly: true });
    expect(useProfileStore.getState().profile?.seatedOnly).toBe(true);
  });

  it('resetOnboarding removes the profile', () => {
    useProfileStore.getState().completeOnboarding(makeProfile());
    useProfileStore.getState().resetOnboarding();
    expect(useProfileStore.getState().profile).toBeNull();
  });
});

describe('history store', () => {
  const log = { id: 'a', date: '2026-10-28', durationSec: 600, items: [] };

  beforeEach(async () => {
    await AsyncStorage.clear();
    useHistoryStore.setState({ logs: [] });
  });

  it('saves workouts on the device and adds the feeling later', async () => {
    useHistoryStore.getState().addLog(log);
    useHistoryStore.getState().setFeeling('a', 'tired');
    const saved = JSON.parse((await AsyncStorage.getItem('sigo-history')) ?? '{}');
    expect(saved.state.logs).toEqual([{ ...log, feeling: 'tired' }]);
    expect(saved.state.hydrated).toBeUndefined();
  });

  it('replaces a log saved twice instead of repeating it', () => {
    useHistoryStore.getState().addLog(log);
    useHistoryStore.getState().addLog({ ...log, durationSec: 700 });
    expect(useHistoryStore.getState().logs).toEqual([{ ...log, durationSec: 700 }]);
  });

  it('loads the saved history and marks itself hydrated', async () => {
    useHistoryStore.setState({ hydrated: false });
    await AsyncStorage.setItem(
      'sigo-history',
      JSON.stringify({ state: { logs: [log] }, version: 1 }),
    );
    await useHistoryStore.persist.rehydrate();
    expect(useHistoryStore.getState().logs).toEqual([log]);
    expect(useHistoryStore.getState().hydrated).toBe(true);
  });
});
