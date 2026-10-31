// Screen tests for the "It hurts" flow: report, safety, swap and preview.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { render, screen, userEvent, within } from '@testing-library/react-native';
import { Linking } from 'react-native';

import HurtScreen from '../../app/hurt/index';
import PreviewScreen from '../../app/hurt/preview';
import SafetyScreen from '../../app/hurt/safety';
import SwapScreen from '../../app/hurt/swap';
import { ALL_AREAS, makeProfile, pain } from '@/engine/__fixtures__/profiles';
import { currentItem } from '@/engine/session';
import type { GeneratedWorkout } from '@/engine/types';
import { setLanguage } from '@/i18n';
import { useHistoryStore } from '@/store/historyStore';
import { useHurtStore } from '@/store/hurtStore';
import { useProfileStore } from '@/store/profileStore';
import { useSessionStore } from '@/store/sessionStore';

const mockRouter = { push: jest.fn(), back: jest.fn(), replace: jest.fn(), dismissTo: jest.fn() };
jest.mock('expo-router', () => ({ useRouter: () => mockRouter }));

const TODAY = '2026-10-28';

function workout(...ids: string[]): GeneratedWorkout {
  return {
    date: TODAY,
    items: ids.map((exerciseId) => ({
      exerciseId,
      section: 'main',
      dosage: { kind: 'reps', sets: 2, reps: 10 },
      perSide: false,
    })),
    skippedPatterns: [],
    estimatedSec: 0,
  };
}

const session = () => useSessionStore.getState().session!;
const profile = () => useProfileStore.getState().profile!;

let user: ReturnType<typeof userEvent.setup>;

beforeAll(async () => {
  await setLanguage('es');
});

beforeEach(async () => {
  jest.clearAllMocks();
  user = userEvent.setup();
  await AsyncStorage.clear();
  useProfileStore.setState({ profile: makeProfile({ painAreas: [] }) });
  useHistoryStore.setState({ logs: [] });
  useHurtStore.getState().clear();
  useSessionStore.getState().start(workout('wall-push-up', 'supported-tandem-stand'), false);
});

// Fills in the report and presses Continue.
async function report(area: string | null, intensity: string, sharp = false) {
  await render(<HurtScreen />);
  if (area) await user.press(screen.getByRole('button', { name: area }));
  await user.press(
    within(screen.getByTestId('hurt-intensity')).getByRole('radio', { name: intensity }),
  );
  if (sharp) await user.press(screen.getByRole('switch', { name: '¿Es un dolor punzante?' }));
  await user.press(screen.getByRole('button', { name: 'Continuar' }));
}

describe('"It hurts" report', () => {
  it('offers the areas the exercise loads first, with the first one picked', async () => {
    await render(<HurtScreen />);
    expect(screen.getByRole('button', { name: 'Hombro' })).toBeSelected();
    expect(screen.getByRole('button', { name: 'Codo' })).not.toBeSelected();
    expect(screen.getByRole('button', { name: 'Muñeca' })).not.toBeSelected();
    expect(screen.queryByRole('button', { name: 'Rodilla' })).toBeNull();
    // Continue waits for the intensity.
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeDisabled();
  });

  it('"Another area" shows the rest, and only one area is picked', async () => {
    await render(<HurtScreen />);
    await user.press(screen.getByRole('button', { name: 'Otra zona' }));
    await user.press(screen.getByRole('button', { name: 'Rodilla' }));
    expect(screen.getByRole('button', { name: 'Rodilla' })).toBeSelected();
    expect(screen.getByRole('button', { name: 'Hombro' })).not.toBeSelected();
  });

  it('"Back to the exercise" records nothing', async () => {
    await render(<HurtScreen />);
    await user.press(screen.getByRole('button', { name: 'Volver al ejercicio' }));
    expect(mockRouter.back).toHaveBeenCalled();
    expect(profile().painAreas).toEqual([]);
    expect(currentItem(session())?.painReported).toBeUndefined();
  });

  it('saves the report on the item, avoids the exercise for 14 days and raises the area', async () => {
    await report('Muñeca', 'Algo, 3 de 5');
    expect(currentItem(session())?.painReported).toEqual({
      area: 'wrist',
      intensity: 3,
      kind: 'achy',
    });
    expect(profile().avoided).toEqual([{ exerciseId: 'wall-push-up', until: '2026-11-11' }]);
    expect(profile().painAreas).toEqual([
      { area: 'wrist', side: 'both', intensity: 3, kind: 'achy', updatedAt: TODAY },
    ]);
    expect(mockRouter.replace).toHaveBeenCalledWith('/hurt/swap');
  });
});

describe('swap suggestion', () => {
  it('suggests the same movement without the painful area, and the session goes on', async () => {
    useSessionStore.getState().completeSet();
    useSessionStore.getState().skipRest(); // set 1 done, on set 2
    await report('Muñeca', 'Algo, 3 de 5');

    await render(<SwapScreen />);
    expect(screen.getByTestId('swap-suggestion')).toHaveTextContent(
      /Empujar botellas al frente sentado.*Es la versión sentada/,
    );
    await user.press(screen.getByRole('button', { name: 'Cambiar y seguir' }));

    expect(mockRouter.dismissTo).toHaveBeenCalledWith('/workout/session');
    expect(session().index).toBe(0);
    expect(session().set).toBe(2);
    expect(currentItem(session())).toMatchObject({
      exerciseId: 'seated-bottle-chest-press',
      swappedFrom: 'wall-push-up',
      setsDone: 1,
      painReported: { area: 'wrist', intensity: 3, kind: 'achy' },
    });

    // The log keeps both.
    useSessionStore.getState().end();
    expect(useHistoryStore.getState().logs[0].items[0]).toMatchObject({
      exerciseId: 'seated-bottle-chest-press',
      swappedFrom: 'wall-push-up',
      painReported: { area: 'wrist' },
    });
  });

  it('a squat with knee pain suggests a hip exercise that does not load the knee', async () => {
    useSessionStore.getState().start(workout('supported-mini-squat', 'wall-push-up'), false);
    await report(null, 'Algo, 3 de 5'); // knee is the first area of the squat
    const { result } = useHurtStore.getState();
    expect(result?.type).toBe('swap');
    if (result?.type === 'swap') {
      expect(result.exercise.pattern).toBe('hinge');
      expect(result.exercise.loads).not.toContain('knee');
    }
  });

  it('"Preview" shows the steps and the mistakes, then uses the exercise', async () => {
    await report('Muñeca', 'Algo, 3 de 5');
    await render(<SwapScreen />);
    await user.press(screen.getByRole('button', { name: 'Ver ejercicio' }));
    expect(mockRouter.push).toHaveBeenCalledWith('/hurt/preview');

    await render(<PreviewScreen />);
    expect(screen.getByText('Empujar botellas al frente sentado')).toBeOnTheScreen();
    expect(screen.getByText('Cómo hacerlo')).toBeOnTheScreen();
    expect(screen.getByText('Cómo NO hacerlo')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Usar este ejercicio' }));
    expect(currentItem(session())?.exerciseId).toBe('seated-bottle-chest-press');
    expect(mockRouter.dismissTo).toHaveBeenCalledWith('/workout/session');
  });

  it('"Skip and rest" rests, then goes on to the next exercise', async () => {
    await report('Muñeca', 'Algo, 3 de 5');
    await render(<SwapScreen />);
    await user.press(screen.getByRole('button', { name: 'Saltar y descansar' }));
    expect(session().phase.kind).toBe('rest');
    useSessionStore.getState().skipRest();
    expect(currentItem(session())?.exerciseId).toBe('supported-tandem-stand');
  });

  it('with nothing that fits, suggests a rest', async () => {
    useProfileStore.setState({
      profile: makeProfile({ painAreas: ALL_AREAS.map((area) => pain(area, 3)) }),
    });
    await report('Muñeca', 'Algo, 3 de 5');
    await render(<SwapScreen />);
    expect(screen.getByText('Mejor descansa')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Cambiar y seguir' })).toBeNull();
    await user.press(screen.getByRole('button', { name: 'Descansar y seguir' }));
    expect(session().phase.kind).toBe('rest');
  });
});

describe('safety screen', () => {
  it('sharp pain goes to Safety, never to a swap, and is still recorded', async () => {
    await report('Muñeca', 'Leve, 2 de 5', true);
    expect(mockRouter.replace).toHaveBeenCalledWith('/hurt/safety');
    expect(useHurtStore.getState().result).toEqual({ type: 'safety' });
    expect(profile().painAreas[0]).toMatchObject({ area: 'wrist', kind: 'sharp' });

    await render(<SafetyScreen />);
    expect(screen.getByText('Para y descansa')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Cambiar y seguir' })).toBeNull();
  });

  it('the worst pain (5) goes to Safety', async () => {
    await report('Muñeca', 'Muy fuerte, 5 de 5');
    expect(mockRouter.replace).toHaveBeenCalledWith('/hurt/safety');
  });

  it('"Chest pain or dizziness?" opens Safety right away, with no pain recorded', async () => {
    await render(<HurtScreen />);
    await user.press(screen.getByRole('button', { name: '¿Dolor de pecho o mareo?' }));
    expect(mockRouter.replace).toHaveBeenCalledWith('/hurt/safety');
    expect(profile().painAreas).toEqual([]);
    expect(currentItem(session())?.painReported).toBeUndefined();
  });

  it('calls 911', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    await render(<SafetyScreen />);
    await user.press(screen.getByRole('button', { name: 'Llamar al 911' }));
    expect(openURL).toHaveBeenCalledWith('tel:911');
  });

  it('"I\'m OK" rests and then opens the next exercise, not the one that hurt', async () => {
    await render(<SafetyScreen />);
    await user.press(screen.getByRole('button', { name: 'Estoy bien, seguir' }));
    expect(mockRouter.dismissTo).toHaveBeenCalledWith('/workout/session');
    expect(session().phase.kind).toBe('rest');
    useSessionStore.getState().skipRest();
    expect(currentItem(session())?.exerciseId).toBe('supported-tandem-stand');
  });

  it('"End workout" ends the session and saves the log', async () => {
    await render(<SafetyScreen />);
    await user.press(screen.getByRole('button', { name: 'Terminar el entrenamiento' }));
    expect(session().phase.kind).toBe('finished');
    expect(useHistoryStore.getState().logs).toHaveLength(1);
    expect(mockRouter.dismissTo).toHaveBeenCalledWith('/workout/session');
  });
});
