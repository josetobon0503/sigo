import { Pressable, StyleSheet, Text } from 'react-native';

import { useTheme } from '@/theme/useTheme';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress: () => void;
  accessibilityLabel?: string; // defaults to label
  testID?: string;
}

// Selectable chip (body areas, equipment, etc.). Selection is shown with color AND a border/weight change.
export function Chip({ label, selected = false, onPress, accessibilityLabel, testID }: ChipProps) {
  const { colors, typography, spacing, radius, sizes } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected }}
      testID={testID}
      style={({ pressed }) => [
        styles.chip,
        {
          minHeight: sizes.chip,
          minWidth: sizes.minTapTarget,
          borderRadius: radius.chip,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          backgroundColor: selected ? colors.primarySoft : colors.surface,
          borderColor: selected ? colors.primary : colors.borderStrong,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <Text
        style={[
          selected ? typography.bodyBold : typography.body,
          { color: selected ? colors.primaryPressed : colors.text },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
});
