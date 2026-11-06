// Spoken guidance for distance mode. Pure: it says WHAT to say and WHEN, as cues timed from the start of
// the current timer (one side of a set, or a rest). The screen turns cues into words and speech. Cues come
// from the session's end timestamps, so pausing freezes them and coming back from the background never
// repeats the ones that already passed.

import {
  LEAD_MS,
  SWITCH_SIDE_SECONDS,
  currentItem,
  nextStep,
  repMs,
  restSeconds,
  segmentElapsedMs,
  setDurationMs,
  type Session,
} from './session';

export type CueKey =
  | 'announce' // "Sit to stand, no hands. Set 1 of 3"
  | 'number' // "4"
  | 'wellDone'
  | 'switchSides'
  | 'tenLeft' // "10 seconds left"
  | 'rest'
  | 'next'; // "Next: Wall push-up"

export interface Cue {
  at: number; // ms from the start of the segment
  key: CueKey;
  params?: { name?: string; set?: number; sets?: number; n?: number };
}

// A cue that is this late (the app was in the background, or the screen was busy) is skipped.
export const STALE_MS = 1500;
const SWITCH_MS = SWITCH_SIDE_SECONDS * 1000;

// The part of the session the cues belong to, and how far into it we are. Null while nothing runs.
export function voiceSegment(
  session: Session,
  now: number,
): { id: string; elapsed: number } | null {
  const { phase } = session;
  if (phase.kind === 'rest') {
    const item = currentItem(session);
    if (!item) return null;
    const total = restSeconds(item, session.seatedOnly) * 1000;
    const elapsed = Math.max(0, total - Math.max(0, phase.endsAt - now));
    return { id: `rest-${session.index}-${session.set}`, elapsed };
  }
  const elapsed = segmentElapsedMs(session, now);
  if (elapsed === null) return null;
  return { id: `set-${session.index}-${session.set}-${session.side}`, elapsed };
}

// Everything to say during the current segment. `name` = the current exercise, `nextName` = what comes
// after the rest.
export function voiceCues(session: Session, name: string, nextName?: string): Cue[] {
  const item = currentItem(session);
  const { phase } = session;
  if (!item) return [];

  if (phase.kind === 'rest') {
    const total = restSeconds(item, session.seatedOnly) * 1000;
    const cues: Cue[] = [{ at: 0, key: 'rest' }];
    if (nextName)
      cues.push({ at: Math.max(0, total - 10_000), key: 'next', params: { name: nextName } });
    return cues;
  }
  if (phase.kind !== 'exercise') return [];

  const { dosage } = item;
  const side2 = session.side === 2;
  const start: Cue = side2
    ? { at: 0, key: 'switchSides' }
    : { at: 0, key: 'announce', params: { name, set: session.set, sets: dosage.sets } };
  const cues: Cue[] = [start];

  if (dosage.kind === 'time') {
    const end = setDurationMs(session, item, session.side);
    if (dosage.seconds > 10) cues.push({ at: end - 10_000, key: 'tenLeft' });
    for (const n of [3, 2, 1]) cues.push({ at: end - n * 1000, key: 'number', params: { n } });
    return cues;
  }

  if (session.countMs === null) return cues;
  const rep = repMs(item, session.countMs);
  const first = side2 ? SWITCH_MS : LEAD_MS;
  for (let n = 1; n <= dosage.reps; n++) {
    cues.push({ at: first + n * rep, key: 'number', params: { n } });
  }
  if (!item.perSide || side2) cues.push({ at: first + dosage.reps * rep, key: 'wellDone' });
  return cues;
}

// The name of what comes after the current rest (the next set of the same exercise, or the next one).
export function nextExerciseId(session: Session): string | undefined {
  return session.items[nextStep(session).index]?.exerciseId;
}

// Cues that became due between two looks at the clock: from < at <= to, and not stale.
export function dueCues(cues: Cue[], from: number, to: number): Cue[] {
  return cues.filter((c) => c.at > from && c.at <= to && to - c.at <= STALE_MS);
}
