import type { MaintenanceSnapshot, MaintenanceStatus } from './types';

export const POLL_NORMAL_MS = 60_000;
export const POLL_FAST_MS = 10_000;
export const FAST_WINDOW_MS = 2 * 60_000;

/**
 * What the UI should treat the state as right now. `forcedActive` is set when a request got the
 * maintenance 503 before the next poll. A scheduled start that passes between polls flips on time.
 */
export const effectiveStatus = (
  snapshot: MaintenanceSnapshot | null,
  forcedActive: boolean,
  serverNow: number,
): MaintenanceStatus => {
  if (forcedActive) return 'active';
  if (!snapshot || snapshot.status === 'off') return 'off';
  if (snapshot.status === 'active') return 'active';
  return snapshot.startsAt !== null && serverNow >= snapshot.startsAt ? 'active' : 'scheduled';
};

export const pollIntervalMs = (
  status: MaintenanceStatus,
  snapshot: MaintenanceSnapshot | null,
  serverNow: number,
): number => {
  if (status === 'active') return POLL_FAST_MS;
  if (status === 'scheduled' && snapshot?.startsAt != null && snapshot.startsAt - serverNow <= FAST_WINDOW_MS) {
    return POLL_FAST_MS;
  }
  return POLL_NORMAL_MS;
};

/** "in 12 min", "in 1 h 30 min" */
export const inCountdown = (ms: number): string => {
  if (ms <= 0) return 'now';
  if (ms < 60_000) return 'in under a minute';
  const minutes = Math.ceil(ms / 60_000);
  if (minutes < 60) return `in ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `in ${hours} h` : `in ${hours} h ${rest} min`;
};

/** "About 25 minutes left" */
export const timeLeftLabel = (ms: number): string => {
  if (ms <= 0) return 'Finishing up';
  if (ms < 60_000) return 'Less than a minute left';
  const minutes = Math.ceil(ms / 60_000);
  if (minutes < 60) return `About ${minutes} minute${minutes === 1 ? '' : 's'} left`;
  const hours = Math.round(minutes / 60);
  return `About ${hours} hour${hours === 1 ? '' : 's'} left`;
};

/** Elapsed share of the estimated window, 0..100; null when there is no usable window. */
export const progressPercent = (startsAt: number | null, endsAt: number | null, serverNow: number): number | null => {
  if (startsAt === null || endsAt === null || endsAt <= startsAt) return null;
  const share = ((serverNow - startsAt) / (endsAt - startsAt)) * 100;
  return Math.round(Math.min(100, Math.max(0, share)));
};

/** "3:00 PM" in the viewer's locale. */
export const formatClock = (timestamp: number, locale?: string, timeZone?: string): string =>
  new Date(timestamp).toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit', timeZone });

const isTimeOrNull = (value: unknown) => value === null || typeof value === 'number';

/** Anything that is not exactly a snapshot (HTML from a wrong URL, an error body) is rejected. */
export const parseSnapshot = (value: unknown): MaintenanceSnapshot | null => {
  if (typeof value !== 'object' || value === null) return null;
  const v = value as Record<string, unknown>;
  const statusOk = v.status === 'off' || v.status === 'scheduled' || v.status === 'active';
  if (!statusOk || !isTimeOrNull(v.startsAt) || !isTimeOrNull(v.endsAt)) return null;
  if (typeof v.message !== 'string' || typeof v.serverTime !== 'number') return null;
  return v as unknown as MaintenanceSnapshot;
};
