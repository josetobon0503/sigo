import { Text } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ScreenContainer } from '@/components';
import { useTheme } from '@/theme/useTheme';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { colors, typography } = useTheme();

  return (
    <ScreenContainer title={t('profile.title')}>
      <Text style={[typography.body, { color: colors.text }]}>{t('profile.placeholder')}</Text>
    </ScreenContainer>
  );
}
