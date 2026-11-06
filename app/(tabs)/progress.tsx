import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTranslation } from 'react-i18next';

import { Card, FaceIcon, LevelBars, ScreenContainer, WeekStrip } from '@/components';
import {
  FEELINGS,
  PROGRESS_PATTERNS,
  feelings,
  minutes,
  painHistory,
  thisWeek,
  weekStart,
  weekStreak,
  type AreaHistory,
  type ProgressPattern,
} from '@/engine/stats';
import { dayOf } from '@/engine/rules';
import type { PainIntensity, UserProfile, WorkoutLog } from '@/engine/types';
import { formatShortDay, goalMetText } from '@/i18n/format';
import { useToday } from '@/store/devStore';
import { useHistoryStore } from '@/store/historyStore';
import { usePainHistoryStore } from '@/store/painHistoryStore';
import { useProfileStore } from '@/store/profileStore';
import { columnsFit } from '@/theme/textFit';
import { BIG_NUMBER_MAX_SCALE, faceScale } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

// Patterns whose level went up in a workout of this week and is still that level.
function raisedThisWeek(
  logs: WorkoutLog[],
  today: string,
  levels: UserProfile['levels'],
): Set<ProgressPattern> {
  const week = weekStart(today);
  const raised = new Set<ProgressPattern>();
  for (const log of logs) {
    const day = dayOf(log.date);
    if (day > today || weekStart(day) !== week) continue;
    for (const c of log.levelChanges ?? []) {
      if (c.to > c.from && c.pattern !== 'mobility' && levels[c.pattern] === c.to) {
        raised.add(c.pattern);
      }
    }
  }
  return raised;
}

export default function ProgressScreen() {
  const { t, i18n } = useTranslation();
  const { colors, typography, spacing, radius } = useTheme();
  const profile = useProfileStore((s) => s.profile);
  const logs = useHistoryStore((s) => s.logs);
  const painEntries = usePainHistoryStore((s) => s.entries);
  const today = useToday();
  const window = useWindowDimensions();

  if (!profile) return null;

  const lang = i18n.language === 'en' ? 'en' : 'es';
  const goal = profile.weeklyGoal;
  const week = thisWeek(logs, today, goal);
  const streak = weekStreak(logs, today, goal);
  const mins = minutes(logs, today);
  const felt = feelings(logs);
  const pain = painHistory(painEntries, profile.painAreas);
  const raised = raisedThisWeek(logs, today, profile.levels);
  const hasHistory = mins.total > 0 || week.count > 0 || felt.length > 0;
  const left = Math.max(0, week.goal - week.count);
  const goalMet = goalMetText(t, week.count, week.goal);

  const streakText =
    streak.currentWeek === 'missed'
      ? t('progress.streakFresh')
      : streak.weeks > 0
        ? t('progress.streak', { count: streak.weeks })
        : t('progress.streakStart');
  const header = (text: string) => (
    <Text accessibilityRole="header" style={[typography.headline, { color: colors.text }]}>
      {text}
    </Text>
  );
  const weekTexts = goalMet
    ? [goalMet.title, goalMet.detail]
    : [
        t('progress.weekCount', { count: week.count, goal: week.goal }),
        t('progress.remaining', { count: left }),
      ];
  const streakTexts = [
    streakText,
    t('progress.streakOpen'),
    ...(streak.best > 0 ? [t('progress.best', { count: streak.best })] : []),
  ];
  // Two tiles side by side only when no word would split; else one under the other.
  const tilesInRow = columnsFit([...weekTexts, ...streakTexts], {
    width: window.width - spacing.screen * 2,
    columns: 2,
    gap: spacing.ms,
    cellPadding: spacing.md * 2,
    fontSize: typography.calloutBold.fontSize,
    fontScale: window.fontScale,
  });
  const tileStyle = {
    flexGrow: 1,
    flexBasis: tilesInRow ? 0 : ('auto' as const),
    borderRadius: radius.card,
    padding: spacing.md,
    gap: spacing.sm,
  };

  return (
    <ScreenContainer title={t('progress.title')}>
      {!hasHistory ? (
        <Card testID="progress-empty">
          <Text style={[typography.body, { color: colors.text }]}>{t('progress.empty')}</Text>
        </Card>
      ) : null}

      <View style={[tilesInRow && styles.tiles, { gap: spacing.ms }]} testID="progress-tiles">
        <View
          style={[tileStyle, { backgroundColor: colors.surface, borderColor: colors.border }]}
          testID="progress-week"
        >
          <GoalRing count={week.count} goal={week.goal} />
          <Text style={[typography.calloutBold, { color: colors.text }]}>{weekTexts[0]}</Text>
          <Text style={[typography.callout, { color: colors.textSecondary }]}>{weekTexts[1]}</Text>
        </View>

        <View style={[tileStyle, { backgroundColor: colors.accentSoft }]} testID="progress-streak">
          <Ionicons name="flame" size={32} color={colors.onAccentSoft} />
          <Text style={[typography.calloutBold, { color: colors.onAccentSoft }]}>{streakText}</Text>
          {streak.currentWeek === 'open' && streak.weeks > 0 ? (
            <Text style={[typography.callout, { color: colors.onAccentSoft }]}>
              {t('progress.streakOpen')}
            </Text>
          ) : null}
          {streak.best > 0 ? (
            <Text style={[typography.callout, { color: colors.onAccentSoft }]} testID="best-streak">
              {t('progress.best', { count: streak.best })}
            </Text>
          ) : null}
        </View>
      </View>

      <Card style={{ gap: spacing.ms }}>
        {header(t('progress.weekTitle'))}
        <WeekStrip days={week.days} today={today} />
      </Card>

      <Card style={{ gap: spacing.ms }} testID="progress-levels">
        {header(t('progress.levelsTitle'))}
        <LevelBars
          rows={PROGRESS_PATTERNS.map((pattern) => {
            const level = profile.levels[pattern];
            const name = t(`levelName.${pattern}`);
            const up = raised.has(pattern);
            const spoken = `${name}, ${t('progress.level', { level })}`;
            return {
              key: pattern,
              label: name,
              level,
              raised: up,
              accessibilityLabel: up ? `${spoken}, ${t('progress.raisedThisWeek')}` : spoken,
            };
          })}
        />
        {raised.size > 0 ? (
          <View style={[styles.row, { gap: spacing.sm }]}>
            <View style={[styles.legendDot, { backgroundColor: colors.accent }]} />
            <Text style={[typography.caption, styles.flex, { color: colors.textSecondary }]}>
              {t('progress.levelsLegend')}
            </Text>
          </View>
        ) : null}
      </Card>

      <Card style={{ gap: spacing.ms }} testID="progress-feelings">
        {header(t('progress.feelingsTitle'))}
        {felt.length === 0 ? (
          <Text style={[typography.body, { color: colors.text }]}>
            {t('progress.feelingsEmpty')}
          </Text>
        ) : (
          felt.map(({ id, day, feeling }) => (
            <View
              key={id}
              accessible
              accessibilityLabel={`${formatShortDay(day, lang)}: ${t(`feeling.${feeling}`)}`}
              style={[styles.row, { gap: spacing.ms }]}
            >
              <FaceIcon index={FEELINGS.indexOf(feeling)} size={32} />
              <Text style={[typography.callout, styles.flex, { color: colors.text }]}>
                {t(`feeling.${feeling}`)}
              </Text>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>
                {formatShortDay(day, lang)}
              </Text>
            </View>
          ))
        )}
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

const RING = 88;
const RING_STROKE = 10;

// Weekly goal as a ring with "2/3" in the middle, full with a check once met (never "3/2").
// Decorative: the tile says the same in words.
function GoalRing({ count, goal }: { count: number; goal: number }) {
  const { colors, typography } = useTheme();
  const c = RING / 2;
  const r = (RING - RING_STROKE) / 2;
  const length = 2 * Math.PI * r;
  const done = Math.min(1, goal > 0 ? count / goal : 0);

  return (
    <View
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={{ width: RING, height: RING }}
    >
      <Svg width={RING} height={RING} style={StyleSheet.absoluteFill}>
        <Circle
          cx={c}
          cy={c}
          r={r}
          stroke={colors.surfaceMuted}
          strokeWidth={RING_STROKE}
          fill="none"
        />
        {done > 0 ? (
          <Circle
            cx={c}
            cy={c}
            r={r}
            stroke={colors.primary}
            strokeWidth={RING_STROKE}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${length} ${length}`}
            strokeDashoffset={length * (1 - done)}
            transform={`rotate(-90 ${c} ${c})`}
          />
        ) : null}
      </Svg>
      <View style={styles.ringCenter}>
        {count >= goal ? (
          <View testID="goal-ring-met">
            <Ionicons name="checkmark" size={40} color={colors.primary} />
          </View>
        ) : (
          <Text
            style={[typography.headline, { color: colors.text }]}
            maxFontSizeMultiplier={BIG_NUMBER_MAX_SCALE}
          >
            {`${count}/${goal}`}
          </Text>
        )}
      </View>
    </View>
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
      <Text style={[typography.callout, { color: colors.textSecondary }]}>{summary}</Text>
      <View style={[styles.row, styles.wrap, styles.bottom, { gap: spacing.sm }]}>
        {points.map((p) => (
          <View key={p.day} style={[styles.point, { gap: spacing.xs }]}>
            <View
              style={{
                width: 24,
                height: p.intensity * BAR_STEP,
                borderRadius: radius.chip / 2,
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
  tiles: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  wrap: {
    flexWrap: 'wrap',
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
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  point: {
    alignItems: 'center',
  },
  ringCenter: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
