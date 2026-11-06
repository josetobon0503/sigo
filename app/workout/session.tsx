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
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';

import Ionicons from '@expo/vector-icons/Ionicons';

import {
  BigButton,
  BigNumber,
  Card,
  CountdownRing,
  ExerciseRow,
  ProgressSegments,
  SetDots,
  VideoBox,
  type VideoChapter,
} from '@/components';
import { exercises } from '@/data/exercises';
import {
  completedSets,
  currentItem,
  displaySeconds,
  nextStep,
  ratingAsked,
  restRemainingMs,
  restSeconds,
  timerView,
  type Session,
  type SessionItem,
} from '@/engine/session';
import type { ItemRating, Lang } from '@/engine/types';
import { formatDosage } from '@/i18n/format';
import { useProfileStore } from '@/store/profileStore';
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
  const resting = session.phase.kind === 'rest';
  const bg = resting ? colors.restBg : colors.bg;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: bg }]}>
      {resting ? <StatusBar style="light" /> : null}
      {/* Opaque and above the scroll view, so content never shows through it when scrolling. */}
      <View
        style={[
          styles.topBar,
          {
            backgroundColor: bg,
            paddingHorizontal: spacing.screen,
            paddingBottom: spacing.ms,
            gap: spacing.ms,
          },
        ]}
      >
        <View style={[styles.topRow, { gap: spacing.ms }]}>
          <Pressable
            onPress={confirmExit}
            accessibilityRole="button"
            accessibilityLabel={t('workout.exit')}
            testID="exit-workout"
            style={({ pressed }) => [
              styles.exit,
              {
                minHeight: sizes.minTapTarget,
                paddingHorizontal: spacing.ms,
                gap: spacing.xs,
                borderRadius: radius.secondary,
                borderColor: resting ? colors.onHeroMuted : colors.borderStrong,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Ionicons name="close" size={22} color={resting ? colors.onHero : colors.primary} />
            <Text
              style={[typography.bodyBold, { color: resting ? colors.onHero : colors.primary }]}
            >
              {t('workout.exit')}
            </Text>
          </Pressable>
          <Text
            style={[
              typography.calloutBold,
              styles.progress,
              { color: resting ? colors.onHeroMuted : colors.textSecondary },
            ]}
          >
            {t('workout.exerciseProgress', {
              current: session.index + 1,
              total: session.items.length,
            })}
          </Text>
        </View>
        {resting ? null : <ProgressSegments total={session.items.length} current={session.index} />}
      </View>
      {resting ? (
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
  const { colors, typography, spacing } = useTheme();
  const { completeSet, startTimer, pauseTimer, tooEasy } = useSessionStore.getState();
  const [chapter, setChapter] = useState<VideoChapter | null>(null);
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
            style={[typography.headline, styles.center, { color: colors.primary }]}
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
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingHorizontal: spacing.screen, gap: spacing.md }}
      >
        <VideoBox
          chapter={chapter}
          onChapter={(c) => setChapter((current) => (current === c ? null : c))}
        />
        {/* Until the videos arrive (phase 7), a chapter tab shows its written text. */}
        {chapter ? (
          <Card style={{ gap: spacing.sm }} testID="chapter-text">
            {chapter === 'purpose' ? (
              <Text style={[typography.body, { color: colors.text }]}>
                {exercise.purpose[lang]}
              </Text>
            ) : (
              (chapter === 'howTo' ? exercise.steps : exercise.mistakes)[lang].map((line, i) => (
                <Text key={line} style={[typography.body, { color: colors.text }]}>
                  {chapter === 'howTo' ? `${i + 1}. ${line}` : `• ${line}`}
                </Text>
              ))
            )}
          </Card>
        ) : null}
        <View style={{ gap: spacing.sm }}>
          <Text
            accessibilityRole="header"
            style={[typography.title, styles.center, { color: colors.text }]}
          >
            {exercise.name[lang]}
          </Text>
          <Text
            style={[typography.callout, styles.center, { color: colors.textSecondary }]}
            testID="set-progress"
          >
            {t('workout.setProgress', { current: session.set, total: dosage.sets })}
          </Text>
          <SetDots total={dosage.sets} current={session.set - 1} />
        </View>
        {bigNumber}
        {dosage.kind === 'time' ? (
          <BigButton
            label={t('workout.done')}
            variant="outline"
            icon="checkmark"
            accessibilityHint={t('workout.doneHint')}
            onPress={completeSet}
            testID="set-done"
          />
        ) : null}
        {/* Less prominent than "Done" and "It hurts": a text button, not in the footer. */}
        <BigButton
          label={t('workout.tooEasy')}
          variant="text"
          icon="arrow-up"
          accessibilityHint={t('workout.tooEasyHint')}
          onPress={() => {
            pauseTimer();
            tooEasy();
            router.push('/workout/harder');
          }}
          testID="too-easy"
        />
      </ScrollView>
      <View
        style={[
          styles.footer,
          {
            backgroundColor: colors.bg,
            paddingHorizontal: spacing.screen,
            paddingVertical: spacing.ms,
            gap: spacing.sm,
            borderTopColor: colors.border,
          },
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
  const { colors, typography, spacing, radius, sizes } = useTheme();
  const skipRest = useSessionStore((s) => s.skipRest);
  const rate = useSessionStore((s) => s.rate);
  const remainingMs = restRemainingMs(session, now);
  const seconds = displaySeconds(remainingMs);
  const current = session.items[session.index];
  const totalMs = current ? restSeconds(current, session.seatedOnly) * 1000 : remainingMs;
  const rated = current?.rating;
  const next = nextStep(session);
  const nextItem = session.items[next.index];
  const nextExercise = nextItem ? byId.get(nextItem.exerciseId) : undefined;
  const currentExercise = byId.get(current?.exerciseId ?? '');
  const floorOk = useProfileStore((s) => s.profile?.floorOk ?? false);
  // Going from standing or sitting to lying down: say where to go.
  const toBed = nextExercise?.position === 'lying' && currentExercise?.position !== 'lying';

  return (
    <>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingHorizontal: spacing.screen, gap: spacing.lg }}
      >
        <View style={{ gap: spacing.xs }}>
          <Text
            accessibilityRole="header"
            style={[typography.title, styles.center, { color: colors.onHero }]}
          >
            {t('rest.title')}
          </Text>
          <Text style={[typography.body, styles.center, { color: colors.onHeroMuted }]}>
            {t('rest.subtitle')}
          </Text>
        </View>
        <CountdownRing
          seconds={seconds}
          progress={totalMs > 0 ? remainingMs / totalMs : 0}
          label={t('workout.secondsLabel')}
          accessibilityLabel={t('workout.secondsLeft', { count: seconds })}
          testID="rest-timer"
        />
        {ratingAsked(session) ? (
          <View style={{ gap: spacing.sm }} testID="rating">
            <Text
              accessibilityRole="header"
              style={[typography.headline, styles.center, { color: colors.onHero }]}
            >
              {t('rest.ratingQuestion')}
            </Text>
            {currentExercise ? (
              <Text style={[typography.callout, styles.center, { color: colors.onHeroMuted }]}>
                {currentExercise.name[lang]}
              </Text>
            ) : null}
            <View style={[styles.choices, { gap: spacing.sm }]}>
              {RATINGS.map((rating) => {
                const selected = rated === rating;
                return (
                  <Pressable
                    key={rating}
                    onPress={() => rate(session.index, rating)}
                    accessibilityRole="button"
                    accessibilityLabel={t(`rating.${rating}`)}
                    accessibilityState={{ selected }}
                    testID={`rating-${rating}`}
                    style={({ pressed }) => [
                      styles.choice,
                      {
                        minHeight: sizes.secondaryButton,
                        borderRadius: radius.secondary,
                        paddingHorizontal: spacing.xs,
                        borderColor: colors.onHero,
                        // Selected = inverse fill (white in both modes).
                        backgroundColor: selected ? colors.inverseBg : 'transparent',
                        opacity: pressed ? 0.8 : 1,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        selected ? typography.bodyBold : typography.body,
                        styles.center,
                        { color: selected ? colors.heroBg : colors.onHero },
                      ]}
                    >
                      {t(`rating.${rating}`)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={[typography.caption, styles.center, { color: colors.onHeroMuted }]}>
              {t('rest.ratingHint')}
            </Text>
          </View>
        ) : null}
        {nextItem && nextExercise ? (
          <Card
            style={{
              gap: spacing.sm,
              backgroundColor: colors.restCard,
              borderColor: colors.restCard,
            }}
            testID="up-next"
          >
            <Text style={[typography.calloutBold, { color: colors.onRestCardMuted }]}>
              {`${t('rest.upNext')} \u00b7 ${t('rest.position', { current: next.index + 1, total: session.items.length })}`}
            </Text>
            {toBed ? (
              <Text
                style={[typography.bodyBold, { color: colors.restCardAccent }]}
                testID="lying-notice"
              >
                {t(floorOk ? 'today.lyingNotice' : 'today.lyingNoticeBed')}
              </Text>
            ) : null}
            <ExerciseRow
              name={nextExercise.name[lang]}
              meta={`${t('workout.setProgress', { current: next.set, total: nextItem.dosage.sets })} \u00b7 ${formatDosage(t, nextItem.dosage, nextItem.perSide)}`}
              divider={false}
              tone="rest"
            />
          </Card>
        ) : null}
      </ScrollView>
      <View
        style={[
          styles.footer,
          {
            paddingHorizontal: spacing.screen,
            paddingVertical: spacing.ms,
            borderTopColor: colors.restTrack,
          },
        ]}
      >
        <BigButton
          label={t('rest.skip')}
          variant="inverse"
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
    paddingTop: 8,
    zIndex: 1,
    elevation: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scroll: {
    flex: 1,
    overflow: 'hidden',
  },
  exit: {
    flexDirection: 'row',
    alignItems: 'center',
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
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  choices: {
    flexDirection: 'row',
  },
  choice: {
    flex: 1,
    borderWidth: 2,
    justifyContent: 'center',
  },
});
