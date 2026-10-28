import AsyncStorage from '@react-native-async-storage/async-storage';

import { makeProfile } from '@/engine/__fixtures__/profiles';

import {
  DEFAULT_EQUIPMENT,
  initialDraft,
  toProfileDraft,
  useOnboardingStore,
} from '../onboardingStore';
import { useHistoryStore } from '../historyStore';
import { useProfileStore } from '../profileStore';

describe('onboarding draft', () => {
  beforeEach(() => useOnboardingStore.getState().reset());

  it('starts with chair and towel checked', () => {
    expect(DEFAULT_EQUIPMENT).toEqual(['chair', 'towel']);
    expect(useOnboardingStore.getState().draft.equipment).toEqual(['chair', 'towel']);
  });

  it('is not ready without an age band', () => {
    expect(toProfileDraft(initialDraft())).toBeNull();
  });

  it('is not ready while a pain area has no intensity', () => {
    const draft = {
      ...initialDraft(),
      ageBand: '50-59' as const,
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
