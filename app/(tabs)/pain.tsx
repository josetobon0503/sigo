import { useRouter } from 'expo-router';
import { Text } from 'react-native';
import { useTranslation } from 'react-i18next';

import { BigButton, BodyMap, Card, confirmRemoveArea, ScreenContainer } from '@/components';
import { removePainArea } from '@/engine/pain';
import { PAIRED_AREAS } from '@/engine/profile';
import type { BodyArea, PainArea } from '@/engine/types';
import { useProfileStore } from '@/store/profileStore';
import { useTheme } from '@/theme/useTheme';

// My painful areas: the body map, the list, add, edit and remove. Today's workout follows them.
export default function PainScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors, typography, spacing } = useTheme();
  const profile = useProfileStore((s) => s.profile);
  const updateProfile = useProfileStore((s) => s.updateProfile);

  if (!profile) return null;
  const { painAreas } = profile;

  const openEditor = (area?: BodyArea, side?: 'left' | 'right') =>
    router.push({
      pathname: '/pain-area',
      params: { ...(area ? { area } : {}), ...(side ? { side } : {}) },
    });

  const title = (p: PainArea) => {
    const area = t(`bodyArea.${p.area}`);
    return PAIRED_AREAS.has(p.area) ? `${area}: ${t(`side.${p.side}`)}` : area;
  };

  const confirmRemove = (p: PainArea) =>
    confirmRemoveArea(t, p.area, () =>
      updateProfile({ painAreas: removePainArea(painAreas, p.area) }),
    );

  return (
    <ScreenContainer title={t('pain.title')}>
      <Text style={[typography.body, { color: colors.text }]}>{t('pain.intro')}</Text>
      <Text style={[typography.caption, { color: colors.textSecondary }]}>{t('pain.mapHint')}</Text>
      <BodyMap
        value={painAreas}
        onZonePress={(area, side) => openEditor(area, side ?? undefined)}
      />

      <Text accessibilityRole="header" style={[typography.title, { color: colors.text }]}>
        {t('pain.listTitle')}
      </Text>
      {painAreas.length === 0 ? (
        <Text style={[typography.body, { color: colors.text }]} testID="pain-empty">
          {t('pain.empty')}
        </Text>
      ) : null}
      {painAreas.map((p) => (
        <Card key={p.area} style={{ gap: spacing.sm }} testID={`pain-card-${p.area}`}>
          <Text style={[typography.title, { color: colors.text }]}>{title(p)}</Text>
          <Text style={[typography.body, { color: colors.text }]}>
            {t('pain.summary', {
              intensity: t(`painIntensity.${p.intensity}`),
              kind: t(`painKind.${p.kind}`),
            })}
          </Text>
          <BigButton
            label={t('pain.edit')}
            accessibilityLabel={t('pain.editLabel', { area: t(`bodyArea.${p.area}`) })}
            variant="secondary"
            icon="create-outline"
            onPress={() => openEditor(p.area)}
            testID={`pain-edit-${p.area}`}
          />
          <BigButton
            label={t('pain.remove')}
            accessibilityLabel={t('pain.removeLabel', { area: t(`bodyArea.${p.area}`) })}
            variant="secondary"
            icon="trash-outline"
            onPress={() => confirmRemove(p)}
            testID={`pain-remove-${p.area}`}
          />
        </Card>
      ))}
      <BigButton label={t('pain.add')} icon="add" onPress={() => openEditor()} testID="pain-add" />
    </ScreenContainer>
  );
}
