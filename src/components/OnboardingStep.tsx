import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/theme/useTheme';

import { BigButton } from './BigButton';
import { ScreenContainer } from './ScreenContainer';

export const ONBOARDING_TOTAL_STEPS = 9;

export interface OnboardingStepProps {
  step: number; // 1-based
  title: string;
  children?: ReactNode;
  onNext: () => void;
  nextLabel?: string; // defaults to "Continue"
  nextDisabled?: boolean;
  onBack?: () => void; // defaults to router.back(); hidden on the first step
}

// One onboarding step per screen: progress bar, large title, content, big Continue and Back buttons.
export function OnboardingStep({
  step,
  title,
  children,
  onNext,
  nextLabel,
  nextDisabled = false,
  onBack,
}: OnboardingStepProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors, typography, spacing, radius } = useTheme();
  const progressLabel = t('onboarding.progress', { step, total: ONBOARDING_TOTAL_STEPS });

  return (
    <ScreenContainer>
      <View
        accessibilityRole="progressbar"
        accessibilityLabel={progressLabel}
        accessibilityValue={{ min: 1, max: ONBOARDING_TOTAL_STEPS, now: step }}
        style={{ gap: spacing.xs }}
      >
        <Text style={[typography.caption, { color: colors.textSecondary }]}>{progressLabel}</Text>
        <View style={[styles.track, { backgroundColor: colors.border, borderRadius: radius.pill }]}>
          <View
            style={[
              styles.fill,
              {
                width: `${(step / ONBOARDING_TOTAL_STEPS) * 100}%`,
                backgroundColor: colors.primary,
                borderRadius: radius.pill,
              },
            ]}
          />
        </View>
      </View>

      <Text accessibilityRole="header" style={[typography.largeTitle, { color: colors.text }]}>
        {title}
      </Text>

      {children}

      <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
        <BigButton
          label={nextLabel ?? t('common.continue')}
          onPress={onNext}
          disabled={nextDisabled}
          testID="onboarding-next"
        />
        {step > 1 ? (
          <BigButton
            label={t('common.back')}
            variant="secondary"
            icon="arrow-back"
            onPress={onBack ?? (() => router.back())}
            testID="onboarding-back"
          />
        ) : null}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 8,
    width: '100%',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
});
