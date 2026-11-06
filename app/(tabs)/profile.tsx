import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { Text, TextInput } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  BigButton,
  Card,
  Chip,
  ChipGroup,
  ReminderEditor,
  ScreenContainer,
  SwitchRow,
} from '@/components';
import {
  ACTIVITY_LEVELS,
  AGE_BANDS,
  EQUIPMENT,
  setActivity,
  toggleEquipment,
} from '@/engine/profile';
import { WEEKLY_GOALS } from '@/engine/stats';
import { SUPPORTED_LANGUAGES } from '@/i18n';
import { formatDay } from '@/i18n/format';
import { useDevStore, useToday } from '@/store/devStore';
import { useOnboardingStore } from '@/store/onboardingStore';
import { useProfileStore } from '@/store/profileStore';
import { useTheme } from '@/theme/useTheme';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors, typography, spacing, radius, sizes } = useTheme();
  const profile = useProfileStore((s) => s.profile);
  const updateProfile = useProfileStore((s) => s.updateProfile);
  const resetOnboarding = useProfileStore((s) => s.resetOnboarding);
  const resetDraft = useOnboardingStore((s) => s.reset);
  const dayOffset = useDevStore((s) => s.dayOffset);
  const setDayOffset = useDevStore((s) => s.setDayOffset);
  const today = useToday();

  if (!profile) return null;

  const saveName = (text: string) => {
    if (text.trim() !== '') updateProfile({ name: text.trim() });
  };

  return (
    <ScreenContainer title={t('profile.title')}>
      <Card style={{ gap: spacing.sm }}>
        <Text style={[typography.bodyBold, { color: colors.text }]}>{t('profile.nameLabel')}</Text>
        <TextInput
          defaultValue={profile.name}
          onEndEditing={(e) => saveName(e.nativeEvent.text)}
          accessibilityLabel={t('profile.nameLabel')}
          returnKeyType="done"
          testID="profile-name"
          style={[
            typography.body,
            {
              minHeight: sizes.primaryButton,
              color: colors.text,
              borderColor: colors.border,
              borderWidth: 2,
              borderRadius: radius.chip,
              paddingHorizontal: spacing.md,
            },
          ]}
        />
      </Card>

      <Card>
        <ChipGroup label={t('profile.ageLabel')}>
          {AGE_BANDS.map((band) => (
            <Chip
              key={band}
              label={t(`ageBand.${band}`)}
              selected={profile.ageBand === band}
              onPress={() => updateProfile({ ageBand: band })}
            />
          ))}
        </ChipGroup>
      </Card>

      <Card style={{ gap: spacing.sm }}>
        <ChipGroup label={t('profile.activityLabel')}>
          {ACTIVITY_LEVELS.map((level) => (
            <Chip
              key={level}
              label={t(`activity.${level}`)}
              selected={profile.activity === level}
              onPress={() => updateProfile(setActivity(level))}
              testID={`activity-${level}`}
            />
          ))}
        </ChipGroup>
        <Text style={[typography.caption, { color: colors.textSecondary }]}>
          {t('profile.activityHint')}
        </Text>
        {profile.screening?.anyYes ? (
          <Text style={[typography.body, { color: colors.text }]} testID="activity-doctor">
            {t('profile.activityDoctor')}
          </Text>
        ) : null}
      </Card>

      <Card style={{ gap: spacing.sm }}>
        <ChipGroup label={t('profile.goalLabel')}>
          {WEEKLY_GOALS.map((goal) => (
            <Chip
              key={goal}
              label={t('weeklyGoal.days', { count: goal })}
              selected={profile.weeklyGoal === goal}
              onPress={() => updateProfile({ weeklyGoal: goal })}
              testID={`goal-${goal}`}
            />
          ))}
        </ChipGroup>
        <Text style={[typography.caption, { color: colors.textSecondary }]}>
          {t('profile.goalHint')}
        </Text>
      </Card>

      <Card style={{ gap: spacing.sm }}>
        <ChipGroup label={t('profile.bodyFigureLabel')}>
          {(['female', 'male'] as const).map((figure) => (
            <Chip
              key={figure}
              label={t(`profile.bodyFigure.${figure}`)}
              selected={profile.bodyFigure === figure}
              onPress={() => updateProfile({ bodyFigure: figure })}
              testID={`figure-${figure}`}
            />
          ))}
        </ChipGroup>
        <Text style={[typography.caption, { color: colors.textSecondary }]}>
          {t('profile.bodyFigureHint')}
        </Text>
      </Card>

      <Card>
        <ChipGroup label={t('language.label')}>
          {SUPPORTED_LANGUAGES.map((lang) => (
            <Chip
              key={lang}
              label={t(`language.${lang}`)}
              selected={profile.language === lang}
              onPress={() => updateProfile({ language: lang })}
              testID={`language-${lang}`}
            />
          ))}
        </ChipGroup>
      </Card>

      <Card>
        <ChipGroup label={t('profile.equipmentLabel')}>
          {EQUIPMENT.map((item) => (
            <Chip
              key={item}
              label={t(`equipmentName.${item}`)}
              selected={profile.equipment.includes(item)}
              onPress={() => updateProfile({ equipment: toggleEquipment(profile.equipment, item) })}
            />
          ))}
        </ChipGroup>
      </Card>

      <Card>
        <SwitchRow
          label={t('profile.seatedOnly')}
          hint={t('profile.seatedOnlyHint')}
          value={profile.seatedOnly}
          onChange={(seatedOnly) => updateProfile({ seatedOnly })}
          testID="seated-only"
        />
      </Card>

      <Card>
        <SwitchRow
          label={t('profile.floorOk')}
          hint={t('profile.floorOkHint')}
          value={profile.floorOk}
          onChange={(floorOk) => updateProfile({ floorOk })}
          testID="floor-ok"
        />
      </Card>

      <Card>
        <ReminderEditor
          value={profile.reminder}
          onChange={(reminder) => updateProfile({ reminder })}
          enableLabel={t('profile.reminderLabel')}
          timeLabel={t('onboarding.reminder.timeLabel')}
          daysLabel={t('onboarding.reminder.daysLabel')}
        />
      </Card>

      <BigButton
        label={t('profile.safetyTips')}
        variant="outline"
        icon="shield-checkmark-outline"
        onPress={() => router.push('/safety-tips')}
      />

      <Card style={{ gap: spacing.xs }}>
        <Text accessibilityRole="header" style={[typography.headline, { color: colors.text }]}>
          {t('profile.aboutTitle')}
        </Text>
        <Text style={[typography.body, { color: colors.text }]}>{t('app.tagline')}</Text>
        <Text style={[typography.caption, { color: colors.textSecondary }]}>
          {t('profile.version', { version: Constants.expoConfig?.version ?? '' })}
        </Text>
        <Text style={[typography.body, { color: colors.text }]}>{t('app.disclaimer')}</Text>
      </Card>

      {__DEV__ ? (
        <>
          <Card style={{ gap: spacing.sm }} testID="simulate-day">
            <Text accessibilityRole="header" style={[typography.bodyBold, { color: colors.text }]}>
              {t('profileDev.simulateDay')}
            </Text>
            <Text style={[typography.body, { color: colors.text }]} testID="simulated-date">
              {t('profileDev.simulatedDate', {
                date: formatDay(today, profile.language),
              })}
            </Text>
            <BigButton
              label={t('profileDev.nextDay')}
              variant="outline"
              icon="arrow-forward"
              onPress={() => setDayOffset(dayOffset + 1)}
              testID="next-day"
            />
            <BigButton
              label={t('profileDev.prevDay')}
              variant="outline"
              icon="arrow-back"
              onPress={() => setDayOffset(dayOffset - 1)}
              testID="prev-day"
            />
            {dayOffset !== 0 ? (
              <BigButton
                label={t('profileDev.realToday')}
                variant="outline"
                icon="today-outline"
                onPress={() => setDayOffset(0)}
                testID="real-today"
              />
            ) : null}
          </Card>
          <BigButton
            label={t('profile.resetOnboarding')}
            variant="outline"
            icon="refresh"
            onPress={() => {
              resetDraft();
              resetOnboarding();
            }}
            testID="reset-onboarding"
          />
        </>
      ) : null}
    </ScreenContainer>
  );
}
