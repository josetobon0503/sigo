import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';
import { useTranslation } from 'react-i18next';

import { BigButton, Card, ScreenContainer } from '@/components';
import { exercises } from '@/data/exercises';
import { findHarder } from '@/engine/harder';
import type { Lang } from '@/engine/types';
import { useProfileStore } from '@/store/profileStore';
import { useCurrentExercise, useSessionStore } from '@/store/sessionStore';
import { useTheme } from '@/theme/useTheme';

// "Too easy": a harder exercise with the same movement goal, or, at the top, a tip to go slower.
export default function HarderScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { colors, typography, spacing } = useTheme();
  const current = useCurrentExercise();
  const lang: Lang = i18n.language === 'en' ? 'en' : 'es';
  // Worked out once: swapping changes the current exercise, and the answer should not change.
  const [result] = useState(() => {
    const { session } = useSessionStore.getState();
    const { profile } = useProfileStore.getState();
    if (!current || !session || !profile) return null;
    const usedToday = session.items.flatMap((i) =>
      i.swappedFrom ? [i.exerciseId, i.swappedFrom] : [i.exerciseId],
    );
    return findHarder(current, profile, exercises, usedToday, session.date);
  });

  if (!result) return null;

  if (result.type === 'top') {
    return (
      <ScreenContainer title={t('harder.topTitle')}>
        <Text style={[typography.body, { color: colors.text }]}>{t('harder.topBody')}</Text>
        <BigButton
          label={t('harder.continue')}
          icon="play"
          onPress={() => router.back()}
          testID="harder-continue"
        />
      </ScreenContainer>
    );
  }

  const { exercise } = result;
  return (
    <ScreenContainer title={t('harder.title')}>
      <Card style={{ gap: spacing.sm }} testID="harder-suggestion">
        <Text accessibilityRole="header" style={[typography.title, { color: colors.text }]}>
          {exercise.name[lang]}
        </Text>
        <Text style={[typography.body, { color: colors.text }]}>{exercise.purpose[lang]}</Text>
      </Card>
      <BigButton
        label={t('harder.accept')}
        icon="trending-up"
        onPress={() => {
          useSessionStore.getState().swapTo(exercise);
          router.back();
        }}
        testID="harder-accept"
      />
      <BigButton
        label={t('harder.keep')}
        variant="secondary"
        onPress={() => router.back()}
        testID="harder-keep"
      />
    </ScreenContainer>
  );
}
