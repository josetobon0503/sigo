import { useRouter } from 'expo-router';
import { Text } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Chip, ChipGroup, OnboardingStep } from '@/components';
import { EQUIPMENT, toggleEquipment } from '@/engine/profile';
import { useOnboardingStore } from '@/store/onboardingStore';
import { useTheme } from '@/theme/useTheme';

// Step 9: equipment I have. Chair and towel start checked.
export default function EquipmentScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors, typography } = useTheme();
  const equipment = useOnboardingStore((s) => s.draft.equipment);
  const update = useOnboardingStore((s) => s.update);

  return (
    <OnboardingStep
      step={9}
      title={t('onboarding.equipment.title')}
      onNext={() => router.push('/onboarding/reminder')}
    >
      <Text style={[typography.body, { color: colors.text }]}>
        {t('onboarding.equipment.hint')}
      </Text>
      <ChipGroup>
        {EQUIPMENT.map((item) => (
          <Chip
            key={item}
            label={t(`equipmentName.${item}`)}
            selected={equipment.includes(item)}
            onPress={() => update({ equipment: toggleEquipment(equipment, item) })}
            testID={`equipment-${item}`}
          />
        ))}
      </ChipGroup>
    </OnboardingStep>
  );
}
