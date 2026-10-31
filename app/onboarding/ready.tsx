import { Text } from 'react-native';
import { useTranslation } from 'react-i18next';

import { OnboardingStep } from '@/components';
import { createProfile } from '@/engine/profile';
import { toProfileDraft, useOnboardingStore } from '@/store/onboardingStore';
import { useProfileStore } from '@/store/profileStore';
import { useTheme } from '@/theme/useTheme';

// Step 11: save the profile. The root layout then switches to the tabs on its own.
export default function ReadyScreen() {
  const { t } = useTranslation();
  const { colors, typography } = useTheme();
  const draft = useOnboardingStore((s) => s.draft);
  const resetDraft = useOnboardingStore((s) => s.reset);
  const completeOnboarding = useProfileStore((s) => s.completeOnboarding);
  const ready = toProfileDraft(draft);

  const finish = () => {
    if (!ready) return;
    completeOnboarding(createProfile(ready, new Date().toISOString()));
    resetDraft();
  };

  return (
    <OnboardingStep
      step={11}
      title={t('onboarding.ready.title', { name: draft.name.trim() })}
      nextLabel={t('onboarding.ready.start')}
      nextDisabled={!ready}
      onNext={finish}
    >
      <Text style={[typography.body, { color: colors.text }]}>{t('onboarding.ready.body')}</Text>
    </OnboardingStep>
  );
}
