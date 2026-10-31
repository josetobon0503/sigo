// Domain model (CLAUDE.md section 5). Pure types, no React imports.

export type Lang = 'es' | 'en';
export type Localized = Record<Lang, string>;
export type LocalizedList = Record<Lang, string[]>;

export type BodyArea =
  | 'neck'
  | 'shoulder'
  | 'elbow'
  | 'wrist'
  | 'upper_back'
  | 'lower_back'
  | 'hip'
  | 'knee'
  | 'ankle'
  | 'foot';
export type Side = 'left' | 'right' | 'both';

export type Pattern =
  | 'squat' // sit-to-stand, mini squats
  | 'hinge' // hip hinge, bridges
  | 'upper_push' // wall push-ups, bottle press
  | 'upper_pull' // rows with bottle or towel
  | 'core'
  | 'balance'
  | 'mobility' // warm-up and cool-down
  | 'calf';

// 'standing_supported' means holding on for balance. A wall, counter or table that only carries
// the trunk or the hands (wall sit, counter push-up, one-arm row on a table) is 'standing'.
// 'floor' is only offered to users who can get down and up without help (floorOk).
export type Position = 'seated' | 'standing_supported' | 'standing' | 'floor';
export type Equipment =
  | 'chair'
  | 'wall'
  | 'bottles'
  | 'towel'
  | 'light_dumbbells'
  | 'backpack' // a backpack with books or water bottles, adjustable weight
  | 'step' // a sturdy step or the first stair
  | 'band'; // elastic band, optional

export type Level = 1 | 2 | 3 | 4 | 5;

export type Dosage =
  | { kind: 'reps'; sets: number; reps: number; slow?: true } // slow: 3 s on the way down (level 5)
  | { kind: 'time'; sets: number; seconds: number };

export interface Exercise {
  id: string; // kebab-case, e.g. 'chair-sit-to-stand'
  name: Localized;
  pattern: Pattern;
  position: Position;
  level: Level; // 1 = gentlest
  loads: BodyArea[]; // joints meaningfully loaded by this exercise
  equipment: Equipment[];
  dosage: Dosage; // for a perSide exercise, reps or seconds are for each side
  perSide: boolean; // done one side at a time: "10 per side"
  purpose: Localized; // "what it is for", one or two plain sentences
  steps: LocalizedList; // "how to do it", 3-5 short steps
  mistakes: LocalizedList; // "how NOT to do it", 2-3 common mistakes
  video: { purpose?: string; howTo?: string; mistakes?: string }; // asset ids / URLs, optional for now
  reviewedByProfessional: boolean; // false until a licensed physical therapist approves it
}

export type PainIntensity = 1 | 2 | 3 | 4 | 5; // None, Mild, Some, Strong, Worst
export type PainKind = 'achy' | 'sharp' | 'stiff';

export interface PainArea {
  area: BodyArea;
  side: Side;
  intensity: PainIntensity;
  kind: PainKind;
  updatedAt: string; // ISO date
}

export type Feeling = 'great' | 'good' | 'ok' | 'tired' | 'sore';

export type AgeBand = 'under-50' | '50-59' | '60-69' | '70-79' | '80+';

// "How active are you?" from onboarding. Sets the starting level of every pattern.
export type ActivityLevel = 'low' | 'some' | 'daily' | 'strength';

export interface UserProfile {
  name: string;
  language: Lang;
  ageBand: AgeBand;
  activity: ActivityLevel | null; // null for profiles created before the question existed
  floorOk: boolean; // can get down to the floor and back up without help
  equipment: Equipment[];
  levels: Record<Pattern, Level>;
  seatedOnly: boolean; // true after a screening "yes" until the user changes it
  painAreas: PainArea[];
  avoided: { exerciseId: string; until: string }[]; // exercises that caused pain
  reminder: { enabled: boolean; hour: number; minute: number; days: number[] };
  screening: { completedAt: string; anyYes: boolean } | null;
}

// What the user reports from the "It hurts" flow.
export interface PainReport {
  area: BodyArea;
  intensity: number;
  kind: PainKind;
}

// "How was it?" after the last set of a main exercise. "Too easy" during the exercise counts as 'easy'.
export type ItemRating = 'easy' | 'good' | 'hard';

export interface WorkoutItem {
  exerciseId: string;
  completed: boolean;
  swappedFrom?: string;
  painReported?: PainReport;
  rating?: ItemRating;
}

export interface WorkoutLog {
  id: string;
  date: string;
  durationSec: number;
  items: WorkoutItem[];
  feeling?: Feeling;
}

// Engine results.

export type WorkoutSection = 'warmup' | 'main' | 'cooldown';

export interface PlannedItem {
  exerciseId: string;
  section: WorkoutSection;
  dosage: Dosage; // the exercise dosage, with extra sets if the workout was too short
  perSide: boolean;
}

export interface GeneratedWorkout {
  date: string;
  items: PlannedItem[];
  skippedPatterns: Pattern[]; // so the UI can say "We skipped X today to protect your knee"
  estimatedSec: number;
}

export type SwapReasonKey =
  | 'swap.reason.seatedVersion'
  | 'swap.reason.gentlerVersion'
  | 'swap.reason.avoidsArea'
  | 'swap.reason.similarMovement'
  | 'swap.reason.mobility';

export type HarderResult = { type: 'harder'; exercise: Exercise } | { type: 'top' };

export type SwapResult =
  | { type: 'safety' }
  | { type: 'rest' }
  | { type: 'swap'; exercise: Exercise; reasonKey: SwapReasonKey };
