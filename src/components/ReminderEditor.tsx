import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import type { TFunction } from 'i18next';
import { getCalendars } from 'expo-localization';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { UserProfile } from '@/engine/types';
import { useTheme } from '@/theme/useTheme';

import { BigButton } from './BigButton';
import { Chip } from './Chip';
import { SwitchRow } from './SwitchRow';

type Reminder = UserProfile['reminder'];

// Day numbers follow Date.getDay(): 0 = Sunday. Shown Monday first.
const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const MINUTE_INTERVAL = 5;

// 12 or 24 hours, as set on the phone.
export function uses24HourClock(): boolean {
  return getCalendars()[0]?.uses24hourClock ?? false;
}

export function formatTime(hour: number, minute: number, t: TFunction, use24h: boolean): string {
  const mm = String(minute).padStart(2, '0');
  if (use24h) return `${String(hour).padStart(2, '0')}:${mm}`;
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:${mm} ${hour < 12 ? t('time.am') : t('time.pm')}`;
}

function toDate(hour: number, minute: number): Date {
  return new Date(2000, 0, 1, hour, minute);
}

export interface ReminderEditorProps {
  value: Reminder;
  onChange: (value: Reminder) => void;
  enableLabel: string;
  timeLabel: string;
  daysLabel: string;
}

// Reminder switch, native time picker (iOS wheel, Android dialog) and day chips.
// Native system pickers are allowed: they work with VoiceOver and TalkBack (CLAUDE.md rule 4).
export function ReminderEditor({
  value,
  onChange,
  enableLabel,
  timeLabel,
  daysLabel,
}: ReminderEditorProps) {
  const { t } = useTranslation();
  const { scheme, colors, typography, spacing } = useTheme();
  const use24h = uses24HourClock();

  const setTime = (event: DateTimePickerEvent, date?: Date) => {
    if (event.type !== 'set' || !date) return;
    onChange({ ...value, hour: date.getHours(), minute: date.getMinutes() });
  };
  const openAndroidPicker = () =>
    DateTimePickerAndroid.open({
      value: toDate(value.hour, value.minute),
      mode: 'time',
      is24Hour: use24h,
      onChange: setTime,
    });
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
            testID="reminder-time"
          >
            {formatTime(value.hour, value.minute, t, use24h)}
          </Text>
          {Platform.OS === 'ios' ? (
            <DateTimePicker
              value={toDate(value.hour, value.minute)}
              mode="time"
              display="spinner"
              minuteInterval={MINUTE_INTERVAL}
              onChange={setTime}
              themeVariant={scheme}
              textColor={colors.text}
              accessibilityLabel={timeLabel}
              testID="time-picker"
              style={styles.picker}
            />
          ) : (
            <BigButton
              label={t('time.change')}
              variant="secondary"
              icon="time-outline"
              onPress={openAndroidPicker}
            />
          )}
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

const styles = StyleSheet.create({
  picker: {
    alignSelf: 'center',
    height: 216,
  },
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});
