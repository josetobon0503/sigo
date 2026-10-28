import Ionicons from '@expo/vector-icons/Ionicons';
import type { TFunction } from 'i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { UserProfile } from '@/engine/types';
import { useTheme } from '@/theme/useTheme';

import { Chip } from './Chip';
import { SwitchRow } from './SwitchRow';

type Reminder = UserProfile['reminder'];

// Day numbers follow Date.getDay(): 0 = Sunday. Shown Monday first.
const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const MINUTE_STEP = 15;

export function formatTime(hour: number, minute: number, t: TFunction): string {
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  const suffix = hour < 12 ? t('time.am') : t('time.pm');
  return `${h12}:${String(minute).padStart(2, '0')} ${suffix}`;
}

export function shiftTime(hour: number, minute: number, deltaMinutes: number) {
  const total = (((hour * 60 + minute + deltaMinutes) % 1440) + 1440) % 1440;
  return { hour: Math.floor(total / 60), minute: total % 60 };
}

export interface ReminderEditorProps {
  value: Reminder;
  onChange: (value: Reminder) => void;
  enableLabel: string;
  timeLabel: string;
  daysLabel: string;
}

// Reminder switch, time with big - / + buttons (no wheel or swipe) and day chips.
export function ReminderEditor({
  value,
  onChange,
  enableLabel,
  timeLabel,
  daysLabel,
}: ReminderEditorProps) {
  const { t } = useTranslation();
  const { colors, typography, spacing } = useTheme();

  const shift = (delta: number) =>
    onChange({ ...value, ...shiftTime(value.hour, value.minute, delta) });
  const toggleDay = (day: number) =>
    onChange({
      ...value,
      days: value.days.includes(day)
        ? value.days.filter((d) => d !== day)
        : [...value.days, day].sort((a, b) => a - b),
    });

  return (
    <View style={{ gap: spacing.md }}>
      <SwitchRow
        label={enableLabel}
        value={value.enabled}
        onChange={(enabled) => onChange({ ...value, enabled })}
      />
      {value.enabled ? (
        <>
          <Text style={[typography.bodyBold, { color: colors.text }]}>{timeLabel}</Text>
          <Text
            accessibilityLiveRegion="polite"
            style={[typography.largeTitle, { color: colors.text, textAlign: 'center' }]}
          >
            {formatTime(value.hour, value.minute, t)}
          </Text>
          <View style={[styles.row, { gap: spacing.sm }]}>
            <StepButton icon="remove" label={t('time.hourEarlier')} onPress={() => shift(-60)} />
            <StepButton icon="add" label={t('time.hourLater')} onPress={() => shift(60)} />
          </View>
          <View style={[styles.row, { gap: spacing.sm }]}>
            <StepButton
              icon="remove"
              label={t('time.minutesEarlier')}
              onPress={() => shift(-MINUTE_STEP)}
            />
            <StepButton
              icon="add"
              label={t('time.minutesLater')}
              onPress={() => shift(MINUTE_STEP)}
            />
          </View>
          <Text style={[typography.bodyBold, { color: colors.text }]}>{daysLabel}</Text>
          <View style={[styles.wrap, { gap: spacing.sm }]}>
            {DAY_ORDER.map((day) => (
              <Chip
                key={day}
                label={t(`days.short.${DAY_KEYS[day]}`)}
                accessibilityLabel={t(`days.long.${DAY_KEYS[day]}`)}
                selected={value.days.includes(day)}
                onPress={() => toggleDay(day)}
              />
            ))}
          </View>
        </>
      ) : null}
    </View>
  );
}

function StepButton({
  icon,
  label,
  onPress,
}: {
  icon: 'add' | 'remove';
  label: string;
  onPress: () => void;
}) {
  const { colors, typography, spacing, radius, sizes } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.step,
        {
          minHeight: sizes.primaryButton,
          borderRadius: radius.md,
          borderColor: colors.primary,
          backgroundColor: colors.card,
          paddingHorizontal: spacing.sm,
          gap: spacing.xs,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <Ionicons name={icon} size={24} color={colors.primary} />
      <Text style={[typography.body, styles.stepLabel, { color: colors.primary }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
  },
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  step: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  stepLabel: {
    flexShrink: 1,
    textAlign: 'center',
  },
});
