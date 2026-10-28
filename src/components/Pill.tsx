import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme/useTheme';

export interface PillProps {
  label: string;
  icon?: ComponentProps<typeof Ionicons>['name'];
  testID?: string;
}

// Rounded, non-interactive tag, e.g. "Consideramos: rodilla y espalda baja".
export function Pill({ label, icon, testID }: PillProps) {
  const { colors, typography, spacing, radius } = useTheme();

  return (
    <View
      testID={testID}
      style={[
        styles.pill,
        {
          borderColor: colors.primary,
          backgroundColor: colors.card,
          borderRadius: radius.pill,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          gap: spacing.sm,
        },
      ]}
    >
      {icon ? <Ionicons name={icon} size={22} color={colors.primary} /> : null}
      <Text style={[typography.bodyBold, styles.label, { color: colors.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    maxWidth: '100%',
  },
  label: {
    flexShrink: 1,
  },
});
