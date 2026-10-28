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

export type Position = 'seated' | 'standing_supported' | 'standing'; // NO floor exercises in the MVP
export type Equipment = 'chair' | 'wall' | 'bottles' | 'towel' | 'light_dumbbells';

export type Level = 1 | 2 | 3 | 4 | 5;

export type Dosage =
  { kind: 'reps'; sets: number; reps: number } | { kind: 'time'; sets: number; seconds: number };

export interface Exercise {
  id: string; // kebab-case, e.g. 'chair-sit-to-stand'
  name: Localized;
  pattern: Pattern;
  position: Position;
  level: Level; // 1 = gentlest
  loads: BodyArea[]; // joints meaningfully loaded by this exercise
  equipment: Equipment[];
  dosage: Dosage;
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

export interface UserProfile {
  name: string;
  language: Lang;
  ageBand: AgeBand;
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

export interface WorkoutItem {
  exerciseId: string;
  completed: boolean;
  swappedFrom?: string;
  painReported?: PainReport;
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
  | 'swap.reason.mobility';

export type SwapResult =
  | { type: 'safety' }
  | { type: 'rest' }
  | { type: 'swap'; exercise: Exercise; reasonKey: SwapReasonKey };
