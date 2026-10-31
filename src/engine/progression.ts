// Updates the user's levels after a workout (CLAUDE.md section 6). Never moves more than 1 level.

import { dayOf } from './rules';
import type {
  Exercise,
  ItemRating,
  Level,
  Pattern,
  UserProfile,
  WorkoutItem,
  WorkoutLog,
} from './types';

const MIN_LEVEL = 1;
const MAX_LEVEL = 5;
const WINDOW = 2; // "the last 2 workouts that included that pattern"

// An item trains the pattern of its exercise and of the one it replaced, if any. Items the user
// never got to (left early, no pain, no rating) do not count.
function itemPatterns(
  log: WorkoutLog,
  byId: Map<string, Exercise>,
  keep: (item: WorkoutItem) => boolean,
): Set<Pattern> {
  const patterns = new Set<Pattern>();
  for (const item of log.items) {
    if (!keep(item)) continue;
    for (const id of [item.exerciseId, item.swappedFrom]) {
      const pattern = id ? byId.get(id)?.pattern : undefined;
      if (pattern) patterns.add(pattern);
    }
  }
  return patterns;
}

const trained = (item: WorkoutItem) => item.completed || !!item.painReported || !!item.rating;
const withPain = (item: WorkoutItem) => !!item.painReported;
const rated = (rating: ItemRating) => (item: WorkoutItem) =>
  trained(item) && item.rating === rating;

// In order, for each pattern trained today:
// 1. pain -> down 1; 2. "sore" in the last 2 workouts with it -> down 1; 3. rated "hard" -> no change;
// 4. rated "easy" (or "too easy" was used) -> up 1 right away; 5. "great" / "good" and no pain in
// the last 2 workouts with it -> up 1.
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
  const hard = itemPatterns(log, byId, rated('hard'));
  const easy = itemPatterns(log, byId, rated('easy'));
  const down = (level: Level) => Math.max(MIN_LEVEL, level - 1) as Level;
  const up = (level: Level) => Math.min(MAX_LEVEL, level + 1) as Level;

  for (const pattern of itemPatterns(log, byId, trained)) {
    const recent = logs.filter((l) => itemPatterns(l, byId, trained).has(pattern)).slice(0, WINDOW);
    const full = recent.length === WINDOW;
    const level = levels[pattern];

    if (itemPatterns(log, byId, withPain).has(pattern)) {
      levels[pattern] = down(level);
    } else if (full && recent.every((l) => l.feeling === 'sore')) {
      levels[pattern] = down(level);
    } else if (hard.has(pattern)) {
      // "Hard" holds the level this time.
    } else if (easy.has(pattern)) {
      levels[pattern] = up(level);
    } else if (
      (log.feeling === 'great' || log.feeling === 'good') &&
      full &&
      recent.every((l) => !itemPatterns(l, byId, withPain).has(pattern))
    ) {
      levels[pattern] = up(level);
    }
  }
  return levels;
}
