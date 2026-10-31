// Screen tests for the Today tab and the workout session.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, render, screen, userEvent } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { Alert } from 'react-native';

import ProfileScreen from '../../app/(tabs)/profile';
import TodayScreen from '../../app/(tabs)/index';
import FinishScreen from '../../app/workout/finish';
import HarderScreen from '../../app/workout/harder';
import SessionScreen from '../../app/workout/session';
import { levelsAt, makeProfile, pain } from '@/engine/__fixtures__/profiles';
import { currentItem } from '@/engine/session';
import type { GeneratedWorkout, WorkoutLog } from '@/engine/types';
import { formatDosage, spokenDosage } from '@/i18n/format';
import i18n, { setLanguage } from '@/i18n';
import { useDevStore } from '@/store/devStore';
import { useHistoryStore } from '@/store/historyStore';
import { useProfileStore } from '@/store/profileStore';
import { useSessionStore } from '@/store/sessionStore';

const mockRouter = { push: jest.fn(), back: jest.fn(), replace: jest.fn(), dismissTo: jest.fn() };
jest.mock('expo-router', () => {
  const { useEffect } = jest.requireActual<typeof import('react')>('react');
  return {
    useRouter: () => mockRouter,
    // Rendered alone, a screen is always the focused one.
    useFocusEffect: (effect: () => void) => useEffect(effect, [effect]),
  };
});

const TODAY = '2026-10-28';

// A short workout: one reps exercise per side, then a timed one per side.
const SHORT: GeneratedWorkout = {
  date: TODAY,
  items: [
    {
      exerciseId: 'seated-knee-extension', // level 1, so the rest is 45 s
      section: 'main',
      dosage: { kind: 'reps', sets: 1, reps: 10 },
      perSide: true,
    },
    {
      exerciseId: 'supported-tandem-stand',
      section: 'main',
      dosage: { kind: 'time', sets: 1, seconds: 20 },
      perSide: true,
    },
  ],
  skippedPatterns: [],
  estimatedSec: 120,
};

const advance = (ms: number) =>
  act(async () => {
    jest.advanceTimersByTime(ms);
  });

let user: ReturnType<typeof userEvent.setup>;

beforeAll(async () => {
  await setLanguage('es');
});

beforeEach(async () => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  jest.setSystemTime(new Date(2026, 9, 28, 10, 0, 0));
  user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
  await AsyncStorage.clear();
  useProfileStore.setState({ profile: makeProfile({ painAreas: [] }) });
  useHistoryStore.setState({ logs: [] });
  useSessionStore.setState({ session: null, logId: null, progressed: false, updatedAt: 0 });
  useDevStore.setState({ dayOffset: 0 });
});

afterEach(() => {
  jest.useRealTimers();
});

describe('Today screen', () => {
  it('shows the day, the summary, the list and the equipment', async () => {
    await render(<TodayScreen />);
    expect(screen.getByTestId('today-day')).toHaveTextContent('Miércoles, 28 de octubre');
    expect(screen.getByTestId('today-summary')).toHaveTextContent(/\d+ min · \d+ ejercicios/);
    expect(screen.getByText('Para calentar')).toBeOnTheScreen();
    expect(screen.getByText('Equipo necesario')).toBeOnTheScreen();
    expect(screen.queryByTestId('considered-pill')).toBeNull();
    expect(screen.getByRole('button', { name: 'Empezar' })).toBeOnTheScreen();
  });

  it('shows the areas it considered and why a pattern was skipped', async () => {
    // No bed and no floor: nothing lying down can stand in for the squat.
    useProfileStore.setState({
      profile: makeProfile({
        painAreas: [pain('knee', 4), pain('lower_back', 2)],
        equipment: ['chair', 'wall', 'bottles', 'towel'],
      }),
    });
    await render(<TodayScreen />);
    expect(screen.getByTestId('considered-pill')).toHaveTextContent(
      'Consideramos: rodilla y espalda baja',
    );
    expect(
      screen.getByText('Hoy no hicimos sentadillas para cuidar tu rodilla.'),
    ).toBeOnTheScreen();
  });

  it('starts the session', async () => {
    await render(<TodayScreen />);
    await user.press(screen.getByRole('button', { name: 'Empezar' }));
    expect(useSessionStore.getState().session?.date).toBe(TODAY);
    expect(mockRouter.push).toHaveBeenCalledWith('/workout/session');
  });

  it('says so when the user already trained today, with a way to repeat', async () => {
    const log: WorkoutLog = {
      id: 'x',
      date: TODAY,
      durationSec: 900,
      items: [{ exerciseId: 'seated-marching', completed: true }],
    };
    useHistoryStore.setState({ logs: [log] });
    await render(<TodayScreen />);
    expect(screen.getByText('¡Ya entrenaste hoy!')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Empezar' })).toBeNull();
    await user.press(screen.getByRole('button', { name: 'Repetir la rutina' }));
    expect(mockRouter.push).toHaveBeenCalledWith('/workout/session');
  });
});

describe('"Now to the bed"', () => {
  // Seated only at level 2: the level 2 exercises it can do are all lying down.
  const inBed = (floorOk: boolean) =>
    makeProfile({ levels: levelsAt(2), seatedOnly: true, floorOk, painAreas: [] });

  it('Today says it once, before the first exercise lying down', async () => {
    useProfileStore.setState({ profile: inBed(true) });
    await render(<TodayScreen />);
    expect(screen.getAllByTestId('lying-notice')).toHaveLength(1);
    expect(screen.getByText('Ahora a la cama (o al piso)')).toBeOnTheScreen();
  });

  it('says only "the bed" without floorOk', async () => {
    useProfileStore.setState({ profile: inBed(false) });
    await render(<TodayScreen />);
    expect(screen.getByText('Ahora a la cama')).toBeOnTheScreen();
  });

  it('the rest says it when the next exercise is the first lying down', async () => {
    useProfileStore.setState({ profile: inBed(true) });
    useSessionStore.getState().start(
      {
        ...SHORT,
        items: [
          { ...SHORT.items[0], dosage: { kind: 'reps', sets: 1, reps: 8 } },
          { ...SHORT.items[0], exerciseId: 'pelvic-tilt', perSide: false },
          { ...SHORT.items[0], exerciseId: 'heel-slide' },
        ],
      },
      true,
    );
    await render(<SessionScreen />);
    await user.press(screen.getByRole('button', { name: 'Hecho' }));
    expect(screen.getByTestId('up-next')).toHaveTextContent(/Ahora a la cama \(o al piso\)/);
    await user.press(screen.getByRole('button', { name: 'Saltar' }));
    for (let i = 0; i < 2; i++) {
      await user.press(screen.getByRole('button', { name: 'Hecho' }));
      if (screen.queryByRole('button', { name: 'Saltar' })) break;
    }
    // From lying down to lying down: no notice.
    expect(screen.queryByTestId('lying-notice')).toBeNull();
  });
});

describe('dosage text', () => {
  it('says "per side" for one-sided exercises', async () => {
    const t = i18n.t.bind(i18n);
    expect(formatDosage(t, { kind: 'reps', sets: 2, reps: 10 }, true)).toBe('2 × 10 por lado');
    expect(formatDosage(t, { kind: 'time', sets: 2, seconds: 30 }, true)).toBe('2 × 30 s por lado');
    expect(formatDosage(t, { kind: 'reps', sets: 2, reps: 10 }, false)).toBe('2 × 10');
    await setLanguage('en');
    expect(formatDosage(i18n.t.bind(i18n), { kind: 'reps', sets: 2, reps: 10 }, true)).toBe(
      '2 × 10 per side',
    );
    await setLanguage('es');
  });

  it('level 5 says to lower in 3 seconds', () => {
    const t = i18n.t.bind(i18n);
    const slow = { kind: 'reps', sets: 3, reps: 8, slow: true } as const;
    expect(formatDosage(t, slow, false)).toBe('3 × 8 · baja en 3 s');
    expect(formatDosage(t, slow, true)).toBe('3 × 8 por lado · baja en 3 s');
    expect(spokenDosage(t, slow, true)).toBe(
      '3 series de 8 repeticiones, por lado, bajando en 3 segundos',
    );
  });
});

describe('workout session', () => {
  beforeEach(() => {
    useSessionStore.getState().start(SHORT, false);
  });

  it('runs a whole workout and saves the log', async () => {
    await render(<SessionScreen />);
    expect(screen.getByText('Ejercicio 1 de 2')).toBeOnTheScreen();
    expect(screen.getByTestId('set-progress')).toHaveTextContent('Serie 1 de 1');
    expect(screen.getByText('Estirar la rodilla sentado')).toBeOnTheScreen();
    expect(screen.getByTestId('big-reps')).toHaveTextContent('10repeticiones por lado');

    await user.press(screen.getByRole('button', { name: 'Hecho' }));
    expect(Haptics.impactAsync).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Descansa')).toBeOnTheScreen();
    expect(screen.getByTestId('rest-timer')).toHaveTextContent('45segundos'); // level 1
    expect(screen.getByTestId('up-next')).toHaveTextContent(
      /Un pie delante del otro con apoyo.*1 × 20 s por lado/,
    );

    // The rest ends by itself.
    await advance(45_000 + 250); // the clock ticks every 250 ms
    expect(screen.getByText('Ejercicio 2 de 2')).toBeOnTheScreen();
    expect(screen.getByTestId('side-label')).toHaveTextContent('Primer lado');
    expect(screen.getByTestId('big-timer')).toHaveTextContent('20segundos por lado');

    await user.press(screen.getByRole('button', { name: 'Empezar' }));
    await advance(10_000 + 250);
    expect(screen.getByTestId('big-timer')).toHaveTextContent(/^10segundos/);
    await advance(11_000);
    expect(screen.getByTestId('side-label')).toHaveTextContent('Cambia de lado');
    await advance(5_000);
    expect(screen.getByTestId('side-label')).toHaveTextContent('Otro lado');
    await advance(20_000);

    expect(mockRouter.replace).toHaveBeenCalledWith('/workout/finish');
    expect(Haptics.impactAsync).toHaveBeenCalledTimes(2);
    const [log] = useHistoryStore.getState().logs;
    expect(log.items).toEqual([
      { exerciseId: 'seated-knee-extension', completed: true },
      { exerciseId: 'supported-tandem-stand', completed: true },
    ]);
    // The 45 s rest plus 45 s of timer (20 + 5 to switch + 20), and a moment for the taps.
    expect(log.durationSec).toBeGreaterThanOrEqual(90);
    expect(log.durationSec).toBeLessThanOrEqual(95);
  });

  it('can skip the rest', async () => {
    await render(<SessionScreen />);
    await user.press(screen.getByRole('button', { name: 'Hecho' }));
    await user.press(screen.getByRole('button', { name: 'Saltar' }));
    expect(screen.getByText('Ejercicio 2 de 2')).toBeOnTheScreen();
  });

  it('pauses the timer', async () => {
    useSessionStore.getState().completeSet();
    useSessionStore.getState().skipRest();
    await render(<SessionScreen />);
    await user.press(screen.getByRole('button', { name: 'Empezar' }));
    await advance(5_000);
    await user.press(screen.getByRole('button', { name: 'Pausa' }));
    await advance(60_000);
    expect(screen.getByTestId('big-timer')).toHaveTextContent(/^1[45]/);
    expect(screen.getByRole('button', { name: 'Seguir' })).toBeOnTheScreen();
  });

  it('asks before leaving and saves an incomplete log', async () => {
    const alert = jest.spyOn(Alert, 'alert');
    await render(<SessionScreen />);
    await user.press(screen.getByRole('button', { name: 'Salir' }));
    expect(alert).toHaveBeenCalledWith(
      '¿Seguro que quieres terminar?',
      'Guardamos lo que ya hiciste.',
      expect.any(Array),
    );
    const buttons = alert.mock.calls[0][2]!;
    await act(async () => {
      buttons.find((b) => b.style === 'destructive')!.onPress!();
    });
    expect(mockRouter.replace).toHaveBeenCalledWith('/workout/finish');
    expect(useHistoryStore.getState().logs[0].items.every((i) => !i.completed)).toBe(true);
  });

  it('"It hurts" pauses the timer and opens the "It hurts" flow', async () => {
    useSessionStore.getState().completeSet();
    useSessionStore.getState().skipRest();
    await render(<SessionScreen />);
    await user.press(screen.getByRole('button', { name: 'Empezar' }));
    await user.press(screen.getByRole('button', { name: 'Me duele' }));
    expect(mockRouter.push).toHaveBeenCalledWith('/hurt');
    const phase = useSessionStore.getState().session?.phase;
    expect(phase?.kind === 'exercise' && phase.timer.status).toBe('paused');
  });

  it('the finish screen saves how the user feels', async () => {
    useSessionStore.getState().completeSet();
    useSessionStore.getState().skipRest();
    useSessionStore.getState().completeSet();
    await render(<FinishScreen />);
    expect(screen.getByText('¡Terminaste!')).toBeOnTheScreen();
    expect(screen.getByTestId('finish-summary')).toHaveTextContent(/2 ejercicios/);
    await user.press(screen.getByRole('radio', { name: 'Bien, 2 de 5' }));
    expect(useHistoryStore.getState().logs[0].feeling).toBe('good');
    expect(screen.getByText('¡Gracias! Lo guardamos.')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Volver a Hoy' }));
    expect(mockRouter.dismissTo).toHaveBeenCalledWith('/');
  });
});

describe('"Too easy"', () => {
  const item = () => currentItem(useSessionStore.getState().session!)!;

  beforeEach(() => {
    useSessionStore.getState().start(SHORT, false);
  });

  it('is a small text button, pauses the timer, counts as "easy" and opens the offer', async () => {
    useSessionStore.getState().completeSet();
    useSessionStore.getState().skipRest(); // the timed exercise
    await render(<SessionScreen />);
    await user.press(screen.getByRole('button', { name: 'Empezar' }));
    await user.press(screen.getByRole('button', { name: 'Está muy fácil' }));
    expect(mockRouter.push).toHaveBeenCalledWith('/workout/harder');
    const phase = useSessionStore.getState().session?.phase;
    expect(phase?.kind === 'exercise' && phase.timer.status).toBe('paused');
    expect(item().rating).toBe('easy');
  });

  it('offers a harder exercise of the same movement and swaps it in', async () => {
    await render(<HarderScreen />);
    expect(screen.getByText('¿Probar uno más difícil?')).toBeOnTheScreen();
    expect(screen.getByTestId('harder-suggestion')).toHaveTextContent(
      /Sentarse y pararse con ayuda de las manos/,
    );
    await user.press(screen.getByRole('button', { name: 'Cambiar y seguir' }));
    expect(item()).toMatchObject({
      exerciseId: 'sit-to-stand-with-hands',
      swappedFrom: 'seated-knee-extension',
    });
    expect(mockRouter.back).toHaveBeenCalled();
  });

  it('"Keep this one" changes nothing', async () => {
    await render(<HarderScreen />);
    await user.press(screen.getByRole('button', { name: 'Seguir con este' }));
    expect(item().exerciseId).toBe('seated-knee-extension');
    expect(mockRouter.back).toHaveBeenCalled();
  });

  it('at the top level, suggests going slower', async () => {
    useSessionStore.getState().start(
      {
        ...SHORT,
        items: [{ ...SHORT.items[0], exerciseId: 'backpack-reverse-lunge' }],
      },
      false,
    );
    await render(<HarderScreen />);
    expect(screen.getByText('Ya estás en el nivel más alto de este ejercicio')).toBeOnTheScreen();
    expect(screen.getByText(/más lento y controlado/)).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Seguir' }));
    expect(mockRouter.back).toHaveBeenCalled();
  });
});

describe('"How was it?" and progression', () => {
  beforeEach(() => {
    useProfileStore.setState({ profile: makeProfile({ levels: levelsAt(2), painAreas: [] }) });
    useSessionStore.getState().start(SHORT, false);
  });

  it('asks after the last set of a main exercise, and the answer goes to the log', async () => {
    await render(<SessionScreen />);
    expect(screen.queryByTestId('rating')).toBeNull();
    await user.press(screen.getByRole('button', { name: 'Hecho' }));
    expect(screen.getByText('¿Cómo estuvo?')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Difícil' }));
    expect(screen.getByRole('button', { name: 'Difícil' })).toBeSelected();
    expect(screen.getByRole('button', { name: 'Muy fácil' })).not.toBeSelected();

    useSessionStore.getState().end();
    expect(useHistoryStore.getState().logs[0].items[0]).toMatchObject({
      exerciseId: 'seated-knee-extension',
      rating: 'hard',
    });
  });

  it('is optional: the rest goes on without an answer', async () => {
    await render(<SessionScreen />);
    await user.press(screen.getByRole('button', { name: 'Hecho' }));
    await user.press(screen.getByRole('button', { name: 'Saltar' }));
    expect(screen.getByText('Ejercicio 2 de 2')).toBeOnTheScreen();
  });

  it('"Very easy" raises that pattern by 1 when leaving the finish screen, only once', async () => {
    useSessionStore.getState().completeSet();
    useSessionStore.getState().rate(0, 'easy');
    useSessionStore.getState().skipRest();
    useSessionStore.getState().completeSet();
    const finish = await render(<FinishScreen />);
    await user.press(screen.getByRole('button', { name: 'Volver a Hoy' }));
    expect(useProfileStore.getState().profile?.levels).toEqual({ ...levelsAt(2), squat: 3 });
    await finish.unmount(); // closing the screen does not apply it again
    expect(useProfileStore.getState().profile?.levels.squat).toBe(3);
  });

  it('closing the finish screen also applies the progression', async () => {
    useSessionStore.getState().completeSet();
    useSessionStore.getState().rate(0, 'easy');
    useSessionStore.getState().end();
    const finish = await render(<FinishScreen />);
    await finish.unmount();
    expect(useProfileStore.getState().profile?.levels.squat).toBe(3);
  });
});

describe('simulate another day (development)', () => {
  it('moves the date used by Today', async () => {
    await render(<ProfileScreen />);
    expect(screen.getByTestId('simulated-date')).toHaveTextContent(
      'Fecha: Miércoles, 28 de octubre',
    );
    await user.press(screen.getByRole('button', { name: 'Día siguiente' }));
    expect(useDevStore.getState().dayOffset).toBe(1);
    expect(screen.getByTestId('simulated-date')).toHaveTextContent('Fecha: Jueves, 29 de octubre');
    await user.press(screen.getByRole('button', { name: 'Volver a hoy' }));
    expect(useDevStore.getState().dayOffset).toBe(0);
  });
});
