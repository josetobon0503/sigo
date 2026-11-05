import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/useTheme';

export interface HeroCardProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

// Teal card for today's routine. Text inside uses onHero / onHeroMuted.
export function HeroCard({ children, style, testID }: HeroCardProps) {
  const { colors, spacing, radius, scheme } = useTheme();

  return (
    <View
      testID={testID}
      style={[
        {
          backgroundColor: colors.heroBg,
          borderRadius: radius.hero,
          padding: spacing.ml,
          gap: spacing.ms,
        },
        // DESIGN.md: at most a very soft shadow, light mode only.
        scheme === 'light' && {
          shadowColor: '#000',
          shadowOpacity: 0.08,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          elevation: 2,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
