// Finds a safer replacement with the same movement goal (CLAUDE.md section 6).
// Side effects (avoid the exercise for 14 days, raise the pain area) are done by the store.

import { blockedAreas, isRedFlagReport } from './safety';
import { isAllowed } from './rules';
import type { Exercise, PainReport, SwapReasonKey, SwapResult, UserProfile } from './types';

const SUPPORTED_POSITIONS = new Set(['seated', 'standing_supported']);

function reasonFor(current: Exercise, next: Exercise): SwapReasonKey {
  if (next.pattern === 'mobility' && current.pattern !== 'mobility') return 'swap.reason.mobility';
  if (next.position === 'seated' && current.position !== 'seated')
    return 'swap.reason.seatedVersion';
  if (next.level < current.level) return 'swap.reason.gentlerVersion';
  return 'swap.reason.avoidsArea';
}

export function findSwap(
  current: Exercise,
  report: PainReport,
  profile: UserProfile,
  library: Exercise[],
  usedToday: string[],
  date: string,
): SwapResult {
  if (isRedFlagReport(report)) return { type: 'safety' };

  const blocked = blockedAreas(profile);
  blocked.add(report.area);
  const used = new Set(usedToday);
  const eligible = (e: Exercise) =>
    e.id !== current.id && e.level <= current.level && isAllowed(e, profile, blocked, date);
  // Same level first, then seated / supported before standing, then not used today.
  const byPreference = (a: Exercise, b: Exercise) =>
    b.level - a.level ||
    Number(!SUPPORTED_POSITIONS.has(a.position)) - Number(!SUPPORTED_POSITIONS.has(b.position)) ||
    Number(used.has(a.id)) - Number(used.has(b.id)) ||
    a.id.localeCompare(b.id);

  const samePattern = library.filter((e) => e.pattern === current.pattern && eligible(e));
  const mobility = library.filter(
    (e) => e.pattern === 'mobility' && e.id !== current.id && isAllowed(e, profile, blocked, date),
  );
  const [best] =
    samePattern.length > 0 ? samePattern.sort(byPreference) : mobility.sort(byPreference);
  if (!best) return { type: 'rest' };
  return { type: 'swap', exercise: best, reasonKey: reasonFor(current, best) };
}
