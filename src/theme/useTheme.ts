import { useColorScheme } from 'react-native';

import { colors, radius, sizes, spacing, typography, type ColorScheme } from './tokens';

export function useTheme() {
  const scheme: ColorScheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  return { scheme, colors: colors[scheme], typography, spacing, radius, sizes };
}

export type Theme = ReturnType<typeof useTheme>;
