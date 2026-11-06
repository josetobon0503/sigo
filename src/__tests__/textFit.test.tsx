// Words must never split in half. Jest has no text layout, so these tests check the rule instead:
// side-by-side columns are used only while the longest word fits, and stack with a large system font.
import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import ProgressScreen from '../../app/(tabs)/progress';
import { LevelBars } from '@/components/LevelBars';
import { VideoBox } from '@/components/VideoBox';
import { makeProfile } from '@/engine/__fixtures__/profiles';
import { setLanguage } from '@/i18n';
import { useProfileStore } from '@/store/profileStore';
import { columnsFit, longestWordWidth } from '@/theme/textFit';

// A phone 393 pt wide; fontScale changes per test (1 = default text size, 2 = an accessibility size).
const mockWindow = { width: 393, height: 852, scale: 3, fontScale: 1 };
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => mockWindow,
}));

beforeAll(async () => {
  await setLanguage('es');
});

beforeEach(() => {
  mockWindow.fontScale = 1;
});

const direction = (testID: string) =>
  StyleSheet.flatten(screen.getByTestId(testID).props.style).flexDirection;

describe('columnsFit', () => {
  const base = { width: 353, columns: 3, gap: 8, cellPadding: 18, fontSize: 15 };

  it('measures the longest word, not the whole text', () => {
    expect(longestWordWidth(['Con molestias'], 10, 1)).toBeCloseTo(9 * 10 * 0.62);
    expect(longestWordWidth(['Con molestias'], 10, 2)).toBeCloseTo(9 * 10 * 2 * 0.62);
  });

  it('fits short words at the default size and stacks them with large text', () => {
    expect(columnsFit(['Muy fácil', 'Bien', 'Difícil'], { ...base, fontScale: 1 })).toBe(true);
    expect(columnsFit(['Muy fácil', 'Bien', 'Difícil'], { ...base, fontScale: 2 })).toBe(false);
  });

  it('a narrower phone stacks sooner', () => {
    expect(columnsFit(['ejercicios'], { ...base, fontScale: 1 })).toBe(true);
    expect(columnsFit(['ejercicios'], { ...base, width: 280, fontScale: 1 })).toBe(false);
  });
});

describe('layouts with columns', () => {
  it('video chapter tabs sit side by side, and stack with large text', async () => {
    const { rerender } = await render(<VideoBox chapter={null} onChapter={jest.fn()} />);
    expect(direction('chapter-tabs')).toBe('row');
    mockWindow.fontScale = 2;
    await rerender(<VideoBox chapter={null} onChapter={jest.fn()} />);
    expect(direction('chapter-tabs')).toBe('column');
  });

  it('level labels go above the bars when they would not fit beside them', async () => {
    const rows = [
      { key: 'calf', label: 'Pantorrillas', level: 2, raised: false, accessibilityLabel: 'x' },
    ];
    const { rerender } = await render(<LevelBars rows={rows} />);
    const width = () =>
      StyleSheet.flatten(screen.getByTestId('level-calf-label').props.style).width;
    expect(width()).toBe(132);
    mockWindow.fontScale = 1.5;
    await rerender(<LevelBars rows={rows} />);
    expect(width()).toBe('100%');
  });

  it('the two Progress tiles sit side by side, and one under the other with large text', async () => {
    useProfileStore.setState({ profile: makeProfile({ painAreas: [] }) });
    const { rerender } = await render(<ProgressScreen />);
    expect(direction('progress-tiles')).toBe('row');
    mockWindow.fontScale = 2;
    await rerender(<ProgressScreen />);
    expect(direction('progress-tiles')).toBeUndefined();
  });
});
