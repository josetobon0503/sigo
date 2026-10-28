// Updates the user's levels after a workout (CLAUDE.md section 6). Never moves more than 1 level.

import { dayOf } from './rules';
import type { Exercise, Level, Pattern, UserProfile, WorkoutLog } from './types';

const MIN_LEVEL = 1;
const MAX_LEVEL = 5;
const WINDOW = 2; // "the last 2 workouts that included that pattern"

// An item trains the pattern of its exercise and of the one it replaced, if any.
function itemPatterns(
  log: WorkoutLog,
  byId: Map<string, Exercise>,
  painOnly: boolean,
): Set<Pattern> {
  const patterns = new Set<Pattern>();
  for (const item of log.items) {
    if (painOnly && !item.painReported) continue;
    for (const id of [item.exerciseId, item.swappedFrom]) {
      const pattern = id ? byId.get(id)?.pattern : undefined;
      if (pattern) patterns.add(pattern);
    }
  }
  return patterns;
}

export function updateLevels(
  profile: UserProfile,
  log: WorkoutLog,
  history: WorkoutLog[],
  library: Exercise[],
): Record<Pattern, Level> {
  const byId = new Map(library.map((e) => [e.id, e]));
  // Newest first, current log included once.
  const logs = [log, ...history.filter((h) => h.id !== log.id)].sort((a, b) =>
    dayOf(b.date).localeCompare(dayOf(a.date)),
  );
  const levels = { ...profile.levels };

  for (const pattern of itemPatterns(log, byId, false)) {
    const recent = logs.filter((l) => itemPatterns(l, byId, false).has(pattern)).slice(0, WINDOW);
    const full = recent.length === WINDOW;
    const level = levels[pattern];

    if (itemPatterns(log, byId, true).has(pattern)) {
      levels[pattern] = Math.max(MIN_LEVEL, level - 1) as Level;
    } else if (full && recent.every((l) => l.feeling === 'sore')) {
      levels[pattern] = Math.max(MIN_LEVEL, level - 1) as Level;
    } else if (
      (log.feeling === 'great' || log.feeling === 'good') &&
      full &&
      recent.every((l) => !itemPatterns(l, byId, true).has(pattern))
    ) {
      levels[pattern] = Math.min(MAX_LEVEL, level + 1) as Level;
    }
  }
  return levels;
}
