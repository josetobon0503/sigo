import { Text } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Card, ScreenContainer } from '@/components';
import { useTheme } from '@/theme/useTheme';

export default function TodayScreen() {
  const { t } = useTranslation();
  const { colors, typography } = useTheme();

  return (
    <ScreenContainer title={t('today.title')}>
      <Card>
        <Text style={[typography.title, { color: colors.primary }]}>{t('app.tagline')}</Text>
      </Card>
      <Text style={[typography.body, { color: colors.text }]}>{t('today.placeholder')}</Text>
      <Text style={[typography.caption, { color: colors.textSecondary }]}>
        {t('app.disclaimer')}
      </Text>
    </ScreenContainer>
  );
}
