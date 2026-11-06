import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { BigButton, Card, FacesScale, ScreenContainer, type FaceOption } from '@/components';
import { completedExercises } from '@/engine/session';
import { FEELINGS, thisWeek, weekStreak } from '@/engine/stats';
import type { Feeling } from '@/engine/types';
import { goalMetText } from '@/i18n/format';
import { useToday } from '@/store/devStore';
import { useHistoryStore } from '@/store/historyStore';
import { useProfileStore } from '@/store/profileStore';
import { useSessionStore } from '@/store/sessionStore';
import { BIG_NUMBER_MAX_SCALE } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

// The log is already saved when this screen opens; the feeling is added to it. Leaving the screen
// updates the levels once, with the feeling if the user gave one.
export default function FinishScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors, typography, spacing, radius } = useTheme();
  // Kept from the first render, so closing the modal can clear the store safely.
  const [session] = useState(() => useSessionStore.getState().session);
  const [logId] = useState(() => useSessionStore.getState().logId);
  const logs = useHistoryStore((s) => s.logs);
  const log = logs.find((l) => l.id === logId);
  const profile = useProfileStore((s) => s.profile);
  const today = useToday();
  const setFeeling = useSessionStore((s) => s.setFeeling);
  const clear = useSessionStore((s) => s.clear);
  const applyProgression = useSessionStore((s) => s.applyProgression);

  useEffect(
    () => () => {
      applyProgression();
      clear();
    },
    [applyProgression, clear],
  );

  if (!session || !log) return null;

  const done = completedExercises(session);
  const allDone = done === session.items.length;
  const minutes = Math.max(1, Math.round(log.durationSec / 60));
  const goal = profile?.weeklyGoal ?? log.weeklyGoal ?? 2;
  const week = thisWeek(logs, today, goal);
  const streak = weekStreak(logs, today, goal);
  const goalMet = goalMetText(t, week.count, week.goal);
  const options: FaceOption<Feeling>[] = FEELINGS.map((f) => ({
    value: f,
    label: t(`feeling.${f}`),
  }));
  const title = allDone
    ? profile?.name
      ? t('finish.greatJob', { name: profile.name })
      : t('finish.title')
    : t('finish.titlePartial');

  const tile = (value: number, label: string, spoken: string, accent = false) => (
    <View
      accessible
      accessibilityLabel={spoken}
      style={[
        styles.tile,
        {
          padding: spacing.ms,
          borderRadius: radius.card,
          backgroundColor: accent ? colors.accentSoft : colors.surface,
          borderColor: accent ? colors.accentSoft : colors.border,
        },
      ]}
    >
      <Text
        style={[typography.title, { color: accent ? colors.onAccentSoft : colors.text }]}
        maxFontSizeMultiplier={BIG_NUMBER_MAX_SCALE}
      >
        {value}
      </Text>
      <Text
        style={[
          typography.caption,
          styles.center,
          { color: accent ? colors.onAccentSoft : colors.textSecondary },
        ]}
      >
        {label}
      </Text>
    </View>
  );

  return (
    <ScreenContainer>
      <View style={[styles.center, { gap: spacing.ms, paddingTop: spacing.lg }]}>
        <View
          importantForAccessibility="no-hide-descendants"
          accessibilityElementsHidden
          style={[styles.badge, { backgroundColor: colors.primary }]}
        >
          <Ionicons name="checkmark" size={52} color={colors.onPrimary} />
        </View>
        <Text
          accessibilityRole="header"
          style={[typography.title, styles.center, { color: colors.text }]}
        >
          {title}
        </Text>
        {goalMet ? (
          <Text style={[typography.headline, styles.center, { color: colors.primary }]}>
            {goalMet.title}
          </Text>
        ) : null}
        <Text
          style={[typography.body, styles.center, { color: colors.textSecondary }]}
          testID="finish-week"
        >
          {goalMet ? goalMet.detail : t('finish.weekCount', { count: week.count, goal: week.goal })}
        </Text>
      </View>

      <View style={[styles.tiles, { gap: spacing.sm }]} testID="finish-summary">
        {tile(
          done,
          t('finish.statExercises', { count: done }),
          t('finish.exercises', { count: done }),
        )}
        {tile(
          minutes,
          t('finish.statMinutes', { count: minutes }),
          t('finish.minutes', { count: minutes }),
        )}
        {tile(
          streak.weeks,
          t('finish.statWeeks', { count: streak.weeks }),
          t('progress.streak', { count: streak.weeks }),
          true,
        )}
      </View>

      <Card style={{ gap: spacing.ms }}>
        <Text accessibilityRole="header" style={[typography.headline, { color: colors.text }]}>
          {t('finish.feelingQuestion')}
        </Text>
        <FacesScale
          value={log.feeling ?? null}
          onChange={setFeeling}
          options={options}
          accessibilityLabel={t('finish.feelingQuestion')}
          testID="feeling-scale"
        />
        {log.feeling ? (
          <Text
            accessibilityLiveRegion="polite"
            style={[typography.bodyBold, { color: colors.primary }]}
          >
            {t('finish.thanks')}
          </Text>
        ) : null}
      </Card>

      <BigButton
        label={t('finish.backHome')}
        icon="home"
        onPress={() => {
          applyProgression();
          router.dismissTo('/');
        }}
        testID="back-home"
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    textAlign: 'center',
  },
  badge: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tiles: {
    flexDirection: 'row',
  },
  tile: {
    flex: 1,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
});
