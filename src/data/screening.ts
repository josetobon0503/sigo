// NEEDS PROFESSIONAL REVIEW
// Readiness screening inspired by PAR-Q+ (CLAUDE.md section 6). The wording must be reviewed by a
// licensed professional before release. Kept here, next to the ids, so it is reviewed in one place.
// Any "yes" -> "Please talk to your doctor before starting", all levels to 1 and seatedOnly = true.

import type { Localized } from '../engine/types';

export const SCREENING_QUESTIONS = [
  'heartCondition',
  'chestPain',
  'dizziness',
  'boneOrJoint',
  'recentSurgery',
  'fallLastYear',
  'doctorLimit',
] as const;

export type ScreeningQuestionId = (typeof SCREENING_QUESTIONS)[number];

export const SCREENING_TEXT: Record<ScreeningQuestionId, Localized> = {
  heartCondition: {
    es: '¿Algún médico te ha dicho que tienes un problema del corazón?',
    en: 'Has a doctor ever told you that you have a heart condition?',
  },
  chestPain: {
    es: '¿Sientes dolor en el pecho al hacer actividad física?',
    en: 'Do you feel pain in your chest when you are physically active?',
  },
  dizziness: {
    es: '¿Te mareas o has perdido el conocimiento en el último año?',
    en: 'Do you get dizzy, or have you fainted, in the last year?',
  },
  boneOrJoint: {
    es: '¿Tienes un problema de huesos o articulaciones que empeora con la actividad?',
    en: 'Do you have a bone or joint problem that gets worse with activity?',
  },
  recentSurgery: {
    es: '¿Has tenido una cirugía recientemente?',
    en: 'Have you had surgery recently?',
  },
  fallLastYear: {
    es: '¿Te has caído en el último año?',
    en: 'Have you fallen in the last year?',
  },
  doctorLimit: {
    es: '¿Algún médico te ha dicho que limites tu actividad física?',
    en: 'Has a doctor told you to limit your physical activity?',
  },
};
