import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/useTheme';

export type BigButtonVariant = 'primary' | 'secondary' | 'alert';

export interface BigButtonProps {
  label: string;
  onPress: () => void;
  variant?: BigButtonVariant;
  icon?: ComponentProps<typeof Ionicons>['name'];
  accessibilityLabel?: string; // defaults to label
  accessibilityHint?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

// Large, full-width button. Primary and secondary are 56 pt tall; alert ("It hurts") is 64 pt.
export function BigButton({
  label,
  onPress,
  variant = 'primary',
  icon,
  accessibilityLabel,
  accessibilityHint,
  disabled = false,
  style,
  testID,
}: BigButtonProps) {
  const { colors, typography, spacing, radius, sizes } = useTheme();

  const palette = {
    primary: { background: colors.primary, foreground: colors.onPrimary, border: colors.primary },
    secondary: { background: colors.card, foreground: colors.primary, border: colors.primary },
    alert: { background: colors.alert, foreground: colors.onAlert, border: colors.alert },
  }[variant];

  const minHeight = variant === 'alert' ? sizes.hurtButton : sizes.primaryButton;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      testID={testID}
      style={({ pressed }) => [
        styles.button,
        {
          minHeight,
          backgroundColor: palette.background,
          borderColor: palette.border,
          borderRadius: radius.md,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.sm,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      <View style={styles.content}>
        {icon ? (
          <Ionicons
            name={icon}
            size={26}
            color={palette.foreground}
            style={{ marginRight: spacing.sm }}
          />
        ) : null}
        <Text style={[typography.button, styles.label, { color: palette.foreground }]}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: '100%',
    borderWidth: 2,
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  label: {
    textAlign: 'center',
    flexShrink: 1,
  },
});
