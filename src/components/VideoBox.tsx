import * as Speech from 'expo-speech';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { videos } from '@/data/videos';
import type { Exercise, Lang, VideoRef } from '@/engine/types';
import { muscleList } from '@/i18n/format';
import { columnsFit } from '@/theme/textFit';
import { useTheme } from '@/theme/useTheme';

import { BigButton } from './BigButton';
import { Card } from './Card';
import { MuscleMap } from './MuscleMap';

export type VideoChapter = 'purpose' | 'howTo' | 'mistakes';
const CHAPTERS: VideoChapter[] = ['purpose', 'howTo', 'mistakes'];
const VIDEO_HEIGHT = 196;
const SMALL_MAP = 72;
const LARGE_MAP = 200;

// Development only: a solid-color clip (6 KB), so the player can be tried before the real clips exist.
const DEV_CLIP: VideoRef = require('../../assets/videos/_test.mp4');

export const speechLanguage = (lang: Lang) => (lang === 'es' ? 'es-US' : 'en-US');

export interface VideoBoxProps {
  exercise: Exercise;
  lang: Lang;
  width?: number; // of the box, when it is not the full screen width (landscape distance mode)
}

// Three chapters: "What it's for" (text read aloud on request + muscle map), "How to do it" and "How NOT to
// do it" (silent looping clips; their written text when there is no clip). Give it key={exercise.id} so a
// new exercise opens on "How to do it" again.
export function VideoBox({ exercise, lang, width }: VideoBoxProps) {
  const { t } = useTranslation();
  const { colors, typography, spacing, radius, sizes } = useTheme();
  const window = useWindowDimensions();
  const [chapter, setChapter] = useState<VideoChapter>('howTo');
  const [speaking, setSpeaking] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);

  const clip =
    chapter === 'purpose' ? null : (videos[exercise.id]?.[chapter] ?? (__DEV__ ? DEV_CLIP : null));
  const player = useVideoPlayer(clip, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  // Reading aloud stops when the chapter changes or the box goes away.
  useEffect(() => {
    return () => {
      Speech.stop();
      setSpeaking(false);
    };
  }, [chapter]);

  const listen = () => {
    if (speaking) {
      Speech.stop();
      setSpeaking(false);
      return;
    }
    setSpeaking(true);
    const done = () => setSpeaking(false);
    Speech.speak(exercise.purpose[lang], {
      language: speechLanguage(lang),
      onDone: done,
      onStopped: done,
      onError: done,
    });
  };

  const { primary, secondary } = exercise.muscles;
  const works = t('video.works', { list: muscleList(t, primary, lang) });
  const tabsInRow = columnsFit(
    CHAPTERS.map((c) => t(`workout.chapter.${c}`)),
    {
      width: width ?? window.width - spacing.screen * 2,
      columns: CHAPTERS.length,
      gap: spacing.xs,
      cellPadding: spacing.xs * 2 + 4,
      fontSize: typography.captionBold.fontSize,
      fontScale: window.fontScale,
    },
  );

  const avoidBadge =
    chapter === 'mistakes' ? (
      <View
        testID="avoid-badge"
        style={{
          alignSelf: 'flex-start',
          backgroundColor: colors.accent,
          borderRadius: radius.chip,
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.xs,
        }}
      >
        <Text style={[typography.captionBold, { color: colors.onAccent }]}>
          {t('video.avoidThis')}
        </Text>
      </View>
    ) : null;

  let body;
  if (chapter === 'purpose') {
    body = (
      <Card style={{ gap: spacing.sm }} testID="chapter-text">
        <Text style={[typography.body, { color: colors.text }]}>{exercise.purpose[lang]}</Text>
        <BigButton
          label={speaking ? t('video.stopListening') : t('video.listen')}
          variant="outline"
          icon={speaking ? 'stop' : 'volume-high'}
          accessibilityHint={t('video.listenHint')}
          onPress={listen}
          testID="listen"
        />
        <View style={{ alignItems: 'center' }}>
          <MuscleMap
            primary={primary}
            secondary={secondary}
            height={LARGE_MAP}
            testID="muscle-map"
          />
        </View>
        <Text style={[typography.bodyBold, { color: colors.text }]}>{works}</Text>
      </Card>
    );
  } else if (clip) {
    body = (
      <View
        style={{
          height: VIDEO_HEIGHT,
          borderRadius: radius.card,
          overflow: 'hidden',
          backgroundColor: colors.videoBg,
        }}
      >
        <View
          importantForAccessibility="no-hide-descendants"
          accessibilityElementsHidden
          style={{ flex: 1 }}
        >
          <VideoView
            player={player}
            nativeControls={false}
            contentFit="contain"
            style={{ flex: 1 }}
            testID="video"
          />
        </View>
        <View style={{ position: 'absolute', top: spacing.sm, left: spacing.sm }}>
          {avoidBadge}
        </View>
        <View
          style={{
            position: 'absolute',
            right: spacing.xs,
            bottom: spacing.xs,
            backgroundColor: colors.surface,
            borderRadius: radius.chip,
            padding: 2,
          }}
        >
          <MuscleMap
            primary={primary}
            secondary={secondary}
            height={SMALL_MAP}
            onPress={() => setMapOpen(true)}
            testID="muscle-map-small"
          />
        </View>
      </View>
    );
  } else {
    body = (
      <Card style={{ gap: spacing.sm }} testID="chapter-text">
        {avoidBadge}
        {(chapter === 'howTo' ? exercise.steps : exercise.mistakes)[lang].map((line, i) => (
          <Text key={line} style={[typography.body, { color: colors.text }]}>
            {chapter === 'howTo' ? `${i + 1}. ${line}` : `• ${line}`}
          </Text>
        ))}
      </Card>
    );
  }

  return (
    <View style={{ gap: spacing.sm }}>
      <View
        accessibilityRole="tablist"
        testID="chapter-tabs"
        style={{ flexDirection: tabsInRow ? 'row' : 'column', gap: spacing.xs }}
      >
        {CHAPTERS.map((c) => {
          const selected = c === chapter;
          return (
            <Pressable
              key={c}
              onPress={() => setChapter(c)}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              testID={`chapter-${c}`}
              style={({ pressed }) => ({
                flexGrow: 1,
                flexBasis: tabsInRow ? 0 : 'auto',
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
      {body}
      <Modal
        visible={mapOpen}
        animationType="fade"
        onRequestClose={() => setMapOpen(false)}
        testID="muscle-modal"
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
          <ScrollView
            contentContainerStyle={{
              padding: spacing.screen,
              gap: spacing.md,
              alignItems: 'center',
            }}
          >
            <Text accessibilityRole="header" style={[typography.title, { color: colors.text }]}>
              {t('video.musclesTitle')}
            </Text>
            <MuscleMap
              primary={primary}
              secondary={secondary}
              height={Math.min(420, window.height * 0.55)}
            />
            <Text style={[typography.bodyBold, { color: colors.text }]}>{works}</Text>
            <View style={{ alignSelf: 'stretch' }}>
              <BigButton
                label={t('video.close')}
                icon="close"
                onPress={() => setMapOpen(false)}
                testID="muscle-modal-close"
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}
