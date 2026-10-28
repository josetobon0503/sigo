import { Stack } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';

import { useTheme } from '@/theme/useTheme';

// The workout modal. The screen stays on for the whole session, and there is no swipe to close:
// leaving always goes through the "Exit" confirmation.
export default function WorkoutLayout() {
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
