import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  AppState,
  BackHandler,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { BigButton, BigNumber, Card } from '@/components';
import { exercises } from '@/data/exercises';
import {
  completedSets,
  currentItem,
  displaySeconds,
  nextStep,
  ratingAsked,
  restRemainingMs,
  timerView,
  type Session,
  type SessionItem,
} from '@/engine/session';
import type { ItemRating, Lang } from '@/engine/types';
import { formatDosage } from '@/i18n/format';
import { useSessionStore } from '@/store/sessionStore';
import { useTheme } from '@/theme/useTheme';

const TICK_MS = 250;
const RATINGS: ItemRating[] = ['easy', 'good', 'hard'];
const byId = new Map(exercises.map((e) => [e.id, e]));

// Re-renders a few times a second and applies timers that ended, also right after the app comes
// back from the background. Timers use end timestamps, so a late tick is never off. The store's
// last change counts too, so a rest that just started shows its full length, not one second more.
function useSessionClock(): number {
  const tick = useSessionStore((s) => s.tick);
  const updatedAt = useSessionStore((s) => s.updatedAt);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const update = () => {
      tick();
      setNow(Date.now());
    };
    const id = setInterval(update, TICK_MS);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') update();
    });
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [tick]);

  return Math.max(now, updatedAt);
}

export default function SessionScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { colors, typography, spacing, sizes, radius } = useTheme();
  const session = useSessionStore((s) => s.session);
  const end = useSessionStore((s) => s.end);
  const now = useSessionClock();
  const lang: Lang = i18n.language === 'en' ? 'en' : 'es';

  // A soft haptic tap for every finished set, timed or not.
  const setsDone = session ? completedSets(session) : 0;
  const lastSetsDone = useRef(setsDone);
  useEffect(() => {
    if (setsDone > lastSetsDone.current) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    lastSetsDone.current = setsDone;
  }, [setsDone]);

  // Only while this screen is on top: the "It hurts" screens can end the session and come back.
  const finished = !session || session.phase.kind === 'finished';
  useFocusEffect(
    useCallback(() => {
      if (!session) router.dismissTo('/');
      else if (finished) router.replace('/workout/finish');
    }, [session, finished, router]),
  );

  const confirmExit = useCallback(() => {
    Alert.alert(t('workout.exitTitle'), t('workout.exitBody'), [
      { text: t('workout.exitCancel'), style: 'cancel' },
      { text: t('workout.exitConfirm'), style: 'destructive', onPress: end },
    ]);
    return true;
  }, [t, end]);

  // Android back button: same confirmation as "Exit".
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', confirmExit);
    return () => sub.remove();
  }, [confirmExit]);

  if (!session || finished) return null;
  const item = currentItem(session);
  if (!item) return null;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { paddingHorizontal: spacing.md, gap: spacing.md }]}>
        <Pressable
          onPress={confirmExit}
          accessibilityRole="button"
          accessibilityLabel={t('workout.exit')}
          testID="exit-workout"
          style={({ pressed }) => [
            styles.exit,
            {
              minHeight: sizes.minTapTarget,
              paddingHorizontal: spacing.md,
              borderRadius: radius.md,
              borderColor: colors.primary,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <Text style={[typography.bodyBold, { color: colors.primary }]}>{t('workout.exit')}</Text>
        </Pressable>
        <Text style={[typography.bodyBold, styles.progress, { color: colors.text }]}>
          {t('workout.exerciseProgress', {
            current: session.index + 1,
            total: session.items.length,
          })}
        </Text>
      </View>
      {session.phase.kind === 'rest' ? (
        <RestView session={session} now={now} lang={lang} />
      ) : (
        <ExerciseView session={session} item={item} now={now} lang={lang} />
      )}
    </SafeAreaView>
  );
}

function ExerciseView({
  session,
  item,
  now,
  lang,
}: {
  session: Session;
  item: SessionItem;
  now: number;
  lang: Lang;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors, typography, spacing, sizes } = useTheme();
  const { completeSet, startTimer, pauseTimer, tooEasy } = useSessionStore.getState();
  const exercise = byId.get(item.exerciseId);
  if (!exercise) return null;

  const { dosage, perSide } = item;
  let bigNumber;
  let mainAction;
  if (dosage.kind === 'reps') {
    const label = t(perSide ? 'workout.repsPerSideLabel' : 'workout.repsLabel');
    bigNumber = (
      <BigNumber
        value={String(dosage.reps)}
        label={label}
        accessibilityLabel={`${dosage.reps} ${label}`}
        testID="big-reps"
      />
    );
    mainAction = (
      <BigButton
        label={t('workout.done')}
        icon="checkmark"
        accessibilityHint={t('workout.doneHint')}
        onPress={completeSet}
        testID="set-done"
      />
    );
  } else {
    const view = timerView(session, now);
    const seconds = displaySeconds(view.remainingMs);
    const label = view.switching
      ? t('workout.switchSides')
      : t(perSide ? 'workout.secondsPerSideLabel' : 'workout.secondsLabel');
    bigNumber = (
      <View style={{ gap: spacing.xs }}>
        {perSide ? (
          <Text
            style={[typography.title, styles.center, { color: colors.primary }]}
            testID="side-label"
          >
            {view.switching
              ? t('workout.switchSides')
              : t(session.side === 1 ? 'workout.firstSide' : 'workout.secondSide')}
          </Text>
        ) : null}
        <BigNumber
          value={String(seconds)}
          label={label}
          accessibilityLabel={t('workout.secondsLeft', { count: seconds })}
          testID="big-timer"
        />
      </View>
    );
    const timerStatus = session.phase.kind === 'exercise' ? session.phase.timer.status : 'idle';
    mainAction = (
      <BigButton
        label={t(
          timerStatus === 'running'
            ? 'workout.pause'
            : timerStatus === 'paused'
              ? 'workout.resume'
              : 'workout.start',
        )}
        icon={timerStatus === 'running' ? 'pause' : 'play'}
        onPress={timerStatus === 'running' ? pauseTimer : startTimer}
        testID="timer-toggle"
      />
    );
  }

  // The timer waits while the user tells us what hurts.
  const showHurt = () => {
    pauseTimer();
    router.push('/hurt');
  };

  return (
    <>
      <ScrollView contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}>
        <Text style={[typography.body, { color: colors.textSecondary }]} testID="set-progress">
          {t('workout.setProgress', { current: session.set, total: dosage.sets })}
        </Text>
        <Text accessibilityRole="header" style={[typography.largeTitle, { color: colors.text }]}>
          {exercise.name[lang]}
        </Text>
        {bigNumber}
        {/* Video area: the written purpose and steps until the videos arrive (phase 7). */}
        <Card style={{ gap: spacing.sm }}>
          <Text accessibilityRole="header" style={[typography.bodyBold, { color: colors.text }]}>
            {t('workout.purposeTitle')}
          </Text>
          <Text style={[typography.body, { color: colors.text }]}>{exercise.purpose[lang]}</Text>
          <Text accessibilityRole="header" style={[typography.bodyBold, { color: colors.text }]}>
            {t('workout.stepsTitle')}
          </Text>
          {exercise.steps[lang].map((step, i) => (
            <Text key={step} style={[typography.body, { color: colors.text }]}>
              {`${i + 1}. ${step}`}
            </Text>
          ))}
        </Card>
        {dosage.kind === 'time' ? (
          <BigButton
            label={t('workout.done')}
            variant="secondary"
            icon="checkmark"
            accessibilityHint={t('workout.doneHint')}
            onPress={completeSet}
            testID="set-done"
          />
        ) : null}
        {/* Less prominent than "Done" and "It hurts": a text button, not in the footer. */}
        <Pressable
          onPress={() => {
            pauseTimer();
            tooEasy();
            router.push('/workout/harder');
          }}
          accessibilityRole="button"
          accessibilityLabel={t('workout.tooEasy')}
          accessibilityHint={t('workout.tooEasyHint')}
          testID="too-easy"
          style={({ pressed }) => [
            styles.textButton,
            { minHeight: sizes.minTapTarget, opacity: pressed ? 0.6 : 1 },
          ]}
        >
          <Text style={[typography.bodyBold, { color: colors.primary }]}>
            {t('workout.tooEasy')}
          </Text>
        </Pressable>
      </ScrollView>
      <View
        style={[
          styles.footer,
          { padding: spacing.md, gap: spacing.sm, borderTopColor: colors.border },
        ]}
      >
        {mainAction}
        <BigButton
          label={t('workout.hurt')}
          variant="alert"
          icon="hand-left"
          accessibilityHint={t('workout.hurtHint')}
          onPress={showHurt}
          testID="it-hurts"
        />
      </View>
    </>
  );
}

function RestView({ session, now, lang }: { session: Session; now: number; lang: Lang }) {
  const { t } = useTranslation();
  const { colors, typography, spacing } = useTheme();
  const skipRest = useSessionStore((s) => s.skipRest);
  const rate = useSessionStore((s) => s.rate);
  const seconds = displaySeconds(restRemainingMs(session, now));
  const rated = session.items[session.index]?.rating;
  const next = nextStep(session);
  const nextItem = session.items[next.index];
  const nextExercise = nextItem ? byId.get(nextItem.exerciseId) : undefined;

  return (
    <>
      <ScrollView contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}>
        <Text
          accessibilityRole="header"
          style={[typography.largeTitle, styles.center, { color: colors.text }]}
        >
          {t('rest.title')}
        </Text>
        <BigNumber
          value={String(seconds)}
          label={t('workout.secondsLabel')}
          accessibilityLabel={t('workout.secondsLeft', { count: seconds })}
          testID="rest-timer"
        />
        {ratingAsked(session) ? (
          <Card style={{ gap: spacing.sm }} testID="rating">
            <Text accessibilityRole="header" style={[typography.title, { color: colors.text }]}>
              {t('rest.ratingQuestion')}
            </Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              {t('rest.ratingHint')}
            </Text>
            {RATINGS.map((rating) => (
              <BigButton
                key={rating}
                label={t(`rating.${rating}`)}
                variant={rated === rating ? 'primary' : 'secondary'}
                icon={rated === rating ? 'checkmark' : undefined}
                selected={rated === rating}
                onPress={() => rate(session.index, rating)}
                testID={`rating-${rating}`}
              />
            ))}
          </Card>
        ) : null}
        {nextItem && nextExercise ? (
          <Card style={{ gap: spacing.xs }} testID="up-next">
            <Text style={[typography.body, { color: colors.textSecondary }]}>
              {t('rest.upNext')}
            </Text>
            <Text style={[typography.title, { color: colors.text }]}>
              {nextExercise.name[lang]}
            </Text>
            <Text style={[typography.body, { color: colors.text }]}>
              {`${t('workout.setProgress', { current: next.set, total: nextItem.dosage.sets })} · ${formatDosage(t, nextItem.dosage, nextItem.perSide)}`}
            </Text>
          </Card>
        ) : null}
      </ScrollView>
      <View style={[styles.footer, { padding: spacing.md, borderTopColor: colors.border }]}>
        <BigButton
          label={t('rest.skip')}
          icon="play-skip-forward"
          accessibilityHint={t('rest.skipHint')}
          onPress={skipRest}
          testID="skip-rest"
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
  },
  exit: {
    borderWidth: 2,
    justifyContent: 'center',
  },
  progress: {
    flex: 1,
    textAlign: 'right',
  },
  center: {
    textAlign: 'center',
  },
  textButton: {
    alignSelf: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
