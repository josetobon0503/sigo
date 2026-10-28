import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme/useTheme';

export interface ChipGroupProps {
  label?: string;
  children: ReactNode;
}

// A labeled row of chips that wraps onto new lines at large font sizes.
export function ChipGroup({ label, children }: ChipGroupProps) {
  const { colors, typography, spacing } = useTheme();

  return (
    <View style={{ gap: spacing.sm }}>
      {label ? <Text style={[typography.bodyBold, { color: colors.text }]}>{label}</Text> : null}
      <View style={[styles.wrap, { gap: spacing.sm }]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});
