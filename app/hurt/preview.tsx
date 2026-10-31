import { useRouter } from 'expo-router';
import { Text } from 'react-native';
import { useTranslation } from 'react-i18next';

import { BigButton, Card, ScreenContainer } from '@/components';
import type { Lang } from '@/engine/types';
import { useHurtStore } from '@/store/hurtStore';
import { useSessionStore } from '@/store/sessionStore';
import { useTheme } from '@/theme/useTheme';

// A look at the suggested exercise before using it. Written chapters until the videos arrive.
export default function PreviewScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { colors, typography, spacing } = useTheme();
  const result = useHurtStore((s) => s.result);
  const lang: Lang = i18n.language === 'en' ? 'en' : 'es';

  if (result?.type !== 'swap') return null;
  const { exercise } = result;

  const use = () => {
    useSessionStore.getState().swapTo(exercise);
    useHurtStore.getState().clear();
    router.dismissTo('/workout/session');
  };

  const chapter = (title: string, lines: string[], mark: (i: number) => string) => (
    <Card style={{ gap: spacing.sm }}>
      <Text accessibilityRole="header" style={[typography.bodyBold, { color: colors.text }]}>
        {title}
      </Text>
      {lines.map((line, i) => (
        <Text key={line} style={[typography.body, { color: colors.text }]}>
          {`${mark(i)}${line}`}
        </Text>
      ))}
    </Card>
  );

  return (
    <ScreenContainer title={exercise.name[lang]}>
      {chapter(t('workout.purposeTitle'), [exercise.purpose[lang]], () => '')}
      {chapter(t('workout.stepsTitle'), exercise.steps[lang], (i) => `${i + 1}. `)}
      {chapter(t('preview.mistakesTitle'), exercise.mistakes[lang], () => '• ')}
      <BigButton label={t('preview.use')} icon="checkmark" onPress={use} testID="preview-use" />
      <BigButton
        label={t('preview.back')}
        variant="secondary"
        icon="arrow-back"
        onPress={() => router.back()}
        testID="preview-back"
      />
    </ScreenContainer>
  );
}
