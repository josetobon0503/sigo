// Red-flag rules, blocked/caution areas and the readiness screening result (CLAUDE.md section 6).

import type { BodyArea, Level, PainArea, PainReport, Pattern, UserProfile } from './types';

// Symptoms that always stop the workout and open the Safety screen. Never suggest a swap for these.
export const RED_FLAG_SYMPTOMS = ['chest_pain', 'dizziness', 'short_breath'] as const;
export type RedFlagSymptom = (typeof RED_FLAG_SYMPTOMS)[number];

// Sharp pain or the worst pain (5) also stops the workout.
export function isRedFlagReport(report: Pick<PainReport, 'intensity' | 'kind'>): boolean {
  return report.kind === 'sharp' || report.intensity >= 5;
}

// Blocked: intensity >= 3, or sharp pain.
export function isBlocked(pain: PainArea): boolean {
  return pain.intensity >= 3 || pain.kind === 'sharp';
}

// Caution: intensity 2 (allowed, but prefer seated / supported variants).
export function isCaution(pain: PainArea): boolean {
  return !isBlocked(pain) && pain.intensity === 2;
}

export function blockedAreas(profile: Pick<UserProfile, 'painAreas'>): Set<BodyArea> {
  return new Set(profile.painAreas.filter(isBlocked).map((p) => p.area));
}

export function cautionAreas(profile: Pick<UserProfile, 'painAreas'>): Set<BodyArea> {
  const blocked = blockedAreas(profile);
  // If one side is blocked and the other only caution, the area stays blocked.
  return new Set(
    profile.painAreas.filter((p) => isCaution(p) && !blocked.has(p.area)).map((p) => p.area),
  );
}

// Readiness screening inspired by PAR-Q+. The question ids live in src/data/screening.ts.
export function applyScreening(
  profile: UserProfile,
  answers: Record<string, boolean>,
  completedAt: string,
): UserProfile {
  const anyYes = Object.values(answers).some(Boolean);
  const screening = { completedAt, anyYes };
  if (!anyYes) return { ...profile, screening };
  const levels = Object.fromEntries(
    Object.keys(profile.levels).map((pattern) => [pattern, 1]),
  ) as Record<Pattern, Level>;
  return { ...profile, screening, levels, seatedOnly: true };
}
