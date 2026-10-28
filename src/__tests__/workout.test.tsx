// Screen tests for the Today tab and the workout session.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, render, screen, userEvent } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { Alert } from 'react-native';

import ProfileScreen from '../../app/(tabs)/profile';
import TodayScreen from '../../app/(tabs)/index';
import FinishScreen from '../../app/workout/finish';
import SessionScreen from '../../app/workout/session';
import { makeProfile, pain } from '@/engine/__fixtures__/profiles';
import type { GeneratedWorkout, WorkoutLog } from '@/engine/types';
import { formatDosage } from '@/i18n/format';
import i18n, { setLanguage } from '@/i18n';
import { useDevStore } from '@/store/devStore';
import { useHistoryStore } from '@/store/historyStore';
import { useProfileStore } from '@/store/profileStore';
import { useSessionStore } from '@/store/sessionStore';

const mockRouter = { push: jest.fn(), back: jest.fn(), replace: jest.fn(), dismissTo: jest.fn() };
jest.mock('expo-router', () => ({ useRouter: () => mockRouter }));

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
  useSessionStore.setState({ session: null, logId: null, updatedAt: 0 });
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
    useProfileStore.setState({
      profile: makeProfile({ painAreas: [pain('knee', 4), pain('lower_back', 2)] }),
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

  it('"It hurts" is big, red and explains what to do for now', async () => {
    const alert = jest.spyOn(Alert, 'alert');
    await render(<SessionScreen />);
    await user.press(screen.getByRole('button', { name: 'Me duele' }));
    expect(alert).toHaveBeenCalledWith('Para y descansa', expect.stringMatching(/911/), [
      { text: 'Entendido' },
    ]);
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
