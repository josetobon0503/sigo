import { View } from 'react-native';

import { useTheme } from '@/theme/useTheme';

export interface ProgressSegmentsProps {
  total: number;
  current: number; // 0-based index of the current segment
}

// N equal bars: done = primary, current = primary at ~55%, rest = surfaceMuted. Decorative: the screen
// shows the same progress as text ("Ejercicio 3 de 7").
export function ProgressSegments({ total, current }: ProgressSegmentsProps) {
  const { colors, spacing } = useTheme();

  return (
    <View
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={{ flexDirection: 'row', gap: spacing.xs, flex: 1 }}
    >
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          testID={`segment-${i < current ? 'done' : i === current ? 'current' : 'todo'}`}
          style={{
            flex: 1,
            height: 6,
            borderRadius: 3,
            backgroundColor: i <= current ? colors.primary : colors.surfaceMuted,
            opacity: i === current ? 0.55 : 1,
          }}
        />
      ))}
    </View>
  );
}
