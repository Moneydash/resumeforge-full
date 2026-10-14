import { create } from 'zustand';
import { effectiveStatus } from './timing';
import type { MaintenanceSnapshot } from './types';

interface MaintenanceState {
  snapshot: MaintenanceSnapshot | null;
  /** server time minus local time at the last poll, to compute countdowns without trusting the local clock */
  offsetMs: number;
  /** a request got the maintenance 503 before the next poll */
  forcedActive: boolean;
  /** the first status check has finished (success or failure) */
  checked: boolean;
  setSnapshot: (snapshot: MaintenanceSnapshot, receivedAt: number) => void;
  markActive: () => void;
  markChecked: () => void;
}

export const useMaintenanceStore = create<MaintenanceState>((set) => ({
  snapshot: null,
  offsetMs: 0,
  forcedActive: false,
  checked: false,
  setSnapshot: (snapshot, receivedAt) =>
    set({ snapshot, offsetMs: snapshot.serverTime - receivedAt, forcedActive: false, checked: true }),
  markActive: () => set({ forcedActive: true }),
  markChecked: () => set({ checked: true }),
}));

/** For non-React callers (the axios interceptor, save handlers). */
export const isMaintenanceActive = (): boolean => {
  const { snapshot, offsetMs, forcedActive } = useMaintenanceStore.getState();
  return effectiveStatus(snapshot, forcedActive, Date.now() + offsetMs) === 'active';
};
