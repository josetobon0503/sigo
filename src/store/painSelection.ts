// Pure helpers to pick painful areas and sides, shared by the body map and the chips.

import { PAIRED_AREAS } from '@/engine/profile';
import type { BodyArea, PainIntensity, PainKind, Side } from '@/engine/types';

export interface PainSelection {
  area: BodyArea;
  side: Side;
  intensity: PainIntensity | null; // null until the user picks one
  kind: PainKind;
}

const DEFAULT_KIND: PainKind = 'achy';

function opposite(side: 'left' | 'right'): 'left' | 'right' {
  return side === 'left' ? 'right' : 'left';
}

// Body map tap. Unpaired areas (neck, back) toggle on and off; paired areas combine sides:
// none -> this side, this side -> none, both -> the other side, the other side -> both.
export function toggleZone(
  list: PainSelection[],
  area: BodyArea,
  side: 'left' | 'right' | null,
): PainSelection[] {
  const current = list.find((p) => p.area === area);
  if (!PAIRED_AREAS.has(area) || side === null) {
    return current ? list.filter((p) => p.area !== area) : [...list, newSelection(area, 'both')];
  }
  if (!current) return [...list, newSelection(area, side)];
  if (current.side === side) return list.filter((p) => p.area !== area);
  const next: Side = current.side === 'both' ? opposite(side) : 'both';
  return setSide(list, area, next);
}

// Chip tap: adds the area on both sides, or removes it.
export function toggleArea(list: PainSelection[], area: BodyArea): PainSelection[] {
  return list.some((p) => p.area === area)
    ? list.filter((p) => p.area !== area)
    : [...list, newSelection(area, 'both')];
}

export function setSide(list: PainSelection[], area: BodyArea, side: Side): PainSelection[] {
  return list.map((p) => (p.area === area ? { ...p, side } : p));
}

export function setIntensity(
  list: PainSelection[],
  area: BodyArea,
  intensity: PainIntensity,
): PainSelection[] {
  return list.map((p) => (p.area === area ? { ...p, intensity } : p));
}

export function setKind(list: PainSelection[], area: BodyArea, kind: PainKind): PainSelection[] {
  return list.map((p) => (p.area === area ? { ...p, kind } : p));
}

// Is this side of the area selected? Used to paint body map zones.
export function isZoneSelected(
  list: PainSelection[],
  area: BodyArea,
  side: 'left' | 'right' | null,
): boolean {
  const current = list.find((p) => p.area === area);
  if (!current) return false;
  return side === null || current.side === 'both' || current.side === side;
}

function newSelection(area: BodyArea, side: Side): PainSelection {
  return { area, side, intensity: null, kind: DEFAULT_KIND };
}
