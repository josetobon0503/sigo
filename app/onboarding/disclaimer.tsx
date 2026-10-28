import { useRouter } from 'expo-router';
import { Text } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Card, OnboardingStep } from '@/components';
import { useTheme } from '@/theme/useTheme';

// Step 2: "Sigo is not medical advice".
export default function DisclaimerScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors, typography } = useTheme();

  return (
    <OnboardingStep
      step={2}
      title={t('onboarding.disclaimer.title')}
      nextLabel={t('onboarding.disclaimer.accept')}
      onNext={() => router.push('/onboarding/screening')}
    >
      <Card>
        <Text style={[typography.bodyBold, { color: colors.text }]}>{t('app.disclaimer')}</Text>
      </Card>
      <Text style={[typography.body, { color: colors.text }]}>
        {t('onboarding.disclaimer.body')}
      </Text>
    </OnboardingStep>
  );
}
