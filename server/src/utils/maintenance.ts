import { createHash, timingSafeEqual } from 'crypto';

export type MaintenanceStatus = 'off' | 'scheduled' | 'active';

/** What the server keeps (memory, mirrored to Redis). Times are epoch milliseconds. */
export interface StoredMaintenance {
  enabled: boolean;
  startsAt: number | null;
  endsAt: number | null;
  message: string;
}

/** What `GET /maintenance/status` returns. `status` is derived from the clock. */
export interface MaintenanceSnapshot {
  status: MaintenanceStatus;
  startsAt: number | null;
  endsAt: number | null;
  message: string;
  serverTime: number;
}

export const MESSAGE_MAX = 200;
const DEFAULT_RETRY_AFTER_S = 300;

export const OFF_STATE: StoredMaintenance = { enabled: false, startsAt: null, endsAt: null, message: '' };

export const snapshotOf = (stored: StoredMaintenance, now: number): MaintenanceSnapshot => {
  let status: MaintenanceStatus = 'off';
  if (stored.enabled) {
    status = stored.startsAt === null || now >= stored.startsAt ? 'active' : 'scheduled';
  }
  return { status, startsAt: stored.startsAt, endsAt: stored.endsAt, message: stored.message, serverTime: now };
};

type ParseResult = { ok: true; state: StoredMaintenance } | { ok: false; error: string };

const fail = (error: string): ParseResult => ({ ok: false, error });

const parseTime = (value: unknown): number | null | 'invalid' => {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') return 'invalid';
  const time = Date.parse(value);
  return Number.isNaN(time) ? 'invalid' : time;
};

/** Validates the body of `PUT /maintenance` and turns it into the state to store. */
export const parseUpdate = (body: unknown, now: number): ParseResult => {
  if (typeof body !== 'object' || body === null) return fail('Body must be a JSON object');
  const { action, startsAt, endsAt, message } = body as Record<string, unknown>;

  if (action === 'off') return { ok: true, state: { ...OFF_STATE } };
  if (action !== 'on' && action !== 'schedule') return fail("action must be 'on', 'off' or 'schedule'");

  const text = message === undefined ? '' : message;
  if (typeof text !== 'string' || text.length > MESSAGE_MAX) {
    return fail(`message must be a string of at most ${MESSAGE_MAX} characters`);
  }

  const end = parseTime(endsAt);
  if (end === 'invalid') return fail('endsAt must be an ISO date');

  let start = now;
  if (action === 'schedule') {
    const parsed = parseTime(startsAt);
    if (parsed === 'invalid' || parsed === null) return fail('startsAt must be an ISO date');
    if (parsed <= now) return fail('startsAt must be in the future');
    start = parsed;
  }

  if (end !== null && end <= start) return fail('endsAt must be after the start');
  return { ok: true, state: { enabled: true, startsAt: start, endsAt: end, message: text.trim() } };
};

const digest = (value: string) => createHash('sha256').update(value).digest();

/** Constant-time comparison. A missing or empty configured token disables the endpoint. */
export const isValidAdminToken = (provided: unknown, expected: string | undefined): boolean => {
  if (!expected) return false;
  if (typeof provided !== 'string') return false;
  return timingSafeEqual(digest(provided), digest(expected));
};

export const retryAfterSeconds = (snapshot: MaintenanceSnapshot): number => {
  if (snapshot.endsAt !== null && snapshot.endsAt > snapshot.serverTime) {
    return Math.ceil((snapshot.endsAt - snapshot.serverTime) / 1000);
  }
  return DEFAULT_RETRY_AFTER_S;
};

const isTimeOrNull = (value: unknown) => value === null || typeof value === 'number';

export const isStoredMaintenance = (value: unknown): value is StoredMaintenance => {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.enabled === 'boolean' &&
    isTimeOrNull(v.startsAt) &&
    isTimeOrNull(v.endsAt) &&
    typeof v.message === 'string'
  );
};
