import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { PainIntensity } from '@/engine/types';
import { faceScale } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

const VALUES: PainIntensity[] = [1, 2, 3, 4, 5];
const FACES = ['😀', '🙂', '😐', '😟', '😣'];

export interface FacesScaleProps {
  value: PainIntensity | null;
  onChange: (value: PainIntensity) => void;
  accessibilityLabel: string; // what is being rated, e.g. "Knee, left side"
  testID?: string;
}

// Five colored faces (green to red), always with a text label: color is never the only cue.
export function FacesScale({ value, onChange, accessibilityLabel, testID }: FacesScaleProps) {
  const { t } = useTranslation();
  const { colors, typography, spacing, radius, sizes } = useTheme();

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      style={{ gap: spacing.sm }}
    >
      {VALUES.map((v, i) => {
        const selected = value === v;
        const label = t(`painIntensity.${v}`);
        return (
          <Pressable
            key={v}
            onPress={() => onChange(v)}
            accessibilityRole="radio"
            accessibilityLabel={t('faces.option', { label, value: v })}
            accessibilityState={{ checked: selected }}
            style={({ pressed }) => [
              styles.option,
              {
                minHeight: sizes.primaryButton,
                gap: spacing.md,
                paddingHorizontal: spacing.md,
                borderRadius: radius.md,
                borderWidth: selected ? 3 : 2,
                borderColor: selected ? colors.primary : colors.border,
                backgroundColor: colors.card,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <View
              importantForAccessibility="no-hide-descendants"
              accessibilityElementsHidden
              style={[styles.face, { backgroundColor: faceScale[i] }]}
            >
              <Text style={styles.emoji} allowFontScaling={false}>
                {FACES[i]}
              </Text>
            </View>
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
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  option: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  face: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 24,
  },
  label: {
    flex: 1,
  },
});
