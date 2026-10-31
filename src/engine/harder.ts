// "Too easy": finds a harder exercise with the same movement goal (CLAUDE.md section 6).

import { blockedAreas } from './safety';
import { isAllowed } from './rules';
import type { Exercise, HarderResult, UserProfile } from './types';

const SUPPORTED_POSITIONS = new Set(['seated', 'standing_supported']);

// Same pattern, the closest higher level, and every rule the generator uses: no blocked area,
// equipment the user has, not avoided, seatedOnly, floor only with floorOk, gentle balance held.
export function findHarder(
  current: Exercise,
  profile: UserProfile,
  library: Exercise[],
  usedToday: string[],
  date: string,
): HarderResult {
  const blocked = blockedAreas(profile);
  const used = new Set(usedToday);
  const [best] = library
    .filter(
      (e) =>
        e.pattern === current.pattern &&
        e.level > current.level &&
        isAllowed(e, profile, blocked, date),
    )
    .sort(
      (a, b) =>
        a.level - b.level ||
        Number(!SUPPORTED_POSITIONS.has(a.position)) -
          Number(!SUPPORTED_POSITIONS.has(b.position)) ||
        Number(used.has(a.id)) - Number(used.has(b.id)) ||
        a.id.localeCompare(b.id),
    );
  return best ? { type: 'harder', exercise: best } : { type: 'top' };
}
