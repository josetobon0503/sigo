import { Text } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ScreenContainer } from '@/components';
import { useTheme } from '@/theme/useTheme';

export default function PainScreen() {
  const { t } = useTranslation();
  const { colors, typography } = useTheme();

  return (
    <ScreenContainer title={t('pain.title')}>
      <Text style={[typography.body, { color: colors.text }]}>{t('pain.placeholder')}</Text>
    </ScreenContainer>
  );
}
