import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  BigButton,
  Card,
  Chip,
  ChipGroup,
  confirmRemoveArea,
  FacesScale,
  Notice,
  ScreenContainer,
} from '@/components';
import { removePainArea, upsertPainArea } from '@/engine/pain';
import { BODY_AREAS, PAIRED_AREAS } from '@/engine/profile';
import { isRedFlagReport } from '@/engine/safety';
import type { BodyArea, PainIntensity, PainKind, Side } from '@/engine/types';
import { useToday } from '@/store/devStore';
import { useProfileStore } from '@/store/profileStore';
import { useTheme } from '@/theme/useTheme';

const SIDES: Side[] = ['left', 'right', 'both'];
const KINDS: PainKind[] = ['achy', 'sharp', 'stiff'];

function isBodyArea(value: unknown): value is BodyArea {
  return typeof value === 'string' && (BODY_AREAS as string[]).includes(value);
}

// Add or edit one painful area. Opened from the Pain tab, with the area when it is known (a tap
// on the body map, or "Edit"), and the side when a map zone was tapped.
export default function PainAreaScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors, typography, spacing } = useTheme();
  const params = useLocalSearchParams<{ area?: string; side?: string }>();
  const painAreas = useProfileStore((s) => s.profile?.painAreas ?? []);
  const updateProfile = useProfileStore((s) => s.updateProfile);
  const today = useToday();

  const fixedArea = isBodyArea(params.area) ? params.area : null;
  const existing = painAreas.find((p) => p.area === fixedArea);
  const startSide: Side = params.side === 'left' || params.side === 'right' ? params.side : 'both';
  const [area, setArea] = useState<BodyArea | null>(fixedArea);
  const [side, setSide] = useState<Side>(existing?.side ?? startSide);
  const [intensity, setIntensity] = useState<PainIntensity | null>(existing?.intensity ?? null);
  const [kind, setKind] = useState<PainKind>(existing?.kind ?? 'achy');

  // The store changes first, then the modal closes: closing never cuts the update short.
  const removeAndClose = (a: BodyArea) => {
    updateProfile({ painAreas: removePainArea(painAreas, a) });
    router.back();
  };

  const save = () => {
    if (!area || intensity === null) return;
    // "None" means it no longer hurts.
    if (intensity === 1) {
      removeAndClose(area);
      return;
    }
    const pain = {
      area,
      side: PAIRED_AREAS.has(area) ? side : 'both',
      intensity,
      kind,
      updatedAt: today,
    };
    updateProfile({ painAreas: upsertPainArea(painAreas, pain) });
    router.back();
  };

  // When adding, only the areas that are not in the list yet.
  const choices = BODY_AREAS.filter((a) => !painAreas.some((p) => p.area === a));
  const needsDoctor = intensity !== null && isRedFlagReport({ intensity, kind });

  return (
    <ScreenContainer title={fixedArea ? t(`bodyArea.${fixedArea}`) : t('pain.addTitle')}>
      {fixedArea ? null : (
        <Card>
          <ChipGroup label={t('pain.areaLabel')}>
            {choices.map((a) => (
              <Chip
                key={a}
                label={t(`bodyArea.${a}`)}
                selected={area === a}
                onPress={() => setArea(a)}
                testID={`pain-area-${a}`}
              />
            ))}
          </ChipGroup>
        </Card>
      )}

      {area && PAIRED_AREAS.has(area) ? (
        <Card>
          <ChipGroup label={t('pain.sideLabel')}>
            {SIDES.map((s) => (
              <Chip
                key={s}
                label={t(`side.${s}`)}
                selected={side === s}
                onPress={() => setSide(s)}
                testID={`pain-side-${s}`}
              />
            ))}
          </ChipGroup>
        </Card>
      ) : null}

      <Card style={{ gap: spacing.md }}>
        <Text accessibilityRole="header" style={[typography.bodyBold, { color: colors.text }]}>
          {t('pain.strengthLabel')}
        </Text>
        <FacesScale
          value={intensity}
          onChange={setIntensity}
          accessibilityLabel={t('pain.strengthLabel')}
          testID="pain-intensity"
        />
      </Card>

      <Card>
        <ChipGroup label={t('pain.kindLabel')}>
          {KINDS.map((k) => (
            <Chip
              key={k}
              label={t(`painKind.${k}`)}
              selected={kind === k}
              onPress={() => setKind(k)}
              testID={`pain-kind-${k}`}
            />
          ))}
        </ChipGroup>
      </Card>

      {needsDoctor ? (
        <Notice title={t('painNotice.title')} body={t('painNotice.body')} testID="pain-notice" />
      ) : null}

      <BigButton
        label={t('pain.save')}
        icon="checkmark"
        disabled={!area || intensity === null}
        onPress={save}
        testID="pain-save"
      />
      {existing ? (
        <BigButton
          label={t('pain.remove')}
          accessibilityLabel={t('pain.removeLabel', { area: t(`bodyArea.${existing.area}`) })}
          variant="secondary"
          icon="trash-outline"
          onPress={() => confirmRemoveArea(t, existing.area, () => removeAndClose(existing.area))}
          testID="pain-remove"
        />
      ) : null}
      <BigButton label={t('pain.cancel')} variant="secondary" onPress={() => router.back()} />
    </ScreenContainer>
  );
}
