// Design tokens from DESIGN.md (sections 2-4). Screens never use hex values: every color comes from here.
// Every text/background pair used on screen keeps a contrast ratio >= 4.5:1 (see __tests__/tokens.test.ts).

export type ColorScheme = 'light' | 'dark';

export interface ColorTokens {
  bg: string; // screen background
  surface: string; // cards, tab bar
  surfaceMuted: string; // empty day dots, inactive segments
  border: string; // row dividers, tab bar top line
  borderStrong: string; // outlined buttons, inactive dots
  text: string;
  textSecondary: string;
  primary: string; // main buttons, selected tab, progress
  primaryPressed: string; // pressed state, selected chip text
  onPrimary: string; // text and icons on primary
  primarySoft: string; // selected chip bg, thumbnails, avatar
  heroBg: string; // hero card background
  onHero: string; // text and icons on heroBg and restBg
  onHeroMuted: string; // secondary text on heroBg and restBg
  accent: string; // level-up icon bg, streak flame, "raised this week" segment
  onAccent: string; // icons on accent
  accentSoft: string; // level-up banner, streak card
  onAccentSoft: string; // text on accentSoft
  alert: string; // ONLY the "It hurts" button and safety screens
  onAlert: string;
  alertText: string; // alert-colored text or icons on bg / surface (the plain alert red is too dark in dark mode)
  restBg: string; // full-screen rest background
  restTrack: string; // countdown ring track
  videoBg: string; // video box placeholder
}

export const colors: Record<ColorScheme, ColorTokens> = {
  light: {
    bg: '#F3F5F4',
    surface: '#FFFFFF',
    surfaceMuted: '#EEF1F0',
    border: '#E3E8E6',
    borderStrong: '#C9D3D0',
    text: '#13201F',
    textSecondary: '#4A5856',
    primary: '#0B6E7A',
    primaryPressed: '#08525B',
    onPrimary: '#FFFFFF',
    primarySoft: '#E1F0F1',
    heroBg: '#0B6E7A',
    onHero: '#FFFFFF',
    onHeroMuted: '#CDE7EA',
    accent: '#E07A2E',
    onAccent: '#13201F',
    accentSoft: '#FCEBDD',
    onAccentSoft: '#7A3A0C',
    alert: '#D70015',
    onAlert: '#FFFFFF',
    alertText: '#D70015',
    restBg: '#0B6E7A',
    restTrack: '#2B8893',
    videoBg: '#0E3B40',
  },
  dark: {
    bg: '#0E1514',
    surface: '#172120',
    surfaceMuted: '#1F2B2A',
    border: '#263433',
    borderStrong: '#3A4B49',
    text: '#F1F5F4',
    textSecondary: '#A9B8B5',
    primary: '#3FB5C2',
    primaryPressed: '#6BC9D3',
    onPrimary: '#06272B',
    primarySoft: '#133A3F',
    heroBg: '#0B5560',
    onHero: '#FFFFFF',
    onHeroMuted: '#B9DDE1',
    accent: '#F29A57',
    onAccent: '#13201F',
    accentSoft: '#3A2414',
    onAccentSoft: '#F7C9A3',
    alert: '#D70015',
    onAlert: '#FFFFFF',
    alertText: '#FF6B6B',
    restBg: '#0B5560',
    restTrack: '#2B7A84',
    videoBg: '#0A2A2E',
  },
};

// Feeling and pain faces, green (1) to red (5), the same in both themes. Always shown next to a text label.
// Not the alert color: that one is reserved for "It hurts" and safety screens.
export const faceScale = ['#3E9B48', '#8CC152', '#F6C343', '#F08A3C', '#E5574F'] as const;
export const faceInk = '#13201F'; // eyes and mouth

export const fonts = {
  regular: 'AtkinsonHyperlegible_400Regular',
  bold: 'AtkinsonHyperlegible_700Bold',
} as const;

// With a custom font the weight comes from the font family, not from fontWeight.
const regular = { fontFamily: fonts.regular } as const;
const bold = { fontFamily: fonts.bold } as const;

export const typography = {
  display: { ...bold, fontSize: 104, lineHeight: 112 }, // reps counter
  countdown: { ...bold, fontSize: 68, lineHeight: 76 },
  largeTitle: { ...bold, fontSize: 32, lineHeight: 39 },
  title: { ...bold, fontSize: 28, lineHeight: 34 },
  title2: { ...bold, fontSize: 26, lineHeight: 32 },
  headline: { ...bold, fontSize: 20, lineHeight: 26 },
  body: { ...regular, fontSize: 18, lineHeight: 25 },
  bodyBold: { ...bold, fontSize: 18, lineHeight: 25 },
  callout: { ...regular, fontSize: 17, lineHeight: 23 },
  calloutBold: { ...bold, fontSize: 17, lineHeight: 23 },
  button: { ...bold, fontSize: 20, lineHeight: 26 },
  caption: { ...regular, fontSize: 15, lineHeight: 20 }, // smallest size allowed on screen
  captionBold: { ...bold, fontSize: 15, lineHeight: 20 },
} as const;

// Big numbers stop growing past this system font multiplier so they never break the layout.
export const BIG_NUMBER_MAX_SCALE = 1.3;

export const spacing = {
  xs: 4,
  sm: 8,
  ms: 12,
  md: 16,
  ml: 20,
  lg: 24,
  screen: 20, // screen side padding
  cardGap: 14,
} as const;

export const radius = {
  chip: 12,
  thumb: 12,
  secondary: 16, // secondary button
  button: 18, // primary / alert button
  card: 20,
  hero: 24,
  pill: 999,
} as const;

// Minimum heights for interactive elements, in points.
export const sizes = {
  minTapTarget: 44,
  chip: 52,
  secondaryButton: 56,
  primaryButton: 64,
  hurtButton: 64,
} as const;
