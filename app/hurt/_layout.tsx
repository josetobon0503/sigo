import { Stack } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';

import { useTheme } from '@/theme/useTheme';

// The "It hurts" modal, opened from the workout. The screen stays on, and there is no swipe to
// close: every way out is a button that says what happens to the workout.
export default function HurtLayout() {
  useKeepAwake();
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    />
  );
}
