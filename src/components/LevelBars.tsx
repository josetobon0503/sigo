import { Text, View } from 'react-native';

import { useTheme } from '@/theme/useTheme';

export interface LevelBarRow {
  key: string;
  label: string;
  level: number; // 1 ... 5
  raised: boolean; // raised this week: the top filled segment is accent
  accessibilityLabel: string;
}

const LEVELS = [1, 2, 3, 4, 5];

// Label column, 5 segments 12 pt tall and the number.
export function LevelBars({ rows }: { rows: LevelBarRow[] }) {
  const { colors, typography, spacing } = useTheme();

  return (
    <View style={{ gap: spacing.ms }}>
      {rows.map((row) => (
        <View
          key={row.key}
          accessible
          accessibilityLabel={row.accessibilityLabel}
          testID={`level-${row.key}`}
          style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.ms, flexWrap: 'wrap' }}
        >
          <Text style={[typography.callout, { color: colors.text, width: 132 }]}>{row.label}</Text>
          <View style={{ flexDirection: 'row', gap: spacing.xs, flex: 1, minWidth: 120 }}>
            {LEVELS.map((n) => (
              <View
                key={n}
                testID={n === row.level && row.raised ? `level-${row.key}-raised` : undefined}
                style={{
                  flex: 1,
                  height: 12,
                  borderRadius: 6,
                  backgroundColor:
                    n > row.level
                      ? colors.surfaceMuted
                      : n === row.level && row.raised
                        ? colors.accent
                        : colors.primary,
                }}
              />
            ))}
          </View>
          <Text style={[typography.calloutBold, { color: colors.text, minWidth: 16 }]}>
            {row.level}
          </Text>
        </View>
      ))}
    </View>
  );
}
