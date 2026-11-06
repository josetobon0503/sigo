import Ionicons from '@expo/vector-icons/Ionicons';
import { Text, View } from 'react-native';

import { useTheme } from '@/theme/useTheme';

export interface ExerciseRowProps {
  name: string;
  meta: string; // "Piernas · 3 × 10"
  divider?: boolean;
  accessibilityLabel?: string; // defaults to "name, meta"
  tone?: 'default' | 'rest'; // rest = on the restCard
  testID?: string;
}

// 48 pt thumbnail (placeholder until videos exist), name and meta line.
export function ExerciseRow({
  name,
  meta,
  divider = true,
  accessibilityLabel,
  tone = 'default',
  testID,
}: ExerciseRowProps) {
  const { colors, typography, spacing, radius } = useTheme();
  const rest = tone === 'rest';

  return (
    <View
      accessible
      accessibilityLabel={accessibilityLabel ?? `${name}, ${meta}`}
      testID={testID}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.ms,
        paddingVertical: spacing.ms,
        borderBottomWidth: divider ? 1 : 0,
        borderBottomColor: colors.border,
      }}
    >
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: radius.thumb,
          backgroundColor: colors.primarySoft,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons
          name="body-outline"
          size={24}
          color={rest ? colors.restCardAccent : colors.primary}
        />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[typography.bodyBold, { color: rest ? colors.onRestCard : colors.text }]}>
          {name}
        </Text>
        <Text
          style={[
            typography.caption,
            { color: rest ? colors.onRestCardMuted : colors.textSecondary },
          ]}
        >
          {meta}
        </Text>
      </View>
    </View>
  );
}
