import { useRouter } from 'expo-router';
import { Text } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Chip, ChipGroup, OnboardingStep } from '@/components';
import { SUPPORTED_LANGUAGES, setLanguage, type Lang } from '@/i18n';
import { useOnboardingStore } from '@/store/onboardingStore';
import { useTheme } from '@/theme/useTheme';

// Step 1: welcome + language.
export default function WelcomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors, typography } = useTheme();
  const language = useOnboardingStore((s) => s.draft.language);
  const update = useOnboardingStore((s) => s.update);

  const choose = (lang: Lang) => {
    update({ language: lang });
    void setLanguage(lang);
  };

  return (
    <OnboardingStep
      step={1}
      title={t('onboarding.welcome.title')}
      nextLabel={t('common.start')}
      onNext={() => router.push('/onboarding/disclaimer')}
    >
      <Text style={[typography.title, { color: colors.primary }]}>{t('app.tagline')}</Text>
      <Text style={[typography.body, { color: colors.text }]}>{t('onboarding.welcome.body')}</Text>
      <ChipGroup label={t('language.label')}>
        {SUPPORTED_LANGUAGES.map((lang) => (
          <Chip
            key={lang}
            label={t(`language.${lang}`)}
            selected={language === lang}
            onPress={() => choose(lang)}
          />
        ))}
      </ChipGroup>
    </OnboardingStep>
  );
}
