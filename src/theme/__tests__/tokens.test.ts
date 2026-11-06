import { contrastRatio } from '../contrast';
import {
  colors,
  faceInk,
  faceScale,
  sizes,
  typography,
  type ColorScheme,
  type ColorTokens,
} from '../tokens';

const TEXT = 4.5; // normal text
const LARGE_OR_ICON = 3; // text >= 24 pt, icons and UI graphics (WCAG 1.4.11)

type Token = keyof ColorTokens;

// Text color -> background color pairs that appear on screen (DESIGN.md section 3).
const textPairs: [Token, Token][] = [
  ['text', 'bg'],
  ['text', 'surface'],
  ['text', 'surfaceMuted'],
  ['text', 'primarySoft'],
  ['textSecondary', 'bg'],
  ['textSecondary', 'surface'],
  ['textSecondary', 'surfaceMuted'],
  ['primary', 'bg'],
  ['primary', 'surface'],
  ['primary', 'primarySoft'],
  ['primaryPressed', 'primarySoft'],
  ['onPrimary', 'primary'],
  ['onHero', 'heroBg'],
  ['onHeroMuted', 'heroBg'],
  ['onHero', 'restBg'],
  ['onHeroMuted', 'restBg'],
  ['onAccentSoft', 'accentSoft'],
  ['text', 'accentSoft'],
  ['onAlert', 'alert'],
  ['alertText', 'bg'],
  ['alertText', 'surface'],
  ['onHero', 'videoBg'],
  ['onRestCard', 'restCard'],
  ['onRestCardMuted', 'restCard'],
  ['restCardAccent', 'restCard'],
];

// Icons and graphics: 3:1 against what is behind them.
const graphicPairs: [Token, Token][] = [
  ['onAccent', 'accent'],
  ['onHero', 'restTrack'], // countdown ring progress on its track
  ['primary', 'surfaceMuted'], // week strip and segments
];

describe('theme tokens', () => {
  it('keeps the brand teal and the alert red from the style guide', () => {
    expect(colors.light.primary).toBe('#0B6E7A');
    expect(colors.light.alert).toBe('#D70015');
    expect(colors.dark.alert).toBe('#D70015');
  });

  describe.each<ColorScheme>(['light', 'dark'])('%s mode', (scheme) => {
    const palette = colors[scheme];

    it.each(textPairs)('%s on %s has contrast >= 4.5:1', (fg, bg) => {
      expect(contrastRatio(palette[fg], palette[bg])).toBeGreaterThanOrEqual(TEXT);
    });

    it.each(graphicPairs)('%s on %s has contrast >= 3:1', (fg, bg) => {
      expect(contrastRatio(palette[fg], palette[bg])).toBeGreaterThanOrEqual(LARGE_OR_ICON);
    });

    it('inverse button: heroBg text on white', () => {
      expect(contrastRatio(palette.heroBg, palette.inverseBg)).toBeGreaterThanOrEqual(TEXT);
    });
  });

  it.each(faceScale.map((c) => [c]))('face ink on face %s has contrast >= 4.5:1', (face) => {
    expect(contrastRatio(faceInk, face)).toBeGreaterThanOrEqual(TEXT);
  });

  it('never goes below 15 pt on screen', () => {
    for (const style of Object.values(typography)) {
      expect(style.fontSize).toBeGreaterThanOrEqual(15);
    }
    expect(typography.body.fontSize).toBeGreaterThanOrEqual(17);
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
