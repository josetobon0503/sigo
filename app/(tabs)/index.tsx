import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { BigButton, Card, Pill, ScreenContainer } from '@/components';
import { exercises } from '@/data/exercises';
import { generateWorkout } from '@/engine/generator';
import { consideredAreas, equipmentNeeded, skipReasons, trainedOn } from '@/engine/today';
import type { BodyArea, Exercise, PlannedItem, WorkoutSection } from '@/engine/types';
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
  const minutes = Math.round(workout.estimatedSec / 60);
  const hasItems = workout.items.length > 0;

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

  return (
    <ScreenContainer title={t('today.title')}>
      <View style={{ gap: spacing.xs }}>
        <Text style={[typography.title, { color: colors.text }]} testID="today-day">
          {formatDay(today, lang)}
        </Text>
        {hasItems ? (
          <Text style={[typography.body, { color: colors.textSecondary }]} testID="today-summary">
            {`${t('today.minutes', { count: minutes })} · ${t('today.exercises', { count: workout.items.length })}`}
          </Text>
        ) : null}
      </View>

      {considered.length > 0 ? (
        <Pill
          icon="shield-checkmark-outline"
          label={t('today.considered', { areas: joinList(t, considered) })}
          testID="considered-pill"
        />
      ) : null}

      {skippedNotes.map((note) => (
        <Card key={note} style={[styles.row, { gap: spacing.sm }]}>
          <Ionicons name="information-circle-outline" size={26} color={colors.primary} />
          <Text style={[typography.body, styles.flex, { color: colors.text }]}>{note}</Text>
        </Card>
      ))}

      {!hasItems ? (
        <Card>
          <Text style={[typography.body, { color: colors.text }]}>{t('today.empty')}</Text>
        </Card>
      ) : trained ? (
        <Card style={{ gap: spacing.md }} testID="trained-today">
          <View style={{ gap: spacing.xs }}>
            <Text accessibilityRole="header" style={[typography.title, { color: colors.text }]}>
              {t('today.doneTitle')}
            </Text>
            <Text style={[typography.body, { color: colors.text }]}>{t('today.doneBody')}</Text>
          </View>
          <BigButton
            label={t('today.repeat')}
            variant="secondary"
            icon="refresh"
            onPress={start}
            testID="repeat-workout"
          />
        </Card>
      ) : (
        <BigButton
          label={t('today.start')}
          icon="play"
          accessibilityHint={t('today.startHint')}
          onPress={start}
          testID="start-workout"
        />
      )}

      {SECTIONS.map((section) => {
        const items = workout.items.filter((i) => i.section === section);
        if (items.length === 0) return null;
        return (
          <Card key={section} style={{ gap: spacing.sm }}>
            <Text accessibilityRole="header" style={[typography.title, { color: colors.text }]}>
              {t(`today.${section}`)}
            </Text>
            {items.map((item, i) => {
              const exercise = byId.get(item.exerciseId);
              const prev = i > 0 ? byId.get(items[i - 1].exerciseId) : undefined;
              // Exercises lying down come together at the end: say so once, before the first.
              const toBed = exercise?.position === 'lying' && prev?.position !== 'lying';
              return (
                <View key={item.exerciseId} style={{ gap: spacing.sm }}>
                  {toBed ? (
                    <Text
                      style={[typography.bodyBold, { color: colors.primary }]}
                      testID="lying-notice"
                    >
                      {t(profile.floorOk ? 'today.lyingNotice' : 'today.lyingNoticeBed')}
                    </Text>
                  ) : null}
                  <ExerciseRow item={item} exercise={exercise} />
                </View>
              );
            })}
          </Card>
        );
      })}

      {hasItems ? (
        <Card style={{ gap: spacing.sm }}>
          <Text accessibilityRole="header" style={[typography.title, { color: colors.text }]}>
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

function ExerciseRow({ item, exercise }: { item: PlannedItem; exercise: Exercise | undefined }) {
  const { t, i18n } = useTranslation();
  const { colors, typography, spacing } = useTheme();
  if (!exercise) return null;
  const name = exercise.name[i18n.language === 'en' ? 'en' : 'es'];

  return (
    <View
      accessible
      accessibilityLabel={`${name}, ${spokenDosage(t, item.dosage, item.perSide)}`}
      style={[styles.exerciseRow, { gap: spacing.md, borderTopColor: colors.border }]}
    >
      <Text style={[typography.body, styles.flex, { color: colors.text }]}>{name}</Text>
      <Text style={[typography.bodyBold, styles.dosage, { color: colors.text }]}>
        {formatDosage(t, item.dosage, item.perSide)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  flex: {
    flex: 1,
  },
  exerciseRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  dosage: {
    textAlign: 'right',
    flexShrink: 1,
  },
});
