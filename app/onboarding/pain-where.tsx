import { useRouter } from 'expo-router';
import { Text } from 'react-native';
import { useTranslation } from 'react-i18next';

import { BodyMap, Chip, ChipGroup, OnboardingStep } from '@/components';
import { BODY_AREAS, PAIRED_AREAS } from '@/engine/profile';
import type { Side } from '@/engine/types';
import { useOnboardingStore } from '@/store/onboardingStore';
import { setSide, toggleArea } from '@/store/painSelection';
import { useTheme } from '@/theme/useTheme';

const SIDES: Side[] = ['left', 'right', 'both'];

// Step 7: where does it hurt (body map + chips, with side for paired areas).
export default function PainWhereScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors, typography } = useTheme();
  const painAreas = useOnboardingStore((s) => s.draft.painAreas);
  const update = useOnboardingStore((s) => s.update);
  const setPainAreas = (next: typeof painAreas) => update({ painAreas: next });

  return (
    <OnboardingStep
      step={7}
      title={t('onboarding.painWhere.title')}
      onNext={() =>
        router.push(painAreas.length > 0 ? '/onboarding/pain-strength' : '/onboarding/equipment')
      }
    >
      <Text style={[typography.body, { color: colors.text }]}>
        {t('onboarding.painWhere.hint')}
      </Text>
      <BodyMap value={painAreas} onChange={setPainAreas} />
      <ChipGroup label={t('onboarding.painWhere.listLabel')}>
        <Chip
          label={t('onboarding.painWhere.noPain')}
          selected={painAreas.length === 0}
          onPress={() => setPainAreas([])}
          testID="no-pain"
        />
        {BODY_AREAS.map((area) => (
          <Chip
            key={area}
            label={t(`bodyArea.${area}`)}
            selected={painAreas.some((p) => p.area === area)}
            onPress={() => setPainAreas(toggleArea(painAreas, area))}
            testID={`area-${area}`}
          />
        ))}
      </ChipGroup>
      {painAreas
        .filter((p) => PAIRED_AREAS.has(p.area))
        .map((p) => (
          <ChipGroup
            key={p.area}
            label={t('onboarding.painWhere.sideLabel', { area: t(`bodyArea.${p.area}`) })}
          >
            {SIDES.map((side) => (
              <Chip
                key={side}
                label={t(`side.${side}`)}
                accessibilityLabel={`${t(`bodyArea.${p.area}`)}: ${t(`side.${side}`)}`}
                selected={p.side === side}
                onPress={() => setPainAreas(setSide(painAreas, p.area, side))}
                testID={`side-${p.area}-${side}`}
              />
            ))}
          </ChipGroup>
        ))}
    </OnboardingStep>
  );
}
