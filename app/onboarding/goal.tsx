import { useRouter } from 'expo-router';
import { Text } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Chip, ChipGroup, OnboardingStep } from '@/components';
import { WEEKLY_GOALS } from '@/engine/stats';
import { useOnboardingStore } from '@/store/onboardingStore';
import { useTheme } from '@/theme/useTheme';

// Step 11: weekly goal. The streak counts the weeks that reach it.
export default function GoalScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors, typography } = useTheme();
  const weeklyGoal = useOnboardingStore((s) => s.draft.weeklyGoal);
  const update = useOnboardingStore((s) => s.update);

  return (
    <OnboardingStep
      step={11}
      title={t('onboarding.goal.title')}
      onNext={() => router.push('/onboarding/ready')}
    >
      <ChipGroup>
        {WEEKLY_GOALS.map((goal) => (
          <Chip
            key={goal}
            label={t('weeklyGoal.days', { count: goal })}
            selected={weeklyGoal === goal}
            onPress={() => update({ weeklyGoal: goal })}
            testID={`goal-${goal}`}
          />
        ))}
      </ChipGroup>
      <Text style={[typography.body, { color: colors.text }]}>{t('onboarding.goal.hint')}</Text>
    </OnboardingStep>
  );
}
