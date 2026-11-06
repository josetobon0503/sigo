import * as Haptics from 'expo-haptics';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as Speech from 'expo-speech';
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
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import type { TFunction } from 'i18next';
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
  SwitchRow,
  VideoBox,
} from '@/components';
import { speechLanguage } from '@/components/VideoBox';
import { exercises } from '@/data/exercises';
import {
  completedSets,
  currentItem,
  displaySeconds,
  nextStep,
  ratingAsked,
  REP_MS,
  repsCounted,
  restRemainingMs,
  restSeconds,
  timerView,
  type Session,
  type SessionItem,
} from '@/engine/session';
import type { ItemRating, Lang } from '@/engine/types';
import { dueCues, nextExerciseId, voiceCues, voiceSegment, type Cue } from '@/engine/voice';
import { formatDosage } from '@/i18n/format';
import { useProfileStore } from '@/store/profileStore';
import { useSessionStore } from '@/store/sessionStore';
import { columnsFit } from '@/theme/textFit';
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

// Distance mode: says the cues of the voice engine as they come due. Muted or off screen, it stays silent
// but keeps its place, so turning the voice back on never repeats what already passed.
function useVoiceGuide(session: Session | null, now: number, lang: Lang, on: boolean) {
  const { t } = useTranslation();
  const last = useRef<{ id: string; elapsed: number } | null>(null);

  useEffect(() => {
    const segment = session ? voiceSegment(session, now) : null;
    if (!session || !segment) return;
    const from = last.current?.id === segment.id ? last.current.elapsed : -1;
    last.current = segment;
    if (!on) return;
    const name = (id?: string) => (id ? byId.get(id)?.name[lang] : undefined);
    const item = currentItem(session);
    const cues = voiceCues(session, name(item?.exerciseId) ?? '', name(nextExerciseId(session)));
    for (const cue of dueCues(cues, from, segment.elapsed)) {
      Speech.speak(cueText(t, cue), { language: speechLanguage(lang) });
    }
  }, [session, now, lang, on, t]);

  useEffect(() => {
    if (!on) void Speech.stop();
  }, [on]);
}

function cueText(t: TFunction, cue: Cue): string {
  return cue.key === 'number' ? String(cue.params?.n) : t(`voice.${cue.key}`, cue.params);
}

export default function SessionScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { colors, typography, spacing, sizes, radius } = useTheme();
  const session = useSessionStore((s) => s.session);
  const end = useSessionStore((s) => s.end);
  const now = useSessionClock();
  const lang: Lang = i18n.language === 'en' ? 'en' : 'es';
  const distance = useProfileStore((s) => s.profile?.distanceMode ?? false);
  const countSpeed = useProfileStore((s) => s.profile?.countSpeed ?? 'normal');
  const setDistance = useSessionStore((s) => s.setDistance);
  const [muted, setMuted] = useState(false);
  const [focused, setFocused] = useState(true);

  useEffect(() => {
    setDistance(distance ? REP_MS[countSpeed] : null);
  }, [distance, countSpeed, setDistance]);

  // Turning the phone on its side is only allowed here, with distance mode on.
  useEffect(() => {
    if (distance) void ScreenOrientation.unlockAsync();
    else void ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
  }, [distance]);
  useEffect(
    () => () => void ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP),
    [],
  );

  // The voice stops as soon as another screen (It hurts, Safety, Too easy) covers this one.
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => {
        setFocused(false);
        void Speech.stop();
      };
    }, []),
  );
  useVoiceGuide(session, now, lang, distance && !muted && focused);

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
        <ExerciseView
          session={session}
          item={item}
          now={now}
          lang={lang}
          distance={distance}
          muted={muted}
          onMute={setMuted}
        />
      )}
    </SafeAreaView>
  );
}

function ExerciseView({
  session,
  item,
  now,
  lang,
  distance,
  muted,
  onMute,
}: {
  session: Session;
  item: SessionItem;
  now: number;
  lang: Lang;
  distance: boolean;
  muted: boolean;
  onMute: (muted: boolean) => void;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors, typography, spacing } = useTheme();
  const window = useWindowDimensions();
  const { completeSet, startTimer, pauseTimer, tooEasy } = useSessionStore.getState();
  const updateProfile = useProfileStore((s) => s.updateProfile);
  const timerStatus = session.phase.kind === 'exercise' ? session.phase.timer.status : 'idle';
  const counting = session.countMs !== null; // distance mode is on in the session

  // Distance mode goes on by itself: every set starts when it appears (a paused one waits for "Resume").
  useEffect(() => {
    if (counting && timerStatus === 'idle') startTimer();
  }, [counting, timerStatus, session.index, session.set, startTimer]);

  const exercise = byId.get(item.exerciseId);
  if (!exercise) return null;

  const { dosage, perSide } = item;
  const landscape = distance && window.width > window.height;
  const pauseButton = (
    <BigButton
      label={t(timerStatus === 'running' ? 'workout.pause' : 'workout.resume')}
      icon={timerStatus === 'running' ? 'pause' : 'play'}
      onPress={timerStatus === 'running' ? pauseTimer : startTimer}
      style={landscape ? styles.grow : undefined}
      testID="distance-pause"
    />
  );
  const doneOutline = (
    <BigButton
      label={t('workout.done')}
      variant="outline"
      icon="checkmark"
      accessibilityHint={t('workout.doneHint')}
      onPress={completeSet}
      testID="set-done"
    />
  );
  let bigNumber;
  let mainAction;
  if (dosage.kind === 'reps') {
    const label = t(perSide ? 'workout.repsPerSideLabel' : 'workout.repsLabel');
    const count = repsCounted(session, now);
    bigNumber = counting ? (
      <BigNumber
        value={String(count)}
        label={t('workout.repsOf', { count: dosage.reps })}
        accessibilityLabel={t('workout.repsCountedLabel', { count, total: dosage.reps })}
        testID="big-reps"
      />
    ) : (
      <BigNumber
        value={String(dosage.reps)}
        label={label}
        accessibilityLabel={`${dosage.reps} ${label}`}
        testID="big-reps"
      />
    );
    mainAction = counting ? (
      pauseButton
    ) : (
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
    mainAction = counting ? (
      pauseButton
    ) : (
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

  // The timer and the voice wait while the user tells us what hurts.
  const showHurt = () => {
    pauseTimer();
    void Speech.stop();
    router.push('/hurt');
  };

  const video = (
    <VideoBox
      key={exercise.id}
      exercise={exercise}
      lang={lang}
      width={landscape ? (window.width - spacing.screen * 2 - spacing.md) / 2 : undefined}
    />
  );
  const details = (
    <>
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
      {dosage.kind === 'time' || counting ? doneOutline : null}
      {distance ? (
        <BigButton
          label={muted ? t('workout.unmuteVoice') : t('workout.muteVoice')}
          variant="outline"
          icon={muted ? 'volume-high' : 'volume-mute'}
          onPress={() => onMute(!muted)}
          testID="voice-mute"
        />
      ) : null}
      <SwitchRow
        label={t('workout.distanceMode')}
        hint={t('workout.distanceModeHint')}
        value={distance}
        onChange={(on) => updateProfile({ distanceMode: on })}
        testID="distance-switch"
      />
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
    </>
  );

  return (
    <>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          { paddingHorizontal: spacing.screen, gap: spacing.md },
          landscape ? styles.row : null,
        ]}
      >
        {landscape ? (
          // Phone on its side, far away: video on the left, the giant counter on the right.
          <>
            <View style={styles.grow}>{video}</View>
            <View style={[styles.grow, { gap: spacing.md }]}>{details}</View>
          </>
        ) : (
          <>
            {video}
            {details}
          </>
        )}
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
          landscape ? styles.row : null,
        ]}
      >
        {mainAction}
        <BigButton
          label={t('workout.hurt')}
          variant="alert"
          icon="hand-left"
          accessibilityHint={t('workout.hurtHint')}
          onPress={showHurt}
          style={landscape ? styles.grow : undefined}
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
  const window = useWindowDimensions();
  const choicesInRow = columnsFit(
    RATINGS.map((r) => t(`rating.${r}`)),
    {
      width: window.width - spacing.screen * 2,
      columns: RATINGS.length,
      gap: spacing.sm,
      cellPadding: spacing.xs * 2 + 4,
      fontSize: typography.bodyBold.fontSize,
      fontScale: window.fontScale,
    },
  );
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
            <View style={[choicesInRow && styles.choices, { gap: spacing.sm }]} testID="choices">
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
  row: {
    flexDirection: 'row',
  },
  grow: {
    flex: 1,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  choices: {
    flexDirection: 'row',
  },
  choice: {
    flexGrow: 1,
    flexBasis: 0,
    borderWidth: 2,
    justifyContent: 'center',
  },
});
