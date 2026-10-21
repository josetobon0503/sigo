import { contrastRatio } from '../contrast';
import { colors, sizes, typography, type ColorScheme, type ColorTokens } from '../tokens';

const MIN_CONTRAST = 4.5;

// Text color -> background color pairs that appear on screen.
const pairs: [keyof ColorTokens, keyof ColorTokens][] = [
  ['text', 'background'],
  ['text', 'card'],
  ['textSecondary', 'background'],
  ['textSecondary', 'card'],
  ['primary', 'background'],
  ['primary', 'card'],
  ['onPrimary', 'primary'],
  ['onSecondary', 'secondary'],
  ['onAlert', 'alert'],
];

describe('theme tokens', () => {
  it('uses the style guide colors in light mode', () => {
    expect(colors.light.primary).toBe('#0B6E7A');
    expect(colors.light.secondary).toBe('#C2410C');
    expect(colors.light.alert).toBe('#D70015');
    expect(colors.light.background).toBe('#F2F2F7');
    expect(colors.light.card).toBe('#FFFFFF');
  });

  describe.each<ColorScheme>(['light', 'dark'])('%s mode', (scheme) => {
    it.each(pairs)('%s on %s has contrast >= 4.5:1', (fg, bg) => {
      const palette = colors[scheme];
      expect(contrastRatio(palette[fg], palette[bg])).toBeGreaterThanOrEqual(MIN_CONTRAST);
    });
  });

  it('never goes below 15 pt on screen', () => {
    for (const style of Object.values(typography)) {
      expect(style.fontSize).toBeGreaterThanOrEqual(15);
    }
    expect(typography.body.fontSize).toBe(17);
  });

  it('keeps tap targets at the required sizes', () => {
    expect(sizes.minTapTarget).toBeGreaterThanOrEqual(44);
    expect(sizes.primaryButton).toBeGreaterThanOrEqual(56);
    expect(sizes.hurtButton).toBeGreaterThanOrEqual(64);
  });
});

describe('contrastRatio', () => {
  it('returns 21 for black on white and 1 for equal colors', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 1);
    expect(contrastRatio('#0B6E7A', '#0B6E7A')).toBeCloseTo(1, 5);
  });
});
