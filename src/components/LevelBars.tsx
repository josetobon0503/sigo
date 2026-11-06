import { Text, View, useWindowDimensions } from 'react-native';

import { columnsFit } from '@/theme/textFit';
import { useTheme } from '@/theme/useTheme';

export interface LevelBarRow {
  key: string;
  label: string;
  level: number; // 1 ... 5
  raised: boolean; // raised this week: the top filled segment is accent
  accessibilityLabel: string;
}

const LEVELS = [1, 2, 3, 4, 5];
const LABEL_WIDTH = 132;

// Label column, 5 segments 12 pt tall and the number.
export function LevelBars({ rows }: { rows: LevelBarRow[] }) {
  const { colors, typography, spacing } = useTheme();
  const { fontScale } = useWindowDimensions();
  const labelBeside = columnsFit(
    rows.map((r) => r.label),
    {
      width: LABEL_WIDTH,
      columns: 1,
      gap: 0,
      cellPadding: 0,
      fontSize: typography.callout.fontSize,
      fontScale,
    },
  );

  return (
    <View style={{ gap: spacing.ms }}>
      {rows.map((row) => (
        <View
          key={row.key}
          accessible
          accessibilityLabel={row.accessibilityLabel}
          testID={`level-${row.key}`}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.ms,
            flexWrap: labelBeside ? 'nowrap' : 'wrap',
          }}
        >
          <Text
            style={[
              typography.callout,
              { color: colors.text, width: labelBeside ? LABEL_WIDTH : '100%' },
            ]}
            testID={`level-${row.key}-label`}
          >
            {row.label}
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing.xs, flex: 1 }}>
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
