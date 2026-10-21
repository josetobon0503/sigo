import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/useTheme';

export interface ScreenContainerProps {
  children: ReactNode;
  title?: string; // shown as a large title and announced as a header
  scroll?: boolean; // scroll by default so large system font sizes never cut content
  contentStyle?: StyleProp<ViewStyle>;
}

export function ScreenContainer({
  children,
  title,
  scroll = true,
  contentStyle,
}: ScreenContainerProps) {
  const { colors, typography, spacing } = useTheme();

  const content = (
    <>
      {title ? (
        <Text
          accessibilityRole="header"
          style={[typography.largeTitle, { color: colors.text, marginBottom: spacing.md }]}
        >
          {title}
        </Text>
      ) : null}
      {children}
    </>
  );

  const padding = { paddingHorizontal: spacing.md, paddingVertical: spacing.md, gap: spacing.md };

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.root, { backgroundColor: colors.background }]}
    >
      {scroll ? (
        <ScrollView contentContainerStyle={[padding, contentStyle]}>{content}</ScrollView>
      ) : (
        <View style={[styles.root, padding, contentStyle]}>{content}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
