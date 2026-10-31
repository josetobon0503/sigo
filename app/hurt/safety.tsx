import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { BigButton, Card, ScreenContainer } from '@/components';
import { useHurtStore } from '@/store/hurtStore';
import { useSessionStore } from '@/store/sessionStore';
import { useTheme } from '@/theme/useTheme';

// Red flags: sharp or the worst pain, chest pain, dizziness. Never offers another exercise
// (CLAUDE.md rule 1). "I'm OK" never goes back to the exercise that hurt: rest, then the next one.
export default function SafetyScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors, typography, spacing } = useTheme();

  // Back to the session, which opens the next step on its own (rest, or the finish screen).
  const leave = (action: () => void) => {
    action();
    useHurtStore.getState().clear();
    router.dismissTo('/workout/session');
  };

  return (
    <ScreenContainer>
      <View style={[styles.header, { gap: spacing.sm }]}>
        <Ionicons name="hand-left" size={40} color={colors.alert} />
        <Text
          accessibilityRole="header"
          style={[typography.largeTitle, styles.title, { color: colors.text }]}
        >
          {t('safety.title')}
        </Text>
      </View>
      <Card style={{ gap: spacing.sm, borderColor: colors.alert, borderWidth: 2 }}>
        <Text style={[typography.body, { color: colors.text }]}>{t('safety.body')}</Text>
        <Text style={[typography.bodyBold, { color: colors.text }]}>{t('safety.redFlags')}</Text>
      </Card>
      <BigButton
        label={t('safety.call')}
        variant="alert"
        icon="call"
        accessibilityHint={t('safety.callHint')}
        onPress={() => void Linking.openURL('tel:911')}
        testID="call-911"
      />
      <BigButton
        label={t('safety.ok')}
        accessibilityHint={t('safety.okHint')}
        onPress={() => leave(useSessionStore.getState().skipToRest)}
        testID="safety-ok"
      />
      <BigButton
        label={t('safety.end')}
        variant="secondary"
        onPress={() => leave(useSessionStore.getState().end)}
        testID="safety-end"
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    flex: 1,
  },
});
