import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { OnboardingStep, ReminderEditor } from '@/components';
import { useOnboardingStore } from '@/store/onboardingStore';

// Step 8: reminder time. Only saved here; notifications are scheduled in a later phase.
export default function ReminderScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const reminder = useOnboardingStore((s) => s.draft.reminder);
  const update = useOnboardingStore((s) => s.update);

  return (
    <OnboardingStep
      step={8}
      title={t('onboarding.reminder.title')}
      onNext={() => router.push('/onboarding/ready')}
    >
      <ReminderEditor
        value={reminder}
        onChange={(next) => update({ reminder: next })}
        enableLabel={t('onboarding.reminder.enable')}
        timeLabel={t('onboarding.reminder.timeLabel')}
        daysLabel={t('onboarding.reminder.daysLabel')}
      />
    </OnboardingStep>
  );
}
