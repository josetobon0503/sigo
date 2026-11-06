import { render, screen, userEvent } from '@testing-library/react-native';

import { setLanguage } from '@/i18n';

import { LevelBars } from '../LevelBars';
import { ProgressSegments } from '../ProgressSegments';
import { WeekStrip } from '../WeekStrip';

beforeAll(async () => {
  await setLanguage('es');
});

const DAYS = [
  '2026-11-02',
  '2026-11-03',
  '2026-11-04',
  '2026-11-05',
  '2026-11-06',
  '2026-11-07',
  '2026-11-08',
];

describe('WeekStrip', () => {
  it('labels every day and marks today', async () => {
    const days = DAYS.map((day, i) => ({ day, trained: i < 2 }));
    await render(<WeekStrip days={days} today="2026-11-04" />);

    expect(screen.getByLabelText('Lunes: entrenaste')).toBeTruthy();
    expect(screen.getByLabelText('Miércoles: sin entrenamiento. Hoy')).toBeTruthy();
    expect(screen.getByLabelText('Domingo: sin entrenamiento')).toBeTruthy();
  });
});

describe('ProgressSegments', () => {
  it('splits segments into done, current and to do', async () => {
    await render(<ProgressSegments total={5} current={2} />);

    expect(screen.getAllByTestId('segment-done', { includeHiddenElements: true })).toHaveLength(2);
    expect(screen.getAllByTestId('segment-current', { includeHiddenElements: true })).toHaveLength(
      1,
    );
    expect(screen.getAllByTestId('segment-todo', { includeHiddenElements: true })).toHaveLength(2);
  });
});

describe('LevelBars', () => {
  it('highlights only the levels raised this week', async () => {
    await render(
      <LevelBars
        rows={[
          {
            key: 'squat',
            label: 'Piernas',
            level: 3,
            raised: true,
            accessibilityLabel: 'Piernas, 3',
          },
          {
            key: 'core',
            label: 'Abdomen',
            level: 2,
            raised: false,
            accessibilityLabel: 'Abdomen, 2',
          },
        ]}
      />,
    );

    expect(screen.getByTestId('level-squat-raised')).toBeTruthy();
    expect(screen.queryByTestId('level-core-raised')).toBeNull();
    expect(screen.getByLabelText('Piernas, 3')).toBeTruthy();
  });
});
