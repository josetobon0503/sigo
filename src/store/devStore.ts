// Development helpers. "Simulate another day" moves the app's idea of today, to see how the
// workout changes. Not saved: a restart brings back the real date.

import { create } from 'zustand';

interface DevState {
  dayOffset: number;
  setDayOffset: (dayOffset: number) => void;
}

export const useDevStore = create<DevState>()((set) => ({
  dayOffset: 0,
  setDayOffset: (dayOffset) => set({ dayOffset }),
}));

// Local calendar day as 'YYYY-MM-DD', moved by `offset` days.
export function localDay(now: Date, offset = 0): string {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Today's day, with the simulated offset in development.
export function useToday(): string {
  const offset = useDevStore((s) => s.dayOffset);
  return localDay(new Date(), offset);
}
