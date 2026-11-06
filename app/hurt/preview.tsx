import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { BigButton, ScreenContainer, VideoBox } from '@/components';
import type { Lang } from '@/engine/types';
import { useHurtStore } from '@/store/hurtStore';
import { useSessionStore } from '@/store/sessionStore';

// A look at the suggested exercise before using it: the same video chapters as the exercise screen.
export default function PreviewScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const result = useHurtStore((s) => s.result);
  const lang: Lang = i18n.language === 'en' ? 'en' : 'es';

  if (result?.type !== 'swap') return null;
  const { exercise } = result;

  const use = () => {
    useSessionStore.getState().swapTo(exercise);
    useHurtStore.getState().clear();
    router.dismissTo('/workout/session');
  };

  return (
    <ScreenContainer title={exercise.name[lang]}>
      <VideoBox key={exercise.id} exercise={exercise} lang={lang} />
      <BigButton label={t('preview.use')} icon="checkmark" onPress={use} testID="preview-use" />
      <BigButton
        label={t('preview.back')}
        variant="outline"
        icon="arrow-back"
        onPress={() => router.back()}
        testID="preview-back"
      />
    </ScreenContainer>
  );
}
