import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { Text, useWindowDimensions, type ColorValue } from 'react-native';
import { Tabs } from 'expo-router/js-tabs';
import { useTranslation } from 'react-i18next';

import { longestWordWidth } from '@/theme/textFit';
import { useTheme } from '@/theme/useTheme';

type IconName = ComponentProps<typeof Ionicons>['name'];

function tabIcon(active: IconName, inactive: IconName) {
  return function TabIcon({ color, focused }: { color: ColorValue; focused: boolean }) {
    // Tint colors come from our tokens, so they are always plain strings.
    return <Ionicons name={focused ? active : inactive} color={color as string} size={26} />;
  };
}

export default function TabsLayout() {
  const { t } = useTranslation();
  const { colors, typography, spacing } = useTheme();
  const { width } = useWindowDimensions();
  const labels = [t('tabs.today'), t('tabs.progress'), t('tabs.pain'), t('tabs.profile')];
  // A tab label is one word in a quarter of the screen: cap the system font scale so it never splits.
  const labelMaxScale = Math.max(
    1,
    (width / labels.length - spacing.sm) /
      longestWordWidth(labels, typography.captionBold.fontSize, 1),
  );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        // Active tab: primary + bold (color alone is never the only cue).
        tabBarLabel: ({ focused, color, children }) => (
          <Text
            style={[focused ? typography.captionBold : typography.caption, { color }]}
            maxFontSizeMultiplier={labelMaxScale}
            numberOfLines={1}
          >
            {children}
          </Text>
        ),
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.today'),
          tabBarAccessibilityLabel: t('tabs.today'),
          tabBarIcon: tabIcon('today', 'today-outline'),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: t('tabs.progress'),
          tabBarAccessibilityLabel: t('tabs.progress'),
          tabBarIcon: tabIcon('stats-chart', 'stats-chart-outline'),
        }}
      />
      <Tabs.Screen
        name="pain"
        options={{
          title: t('tabs.pain'),
          tabBarAccessibilityLabel: t('tabs.pain'),
          tabBarIcon: tabIcon('body', 'body-outline'),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          tabBarAccessibilityLabel: t('tabs.profile'),
          tabBarIcon: tabIcon('person-circle', 'person-circle-outline'),
        }}
      />
    </Tabs>
  );
}
