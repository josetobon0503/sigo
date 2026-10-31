import { useRouter } from 'expo-router';
import { Text } from 'react-native';
import { useTranslation } from 'react-i18next';

import { BigButton, Card, ScreenContainer } from '@/components';
import type { Lang } from '@/engine/types';
import { useHurtStore } from '@/store/hurtStore';
import { useSessionStore } from '@/store/sessionStore';
import { useTheme } from '@/theme/useTheme';

// What findSwap found: another exercise with the same movement goal and one sentence on why,
// or, when nothing fits, a rest before the next exercise.
export default function SwapScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { colors, typography, spacing } = useTheme();
  const result = useHurtStore((s) => s.result);
  const lang: Lang = i18n.language === 'en' ? 'en' : 'es';

  const leave = (action: () => void) => {
    action();
    useHurtStore.getState().clear();
    router.dismissTo('/workout/session');
  };
  const rest = () => leave(useSessionStore.getState().skipToRest);

  if (!result || result.type === 'safety') return null;

  if (result.type === 'rest') {
    return (
      <ScreenContainer title={t('swap.restTitle')}>
        <Text style={[typography.body, { color: colors.text }]}>{t('swap.restBody')}</Text>
        <BigButton
          label={t('swap.restContinue')}
          icon="play-skip-forward"
          onPress={rest}
          testID="swap-rest"
        />
      </ScreenContainer>
    );
  }

  const { exercise, reasonKey } = result;
  return (
    <ScreenContainer title={t('swap.title')}>
      <Card style={{ gap: spacing.sm }} testID="swap-suggestion">
        <Text accessibilityRole="header" style={[typography.title, { color: colors.text }]}>
          {exercise.name[lang]}
        </Text>
        <Text style={[typography.bodyBold, { color: colors.primary }]} testID="swap-reason">
          {t(reasonKey)}
        </Text>
        <Text style={[typography.body, { color: colors.text }]}>{exercise.purpose[lang]}</Text>
      </Card>
      <BigButton
        label={t('swap.accept')}
        icon="swap-horizontal"
        onPress={() => leave(() => useSessionStore.getState().swapTo(exercise))}
        testID="swap-accept"
      />
      <BigButton
        label={t('swap.preview')}
        variant="secondary"
        icon="eye-outline"
        onPress={() => router.push('/hurt/preview')}
        testID="swap-preview"
      />
      <BigButton
        label={t('swap.skip')}
        variant="secondary"
        icon="play-skip-forward"
        onPress={rest}
        testID="swap-skip"
      />
    </ScreenContainer>
  );
}
