import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/theme/useTheme';

export type VideoChapter = 'purpose' | 'howTo' | 'mistakes';
const CHAPTERS: VideoChapter[] = ['purpose', 'howTo', 'mistakes'];

export interface VideoBoxProps {
  chapter: VideoChapter;
  onChapter: (chapter: VideoChapter) => void;
}

// Video area with 3 chapter tabs. Videos come in phase 7: until then the box is a placeholder and the
// screen shows the written text of the selected chapter.
export function VideoBox({ chapter, onChapter }: VideoBoxProps) {
  const { t } = useTranslation();
  const { colors, typography, spacing, radius, sizes } = useTheme();

  return (
    <View style={{ gap: spacing.sm }}>
      <View
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
        style={{
          height: 196,
          borderRadius: radius.card,
          backgroundColor: colors.videoBg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            borderWidth: 2,
            borderColor: colors.onHero,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="play" size={32} color={colors.onHero} />
        </View>
      </View>
      <View accessibilityRole="tablist" style={{ flexDirection: 'row', gap: spacing.xs }}>
        {CHAPTERS.map((c) => {
          const selected = c === chapter;
          return (
            <Pressable
              key={c}
              onPress={() => onChapter(c)}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              testID={`chapter-${c}`}
              style={({ pressed }) => ({
                flex: 1,
                minHeight: sizes.minTapTarget,
                justifyContent: 'center',
                paddingHorizontal: spacing.xs,
                paddingVertical: spacing.xs,
                borderRadius: radius.chip,
                borderWidth: 2,
                borderColor: selected ? colors.primary : colors.border,
                backgroundColor: selected ? colors.primarySoft : colors.surface,
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Text
                style={[
                  selected ? typography.captionBold : typography.caption,
                  { color: selected ? colors.primaryPressed : colors.text, textAlign: 'center' },
                ]}
              >
                {t(`workout.chapter.${c}`)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
