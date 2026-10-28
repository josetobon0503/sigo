import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { BigButton, Card, ScreenContainer } from '@/components';
import { useTheme } from '@/theme/useTheme';

const TIPS = ['water', 'chair', 'breathe', 'pain', 'redFlags'] as const;

export default function SafetyTipsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors, typography, spacing } = useTheme();

  return (
    <ScreenContainer title={t('safetyTips.title')}>
      {TIPS.map((tip) => (
        <View key={tip} style={[styles.row, { gap: spacing.sm }]}>
          <Ionicons name="checkmark-circle-outline" size={26} color={colors.primary} />
          <Text style={[typography.body, styles.text, { color: colors.text }]}>
            {t(`safetyTips.tips.${tip}`)}
          </Text>
        </View>
      ))}
      <Card>
        <Text style={[typography.bodyBold, { color: colors.text }]}>{t('app.disclaimer')}</Text>
      </Card>
      <BigButton label={t('safetyTips.close')} variant="secondary" onPress={() => router.back()} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  text: {
    flex: 1,
  },
});
