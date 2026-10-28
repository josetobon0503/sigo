import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme/useTheme';

import { Card } from './Card';

export interface NoticeProps {
  title: string;
  body: string;
  testID?: string;
}

// Calm, important message (e.g. "Please talk to your doctor"). Does not block the user.
export function Notice({ title, body, testID }: NoticeProps) {
  const { colors, typography, spacing } = useTheme();

  return (
    <Card testID={testID} style={{ borderColor: colors.secondary, borderWidth: 2 }}>
      <View
        accessible
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        accessibilityLabel={`${title}. ${body}`}
        style={[styles.row, { gap: spacing.sm }]}
      >
        <Ionicons name="medkit-outline" size={28} color={colors.secondary} />
        <View style={[styles.text, { gap: spacing.xs }]}>
          <Text style={[typography.bodyBold, { color: colors.text }]}>{title}</Text>
          <Text style={[typography.body, { color: colors.text }]}>{body}</Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  text: {
    flex: 1,
  },
});
