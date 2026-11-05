import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { PainIntensity } from '@/engine/types';
import { useTheme } from '@/theme/useTheme';

import { FaceIcon } from './FaceIcon';

const VALUES: PainIntensity[] = [1, 2, 3, 4, 5];

export interface FaceOption<T> {
  value: T;
  label: string;
}

export interface FacesScaleProps<T extends string | number = PainIntensity> {
  value: T | null;
  onChange: (value: T) => void;
  accessibilityLabel: string; // what is being rated, e.g. "Knee, left side"
  // Five options, from the green face to the red one. Defaults to the pain scale (None ... Worst).
  options?: readonly FaceOption<T>[];
  layout?: 'list' | 'row'; // row = the 5 faces side by side with the label under each one
  testID?: string;
}

// Five colored faces (green to red), always with a text label: color is never the only cue.
export function FacesScale<T extends string | number = PainIntensity>({
  value,
  onChange,
  accessibilityLabel,
  options,
  layout = 'list',
  testID,
}: FacesScaleProps<T>) {
  const { t } = useTranslation();
  const { colors, typography, spacing, radius, sizes } = useTheme();
  const row = layout === 'row';
  // Without options, T is the default PainIntensity.
  const choices =
    options ??
    (VALUES.map((v) => ({
      value: v,
      label: t(`painIntensity.${v}`),
    })) as FaceOption<unknown>[] as FaceOption<T>[]);

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      style={row ? [styles.row, { gap: spacing.xs }] : { gap: spacing.sm }}
    >
      {choices.map(({ value: v, label }, i) => {
        const selected = value === v;
        const textStyle = [
          selected ? typography.captionBold : typography.caption,
          { color: colors.text },
        ];
        return (
          <Pressable
            key={String(v)}
            onPress={() => onChange(v)}
            accessibilityRole="radio"
            accessibilityLabel={t('faces.option', { label, value: i + 1 })}
            accessibilityState={{ checked: selected }}
            style={({ pressed }) => [
              row
                ? [styles.column, { gap: spacing.xs, minHeight: sizes.minTapTarget }]
                : [
                    styles.option,
                    {
                      minHeight: sizes.primaryButton,
                      gap: spacing.ms,
                      paddingHorizontal: spacing.ms,
                      borderRadius: radius.chip,
                      borderWidth: 2,
                      borderColor: selected ? colors.primary : colors.border,
                      backgroundColor: selected ? colors.primarySoft : colors.surface,
                    },
                  ],
              { opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <FaceIcon index={i} size={row ? 52 : 40} selected={row && selected} />
            {row ? (
              <Text style={[textStyle, styles.center]}>{label}</Text>
            ) : (
              <>
                <Text
                  style={[
                    selected ? typography.bodyBold : typography.body,
                    styles.label,
                    { color: colors.text },
                  ]}
                >
                  {label}
                </Text>
                {selected ? (
                  <Ionicons name="checkmark-circle" size={28} color={colors.primary} />
                ) : null}
              </>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  column: {
    flex: 1,
    alignItems: 'center',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    flex: 1,
  },
  center: {
    textAlign: 'center',
  },
});
