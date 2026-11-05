// Screen tests for the Progress tab.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, render, screen, within } from '@testing-library/react-native';

import ProgressScreen from '../../app/(tabs)/progress';
import { levelsAt, makeProfile, pain } from '@/engine/__fixtures__/profiles';
import { addDays } from '@/engine/pain';
import type { Feeling, WorkoutLog } from '@/engine/types';
import { setLanguage } from '@/i18n';
import { useDevStore } from '@/store/devStore';
import { useHistoryStore } from '@/store/historyStore';
import { usePainHistoryStore } from '@/store/painHistoryStore';
import { useProfileStore } from '@/store/profileStore';

let seq = 0;
function log(date: string, feeling?: Feeling, min = 20): WorkoutLog {
  seq += 1;
  return {
    id: `${date}-${seq}`,
    date,
    durationSec: min * 60,
    items: [{ exerciseId: 'seated-marching', completed: true }],
    weeklyGoal: 2,
    ...(feeling ? { feeling } : {}),
  };
}

// Monday and Tuesday of each week.
const twoDays = (monday: string) => [log(monday), log(addDays(monday, 1))];

function setToday(y: number, m: number, d: number) {
  jest.setSystemTime(new Date(y, m - 1, d, 10, 0, 0));
}

beforeAll(async () => {
  await setLanguage('es');
});

beforeEach(async () => {
  jest.useFakeTimers();
  setToday(2026, 10, 28); // Wednesday
  await AsyncStorage.clear();
  useDevStore.setState({ dayOffset: 0 });
  useProfileStore.setState({ profile: makeProfile({ painAreas: [] }) });
  useHistoryStore.setState({ logs: [] });
  usePainHistoryStore.setState({ entries: [] });
});

afterEach(() => {
  jest.useRealTimers();
});

describe('Progress tab', () => {
  it('with no workouts yet, says so kindly and still shows the levels', async () => {
    await render(<ProgressScreen />);
    expect(screen.getByTestId('progress-empty')).toBeOnTheScreen();
    expect(screen.getByTestId('progress-week')).toHaveTextContent(/0 de 2 días/);
    expect(screen.getByTestId('progress-streak')).toHaveTextContent(
      /Llega a tu meta esta semana para empezar una racha/,
    );
    expect(screen.queryByTestId('best-streak')).toBeNull();
    expect(
      screen.getByText('Al terminar un entrenamiento, cuéntanos cómo te sientes.'),
    ).toBeOnTheScreen();
    expect(screen.getByText('No tienes zonas con dolor guardadas.')).toBeOnTheScreen();
  });

  it('marks the days trained this week, with words and not only color', async () => {
    useHistoryStore.setState({ logs: [log('2026-10-26'), log('2026-10-27')] });
    await render(<ProgressScreen />);
    expect(screen.getByTestId('progress-week')).toHaveTextContent(
      /2 de 2 días.*¡Llegaste a tu meta de esta semana!/,
    );
    expect(screen.getByLabelText('Lunes: entrenaste')).toBeOnTheScreen();
    expect(screen.getByLabelText('Martes: entrenaste')).toBeOnTheScreen();
    expect(screen.getByLabelText('Miércoles: sin entrenamiento. Hoy')).toBeOnTheScreen();
    expect(screen.queryByTestId('progress-empty')).toBeNull();
  });

  it('shows the streak of weeks and the best one', async () => {
    useHistoryStore.setState({
      logs: [...twoDays('2026-10-12'), ...twoDays('2026-10-19'), log('2026-10-26')],
    });
    await render(<ProgressScreen />);
    const streak = screen.getByTestId('progress-streak');
    expect(streak).toHaveTextContent(/2 semanas seguidas llegando a tu meta/);
    expect(streak).toHaveTextContent(/Esta semana todavía puedes llegar a tu meta/);
    expect(within(streak).getByTestId('best-streak')).toHaveTextContent(
      'Tu mejor racha: 2 semanas',
    );
  });

  it('when this week can no longer be met, never shows 0: a fresh start and the best streak', async () => {
    setToday(2026, 11, 1); // Sunday, nothing done this week, goal 2
    useHistoryStore.setState({
      logs: [...twoDays('2026-10-05'), ...twoDays('2026-10-12'), ...twoDays('2026-10-19')],
    });
    await render(<ProgressScreen />);
    const streak = screen.getByTestId('progress-streak');
    expect(streak).toHaveTextContent(/Cada semana es un nuevo comienzo/);
    expect(streak).toHaveTextContent(/Tu mejor racha: 3 semanas/);
    expect(streak).not.toHaveTextContent(/\b0\b/);
  });

  it('adds up the minutes of this week and in total', async () => {
    useHistoryStore.setState({
      logs: [log('2026-10-20', undefined, 18), log('2026-10-27', undefined, 22)],
    });
    await render(<ProgressScreen />);
    expect(screen.getByTestId('progress-minutes')).toHaveTextContent(
      /Esta semana: 22 min.*En total: 40 min/,
    );
  });

  it('shows "Your levels" with simple names, 1 to 5, without the warm-up', async () => {
    useProfileStore.setState({
      profile: makeProfile({ levels: { ...levelsAt(3), squat: 4, calf: 1 } }),
    });
    await render(<ProgressScreen />);
    for (const label of [
      'Piernas, Nivel 4 de 5',
      'Cadera y glúteos, Nivel 3 de 5',
      'Brazos: empujar, Nivel 3 de 5',
      'Brazos: jalar, Nivel 3 de 5',
      'Abdomen, Nivel 3 de 5',
      'Equilibrio, Nivel 3 de 5',
      'Pantorrillas, Nivel 1 de 5',
    ]) {
      expect(screen.getByLabelText(label)).toBeOnTheScreen();
    }
    expect(screen.queryByText('Soltar el cuerpo')).toBeNull();
  });

  it('marks in orange only the levels raised this week', async () => {
    useProfileStore.setState({
      profile: makeProfile({ levels: { ...levelsAt(3), squat: 4, core: 2 } }),
    });
    useHistoryStore.setState({
      logs: [
        {
          ...log('2026-10-20'), // last week: not shown
          levelChanges: [{ pattern: 'balance', from: 2, to: 3 }],
        },
        {
          ...log('2026-10-26'),
          levelChanges: [
            { pattern: 'squat', from: 3, to: 4 },
            { pattern: 'core', from: 3, to: 2 },
          ],
        },
      ],
    });
    await render(<ProgressScreen />);
    expect(screen.getByLabelText('Piernas, Nivel 4 de 5, subiste esta semana')).toBeOnTheScreen();
    expect(screen.getByLabelText('Equilibrio, Nivel 3 de 5')).toBeOnTheScreen();
    expect(screen.getByLabelText('Abdomen, Nivel 2 de 5')).toBeOnTheScreen();
    expect(screen.getByText('Naranja = subiste esta semana')).toBeOnTheScreen();
  });

  it('shows the last 10 feelings with faces and neutral words', async () => {
    const feelings: Feeling[] = ['great', 'good', 'ok', 'tired', 'sore'];
    useHistoryStore.setState({
      logs: Array.from({ length: 12 }, (_, i) => log(addDays('2026-10-01', i), feelings[i % 5])),
    });
    await render(<ProgressScreen />);
    const card = screen.getByTestId('progress-feelings');
    const rows = ['Excelente', 'Bien', 'Regular', 'Con cansancio', 'Con molestias'].flatMap(
      (word) => within(card).queryAllByText(word),
    );
    expect(rows).toHaveLength(10);
    expect(within(card).getAllByText('Con cansancio')).toHaveLength(2);
  });

  it('shows the pain of each area over time, in words', async () => {
    useProfileStore.setState({ profile: makeProfile({ painAreas: [pain('knee', 2)] }) });
    usePainHistoryStore.setState({
      entries: [
        { date: '2026-10-01', area: 'knee', intensity: 3 },
        { date: '2026-10-20', area: 'knee', intensity: 2 },
      ],
    });
    await render(<ProgressScreen />);
    expect(screen.getByTestId('pain-history-knee')).toHaveTextContent(
      /Rodilla.*Antes: Algo · Ahora: Leve/,
    );
  });

  it('starts an area without history at its current value', async () => {
    useProfileStore.setState({ profile: makeProfile({ painAreas: [pain('lower_back', 3)] }) });
    await render(<ProgressScreen />);
    expect(screen.getByTestId('pain-history-lower_back')).toHaveTextContent(
      /Espalda baja.*Ahora: Algo/,
    );
  });

  it('works in English', async () => {
    await setLanguage('en');
    useHistoryStore.setState({ logs: [log('2026-10-26', 'tired')] });
    await render(<ProgressScreen />);
    expect(screen.getByText('Your progress')).toBeOnTheScreen();
    expect(screen.getByTestId('progress-week')).toHaveTextContent(/1 of 2 days/);
    expect(screen.getByLabelText('Monday: you trained')).toBeOnTheScreen();
    expect(screen.getByLabelText('Legs, Level 3 of 5')).toBeOnTheScreen();
    expect(screen.getByText('Tired')).toBeOnTheScreen();
    await act(() => setLanguage('es')); // the screen is still mounted and re-renders
  });
});
