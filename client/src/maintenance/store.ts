import { create } from 'zustand';
import { effectiveStatus, rawStatus } from './timing';
import type { MaintenanceSnapshot } from './types';

interface MaintenanceState {
  snapshot: MaintenanceSnapshot | null;
  /** server time minus local time at the last poll, to compute countdowns without trusting the local clock */
  offsetMs: number;
  /** a request got the maintenance 503 before the next poll */
  forcedActive: boolean;
  /** the first status check has finished (success or failure) */
  checked: boolean;
  /** the signed-in viewer is an admin, so maintenance does not block them */
  viewerIsAdmin: boolean;
  /** the admin probe has answered for the current maintenance period */
  adminChecked: boolean;
  setSnapshot: (snapshot: MaintenanceSnapshot, receivedAt: number) => void;
  markActive: () => void;
  markChecked: () => void;
  setViewerAdmin: (isAdmin: boolean) => void;
  resetAdmin: () => void;
}

export const useMaintenanceStore = create<MaintenanceState>((set) => ({
  snapshot: null,
  offsetMs: 0,
  forcedActive: false,
  checked: false,
  viewerIsAdmin: false,
  adminChecked: false,
  setSnapshot: (snapshot, receivedAt) =>
    set(() => {
      const stillActive = rawStatus(snapshot, false, snapshot.serverTime) === 'active';
      return {
        snapshot,
        offsetMs: snapshot.serverTime - receivedAt,
        forcedActive: false,
        checked: true,
        // a new maintenance period must be probed again
        ...(stillActive ? {} : { viewerIsAdmin: false, adminChecked: false }),
      };
    }),
  markActive: () => set({ forcedActive: true }),
  markChecked: () => set({ checked: true }),
  setViewerAdmin: (isAdmin) => set({ viewerIsAdmin: isAdmin, adminChecked: true }),
  resetAdmin: () => set({ viewerIsAdmin: false, adminChecked: false }),
}));

/** For non-React callers (the axios interceptor, save handlers). False for an admin: they are not blocked. */
export const isMaintenanceActive = (): boolean => {
  const { snapshot, offsetMs, forcedActive, viewerIsAdmin } = useMaintenanceStore.getState();
  return effectiveStatus(snapshot, forcedActive, Date.now() + offsetMs, viewerIsAdmin) === 'active';
};
