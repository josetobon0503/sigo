import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  BigButton,
  Card,
  Chip,
  ChipGroup,
  FacesScale,
  ScreenContainer,
  SwitchRow,
} from '@/components';
import { exercises } from '@/data/exercises';
import { BODY_AREAS } from '@/engine/profile';
import { findSwap } from '@/engine/swap';
import type { BodyArea, PainIntensity, PainReport } from '@/engine/types';
import { useHurtStore } from '@/store/hurtStore';
import { useProfileStore } from '@/store/profileStore';
import { useCurrentExercise, useSessionStore } from '@/store/sessionStore';
import { useTheme } from '@/theme/useTheme';

// "It hurts": where, how strong and whether it is sharp. One area per report. The areas the
// current exercise loads come first, and the first one is already picked.
export default function HurtScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors, typography, spacing } = useTheme();
  const exercise = useCurrentExercise();
  const loads = exercise?.loads ?? [];
  const [area, setArea] = useState<BodyArea | null>(loads[0] ?? null);
  const [showOthers, setShowOthers] = useState(loads.length === 0);
  const [intensity, setIntensity] = useState<PainIntensity | null>(null);
  const [sharp, setSharp] = useState(false);

  if (!exercise) return null;
  const others = BODY_AREAS.filter((a) => !loads.includes(a));

  const areaChip = (a: BodyArea) => (
    <Chip
      key={a}
      label={t(`bodyArea.${a}`)}
      selected={area === a}
      onPress={() => setArea(a)}
      testID={`hurt-area-${a}`}
    />
  );

  const submit = () => {
    const { session } = useSessionStore.getState();
    const { profile } = useProfileStore.getState();
    if (!session || !profile || !area || intensity === null) return;
    const report: PainReport = { area, intensity, kind: sharp ? 'sharp' : 'achy' };
    const usedToday = session.items.flatMap((i) =>
      i.swappedFrom ? [i.exerciseId, i.swappedFrom] : [i.exerciseId],
    );
    const result = findSwap(exercise, report, profile, exercises, usedToday, session.date);
    useSessionStore.getState().reportPain(report);
    useHurtStore.getState().setResult(result);
    router.replace(result.type === 'safety' ? '/hurt/safety' : '/hurt/swap');
  };

  return (
    <ScreenContainer title={t('hurt.title')}>
      <BigButton
        label={t('hurt.redFlag')}
        variant="alert"
        icon="warning"
        accessibilityHint={t('hurt.redFlagHint')}
        onPress={() => router.replace('/hurt/safety')}
        testID="red-flag"
      />

      <Card style={{ gap: spacing.md }}>
        <ChipGroup label={t('hurt.areaLabel')}>
          {loads.map(areaChip)}
          {showOthers ? null : (
            <Chip
              label={t('hurt.otherAreas')}
              onPress={() => setShowOthers(true)}
              testID="hurt-other-areas"
            />
          )}
        </ChipGroup>
        {showOthers ? <ChipGroup>{others.map(areaChip)}</ChipGroup> : null}
      </Card>

      <Card style={{ gap: spacing.md }}>
        <Text accessibilityRole="header" style={[typography.bodyBold, { color: colors.text }]}>
          {t('hurt.strengthLabel')}
        </Text>
        <FacesScale
          value={intensity}
          onChange={setIntensity}
          accessibilityLabel={t('hurt.strengthLabel')}
          testID="hurt-intensity"
        />
      </Card>

      <Card>
        <SwitchRow
          label={t('hurt.sharp')}
          hint={t('hurt.sharpHint')}
          value={sharp}
          onChange={setSharp}
          testID="hurt-sharp"
        />
      </Card>

      <BigButton
        label={t('hurt.continue')}
        icon="arrow-forward"
        disabled={!area || intensity === null}
        onPress={submit}
        testID="hurt-continue"
      />
      <BigButton
        label={t('hurt.cancel')}
        variant="secondary"
        onPress={() => router.back()}
        testID="hurt-cancel"
      />
    </ScreenContainer>
  );
}
