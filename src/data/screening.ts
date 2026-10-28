// NEEDS PROFESSIONAL REVIEW
// Readiness screening inspired by PAR-Q+ (CLAUDE.md section 6). The wording is added in Phase 3.
// Any "yes" -> "Please talk to your doctor before starting", all levels to 1 and seatedOnly = true.

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
