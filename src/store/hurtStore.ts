// The "It hurts" flow result, shared by its screens. Lives in memory only.

import { create } from 'zustand';

import type { SwapResult } from '@/engine/types';

interface HurtState {
  result: SwapResult | null; // what findSwap said for the last report
  setResult: (result: SwapResult) => void;
  clear: () => void;
}

export const useHurtStore = create<HurtState>()((set) => ({
  result: null,
  setResult: (result) => set({ result }),
  clear: () => set({ result: null }),
}));
