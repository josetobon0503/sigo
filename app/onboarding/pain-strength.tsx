import { useRouter } from 'expo-router';
import { Text } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Card, Chip, ChipGroup, FacesScale, Notice, OnboardingStep } from '@/components';
import { PAIRED_AREAS } from '@/engine/profile';
import { isRedFlagReport } from '@/engine/safety';
import type { PainKind } from '@/engine/types';
import { useOnboardingStore } from '@/store/onboardingStore';
import { setIntensity, setKind, type PainSelection } from '@/store/painSelection';
import { useTheme } from '@/theme/useTheme';

const KINDS: PainKind[] = ['achy', 'sharp', 'stiff'];

// Step 8: how strong (five faces) and what it feels like, for each area.
export default function PainStrengthScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors, typography } = useTheme();
  const painAreas = useOnboardingStore((s) => s.draft.painAreas);
  const update = useOnboardingStore((s) => s.update);
  const setPainAreas = (next: PainSelection[]) => update({ painAreas: next });

  const title = (p: PainSelection) => {
    const area = t(`bodyArea.${p.area}`);
    return PAIRED_AREAS.has(p.area) ? `${area}: ${t(`side.${p.side}`)}` : area;
  };
  // Same red-flag rule as the "It hurts" flow: very strong (5) or sharp pain.
  const needsDoctor = painAreas.some(
    (p) => p.intensity !== null && isRedFlagReport({ intensity: p.intensity, kind: p.kind }),
  );

  return (
    <OnboardingStep
      step={8}
      title={t('onboarding.painStrength.title')}
      nextDisabled={painAreas.some((p) => p.intensity === null)}
      onNext={() => router.push('/onboarding/equipment')}
    >
      {painAreas.map((p) => (
        <Card key={p.area} style={{ gap: 16 }}>
          <Text accessibilityRole="header" style={[typography.title, { color: colors.text }]}>
            {title(p)}
          </Text>
          <FacesScale
            value={p.intensity}
            onChange={(v) => setPainAreas(setIntensity(painAreas, p.area, v))}
            accessibilityLabel={title(p)}
            testID={`faces-${p.area}`}
          />
          <ChipGroup label={t('onboarding.painStrength.kindLabel')}>
            {KINDS.map((kind) => (
              <Chip
                key={kind}
                label={t(`painKind.${kind}`)}
                accessibilityLabel={`${title(p)}: ${t(`painKind.${kind}`)}`}
                selected={p.kind === kind}
                onPress={() => setPainAreas(setKind(painAreas, p.area, kind))}
                testID={`kind-${p.area}-${kind}`}
              />
            ))}
          </ChipGroup>
        </Card>
      ))}
      {needsDoctor ? (
        <Notice title={t('painNotice.title')} body={t('painNotice.body')} testID="pain-notice" />
      ) : null}
    </OnboardingStep>
  );
}
