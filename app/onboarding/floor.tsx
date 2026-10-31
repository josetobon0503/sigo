import { useRouter } from 'expo-router';
import { Text } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Chip, ChipGroup, OnboardingStep } from '@/components';
import { useOnboardingStore } from '@/store/onboardingStore';
import { useTheme } from '@/theme/useTheme';

// Step 6: can you get down to the floor and back up without help? Floor exercises are only
// offered after a "yes" (and from level 3).
export default function FloorScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors, typography } = useTheme();
  const floorOk = useOnboardingStore((s) => s.draft.floorOk);
  const update = useOnboardingStore((s) => s.update);

  return (
    <OnboardingStep
      step={6}
      title={t('onboarding.floor.title')}
      nextDisabled={floorOk === null}
      onNext={() => router.push('/onboarding/pain-where')}
    >
      <Text style={[typography.body, { color: colors.text }]}>{t('onboarding.floor.hint')}</Text>
      <ChipGroup>
        <Chip
          label={t('onboarding.floor.yes')}
          selected={floorOk === true}
          onPress={() => update({ floorOk: true })}
          testID="floor-yes"
        />
        <Chip
          label={t('onboarding.floor.no')}
          selected={floorOk === false}
          onPress={() => update({ floorOk: false })}
          testID="floor-no"
        />
      </ChipGroup>
    </OnboardingStep>
  );
}
