import Ionicons from '@expo/vector-icons/Ionicons';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/theme/useTheme';

export interface WeekStripProps {
  days: { day: string; trained: boolean }[]; // Monday to Sunday
  today: string;
}

const SIZE = 36;
const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const; // Monday first

// L M M J V S D: trained = filled primary circle with a check, today = primary ring, other = surfaceMuted.
export function WeekStrip({ days, today }: WeekStripProps) {
  const { t } = useTranslation();
  const { colors, typography, spacing } = useTheme();

  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      {days.map(({ day, trained }, i) => {
        const isToday = day === today;
        const label = t(trained ? 'progress.dayTrained' : 'progress.dayRest', {
          day: t(`weekday.long.${WEEKDAYS[i]}`),
        });
        return (
          <View
            key={day}
            accessible
            accessibilityLabel={isToday ? `${label}. ${t('progress.today')}` : label}
            testID={`week-day-${i}`}
            style={{ alignItems: 'center', gap: spacing.xs }}
          >
            <Text
              style={[
                isToday ? typography.captionBold : typography.caption,
                { color: colors.textSecondary },
              ]}
            >
              {t(`weekday.short.${WEEKDAYS[i]}`)}
            </Text>
            <View
              style={{
                width: SIZE,
                height: SIZE,
                borderRadius: SIZE / 2,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: trained ? colors.primary : colors.surfaceMuted,
                borderWidth: isToday ? 3 : 0,
                borderColor: colors.primary,
              }}
            >
              {trained ? <Ionicons name="checkmark" size={22} color={colors.onPrimary} /> : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}
