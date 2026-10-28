import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme/useTheme';

export interface BigNumberProps {
  value: string; // "10" or "0:25"
  label: string; // "repeticiones", "segundos por lado"
  accessibilityLabel: string; // e.g. "Quedan 25 segundos"
  testID?: string;
}

// Rep count or timer, readable from 2 meters away with the phone propped up.
// It is already huge, so system font scaling is capped to keep it on screen.
export function BigNumber({ value, label, accessibilityLabel, testID }: BigNumberProps) {
  const { colors, typography } = useTheme();

  return (
    <View
      accessible
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="text"
      testID={testID}
      style={styles.root}
    >
      <Text
        style={[styles.value, { color: colors.text }]}
        maxFontSizeMultiplier={1.2}
        adjustsFontSizeToFit
        numberOfLines={1}
      >
        {value}
      </Text>
      <Text style={[typography.title, { color: colors.textSecondary, textAlign: 'center' }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
  },
  value: {
    fontSize: 120,
    lineHeight: 132,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },
});
