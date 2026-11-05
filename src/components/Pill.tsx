import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme/useTheme';

export interface PillProps {
  label: string;
  tone?: 'default' | 'hero'; // hero = on heroBg
  icon?: ComponentProps<typeof Ionicons>['name'];
  testID?: string;
}

// Rounded, non-interactive tag, e.g. "Consideramos: rodilla y espalda baja".
export function Pill({ label, icon, tone = 'default', testID }: PillProps) {
  const { colors, typography, spacing, radius } = useTheme();
  const fg = tone === 'hero' ? colors.onHero : colors.text;
  const iconColor = tone === 'hero' ? colors.onHero : colors.primary;

  return (
    <View
      testID={testID}
      style={[
        styles.pill,
        {
          borderColor: tone === 'hero' ? colors.onHeroMuted : colors.primary,
          backgroundColor: tone === 'hero' ? 'transparent' : colors.surface,
          borderRadius: radius.pill,
          paddingHorizontal: spacing.ms,
          paddingVertical: 6,
          gap: spacing.sm,
        },
      ]}
    >
      {icon ? <Ionicons name={icon} size={20} color={iconColor} /> : null}
      <Text style={[typography.calloutBold, styles.label, { color: fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    maxWidth: '100%',
  },
  label: {
    flexShrink: 1,
  },
});
