import { View } from 'react-native';

import { useTheme } from '@/theme/useTheme';

export interface SetDotsProps {
  total: number;
  current: number; // 0-based: sets before it are done
  color?: string; // defaults to primary
}

// 10 pt dots next to "Serie 1 de 3". Decorative: the text says the same.
export function SetDots({ total, current, color }: SetDotsProps) {
  const { colors, spacing } = useTheme();

  return (
    <View
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={{ flexDirection: 'row', gap: spacing.sm, justifyContent: 'center' }}
    >
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={{
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: i <= current ? (color ?? colors.primary) : colors.borderStrong,
          }}
        />
      ))}
    </View>
  );
}
