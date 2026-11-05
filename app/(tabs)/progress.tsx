import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Card, FaceIcon, ScreenContainer } from '@/components';
import {
  FEELINGS,
  PROGRESS_PATTERNS,
  feelings,
  minutes,
  painHistory,
  thisWeek,
  weekStreak,
  type AreaHistory,
} from '@/engine/stats';
import type { PainIntensity } from '@/engine/types';
import { formatShortDay } from '@/i18n/format';
import { useToday } from '@/store/devStore';
import { useHistoryStore } from '@/store/historyStore';
import { usePainHistoryStore } from '@/store/painHistoryStore';
import { useProfileStore } from '@/store/profileStore';
import { faceScale } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

const LEVELS = [1, 2, 3, 4, 5];
const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const; // Monday first

// Kept simple on purpose: the visual redesign comes in a later phase.
export default function ProgressScreen() {
  const { t, i18n } = useTranslation();
  const { colors, typography, spacing, radius } = useTheme();
  const profile = useProfileStore((s) => s.profile);
  const logs = useHistoryStore((s) => s.logs);
  const painEntries = usePainHistoryStore((s) => s.entries);
  const today = useToday();

  if (!profile) return null;

  const lang = i18n.language === 'en' ? 'en' : 'es';
  const goal = profile.weeklyGoal;
  const week = thisWeek(logs, today, goal);
  const streak = weekStreak(logs, today, goal);
  const mins = minutes(logs, today);
  const felt = feelings(logs);
  const pain = painHistory(painEntries, profile.painAreas);
  const hasHistory = mins.total > 0 || week.count > 0 || felt.length > 0;

  const streakText =
    streak.currentWeek === 'missed'
      ? t('progress.streakFresh')
      : streak.weeks > 0
        ? t('progress.streak', { count: streak.weeks })
        : t('progress.streakStart');
  const header = (text: string) => (
    <Text accessibilityRole="header" style={[typography.title, { color: colors.text }]}>
      {text}
    </Text>
  );

  return (
    <ScreenContainer title={t('progress.title')}>
      {!hasHistory ? (
        <Card testID="progress-empty">
          <Text style={[typography.body, { color: colors.text }]}>{t('progress.empty')}</Text>
        </Card>
      ) : null}

      <Card style={{ gap: spacing.sm }} testID="progress-week">
        {header(t('progress.weekTitle'))}
        <Text style={[typography.bodyBold, { color: colors.text }]}>
          {t('progress.weekCount', { count: week.count, goal: week.goal })}
        </Text>
        <View style={[styles.row, { gap: spacing.xs }]}>
          {week.days.map(({ day, trained }, i) => {
            const label = t(trained ? 'progress.dayTrained' : 'progress.dayRest', {
              day: t(`weekday.long.${WEEKDAYS[i]}`),
            });
            return (
              <View
                key={day}
                accessible
                accessibilityLabel={label}
                testID={`week-day-${i}`}
                style={[
                  styles.day,
                  {
                    borderRadius: radius.pill,
                    borderColor: colors.primary,
                    backgroundColor: trained ? colors.primary : colors.surface,
                  },
                ]}
              >
                {trained ? (
                  <Ionicons name="checkmark" size={22} color={colors.onPrimary} />
                ) : (
                  <Text style={[typography.bodyBold, { color: colors.text }]}>
                    {t(`weekday.short.${WEEKDAYS[i]}`)}
                  </Text>
                )}
              </View>
            );
          })}
        </View>
        {week.met ? (
          <Text style={[typography.body, { color: colors.text }]}>{t('progress.weekMet')}</Text>
        ) : null}
      </Card>

      <Card style={{ gap: spacing.sm }} testID="progress-streak">
        {header(t('progress.streakTitle'))}
        <Text style={[typography.body, { color: colors.text }]}>{streakText}</Text>
        {streak.currentWeek === 'open' && streak.weeks > 0 ? (
          <Text style={[typography.body, { color: colors.text }]}>{t('progress.streakOpen')}</Text>
        ) : null}
        {streak.best > 0 ? (
          <Text style={[typography.bodyBold, { color: colors.text }]} testID="best-streak">
            {t('progress.best', { count: streak.best })}
          </Text>
        ) : null}
      </Card>

      <Card style={{ gap: spacing.xs }} testID="progress-minutes">
        {header(t('progress.minutesTitle'))}
        <Text style={[typography.body, { color: colors.text }]}>
          {t('progress.minutesWeek', { count: mins.week })}
        </Text>
        <Text style={[typography.body, { color: colors.text }]}>
          {t('progress.minutesTotal', { count: mins.total })}
        </Text>
      </Card>

      <Card style={{ gap: spacing.md }} testID="progress-levels">
        {header(t('progress.levelsTitle'))}
        {PROGRESS_PATTERNS.map((pattern) => {
          const level = profile.levels[pattern];
          const name = t(`levelName.${pattern}`);
          const levelText = t('progress.level', { level });
          return (
            <View
              key={pattern}
              accessible
              accessibilityLabel={`${name}, ${levelText}`}
              testID={`level-${pattern}`}
              style={{ gap: spacing.xs }}
            >
              <View style={[styles.row, styles.between, { gap: spacing.sm }]}>
                <Text style={[typography.body, styles.flex, { color: colors.text }]}>{name}</Text>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>
                  {levelText}
                </Text>
              </View>
              <View style={[styles.bar, { gap: spacing.xs }]}>
                {LEVELS.map((n) => (
                  <View
                    key={n}
                    style={[
                      styles.segment,
                      {
                        borderRadius: radius.chip,
                        borderColor: colors.primary,
                        backgroundColor: n <= level ? colors.primary : colors.surface,
                      },
                    ]}
                  />
                ))}
              </View>
            </View>
          );
        })}
      </Card>

      <Card style={{ gap: spacing.sm }} testID="progress-feelings">
        {header(t('progress.feelingsTitle'))}
        {felt.length === 0 ? (
          <Text style={[typography.body, { color: colors.text }]}>
            {t('progress.feelingsEmpty')}
          </Text>
        ) : (
          felt.map(({ id, day, feeling }) => (
            <View key={id} accessible style={[styles.row, { gap: spacing.md }]}>
              <FaceIcon index={FEELINGS.indexOf(feeling)} size={40} />
              <Text style={[typography.body, styles.flex, { color: colors.text }]}>
                {t(`feeling.${feeling}`)}
              </Text>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>
                {formatShortDay(day, lang)}
              </Text>
            </View>
          ))
        )}
      </Card>

      <Card style={{ gap: spacing.md }} testID="progress-pain">
        {header(t('progress.painTitle'))}
        {pain.length === 0 ? (
          <Text style={[typography.body, { color: colors.text }]}>{t('progress.painEmpty')}</Text>
        ) : (
          pain.map((history) => <PainRow key={history.area} history={history} lang={lang} />)
        )}
      </Card>
    </ScreenContainer>
  );
}

const BAR_STEP = 10; // points of bar height per intensity step

function PainRow({ history, lang }: { history: AreaHistory; lang: 'es' | 'en' }) {
  const { t } = useTranslation();
  const { colors, typography, spacing, radius } = useTheme();
  const { area, points } = history;
  const intensity = (n: PainIntensity) => t(`painIntensity.${n}`);
  const now = intensity(points[points.length - 1].intensity);
  const summary =
    points.length > 1
      ? t('progress.painBeforeNow', { before: intensity(points[0].intensity), now })
      : t('progress.painNow', { now });
  const spoken = points
    .map((p) =>
      t('progress.painPoint', {
        day: formatShortDay(p.day, lang),
        intensity: intensity(p.intensity),
      }),
    )
    .join(', ');

  return (
    <View
      accessible
      accessibilityLabel={`${t(`bodyArea.${area}`)}. ${summary}. ${spoken}`}
      testID={`pain-history-${area}`}
      style={{ gap: spacing.xs }}
    >
      <Text style={[typography.bodyBold, { color: colors.text }]}>{t(`bodyArea.${area}`)}</Text>
      <Text style={[typography.body, { color: colors.text }]}>{summary}</Text>
      <View style={[styles.row, styles.bottom, { gap: spacing.sm }]}>
        {points.map((p) => (
          <View key={p.day} style={[styles.point, { gap: spacing.xs }]}>
            <View
              style={{
                width: 24,
                height: p.intensity * BAR_STEP,
                borderRadius: radius.chip,
                backgroundColor: faceScale[p.intensity - 1],
              }}
            />
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              {formatShortDay(p.day, lang)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  bar: {
    flexDirection: 'row',
  },
  between: {
    justifyContent: 'space-between',
  },
  bottom: {
    alignItems: 'flex-end',
  },
  flex: {
    flex: 1,
  },
  day: {
    width: 40,
    height: 40,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segment: {
    flex: 1,
    height: 16,
    borderWidth: 2,
  },
  point: {
    alignItems: 'center',
  },
});
