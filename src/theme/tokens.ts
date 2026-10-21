// Design tokens from the Sigo style guide (CLAUDE.md section 7).
// Every text/background pair used on screen must keep a contrast ratio >= 4.5:1 (see __tests__/tokens.test.ts).

export type ColorScheme = 'light' | 'dark';

export interface ColorTokens {
  primary: string; // buttons, selected tabs, links
  onPrimary: string; // text and icons on top of primary
  secondary: string; // small highlights only
  onSecondary: string;
  alert: string; // ONLY the "It hurts" button and safety screens
  onAlert: string;
  background: string; // screen background
  card: string; // cards
  text: string;
  textSecondary: string;
  border: string;
}

export const colors: Record<ColorScheme, ColorTokens> = {
  light: {
    primary: '#0B6E7A',
    onPrimary: '#FFFFFF',
    secondary: '#C2410C',
    onSecondary: '#FFFFFF',
    alert: '#D70015',
    onAlert: '#FFFFFF',
    background: '#F2F2F7',
    card: '#FFFFFF',
    text: '#1C1C1E',
    textSecondary: '#55555C',
    border: '#C7C7CC',
  },
  dark: {
    primary: '#4FC3CF',
    onPrimary: '#00262B',
    secondary: '#FB923C',
    onSecondary: '#2A0E00',
    alert: '#D70015',
    onAlert: '#FFFFFF',
    background: '#000000',
    card: '#1C1C1E',
    text: '#FFFFFF',
    textSecondary: '#AEAEB2',
    border: '#3A3A3C',
  },
};

export const typography = {
  largeTitle: { fontSize: 34, lineHeight: 41, fontWeight: '700' },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '700' },
  body: { fontSize: 17, lineHeight: 24, fontWeight: '400' },
  bodyBold: { fontSize: 17, lineHeight: 24, fontWeight: '600' },
  button: { fontSize: 20, lineHeight: 26, fontWeight: '600' },
  caption: { fontSize: 15, lineHeight: 20, fontWeight: '400' }, // smallest size allowed on screen
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16, // side margins
  lg: 24,
  xl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  pill: 999,
} as const;

// Minimum heights for interactive elements, in points.
export const sizes = {
  minTapTarget: 44,
  primaryButton: 56,
  hurtButton: 64,
} as const;
