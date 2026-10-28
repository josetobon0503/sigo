// Helpers for the Today screen. Pure, no React imports.

import { EQUIPMENT } from './profile';
import { dayOf, isAllowed, resolveEquipment } from './rules';
import { blockedAreas, cautionAreas } from './safety';
import type {
  BodyArea,
  Equipment,
  Exercise,
  Pattern,
  PlannedItem,
  UserProfile,
  WorkoutLog,
} from './types';

// Areas the workout took into account (blocked or caution), in the order the user added them.
export function consideredAreas(profile: Pick<UserProfile, 'painAreas'>): BodyArea[] {
  const considered = new Set([...blockedAreas(profile), ...cautionAreas(profile)]);
  return [...new Set(profile.painAreas.map((p) => p.area))].filter((a) => considered.has(a));
}

// For each skipped pattern, the blocked areas that caused it. An empty list means it was
// skipped for another reason (equipment, seated only), so the UI must not blame the pain.
export function skipReasons(
  skipped: Pattern[],
  profile: UserProfile,
  library: Exercise[],
  date: string,
): Partial<Record<Pattern, BodyArea[]>> {
  const blocked = blockedAreas(profile);
  const reasons: Partial<Record<Pattern, BodyArea[]>> = {};
  for (const pattern of skipped) {
    // Exercises that would have fit if nothing hurt.
    const withoutPain = library.filter(
      (e) =>
        e.pattern === pattern &&
        e.level <= profile.levels[pattern] &&
        isAllowed(e, profile, new Set(), date),
    );
    const areas = new Set(withoutPain.flatMap((e) => e.loads.filter((a) => blocked.has(a))));
    reasons[pattern] = [...blocked].filter((a) => areas.has(a));
  }
  return reasons;
}

// Equipment for today's exercises, as the user will use it (dumbbells for bottles, if that is
// what they have), without repeats and in a stable order.
export function equipmentNeeded(
  items: PlannedItem[],
  library: Exercise[],
  owned: Equipment[],
): Equipment[] {
  const byId = new Map(library.map((e) => [e.id, e]));
  const needed = new Set(
    items.flatMap((item) =>
      (byId.get(item.exerciseId)?.equipment ?? []).map((eq) => resolveEquipment(owned, eq)),
    ),
  );
  return EQUIPMENT.filter((eq) => needed.has(eq));
}

// True when a workout that day has at least one finished exercise. Opening a session and leaving
// right away does not count.
export function trainedOn(history: WorkoutLog[], day: string): boolean {
  return history.some(
    (log) => dayOf(log.date) === dayOf(day) && log.items.some((item) => item.completed),
  );
}
