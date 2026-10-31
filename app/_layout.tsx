import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { setLanguage } from '@/i18n'; // also initializes i18n
import { useHistoryStore } from '@/store/historyStore';
import { useProfileStore } from '@/store/profileStore';
import { useTheme } from '@/theme/useTheme';

// Keep the splash screen up until the saved profile and history are loaded.
void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { colors } = useTheme();
  const profileHydrated = useProfileStore((s) => s.hydrated);
  const historyHydrated = useHistoryStore((s) => s.hydrated);
  const hydrated = profileHydrated && historyHydrated;
  const onboarded = useProfileStore((s) => s.profile !== null);
  const language = useProfileStore((s) => s.profile?.language);

  useEffect(() => {
    if (language) void setLanguage(language);
  }, [language]);

  useEffect(() => {
    if (hydrated) void SplashScreen.hideAsync();
  }, [hydrated]);

  if (!hydrated) return null;

  return (
    <>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}
      >
        <Stack.Protected guard={onboarded}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="safety-tips" options={{ presentation: 'modal' }} />
          <Stack.Screen name="pain-area" options={{ presentation: 'modal' }} />
          <Stack.Screen
            name="workout"
            options={{ presentation: 'fullScreenModal', gestureEnabled: false }}
          />
          <Stack.Screen
            name="hurt"
            options={{ presentation: 'fullScreenModal', gestureEnabled: false }}
          />
        </Stack.Protected>
        <Stack.Protected guard={!onboarded}>
          <Stack.Screen name="onboarding" />
        </Stack.Protected>
      </Stack>
    </>
  );
}
