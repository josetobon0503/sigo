import { useRouter } from 'expo-router';
import { Text } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Chip, ChipGroup, OnboardingStep } from '@/components';
import { ACTIVITY_LEVELS } from '@/engine/profile';
import { useOnboardingStore } from '@/store/onboardingStore';
import { useTheme } from '@/theme/useTheme';

// Step 5: how active are you. Sets the starting level of every pattern (the screening still wins).
export default function ActivityScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors, typography } = useTheme();
  const activity = useOnboardingStore((s) => s.draft.activity);
  const update = useOnboardingStore((s) => s.update);

  return (
    <OnboardingStep
      step={5}
      title={t('onboarding.activity.title')}
      nextDisabled={activity === null}
      onNext={() => router.push('/onboarding/floor')}
    >
      <Text style={[typography.body, { color: colors.text }]}>{t('onboarding.activity.hint')}</Text>
      <ChipGroup>
        {ACTIVITY_LEVELS.map((level) => (
          <Chip
            key={level}
            label={t(`activity.${level}`)}
            selected={activity === level}
            onPress={() => update({ activity: level })}
            testID={`activity-${level}`}
          />
        ))}
      </ChipGroup>
    </OnboardingStep>
  );
}
