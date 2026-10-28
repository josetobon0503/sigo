import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { useTheme } from '@/theme/useTheme';

export interface SwitchRowProps {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (value: boolean) => void;
  testID?: string;
}

// The whole row is the tap target, not only the small switch.
export function SwitchRow({ label, hint, value, onChange, testID }: SwitchRowProps) {
  const { colors, typography, spacing, sizes } = useTheme();

  return (
    <Pressable
      onPress={() => onChange(!value)}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ checked: value }}
      testID={testID}
      style={[styles.row, { minHeight: sizes.primaryButton, gap: spacing.md }]}
    >
      <View style={styles.text}>
        <Text style={[typography.body, { color: colors.text }]}>{label}</Text>
        {hint ? (
          <Text style={[typography.caption, { color: colors.textSecondary }]}>{hint}</Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: colors.primary, false: colors.border }}
        importantForAccessibility="no"
        accessibilityElementsHidden
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    flex: 1,
  },
});
