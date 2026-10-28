import { useRouter } from 'expo-router';
import { Text, TextInput } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Chip, ChipGroup, OnboardingStep } from '@/components';
import { AGE_BANDS } from '@/engine/profile';
import { useOnboardingStore } from '@/store/onboardingStore';
import { useTheme } from '@/theme/useTheme';

// Step 4: name and age band.
export default function AboutScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors, typography, spacing, radius, sizes } = useTheme();
  const name = useOnboardingStore((s) => s.draft.name);
  const ageBand = useOnboardingStore((s) => s.draft.ageBand);
  const update = useOnboardingStore((s) => s.update);

  return (
    <OnboardingStep
      step={4}
      title={t('onboarding.about.title')}
      nextDisabled={name.trim() === '' || ageBand === null}
      onNext={() => router.push('/onboarding/pain-where')}
    >
      <Text style={[typography.bodyBold, { color: colors.text }]}>
        {t('onboarding.about.nameLabel')}
      </Text>
      <TextInput
        value={name}
        onChangeText={(text) => update({ name: text })}
        placeholder={t('onboarding.about.namePlaceholder')}
        placeholderTextColor={colors.textSecondary}
        accessibilityLabel={t('onboarding.about.nameLabel')}
        autoComplete="given-name"
        textContentType="givenName"
        returnKeyType="done"
        testID="name-input"
        style={[
          typography.body,
          {
            minHeight: sizes.primaryButton,
            color: colors.text,
            backgroundColor: colors.card,
            borderColor: colors.border,
            borderWidth: 2,
            borderRadius: radius.md,
            paddingHorizontal: spacing.md,
          },
        ]}
      />
      <ChipGroup label={t('onboarding.about.ageLabel')}>
        {AGE_BANDS.map((band) => (
          <Chip
            key={band}
            label={t(`ageBand.${band}`)}
            selected={ageBand === band}
            onPress={() => update({ ageBand: band })}
          />
        ))}
      </ChipGroup>
    </OnboardingStep>
  );
}
