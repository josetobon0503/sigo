import Ionicons from '@expo/vector-icons/Ionicons';
import { Text, View } from 'react-native';

import { useTheme } from '@/theme/useTheme';

export interface LevelUpBannerProps {
  text: string;
  direction: 'up' | 'down'; // down uses a calm primarySoft look, never red
  testID?: string;
}

export function LevelUpBanner({ text, direction, testID }: LevelUpBannerProps) {
  const { colors, typography, spacing, radius } = useTheme();
  const up = direction === 'up';

  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={text}
      testID={testID}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.ms,
        padding: spacing.md,
        borderRadius: radius.card,
        backgroundColor: up ? colors.accentSoft : colors.primarySoft,
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: up ? colors.accent : colors.primary,
        }}
      >
        <Ionicons
          name={up ? 'arrow-up' : 'leaf-outline'}
          size={24}
          color={up ? colors.onAccent : colors.onPrimary}
        />
      </View>
      <Text
        style={[typography.bodyBold, { flex: 1, color: up ? colors.onAccentSoft : colors.text }]}
      >
        {text}
      </Text>
    </View>
  );
}
