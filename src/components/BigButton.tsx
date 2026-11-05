import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/useTheme';

// primary / alert: filled, 64 pt. inverse: white with heroBg text, for heroBg and restBg.
// outline: borderStrong 2 pt. text: link style, 44 pt min.
export type BigButtonVariant = 'primary' | 'alert' | 'inverse' | 'outline' | 'text';

export interface BigButtonProps {
  label: string;
  onPress: () => void;
  variant?: BigButtonVariant;
  icon?: ComponentProps<typeof Ionicons>['name'];
  accessibilityLabel?: string; // defaults to label
  accessibilityHint?: string;
  disabled?: boolean;
  selected?: boolean; // for a choice among buttons, e.g. "How was it?"
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function BigButton({
  label,
  onPress,
  variant = 'primary',
  icon,
  accessibilityLabel,
  accessibilityHint,
  disabled = false,
  selected,
  style,
  testID,
}: BigButtonProps) {
  const { colors, typography, spacing, radius, sizes } = useTheme();

  const palette = {
    primary: { background: colors.primary, foreground: colors.onPrimary, border: colors.primary },
    alert: { background: colors.alert, foreground: colors.onAlert, border: colors.alert },
    inverse: { background: colors.inverseBg, foreground: colors.heroBg, border: colors.inverseBg },
    outline: { background: 'transparent', foreground: colors.primary, border: colors.borderStrong },
    text: { background: 'transparent', foreground: colors.primary, border: 'transparent' },
  }[variant];

  const filled = variant === 'primary' || variant === 'alert';
  const minHeight = filled
    ? sizes.primaryButton
    : variant === 'text'
      ? sizes.minTapTarget
      : sizes.secondaryButton;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled, selected }}
      testID={testID}
      style={({ pressed }) => [
        styles.button,
        {
          minHeight,
          backgroundColor: palette.background,
          borderColor: palette.border,
          borderRadius: filled ? radius.button : radius.secondary,
          paddingHorizontal: spacing.ml,
          paddingVertical: spacing.sm,
          opacity: disabled ? 0.5 : pressed ? 0.8 : 1,
        },
        style,
      ]}
    >
      <View style={[styles.content, { gap: spacing.sm }]}>
        {icon ? <Ionicons name={icon} size={24} color={palette.foreground} /> : null}
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
