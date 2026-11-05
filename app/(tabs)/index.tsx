import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  BigButton,
  Card,
  ExerciseRow,
  HeroCard,
  LevelUpBanner,
  Pill,
  ScreenContainer,
  StreakBadge,
  WeekStrip,
} from '@/components';
import { exercises } from '@/data/exercises';
import { generateWorkout } from '@/engine/generator';
import { PROGRESS_PATTERNS, thisWeek, visibleLevelChanges, weekStreak } from '@/engine/stats';
import { consideredAreas, equipmentNeeded, skipReasons, trainedOn } from '@/engine/today';
import type { BodyArea, Pattern, WorkoutSection } from '@/engine/types';
import { formatDay, formatDosage, joinList, spokenDosage } from '@/i18n/format';
import { useToday } from '@/store/devStore';
import { useHistoryStore } from '@/store/historyStore';
import { useProfileStore } from '@/store/profileStore';
import { useSessionStore } from '@/store/sessionStore';
import { useTheme } from '@/theme/useTheme';

const SECTIONS: WorkoutSection[] = ['warmup', 'main', 'cooldown'];
const byId = new Map(exercises.map((e) => [e.id, e]));

export default function TodayScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { colors, typography, spacing } = useTheme();
  const profile = useProfileStore((s) => s.profile);
  const logs = useHistoryStore((s) => s.logs);
  const startSession = useSessionStore((s) => s.start);
  const today = useToday();

  const workout = useMemo(
    () => (profile ? generateWorkout(profile, exercises, logs, today) : null),
    [profile, logs, today],
  );

  if (!profile || !workout) return null;

  const lang = i18n.language === 'en' ? 'en' : 'es';
  const areaName = (area: BodyArea) => t(`bodyArea.${area}`).toLocaleLowerCase(lang);
  const considered = consideredAreas(profile).map((a) => areaName(a));
  const reasons = skipReasons(workout.skippedPatterns, profile, exercises, today);
  const equipment = equipmentNeeded(workout.items, exercises, profile.equipment, profile.floorOk);
  const trained = trainedOn(logs, today);
  const week = thisWeek(logs, today, profile.weeklyGoal);
  const streak = weekStreak(logs, today, profile.weeklyGoal);
  const minutes = Math.round(workout.estimatedSec / 60);
  const hasItems = workout.items.length > 0;
  // From the last workout, until the next one.
  const changed = visibleLevelChanges(logs, profile.levels);
  const levelNames = (patterns: typeof changed.up) =>
    joinList(
      t,
      patterns.map((p) => t(`levelName.${p}`)),
    );
  const avgLevel = Math.round(
    PROGRESS_PATTERNS.reduce((sum, p) => sum + profile.levels[p], 0) / PROGRESS_PATTERNS.length,
  );

  // Routine name from the movements of the main block, e.g. "Piernas, equilibrio y abdomen".
  const mainPatterns = [
    ...new Set(
      workout.items
        .filter((i) => i.section === 'main')
        .map((i) => byId.get(i.exerciseId)?.pattern)
        .filter((p): p is Pattern => p !== undefined),
    ),
  ];
  const routineName = joinList(
    t,
    mainPatterns.map((p, i) => {
      const name = t(`pattern.${p}`);
      return i === 0 ? name : name.toLocaleLowerCase(lang);
    }),
  );

  const start = () => {
    startSession(workout, profile.seatedOnly);
    router.push('/workout/session');
  };

  const skippedNotes = workout.skippedPatterns.map((pattern) => {
    const areas = reasons[pattern] ?? [];
    const patternText = t(`patternSkipped.${pattern}`);
    if (areas.length === 0) return t('today.skippedOther', { pattern: patternText });
    const yours = areas.map((a) => t('today.yourArea', { area: areaName(a) }));
    return t('today.skippedPain', { pattern: patternText, areas: joinList(t, yours) });
  });

  const heroText = (style: object, text: string, testID?: string) => (
    <Text style={[style, { color: colors.onHero }]} testID={testID}>
      {text}
    </Text>
  );

  return (
    <ScreenContainer>
      <View style={[styles.row, { gap: spacing.ms }]}>
        <View style={[styles.flex, { gap: spacing.xs }]}>
          <Text style={[typography.callout, { color: colors.textSecondary }]} testID="today-day">
            {formatDay(today, lang)}
          </Text>
          <Text accessibilityRole="header" style={[typography.largeTitle, { color: colors.text }]}>
            {profile.name ? t('today.greeting', { name: profile.name }) : t('today.title')}
          </Text>
        </View>
        {profile.name ? (
          <View
            importantForAccessibility="no-hide-descendants"
            accessibilityElementsHidden
            style={[styles.avatar, { backgroundColor: colors.primarySoft }]}
          >
            <Text style={[typography.headline, { color: colors.primaryPressed }]}>
              {profile.name.charAt(0).toLocaleUpperCase(lang)}
            </Text>
          </View>
        ) : null}
      </View>

      <Card style={{ gap: spacing.ms }} testID="today-week">
        <View style={[styles.row, styles.wrap, { gap: spacing.sm }]}>
          <Text style={[typography.headline, styles.flex, { color: colors.text }]}>
            {t('today.weekCount', { count: week.count, goal: week.goal })}
          </Text>
          {streak.weeks > 0 ? <StreakBadge weeks={streak.weeks} /> : null}
        </View>
        <WeekStrip days={week.days} today={today} />
      </Card>

      {changed.up.length > 0 ? (
        <LevelUpBanner
          direction="up"
          text={t('today.levelUp', { patterns: levelNames(changed.up) })}
          testID="level-up"
        />
      ) : null}

      {changed.down.length > 0 ? (
        <LevelUpBanner
          direction="down"
          text={t('today.levelDown', { patterns: levelNames(changed.down) })}
          testID="level-down"
        />
      ) : null}

      {!hasItems ? (
        <Card>
          <Text style={[typography.body, { color: colors.text }]}>{t('today.empty')}</Text>
        </Card>
      ) : trained ? (
        <HeroCard testID="trained-today">
          <Text accessibilityRole="header" style={[typography.title2, { color: colors.onHero }]}>
            {t('today.doneTitle')}
          </Text>
          <Text style={[typography.body, { color: colors.onHeroMuted }]}>
            {t('today.doneBody')}
          </Text>
          <BigButton
            label={t('today.repeat')}
            variant="inverse"
            icon="refresh"
            onPress={start}
            testID="repeat-workout"
          />
        </HeroCard>
      ) : (
        <HeroCard testID="today-hero">
          <Text style={[typography.callout, { color: colors.onHeroMuted }]}>
            {t('today.heroLabel')}
          </Text>
          {routineName ? heroText(typography.title2, routineName) : null}
          {heroText(
            typography.body,
            [
              t('today.minutes', { count: minutes }),
              t('today.exercises', { count: workout.items.length }),
              t('today.level', { level: avgLevel }),
            ].join(' · '),
            'today-summary',
          )}
          {considered.length > 0 ? (
            <Pill
              tone="hero"
              icon="shield-checkmark-outline"
              label={t('today.considered', { areas: joinList(t, considered) })}
              testID="considered-pill"
            />
          ) : null}
          <BigButton
            label={t('today.start')}
            variant="inverse"
            icon="play"
            accessibilityHint={t('today.startHint')}
            onPress={start}
            testID="start-workout"
            style={{ marginTop: spacing.xs }}
          />
        </HeroCard>
      )}

      {skippedNotes.map((note) => (
        <Card key={note} style={[styles.row, { gap: spacing.sm }]}>
          <Ionicons name="information-circle-outline" size={26} color={colors.primary} />
          <Text style={[typography.body, styles.flex, { color: colors.text }]}>{note}</Text>
        </Card>
      ))}

      {hasItems ? (
        <Text accessibilityRole="header" style={[typography.title2, { color: colors.text }]}>
          {t('today.listTitle')}
        </Text>
      ) : null}

      {hasItems ? (
        <Card style={{ paddingVertical: spacing.sm }}>
          {SECTIONS.map((section) => {
            const items = workout.items.filter((i) => i.section === section);
            if (items.length === 0) return null;
            const subheader = (text: string, testID?: string) => (
              <Text
                accessibilityRole="header"
                style={[typography.calloutBold, { color: colors.primary, marginTop: spacing.ms }]}
                testID={testID}
              >
                {text}
              </Text>
            );
            return (
              <View key={section}>
                {subheader(t(`today.${section}`))}
                {items.map((item, i) => {
                  const exercise = byId.get(item.exerciseId);
                  if (!exercise) return null;
                  const prev = i > 0 ? byId.get(items[i - 1].exerciseId) : undefined;
                  // Exercises lying down come together at the end: say so once, before the first.
                  const toBed = exercise.position === 'lying' && prev?.position !== 'lying';
                  const name = exercise.name[lang];
                  return (
                    <View key={item.exerciseId}>
                      {toBed
                        ? subheader(
                            t(profile.floorOk ? 'today.lyingNotice' : 'today.lyingNoticeBed'),
                            'lying-notice',
                          )
                        : null}
                      <ExerciseRow
                        name={name}
                        meta={`${t(`pattern.${exercise.pattern}`)} · ${formatDosage(t, item.dosage, item.perSide)}`}
                        accessibilityLabel={`${name}, ${spokenDosage(t, item.dosage, item.perSide)}`}
                        divider={i < items.length - 1}
                      />
                    </View>
                  );
                })}
              </View>
            );
          })}
        </Card>
      ) : null}

      {hasItems ? (
        <Card style={{ gap: spacing.sm }}>
          <Text accessibilityRole="header" style={[typography.headline, { color: colors.text }]}>
            {t('today.equipmentTitle')}
          </Text>
          {equipment.length === 0 ? (
            <Text style={[typography.body, { color: colors.text }]}>{t('today.noEquipment')}</Text>
          ) : (
            equipment.map((eq) => (
              <View key={eq} style={[styles.row, { gap: spacing.sm }]}>
                <Ionicons name="checkmark-circle-outline" size={24} color={colors.primary} />
                <Text style={[typography.body, styles.flex, { color: colors.text }]}>
                  {t(`equipmentName.${eq}`)}
                </Text>
              </View>
            ))
          )}
        </Card>
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  wrap: {
    flexWrap: 'wrap',
  },
  flex: {
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
