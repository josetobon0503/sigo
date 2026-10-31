// Pure updates to the profile's pain areas and avoided exercises. The stores call these after an
// "It hurts" report (CLAUDE.md section 6) and from the Pain tab.

import { dayOf } from './rules';
import type { BodyArea, PainArea, PainIntensity, PainReport, UserProfile } from './types';

export const AVOID_DAYS = 14;

// 'YYYY-MM-DD' plus `days` calendar days.
export function addDays(date: string, days: number): string {
  const [y, m, d] = dayOf(date).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

function clampIntensity(value: number): PainIntensity {
  return Math.min(5, Math.max(1, Math.round(value))) as PainIntensity;
}

// A report never lowers what the profile already says: intensity goes up to the reported one, and
// sharp pain stays sharp. A new area is added on both sides (the report has no side).
export function raisePainArea(painAreas: PainArea[], report: PainReport, date: string): PainArea[] {
  const intensity = clampIntensity(report.intensity);
  const existing = painAreas.find((p) => p.area === report.area);
  if (!existing) {
    return [
      ...painAreas,
      { area: report.area, side: 'both', intensity, kind: report.kind, updatedAt: date },
    ];
  }
  return painAreas.map((p) =>
    p.area === report.area
      ? {
          ...p,
          intensity: Math.max(p.intensity, intensity) as PainIntensity,
          kind: report.kind === 'sharp' ? 'sharp' : p.kind,
          updatedAt: date,
        }
      : p,
  );
}

// The exercise that caused pain is left out for 14 days. Reporting it again starts the 14 days over.
export function avoidExercise(
  avoided: UserProfile['avoided'],
  exerciseId: string,
  date: string,
  days = AVOID_DAYS,
): UserProfile['avoided'] {
  return [
    ...avoided.filter((a) => a.exerciseId !== exerciseId),
    { exerciseId, until: addDays(date, days) },
  ];
}

// Pain tab: add an area, or replace it when it is already in the list.
export function upsertPainArea(painAreas: PainArea[], pain: PainArea): PainArea[] {
  return painAreas.some((p) => p.area === pain.area)
    ? painAreas.map((p) => (p.area === pain.area ? pain : p))
    : [...painAreas, pain];
}

export function removePainArea(painAreas: PainArea[], area: BodyArea): PainArea[] {
  return painAreas.filter((p) => p.area !== area);
}
