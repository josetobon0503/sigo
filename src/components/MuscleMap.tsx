import { Pressable, View } from 'react-native';
import Body, { type ExtendedBodyPart, type Slug } from 'react-native-body-highlighter';
import { useTranslation } from 'react-i18next';

import type { Lang, Muscle } from '@/engine/types';
import { muscleList } from '@/i18n/format';
import { useProfileStore } from '@/store/profileStore';
import { useTheme } from '@/theme/useTheme';

// The library draws 200 x 400 per view at scale 1.
const VIEW_HEIGHT = 400;

// shortcut: the library's drawing has no abductor part (v3.2.0), so the outer hip shows as the glutes
// (gluteus medius); draw our own part if a later version still lacks it.
const SLUGS: Record<Muscle, Slug[]> = {
  glutes: ['gluteal'],
  quads: ['quadriceps'],
  hamstrings: ['hamstring'],
  calves: ['calves'],
  abs: ['abs'],
  obliques: ['obliques'],
  lower_back: ['lower-back'],
  upper_back: ['upper-back', 'trapezius'],
  chest: ['chest'],
  shoulders: ['deltoids'],
  biceps: ['biceps'],
  triceps: ['triceps'],
  neck: ['neck'],
  adductors: ['adductors'],
  abductors: ['gluteal'],
};

export interface MuscleMapProps {
  primary: Muscle[];
  secondary: Muscle[];
  height: number; // of the whole map; front and back views sit side by side
  onPress?: () => void; // the whole map is one button (for example: show it bigger)
  testID?: string;
}

// Front and back of the body: muscles it works in accent, the ones that help in muscleSecondary. Never
// red. The drawing is hidden from screen readers; the label says the muscles in words.
export function MuscleMap({ primary, secondary, height, onPress, testID }: MuscleMapProps) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const gender = useProfileStore((s) => s.profile?.bodyFigure ?? 'female');
  const lang: Lang = i18n.language === 'en' ? 'en' : 'es';

  // Later entries win in the library, so primary goes last.
  const data: ExtendedBodyPart[] = [
    ...secondary.flatMap((m) => SLUGS[m].map((slug) => ({ slug, intensity: 1 }))),
    ...primary.flatMap((m) => SLUGS[m].map((slug) => ({ slug, intensity: 2 }))),
  ];
  const label = t('video.muscles', { list: muscleList(t, [...primary, ...secondary], lang) });
  const views = (
    <View
      style={{ flexDirection: 'row' }}
      pointerEvents={onPress ? 'none' : 'auto'}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
    >
      {(['front', 'back'] as const).map((side) => (
        <Body
          key={side}
          side={side}
          gender={gender}
          data={data}
          scale={height / VIEW_HEIGHT}
          colors={[colors.muscleSecondary, colors.accent]}
          defaultFill={colors.bodyFill}
          border={colors.borderStrong}
        />
      ))}
    </View>
  );

  if (!onPress) {
    return (
      <View accessible accessibilityRole="image" accessibilityLabel={label} testID={testID}>
        {views}
      </View>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={t('video.musclesHint')}
      hitSlop={8}
      testID={testID}
    >
      {views}
    </Pressable>
  );
}
