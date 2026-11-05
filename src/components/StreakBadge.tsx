import Ionicons from '@expo/vector-icons/Ionicons';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/theme/useTheme';

export interface StreakBadgeProps {
  weeks: number;
  testID?: string;
}

// Flame + "4 semanas" on accentSoft.
export function StreakBadge({ weeks, testID }: StreakBadgeProps) {
  const { t } = useTranslation();
  const { colors, typography, spacing, radius } = useTheme();

  return (
    <View
      accessible
      accessibilityLabel={t('progress.streak', { count: weeks })}
      testID={testID}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: spacing.xs,
        backgroundColor: colors.accentSoft,
        borderRadius: radius.pill,
        paddingHorizontal: spacing.ms,
        paddingVertical: 6,
      }}
    >
      <Ionicons name="flame" size={20} color={colors.onAccentSoft} />
      <Text style={[typography.calloutBold, { color: colors.onAccentSoft }]}>
        {t('progress.weeks', { count: weeks })}
      </Text>
    </View>
  );
}
