import { useRouter } from 'expo-router';
import { Text } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Card, Chip, ChipGroup, Notice, OnboardingStep } from '@/components';
import { SCREENING_QUESTIONS, SCREENING_TEXT } from '@/data/screening';
import { useOnboardingStore } from '@/store/onboardingStore';
import { useTheme } from '@/theme/useTheme';

// Step 3: readiness screening. The result is applied by the engine (applyScreening) at the end.
export default function ScreeningScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors, typography } = useTheme();
  const answers = useOnboardingStore((s) => s.draft.screeningAnswers);
  const language = useOnboardingStore((s) => s.draft.language);
  const update = useOnboardingStore((s) => s.update);

  const answer = (id: string, value: boolean) =>
    update({ screeningAnswers: { ...answers, [id]: value } });
  const allAnswered = SCREENING_QUESTIONS.every((id) => id in answers);
  const anyYes = SCREENING_QUESTIONS.some((id) => answers[id] === true);

  return (
    <OnboardingStep
      step={3}
      title={t('onboarding.screening.title')}
      nextDisabled={!allAnswered}
      onNext={() => router.push('/onboarding/about')}
    >
      <Text style={[typography.body, { color: colors.text }]}>
        {t('onboarding.screening.intro')}
      </Text>
      {SCREENING_QUESTIONS.map((id, i) => {
        const question = SCREENING_TEXT[id][language];
        return (
          <Card key={id}>
            <ChipGroup label={`${i + 1}. ${question}`}>
              <Chip
                label={t('common.yes')}
                accessibilityLabel={`${t('common.yes')}: ${question}`}
                selected={answers[id] === true}
                onPress={() => answer(id, true)}
                testID={`${id}-yes`}
              />
              <Chip
                label={t('common.no')}
                accessibilityLabel={`${t('common.no')}: ${question}`}
                selected={answers[id] === false}
                onPress={() => answer(id, false)}
                testID={`${id}-no`}
              />
            </ChipGroup>
          </Card>
        );
      })}
      {anyYes ? (
        <Notice
          title={t('doctorNotice.title')}
          body={t('doctorNotice.body')}
          testID="doctor-notice"
        />
      ) : null}
    </OnboardingStep>
  );
}
