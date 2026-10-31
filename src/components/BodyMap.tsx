import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { BodyArea } from '@/engine/types';
import { isZoneSelected, toggleZone, type PainSelection } from '@/store/painSelection';
import { useTheme } from '@/theme/useTheme';

// The figure is drawn from behind, so the user's left side is on the screen's left.
const WIDTH = 240;
const HEIGHT = 480;
const ZONE = 44; // minimum tap target

type ZoneSide = 'left' | 'right' | null;

// Zone centers in figure coordinates.
const ZONES: { area: BodyArea; side: ZoneSide; x: number; y: number }[] = [
  { area: 'neck', side: null, x: 120, y: 56 },
  { area: 'upper_back', side: null, x: 120, y: 108 },
  { area: 'lower_back', side: null, x: 120, y: 180 },
  { area: 'shoulder', side: 'left', x: 70, y: 80 },
  { area: 'shoulder', side: 'right', x: 170, y: 80 },
  { area: 'elbow', side: 'left', x: 48, y: 150 },
  { area: 'elbow', side: 'right', x: 192, y: 150 },
  { area: 'wrist', side: 'left', x: 48, y: 215 },
  { area: 'wrist', side: 'right', x: 192, y: 215 },
  { area: 'hip', side: 'left', x: 97, y: 230 },
  { area: 'hip', side: 'right', x: 143, y: 230 },
  { area: 'knee', side: 'left', x: 97, y: 320 },
  { area: 'knee', side: 'right', x: 143, y: 320 },
  { area: 'ankle', side: 'left', x: 97, y: 400 },
  { area: 'ankle', side: 'right', x: 143, y: 400 },
  { area: 'foot', side: 'left', x: 91, y: 450 },
  { area: 'foot', side: 'right', x: 149, y: 450 },
];

// Simple silhouette made of rounded blocks. Decorative only.
const SHAPES: ViewStyle[] = [
  { left: 95, top: 0, width: 50, height: 52, borderRadius: 26 }, // head
  { left: 108, top: 46, width: 24, height: 22 }, // neck
  { left: 70, top: 64, width: 100, height: 160, borderRadius: 24 }, // torso
  { left: 32, top: 70, width: 34, height: 160, borderRadius: 17 }, // left arm
  { left: 174, top: 70, width: 34, height: 160, borderRadius: 17 }, // right arm
  { left: 76, top: 210, width: 42, height: 220, borderRadius: 20 }, // left leg
  { left: 122, top: 210, width: 42, height: 220, borderRadius: 20 }, // right leg
  { left: 66, top: 430, width: 50, height: 32, borderRadius: 14 }, // left foot
  { left: 124, top: 430, width: 50, height: 32, borderRadius: 14 }, // right foot
];

export interface BodyMapProps {
  value: PainSelection[];
  onChange?: (value: PainSelection[]) => void; // toggles zones, as in onboarding
  onZonePress?: (area: BodyArea, side: ZoneSide) => void; // replaces the toggle, e.g. to open an editor
}

export function BodyMap({ value, onChange, onZonePress }: BodyMapProps) {
  const { t } = useTranslation();
  const { colors, typography, spacing } = useTheme();

  const zoneLabel = (area: BodyArea, side: ZoneSide) => {
    const name = t(`bodyArea.${area}`);
    if (side === 'left') return t('bodyMap.leftZone', { area: name });
    if (side === 'right') return t('bodyMap.rightZone', { area: name });
    return name;
  };

  return (
    <View style={{ alignItems: 'center', gap: spacing.sm }}>
      <Text style={[typography.caption, { color: colors.textSecondary, textAlign: 'center' }]}>
        {t('bodyMap.caption')}
      </Text>
      <View style={{ width: WIDTH, height: HEIGHT }}>
        {SHAPES.map((shape, i) => (
          <View
            key={i}
            importantForAccessibility="no"
            accessibilityElementsHidden
            style={[styles.shape, shape, { backgroundColor: colors.border }]}
          />
        ))}
        {ZONES.map(({ area, side, x, y }) => {
          const selected = isZoneSelected(value, area, side);
          return (
            <Pressable
              key={`${area}-${side ?? 'center'}`}
              onPress={() =>
                onZonePress ? onZonePress(area, side) : onChange?.(toggleZone(value, area, side))
              }
              accessibilityRole="checkbox"
              accessibilityLabel={zoneLabel(area, side)}
              accessibilityState={{ checked: selected }}
              testID={`zone-${area}-${side ?? 'center'}`}
              hitSlop={4}
              style={({ pressed }) => [
                styles.zone,
                {
                  left: x - ZONE / 2,
                  top: y - ZONE / 2,
                  backgroundColor: selected ? colors.primary : colors.card,
                  borderColor: colors.primary,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              {selected ? <Ionicons name="checkmark" size={26} color={colors.onPrimary} /> : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shape: {
    position: 'absolute',
  },
  zone: {
    position: 'absolute',
    width: ZONE,
    height: ZONE,
    borderRadius: ZONE / 2,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
