import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { BigButton, Card, FacesScale, ScreenContainer, type FaceOption } from '@/components';
import { completedExercises } from '@/engine/session';
import type { Feeling } from '@/engine/types';
import { useHistoryStore } from '@/store/historyStore';
import { useSessionStore } from '@/store/sessionStore';
import { useTheme } from '@/theme/useTheme';

const FEELINGS: Feeling[] = ['great', 'good', 'ok', 'tired', 'sore'];

// The log is already saved when this screen opens; the feeling is added to it. Leaving the screen
// updates the levels once, with the feeling if the user gave one.
export default function FinishScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors, typography, spacing } = useTheme();
  // Kept from the first render, so closing the modal can clear the store safely.
  const [session] = useState(() => useSessionStore.getState().session);
  const [logId] = useState(() => useSessionStore.getState().logId);
  const log = useHistoryStore((s) => s.logs.find((l) => l.id === logId));
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
  const options: FaceOption<Feeling>[] = FEELINGS.map((f) => ({
    value: f,
    label: t(`feeling.${f}`),
  }));

  return (
    <ScreenContainer title={t(allDone ? 'finish.title' : 'finish.titlePartial')}>
      <Card style={{ gap: spacing.xs }} testID="finish-summary">
        <Text style={[typography.title, { color: colors.text }]}>
          {t('finish.exercises', { count: done })}
        </Text>
        <Text style={[typography.title, { color: colors.text }]}>
          {t('finish.minutes', { count: minutes })}
        </Text>
      </Card>

      <View style={{ gap: spacing.sm }}>
        <Text accessibilityRole="header" style={[typography.title, { color: colors.text }]}>
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
      </View>

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
