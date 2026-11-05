import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { BIG_NUMBER_MAX_SCALE } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

export interface CountdownRingProps {
  seconds: number; // shown in the center
  progress: number; // 0 ... 1, part of the rest still left
  label: string; // "segundos"
  accessibilityLabel: string; // "Quedan 25 segundos"
  size?: number;
  testID?: string;
}

const STROKE = 16;

// Rest countdown on restBg: track in restTrack, remaining time in onHero.
export function CountdownRing({
  seconds,
  progress,
  label,
  accessibilityLabel,
  size = 232,
  testID,
}: CountdownRingProps) {
  const { colors, typography } = useTheme();
  const c = size / 2;
  const r = (size - STROKE) / 2;
  const length = 2 * Math.PI * r;
  const left = Math.min(1, Math.max(0, progress));

  return (
    <View
      accessible
      accessibilityRole="timer"
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      style={{ width: size, height: size, alignSelf: 'center' }}
    >
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={c} cy={c} r={r} stroke={colors.restTrack} strokeWidth={STROKE} fill="none" />
        <Circle
          cx={c}
          cy={c}
          r={r}
          stroke={colors.onHero}
          strokeWidth={STROKE}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${length} ${length}`}
          strokeDashoffset={length * (1 - left)}
          transform={`rotate(-90 ${c} ${c})`}
        />
      </Svg>
      <View style={styles.center}>
        <Text
          style={[typography.countdown, styles.number, { color: colors.onHero }]}
          maxFontSizeMultiplier={BIG_NUMBER_MAX_SCALE}
        >
          {seconds}
        </Text>
        <Text
          style={[typography.callout, { color: colors.onHeroMuted }]}
          maxFontSizeMultiplier={BIG_NUMBER_MAX_SCALE}
        >
          {label}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  number: {
    fontVariant: ['tabular-nums'],
  },
});
