// Small formatting helpers shared by screens. Every word comes from the translation files.

import type { TFunction } from 'i18next';

import type { Dosage, Lang } from '@/engine/types';

// "2 × 10", "2 × 30 s por lado".
export function formatDosage(t: TFunction, dosage: Dosage, perSide: boolean): string {
  if (dosage.kind === 'reps') {
    return t(perSide ? 'dosage.repsPerSide' : 'dosage.reps', {
      sets: dosage.sets,
      reps: dosage.reps,
    });
  }
  return t(perSide ? 'dosage.timePerSide' : 'dosage.time', {
    sets: dosage.sets,
    seconds: dosage.seconds,
  });
}

// What a screen reader says instead of "2 × 10": "2 series de 10 repeticiones, por lado".
export function spokenDosage(t: TFunction, dosage: Dosage, perSide: boolean): string {
  const base =
    dosage.kind === 'reps'
      ? t('dosage.spokenReps', { count: dosage.sets, reps: dosage.reps })
      : t('dosage.spokenTime', { count: dosage.sets, seconds: dosage.seconds });
  return perSide ? t('dosage.spokenPerSide', { dosage: base }) : base;
}

// "rodilla, cadera y espalda baja".
export function joinList(t: TFunction, items: string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  return t('list.and', { first: items.slice(0, -1).join(', '), last: items[items.length - 1] });
}

// "Miércoles, 28 de octubre" for a 'YYYY-MM-DD' day.
export function formatDay(day: string, lang: Lang): string {
  const [y, m, d] = day.split('-').map(Number);
  const text = new Date(y, m - 1, d).toLocaleDateString(lang, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  return text.charAt(0).toLocaleUpperCase(lang) + text.slice(1);
}
