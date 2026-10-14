# Maintenance Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an admin schedule or start maintenance with one command and no deploy, while people who are mid-edit keep their work and everyone else sees a clear maintenance screen.

**Architecture:** The server keeps one small state object (memory, mirrored to Redis when `REDIS_URL` is set). A public `GET /maintenance/status` reports it, a token-protected `PUT /maintenance` changes it, and a gate middleware answers every other request with a 503 while it is active. The client polls the status, shows banners and a full-page screen, and the two editors pause their save/generate calls at `handleFormSubmit` while keeping the latest document on the device.

**Tech Stack:** Express 5 + ioredis (server), React 19 + TypeScript + Vite + Tailwind + zustand (client), Vitest (node environment) for unit tests.

**Spec:** [docs/superpowers/specs/2026-10-14-maintenance-mode-design.md](../specs/2026-10-14-maintenance-mode-design.md)

## Global Constraints

- **No new dependencies.** `zustand`, `ioredis`, `lucide-react`, `@radix-ui/react-dialog` are already installed. No database table.
- Maintenance state shape on the server: `{ enabled, startsAt, endsAt, message }`, times as epoch milliseconds. Public snapshot: `{ status: 'off' | 'scheduled' | 'active', startsAt, endsAt, message, serverTime }`.
- `message` is at most 200 characters. Admin header is `x-admin-token`, env var `MAINTENANCE_ADMIN_TOKEN`; when the env var is unset the `PUT` answers 404 (disabled).
- While active, every request outside `GET /maintenance/status` and `PUT /maintenance` answers `503 { error: 'maintenance', endsAt }` with `Retry-After` and `X-Maintenance: 1`. CORS exposes both headers.
- The maintenance router and the gate are mounted **before** `cookieParser`, the session and `csrfProtection`.
- Polling: every 60 s normally; every 10 s when active or when a scheduled start is within 2 minutes; paused while the tab is hidden. A failed or malformed poll never changes the state.
- Landing, privacy and terms pages stay up. Non-editor routes switch to the maintenance screen as soon as maintenance is active. Editor routes (`/preview`, `/cl-preview`) switch only if maintenance was already active when the route mounted.
- Copy (exact): scheduled bar `Maintenance starts at {time} ({countdown}). Your work is saved.`; soft lock bar `Maintenance in progress. Your edits are kept on this device and will save when we're back.`; editor status label `Paused for maintenance`.
- Visual design is monochrome and matches the approved mockups: full-page screen is the left-aligned layout with progress bar and trust checklist; banners are full-width top bars (dark for scheduled, light with a dark bottom rule for the editor soft lock).
- Per the user's standing rule: test files are temporary. Create them for TDD, **never `git add` them**, and delete them in Task 9. Stage explicit paths only.
- Do not create a branch; work on `feat/maintenance-page`.

## Review Focus

1. A 503 arrives before the client has polled (maintenance started between polls): no error toast, the edit is kept, the editor shows "Paused for maintenance" (Tasks 4, 7, 8).
2. The status endpoint is unreachable or returns something that is not JSON (wrong API URL returns the SPA's `index.html`): never starts maintenance, never blocks the app (Tasks 4, 5).
3. User clicks Dashboard or reloads during maintenance with an unsaved edit: the draft survives `localStorage.clear()` and the user is asked what to keep on the next open (Tasks 4, 7, 8).
4. Two tabs open on the same document when maintenance ends: exactly one of them saves (Task 4).
5. Wrong, missing or unset admin token: state never changes, and the `PUT` is disabled when the env var is unset (Tasks 1, 3). A scheduled start that passes between polls flips the client to active on time (Task 4).

---

## File Structure

Server
- Create `server/src/utils/maintenance.ts`: types, `snapshotOf`, `parseUpdate`, `isValidAdminToken`, `retryAfterSeconds`, `isStoredMaintenance` (pure).
- Create `server/src/utils/maintenanceStore.ts`: `MaintenanceStore` (memory + optional key-value mirror) and `createMaintenanceStore()`.
- Create `server/src/middlewares/maintenance.ts`: `maintenanceGate`.
- Create `server/src/routes/maintenance.ts`: `createMaintenanceRouter`.
- Create `server/scripts/maintenance.sh`: the admin command line.
- Modify `server/src/index.ts`: mount order, CORS exposed headers, start the store.
- Modify `server/README.md`: document the feature.

Client (`client/src/maintenance/` holds logic; `client/src/components/maintenance/` holds UI)
- Create `maintenance/types.ts`, `maintenance/timing.ts`, `maintenance/store.ts`, `maintenance/api.ts`, `maintenance/hooks.ts`, `maintenance/draft.ts`, `maintenance/lock.ts`.
- Create `components/maintenance/MaintenanceBanner.tsx`, `MaintenanceScreen.tsx`, `MaintenanceGate.tsx`, `MaintenanceLayer.tsx`, `DraftRecoveryDialog.tsx`.
- Create `styles/maintenance.css`.
- Modify `api/axiosInstance.ts`, `components/editor-chrome/status.ts`, `components/editor-chrome/EditorTopBar.tsx`, `routes.tsx`, `App.tsx`, `pages/Preview.tsx`, `pages/CLPreview.tsx`, `pages/Dashboard.tsx`, `pages/CLDashboard.tsx`.

---

### Task 1: Server maintenance rules (pure)

**Files:**
- Create: `server/src/utils/maintenance.ts`
- Test (temporary, do not commit): `server/src/utils/maintenance.test.ts`

**Interfaces:**
- Produces:
  - `type MaintenanceStatus = 'off' | 'scheduled' | 'active'`
  - `interface StoredMaintenance { enabled: boolean; startsAt: number | null; endsAt: number | null; message: string }`
  - `interface MaintenanceSnapshot { status: MaintenanceStatus; startsAt: number | null; endsAt: number | null; message: string; serverTime: number }`
  - `const OFF_STATE: StoredMaintenance`, `const MESSAGE_MAX = 200`
  - `snapshotOf(stored: StoredMaintenance, now: number): MaintenanceSnapshot`
  - `parseUpdate(body: unknown, now: number): { ok: true; state: StoredMaintenance } | { ok: false; error: string }`
  - `isValidAdminToken(provided: unknown, expected: string | undefined): boolean`
  - `retryAfterSeconds(snapshot: MaintenanceSnapshot): number`
  - `isStoredMaintenance(value: unknown): value is StoredMaintenance`

- [ ] **Step 1: Write the failing test**

Create `server/src/utils/maintenance.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  OFF_STATE,
  MESSAGE_MAX,
  snapshotOf,
  parseUpdate,
  isValidAdminToken,
  retryAfterSeconds,
  isStoredMaintenance,
} from './maintenance';

const NOW = Date.UTC(2026, 9, 20, 12, 0, 0);
const MIN = 60_000;

describe('snapshotOf', () => {
  it('is off when not enabled', () => {
    expect(snapshotOf(OFF_STATE, NOW).status).toBe('off');
  });
  it('is scheduled before startsAt and active from startsAt on', () => {
    const stored = { enabled: true, startsAt: NOW + 10 * MIN, endsAt: null, message: '' };
    expect(snapshotOf(stored, NOW).status).toBe('scheduled');
    expect(snapshotOf(stored, NOW + 10 * MIN).status).toBe('active');
    expect(snapshotOf(stored, NOW + 11 * MIN).status).toBe('active');
  });
  it('is active when enabled without a start time', () => {
    expect(snapshotOf({ enabled: true, startsAt: null, endsAt: null, message: '' }, NOW).status).toBe('active');
  });
  it('carries the server time and message', () => {
    const snap = snapshotOf({ enabled: true, startsAt: NOW, endsAt: NOW + MIN, message: 'Upgrade' }, NOW);
    expect(snap).toEqual({ status: 'active', startsAt: NOW, endsAt: NOW + MIN, message: 'Upgrade', serverTime: NOW });
  });
});

describe('parseUpdate', () => {
  it('turns maintenance off', () => {
    expect(parseUpdate({ action: 'off' }, NOW)).toEqual({ ok: true, state: OFF_STATE });
  });
  it("'on' starts now and keeps an optional end and trimmed message", () => {
    const result = parseUpdate({ action: 'on', endsAt: new Date(NOW + 30 * MIN).toISOString(), message: '  Upgrade  ' }, NOW);
    expect(result).toEqual({ ok: true, state: { enabled: true, startsAt: NOW, endsAt: NOW + 30 * MIN, message: 'Upgrade' } });
  });
  it("'schedule' needs a future start", () => {
    const ok = parseUpdate({ action: 'schedule', startsAt: new Date(NOW + 5 * MIN).toISOString() }, NOW);
    expect(ok).toEqual({ ok: true, state: { enabled: true, startsAt: NOW + 5 * MIN, endsAt: null, message: '' } });
    expect(parseUpdate({ action: 'schedule', startsAt: new Date(NOW - MIN).toISOString() }, NOW).ok).toBe(false);
    expect(parseUpdate({ action: 'schedule' }, NOW).ok).toBe(false);
    expect(parseUpdate({ action: 'schedule', startsAt: 'not a date' }, NOW).ok).toBe(false);
  });
  it('rejects an end that is not after the start', () => {
    const start = new Date(NOW + 5 * MIN).toISOString();
    expect(parseUpdate({ action: 'schedule', startsAt: start, endsAt: start }, NOW).ok).toBe(false);
    expect(parseUpdate({ action: 'on', endsAt: new Date(NOW - MIN).toISOString() }, NOW).ok).toBe(false);
  });
  it('rejects bad input', () => {
    expect(parseUpdate(null, NOW).ok).toBe(false);
    expect(parseUpdate('on', NOW).ok).toBe(false);
    expect(parseUpdate({ action: 'pause' }, NOW).ok).toBe(false);
    expect(parseUpdate({ action: 'on', message: 'x'.repeat(MESSAGE_MAX + 1) }, NOW).ok).toBe(false);
    expect(parseUpdate({ action: 'on', message: 42 }, NOW).ok).toBe(false);
    expect(parseUpdate({ action: 'on', endsAt: 12345 }, NOW).ok).toBe(false);
  });
});

describe('isValidAdminToken', () => {
  it('is disabled when no token is configured', () => {
    expect(isValidAdminToken('anything', undefined)).toBe(false);
    expect(isValidAdminToken('', '')).toBe(false);
  });
  it('accepts only the exact token', () => {
    expect(isValidAdminToken('s3cret', 's3cret')).toBe(true);
    expect(isValidAdminToken('s3cre', 's3cret')).toBe(false);
    expect(isValidAdminToken('s3cret-and-more', 's3cret')).toBe(false);
    expect(isValidAdminToken(undefined, 's3cret')).toBe(false);
    expect(isValidAdminToken(['s3cret'], 's3cret')).toBe(false);
  });
});

describe('retryAfterSeconds', () => {
  it('counts down to the estimated end', () => {
    const snap = snapshotOf({ enabled: true, startsAt: NOW, endsAt: NOW + 90_000, message: '' }, NOW);
    expect(retryAfterSeconds(snap)).toBe(90);
  });
  it('falls back to 5 minutes without a usable end', () => {
    expect(retryAfterSeconds(snapshotOf({ enabled: true, startsAt: NOW, endsAt: null, message: '' }, NOW))).toBe(300);
    expect(retryAfterSeconds(snapshotOf({ enabled: true, startsAt: NOW - MIN, endsAt: NOW - 1, message: '' }, NOW))).toBe(300);
  });
});

describe('isStoredMaintenance', () => {
  it('accepts the stored shape only', () => {
    expect(isStoredMaintenance(OFF_STATE)).toBe(true);
    expect(isStoredMaintenance({ enabled: true, startsAt: 1, endsAt: null, message: 'x' })).toBe(true);
    expect(isStoredMaintenance({ enabled: 'yes', startsAt: 1, endsAt: null, message: '' })).toBe(false);
    expect(isStoredMaintenance({ enabled: true, startsAt: '1', endsAt: null, message: '' })).toBe(false);
    expect(isStoredMaintenance(null)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npx vitest run src/utils/maintenance.test.ts`
Expected: FAIL, cannot resolve `./maintenance`.

- [ ] **Step 3: Write the implementation**

Create `server/src/utils/maintenance.ts`:

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd server && npx vitest run src/utils/maintenance.test.ts`
Expected: PASS, all tests.

- [ ] **Step 5: Commit**

```bash
git add server/src/utils/maintenance.ts
git commit -m "$(cat <<'EOF'
feat(maintenance): add server maintenance rules

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Server state store

**Files:**
- Create: `server/src/utils/maintenanceStore.ts`
- Test (temporary, do not commit): `server/src/utils/maintenanceStore.test.ts`

**Interfaces:**
- Consumes: Task 1 (`StoredMaintenance`, `OFF_STATE`, `snapshotOf`, `isStoredMaintenance`).
- Produces:
  - `interface KeyValueClient { get(key: string): Promise<string | null>; set(key: string, value: string): Promise<unknown> }`
  - `class MaintenanceStore { constructor(kv?: KeyValueClient); snapshot(now?: number): MaintenanceSnapshot; set(next: StoredMaintenance): Promise<void>; refresh(): Promise<void>; start(): void; stop(): void }`
  - `createMaintenanceStore(): MaintenanceStore` (uses `REDIS_URL` when set; call it after `configDotenv()`).

- [ ] **Step 1: Write the failing test**

Create `server/src/utils/maintenanceStore.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { MaintenanceStore, type KeyValueClient } from './maintenanceStore';

const ACTIVE = { enabled: true, startsAt: 1000, endsAt: null, message: 'Upgrade' };

const memoryKv = (initial?: string): KeyValueClient & { data: Map<string, string> } => {
  const data = new Map<string, string>();
  if (initial !== undefined) data.set('maintenance:state', initial);
  return {
    data,
    get: async (key) => data.get(key) ?? null,
    set: async (key, value) => { data.set(key, value); return 'OK'; },
  };
};

describe('MaintenanceStore without a key-value client', () => {
  it('starts off, then reflects what was set', async () => {
    const store = new MaintenanceStore();
    expect(store.snapshot(5000).status).toBe('off');
    await store.set(ACTIVE);
    expect(store.snapshot(5000).status).toBe('active');
    expect(store.snapshot(5000).message).toBe('Upgrade');
  });
});

describe('MaintenanceStore with a key-value client', () => {
  it('writes the state on set', async () => {
    const kv = memoryKv();
    await new MaintenanceStore(kv).set(ACTIVE);
    expect(JSON.parse(kv.data.get('maintenance:state')!)).toEqual(ACTIVE);
  });

  it('loads the shared state on refresh', async () => {
    const store = new MaintenanceStore(memoryKv(JSON.stringify(ACTIVE)));
    await store.refresh();
    expect(store.snapshot(5000).status).toBe('active');
  });

  it('ignores a missing or malformed value', async () => {
    const store = new MaintenanceStore(memoryKv('{not json'));
    await store.set(ACTIVE);
    await store.refresh();
    expect(store.snapshot(5000).status).toBe('active');
    const empty = new MaintenanceStore(memoryKv(JSON.stringify({ enabled: 'maybe' })));
    await empty.refresh();
    expect(empty.snapshot(5000).status).toBe('off');
  });

  it('never throws when the client fails, and keeps the in-memory state', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    const broken: KeyValueClient = {
      get: async () => { throw new Error('down'); },
      set: async () => { throw new Error('down'); },
    };
    const store = new MaintenanceStore(broken);
    await expect(store.set(ACTIVE)).resolves.toBeUndefined();
    await expect(store.refresh()).resolves.toBeUndefined();
    expect(store.snapshot(5000).status).toBe('active');
    errors.mockRestore();
  });

  it('does not let a slow refresh undo a newer set', async () => {
    let release: (value: string | null) => void = () => {};
    const slow: KeyValueClient = {
      get: () => new Promise((resolve) => { release = resolve; }),
      set: async () => 'OK',
    };
    const store = new MaintenanceStore(slow);
    const refreshing = store.refresh();   // reads the old (off) value, still pending
    await store.set(ACTIVE);              // a newer local change lands first
    release(JSON.stringify({ enabled: false, startsAt: null, endsAt: null, message: '' }));
    await refreshing;
    expect(store.snapshot(5000).status).toBe('active');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npx vitest run src/utils/maintenanceStore.test.ts`
Expected: FAIL, cannot resolve `./maintenanceStore`.

- [ ] **Step 3: Write the implementation**

Create `server/src/utils/maintenanceStore.ts`:

```ts
import Redis from 'ioredis';
import {
  OFF_STATE,
  isStoredMaintenance,
  snapshotOf,
  type MaintenanceSnapshot,
  type StoredMaintenance,
} from './maintenance';

export interface KeyValueClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<unknown>;
}

const KEY = 'maintenance:state';
const REFRESH_MS = 5000;

/**
 * Holds the maintenance state in memory. With a key-value client (Redis) the state is also written
 * there and re-read every few seconds, so several server instances stay in step and a restart keeps it.
 * A client failure is logged and ignored: requests are never blocked because Redis is down.
 */
export class MaintenanceStore {
  private state: StoredMaintenance = { ...OFF_STATE };
  private version = 0; // bumped by every local set, so a slow refresh cannot undo a newer change
  private timer?: ReturnType<typeof setInterval>;

  constructor(private readonly kv?: KeyValueClient) {}

  snapshot(now: number = Date.now()): MaintenanceSnapshot {
    return snapshotOf(this.state, now);
  }

  async set(next: StoredMaintenance): Promise<void> {
    this.state = next;
    this.version += 1;
    if (!this.kv) return;
    try {
      await this.kv.set(KEY, JSON.stringify(next));
    } catch (err) {
      console.error('Redis error (maintenance):', (err as Error).message);
    }
  }

  async refresh(): Promise<void> {
    if (!this.kv) return;
    const versionBefore = this.version;
    try {
      const raw = await this.kv.get(KEY);
      if (raw === null || this.version !== versionBefore) return;
      const parsed: unknown = JSON.parse(raw);
      if (isStoredMaintenance(parsed)) this.state = parsed;
    } catch (err) {
      console.error('Redis error (maintenance):', (err as Error).message);
    }
  }

  start(): void {
    if (!this.kv) return;
    void this.refresh();
    this.timer = setInterval(() => void this.refresh(), REFRESH_MS);
    this.timer.unref();
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
  }
}

/** Call after `configDotenv()` so `REDIS_URL` from `.env` is visible. */
export const createMaintenanceStore = (): MaintenanceStore => {
  if (!process.env.REDIS_URL) return new MaintenanceStore();
  const redis = new Redis(process.env.REDIS_URL);
  redis.on('error', (err) => console.error('Redis error (maintenance):', err.message));
  return new MaintenanceStore({
    get: (key) => redis.get(key),
    set: (key, value) => redis.set(key, value),
  });
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd server && npx vitest run src/utils/maintenanceStore.test.ts`
Expected: PASS, all tests.

- [ ] **Step 5: Commit**

```bash
git add server/src/utils/maintenanceStore.ts
git commit -m "$(cat <<'EOF'
feat(maintenance): add state store with optional Redis mirror

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Server gate, router, wiring, script and docs

**Files:**
- Create: `server/src/middlewares/maintenance.ts`
- Create: `server/src/routes/maintenance.ts`
- Create: `server/scripts/maintenance.sh`
- Modify: `server/src/index.ts`
- Modify: `server/README.md` (append a section)
- Test (temporary, do not commit): `server/src/routes/maintenance.test.ts`

**Interfaces:**
- Consumes: Task 1 (`parseUpdate`, `isValidAdminToken`, `retryAfterSeconds`), Task 2 (`MaintenanceStore`, `createMaintenanceStore`).
- Produces:
  - `maintenanceGate(store: MaintenanceStore): RequestHandler`
  - `createMaintenanceRouter(store: MaintenanceStore): express.Router` (routes `GET /status`, `PUT /`, to be mounted at `/maintenance`)

- [ ] **Step 1: Write the failing test**

Create `server/src/routes/maintenance.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import express from 'express';
import type { Server } from 'http';
import type { AddressInfo } from 'net';
import { createMaintenanceRouter } from './maintenance';
import { maintenanceGate } from '../middlewares/maintenance';
import { MaintenanceStore } from '../utils/maintenanceStore';

let server: Server;
let base = '';
let store: MaintenanceStore;

// Same mount order as src/index.ts: json, maintenance router, gate, everything else.
beforeAll(async () => {
  store = new MaintenanceStore();
  const app = express();
  app.use(express.json());
  app.use('/maintenance', createMaintenanceRouter(store));
  app.use(maintenanceGate(store));
  app.get('/other', (_req, res) => res.json({ ok: true }));
  await new Promise<void>((resolve) => { server = app.listen(0, resolve); });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

beforeEach(async () => {
  process.env.MAINTENANCE_ADMIN_TOKEN = 'test-token';
  await store.set({ enabled: false, startsAt: null, endsAt: null, message: '' });
});

const put = (body: unknown, token: string | null = 'test-token') =>
  fetch(`${base}/maintenance`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json', ...(token ? { 'x-admin-token': token } : {}) },
    body: JSON.stringify(body),
  });

describe('GET /maintenance/status', () => {
  it('is public and reports off by default', async () => {
    const res = await fetch(`${base}/maintenance/status`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('off');
    expect(typeof body.serverTime).toBe('number');
  });
});

describe('PUT /maintenance', () => {
  it('is disabled (404) when MAINTENANCE_ADMIN_TOKEN is unset', async () => {
    delete process.env.MAINTENANCE_ADMIN_TOKEN;
    expect((await put({ action: 'on' })).status).toBe(404);
    expect((await (await fetch(`${base}/maintenance/status`)).json()).status).toBe('off');
  });

  it('rejects a missing or wrong token and changes nothing', async () => {
    expect((await put({ action: 'on' }, null)).status).toBe(401);
    expect((await put({ action: 'on' }, 'wrong')).status).toBe(401);
    expect((await (await fetch(`${base}/maintenance/status`)).json()).status).toBe('off');
  });

  it('rejects an invalid body with 400', async () => {
    const res = await put({ action: 'pause' });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/action/);
  });
});

describe('the gate', () => {
  it('lets requests through while off', async () => {
    expect((await fetch(`${base}/other`)).status).toBe(200);
  });

  it('answers 503 with the maintenance headers while active, but keeps the allowlist open', async () => {
    const endsAt = new Date(Date.now() + 90_000).toISOString();
    expect((await put({ action: 'on', endsAt, message: 'Upgrade' })).status).toBe(200);

    const blocked = await fetch(`${base}/other`);
    expect(blocked.status).toBe(503);
    expect(blocked.headers.get('x-maintenance')).toBe('1');
    expect(Number(blocked.headers.get('retry-after'))).toBeGreaterThan(0);
    expect(await blocked.json()).toEqual({ error: 'maintenance', endsAt: Date.parse(endsAt) });

    const status = await (await fetch(`${base}/maintenance/status`)).json();
    expect(status).toMatchObject({ status: 'active', message: 'Upgrade' });
    expect((await put({ action: 'off' })).status).toBe(200); // the admin route is never gated
    expect((await fetch(`${base}/other`)).status).toBe(200);
  });

  it('does not block while merely scheduled', async () => {
    const startsAt = new Date(Date.now() + 10 * 60_000).toISOString();
    expect((await put({ action: 'schedule', startsAt })).status).toBe(200);
    expect((await (await fetch(`${base}/maintenance/status`)).json()).status).toBe('scheduled');
    expect((await fetch(`${base}/other`)).status).toBe(200);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npx vitest run src/routes/maintenance.test.ts`
Expected: FAIL, cannot resolve `./maintenance`.

- [ ] **Step 3: Write the gate and the router**

Create `server/src/middlewares/maintenance.ts`:

```ts
import type { RequestHandler } from 'express';
import { retryAfterSeconds } from '../utils/maintenance';
import type { MaintenanceStore } from '../utils/maintenanceStore';

/**
 * While maintenance is active, answer every request with 503. Mount it after the maintenance router
 * (which stays reachable) and before the CSRF check, so clients see the 503 and not a CSRF 403.
 * `X-Maintenance` lets the client recognise it even when the body is an unparsed blob (PDF requests).
 */
export const maintenanceGate = (store: MaintenanceStore): RequestHandler => (_req, res, next) => {
  const snapshot = store.snapshot();
  if (snapshot.status !== 'active') return next();
  res.set('Retry-After', String(retryAfterSeconds(snapshot)));
  res.set('X-Maintenance', '1');
  return res.status(503).json({ error: 'maintenance', endsAt: snapshot.endsAt });
};
```

Create `server/src/routes/maintenance.ts`:

```ts
import express from 'express';
import { isValidAdminToken, parseUpdate } from '../utils/maintenance';
import type { MaintenanceStore } from '../utils/maintenanceStore';

export const createMaintenanceRouter = (store: MaintenanceStore) => {
  const router = express.Router();

  router.get('/status', (_req, res) => {
    res.set('Cache-Control', 'no-store');
    res.json(store.snapshot());
  });

  router.put('/', async (req, res) => {
    const expected = process.env.MAINTENANCE_ADMIN_TOKEN;
    if (!expected) return res.status(404).json({ error: 'Not found' }); // feature switched off
    if (!isValidAdminToken(req.header('x-admin-token'), expected)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const parsed = parseUpdate(req.body, Date.now());
    if (!parsed.ok) return res.status(400).json({ error: parsed.error });
    await store.set(parsed.state);
    return res.json(store.snapshot());
  });

  return router;
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd server && npx vitest run src/routes/maintenance.test.ts`
Expected: PASS, all tests.

- [ ] **Step 5: Wire it into the server**

In `server/src/index.ts`:

(a) After `import { csrfProtection } from './middlewares/auth';` add:

```ts
import { createMaintenanceStore } from './utils/maintenanceStore';
import { createMaintenanceRouter } from './routes/maintenance';
import { maintenanceGate } from './middlewares/maintenance';
```

(b) After `const port = process.env.PORT || 8080;` add:

```ts
const maintenanceStore = createMaintenanceStore();
```

(c) Replace

```ts
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true,
}));
app.use(express.json());
```

with

```ts
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true,
  exposedHeaders: ['X-Maintenance', 'Retry-After'], // so the client can recognise the maintenance 503
}));
app.use(express.json());
// Maintenance: the router stays reachable, then the gate answers 503 to everything else while active.
// Both must come before the session and CSRF middleware below.
app.use('/maintenance', createMaintenanceRouter(maintenanceStore));
app.use(maintenanceGate(maintenanceStore));
```

(d) In `startServer`, directly before `app.listen(port, () => {` add:

```ts
    maintenanceStore.start();
```

- [ ] **Step 6: Typecheck**

Run: `cd server && npx tsc --noEmit`
Expected: no errors. If `tsc` reports errors in files you did not touch, compare with `git stash` baseline before attributing them to this change.

- [ ] **Step 7: Create the admin script**

Create `server/scripts/maintenance.sh`:

```bash
#!/usr/bin/env bash
# Control maintenance mode from the command line.
#
#   maintenance.sh status
#   maintenance.sh on  [--ends <ISO>] [--message <text>]
#   maintenance.sh off
#   maintenance.sh schedule <start ISO> [--ends <ISO>] [--message <text>]
#
# Environment:
#   MAINTENANCE_ADMIN_TOKEN  required for on/off/schedule (same value as on the server)
#   MAINTENANCE_URL          server base URL, default http://localhost:8080
set -euo pipefail

BASE_URL="${MAINTENANCE_URL:-http://localhost:8080}"
command="${1:-}"
[ -n "$command" ] && shift || true

json_escape() { printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g'; }

send() {
  if [ -z "${MAINTENANCE_ADMIN_TOKEN:-}" ]; then
    echo "Set MAINTENANCE_ADMIN_TOKEN first." >&2
    exit 1
  fi
  curl -sS --fail-with-body -X PUT "$BASE_URL/maintenance" \
    -H "Content-Type: application/json" \
    -H "x-admin-token: $MAINTENANCE_ADMIN_TOKEN" \
    -d "$1"
  echo
}

build_body() { # build_body <action> [startsAt] -- remaining args are flags
  local action="$1" starts="${2:-}"
  shift 2 || shift $#
  local ends="" message=""
  while [ $# -gt 0 ]; do
    case "$1" in
      --ends) ends="$2"; shift 2 ;;
      --message) message="$2"; shift 2 ;;
      *) echo "Unknown option: $1" >&2; exit 1 ;;
    esac
  done
  local body="{\"action\":\"$action\""
  [ -n "$starts" ] && body="$body,\"startsAt\":\"$(json_escape "$starts")\""
  [ -n "$ends" ] && body="$body,\"endsAt\":\"$(json_escape "$ends")\""
  [ -n "$message" ] && body="$body,\"message\":\"$(json_escape "$message")\""
  printf '%s}' "$body"
}

case "$command" in
  status)
    curl -sS --fail-with-body "$BASE_URL/maintenance/status"
    echo
    ;;
  on)
    send "$(build_body on "" "$@")"
    ;;
  off)
    send '{"action":"off"}'
    ;;
  schedule)
    start="${1:-}"
    if [ -z "$start" ]; then echo "Usage: maintenance.sh schedule <start ISO> [--ends <ISO>] [--message <text>]" >&2; exit 1; fi
    shift
    send "$(build_body schedule "$start" "$@")"
    ;;
  *)
    echo "Usage: maintenance.sh status | on | off | schedule <start ISO>" >&2
    exit 1
    ;;
esac
```

- [ ] **Step 8: Smoke test the script and the server**

Run in one terminal: `cd server && MAINTENANCE_ADMIN_TOKEN=local-test-token npm run dev`
Run in another:

```bash
cd server
export MAINTENANCE_ADMIN_TOKEN=local-test-token
bash scripts/maintenance.sh status
bash scripts/maintenance.sh on --message "Smoke test" --ends "$(date -u -d '+20 minutes' +%Y-%m-%dT%H:%M:%SZ)"
curl -i http://localhost:8080/ats/keywords
bash scripts/maintenance.sh off
```

Expected: `status` prints `"status":"off"`; `on` prints `"status":"active"`; the `curl -i` shows `HTTP/1.1 503`, `X-Maintenance: 1`, a `Retry-After` value and `{"error":"maintenance",...}`; `off` prints `"status":"off"`. (`date -d` needs GNU date; on Git Bash it is available. If the server cannot start because the database is unreachable, start the database first; this is the existing boot behavior.)

- [ ] **Step 9: Document it**

Append to `server/README.md`:

````markdown
## Maintenance mode

Take the app down for maintenance without a deploy.

1. Set `MAINTENANCE_ADMIN_TOKEN` on the server to a long random value (for example `openssl rand -hex 32`). Without it the control endpoint is disabled.
2. Run the commands from `server/`:

```bash
export MAINTENANCE_ADMIN_TOKEN=...            # same value as on the server
export MAINTENANCE_URL=https://api.example.com # default http://localhost:8080
bash scripts/maintenance.sh schedule "2026-10-20T15:00:00Z" --ends "2026-10-20T16:00:00Z" --message "Database upgrade"
bash scripts/maintenance.sh on                 # start immediately
bash scripts/maintenance.sh off                # end it
bash scripts/maintenance.sh status
```

While maintenance is active every request except `GET /maintenance/status` and `PUT /maintenance` gets `503`. `endsAt` is an estimate only; clients leave the maintenance screen when the status becomes `off`.

The state lives in memory. With `REDIS_URL` set it is also mirrored to Redis, so it survives a restart and is shared between instances. Without Redis, a restart resets maintenance to off.
````

- [ ] **Step 10: Commit**

```bash
git add server/src/middlewares/maintenance.ts server/src/routes/maintenance.ts server/scripts/maintenance.sh server/src/index.ts server/README.md
git commit -m "$(cat <<'EOF'
feat(maintenance): add status endpoint, admin control and 503 gate

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Client logic modules (pure)

**Files:**
- Create: `client/src/maintenance/types.ts`
- Create: `client/src/maintenance/timing.ts`
- Create: `client/src/maintenance/store.ts`
- Create: `client/src/maintenance/draft.ts`
- Create: `client/src/maintenance/lock.ts`
- Test (temporary, do not commit): `client/src/maintenance/timing.test.ts`, `store.test.ts`, `draft.test.ts`, `lock.test.ts`

**Interfaces:**
- Produces:
  - `types.ts`: `type MaintenanceStatus = 'off' | 'scheduled' | 'active'`; `interface MaintenanceSnapshot { status: MaintenanceStatus; startsAt: number | null; endsAt: number | null; message: string; serverTime: number }`
  - `timing.ts`: `effectiveStatus(snapshot: MaintenanceSnapshot | null, forcedActive: boolean, serverNow: number): MaintenanceStatus`; `pollIntervalMs(status: MaintenanceStatus, snapshot: MaintenanceSnapshot | null, serverNow: number): number`; `inCountdown(ms: number): string`; `timeLeftLabel(ms: number): string`; `progressPercent(startsAt: number | null, endsAt: number | null, serverNow: number): number | null`; `formatClock(ts: number, locale?: string, timeZone?: string): string`; `parseSnapshot(value: unknown): MaintenanceSnapshot | null`; constants `POLL_NORMAL_MS`, `POLL_FAST_MS`, `FAST_WINDOW_MS`
  - `store.ts`: `useMaintenanceStore` (zustand) with state `{ snapshot, offsetMs, forcedActive, checked }` and actions `setSnapshot(snapshot, receivedAt)`, `markActive()`, `markChecked()`; `isMaintenanceActive(): boolean`
  - `draft.ts`: `type DraftKind = 'resume' | 'cover-letter'`; `saveDraft(storage, kind, id, data)`, `readDraft(storage, kind, id): { id: string; data: string } | null`, `clearDraft(storage, kind)`, `shouldOfferDraft(draftJson: string, serverJson: string): boolean`, `clearStorageKeepingDrafts(storage)`
  - `lock.ts`: `claimSaveLock(storage, key, owner, now, ttlMs?): boolean`; `TAB_ID: string`

- [ ] **Step 1: Write the types**

Create `client/src/maintenance/types.ts`:

```ts
export type MaintenanceStatus = 'off' | 'scheduled' | 'active';

/** What `GET /maintenance/status` returns. Times are epoch milliseconds on the server's clock. */
export interface MaintenanceSnapshot {
  status: MaintenanceStatus;
  startsAt: number | null;
  endsAt: number | null;
  message: string;
  serverTime: number;
}
```

- [ ] **Step 2: Write the failing timing test**

Create `client/src/maintenance/timing.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  FAST_WINDOW_MS,
  POLL_FAST_MS,
  POLL_NORMAL_MS,
  effectiveStatus,
  formatClock,
  inCountdown,
  parseSnapshot,
  pollIntervalMs,
  progressPercent,
  timeLeftLabel,
} from './timing';
import type { MaintenanceSnapshot } from './types';

const MIN = 60_000;
const NOW = Date.UTC(2026, 9, 20, 12, 0, 0);

const snap = (over: Partial<MaintenanceSnapshot>): MaintenanceSnapshot => ({
  status: 'off', startsAt: null, endsAt: null, message: '', serverTime: NOW, ...over,
});

describe('effectiveStatus', () => {
  it('is off without a snapshot or when the snapshot is off', () => {
    expect(effectiveStatus(null, false, NOW)).toBe('off');
    expect(effectiveStatus(snap({}), false, NOW)).toBe('off');
  });
  it('a forced flag (a request got the maintenance 503) means active', () => {
    expect(effectiveStatus(null, true, NOW)).toBe('active');
    expect(effectiveStatus(snap({}), true, NOW)).toBe('active');
  });
  it('flips from scheduled to active when the start passes between polls', () => {
    const scheduled = snap({ status: 'scheduled', startsAt: NOW + 5 * MIN });
    expect(effectiveStatus(scheduled, false, NOW)).toBe('scheduled');
    expect(effectiveStatus(scheduled, false, NOW + 5 * MIN)).toBe('active');
  });
  it('trusts an active snapshot', () => {
    expect(effectiveStatus(snap({ status: 'active', startsAt: NOW }), false, NOW)).toBe('active');
  });
});

describe('pollIntervalMs', () => {
  it('is normal when off or when a start is far away', () => {
    expect(pollIntervalMs('off', null, NOW)).toBe(POLL_NORMAL_MS);
    expect(pollIntervalMs('scheduled', snap({ status: 'scheduled', startsAt: NOW + 30 * MIN }), NOW)).toBe(POLL_NORMAL_MS);
  });
  it('is fast when active or when the start is within two minutes', () => {
    expect(pollIntervalMs('active', snap({ status: 'active' }), NOW)).toBe(POLL_FAST_MS);
    expect(pollIntervalMs('scheduled', snap({ status: 'scheduled', startsAt: NOW + FAST_WINDOW_MS }), NOW)).toBe(POLL_FAST_MS);
  });
});

describe('inCountdown', () => {
  it('words the remaining time', () => {
    expect(inCountdown(0)).toBe('now');
    expect(inCountdown(-5)).toBe('now');
    expect(inCountdown(30_000)).toBe('in under a minute');
    expect(inCountdown(12 * MIN)).toBe('in 12 min');
    expect(inCountdown(11 * MIN + 1)).toBe('in 12 min');
    expect(inCountdown(60 * MIN)).toBe('in 1 h');
    expect(inCountdown(90 * MIN)).toBe('in 1 h 30 min');
  });
});

describe('timeLeftLabel', () => {
  it('words the time left', () => {
    expect(timeLeftLabel(0)).toBe('Finishing up');
    expect(timeLeftLabel(30_000)).toBe('Less than a minute left');
    expect(timeLeftLabel(MIN)).toBe('About 1 minute left');
    expect(timeLeftLabel(25 * MIN)).toBe('About 25 minutes left');
    expect(timeLeftLabel(120 * MIN)).toBe('About 2 hours left');
  });
});

describe('progressPercent', () => {
  it('is null without both ends or with an empty range', () => {
    expect(progressPercent(null, NOW, NOW)).toBeNull();
    expect(progressPercent(NOW, null, NOW)).toBeNull();
    expect(progressPercent(NOW, NOW, NOW)).toBeNull();
  });
  it('is the elapsed share, clamped to 0..100', () => {
    expect(progressPercent(NOW, NOW + 60 * MIN, NOW + 15 * MIN)).toBe(25);
    expect(progressPercent(NOW, NOW + 60 * MIN, NOW - MIN)).toBe(0);
    expect(progressPercent(NOW, NOW + 60 * MIN, NOW + 90 * MIN)).toBe(100);
  });
});

describe('formatClock', () => {
  it('formats a short local time', () => {
    expect(formatClock(Date.UTC(2026, 9, 20, 15, 0), 'en-US', 'UTC').replace(/\s/g, ' ')).toBe('3:00 PM');
  });
});

describe('parseSnapshot', () => {
  it('accepts a well-formed snapshot', () => {
    const good = { status: 'active', startsAt: 1, endsAt: null, message: 'x', serverTime: 2 };
    expect(parseSnapshot(good)).toEqual(good);
  });
  it('rejects anything else, such as the SPA index.html served by a wrong API URL', () => {
    expect(parseSnapshot('<!doctype html><html></html>')).toBeNull();
    expect(parseSnapshot(null)).toBeNull();
    expect(parseSnapshot({})).toBeNull();
    expect(parseSnapshot({ status: 'down', startsAt: null, endsAt: null, message: '', serverTime: 1 })).toBeNull();
    expect(parseSnapshot({ status: 'off', startsAt: '1', endsAt: null, message: '', serverTime: 1 })).toBeNull();
    expect(parseSnapshot({ status: 'off', startsAt: null, endsAt: null, message: '' })).toBeNull();
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `cd client && npx vitest run src/maintenance/timing.test.ts`
Expected: FAIL, cannot resolve `./timing`.

- [ ] **Step 4: Write `timing.ts`**

Create `client/src/maintenance/timing.ts`:

```ts
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
```

- [ ] **Step 5: Run it to verify it passes**

Run: `cd client && npx vitest run src/maintenance/timing.test.ts`
Expected: PASS.

- [ ] **Step 6: Write the failing store test**

Create `client/src/maintenance/store.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { isMaintenanceActive, useMaintenanceStore } from './store';
import type { MaintenanceSnapshot } from './types';

const reset = () => useMaintenanceStore.setState({ snapshot: null, offsetMs: 0, forcedActive: false, checked: false });
const snapshot = (over: Partial<MaintenanceSnapshot> = {}): MaintenanceSnapshot => ({
  status: 'off', startsAt: null, endsAt: null, message: '', serverTime: 10_000, ...over,
});

beforeEach(reset);

describe('useMaintenanceStore', () => {
  it('starts unchecked and inactive', () => {
    const s = useMaintenanceStore.getState();
    expect(s.checked).toBe(false);
    expect(isMaintenanceActive()).toBe(false);
  });

  it('setSnapshot records the snapshot, the clock offset and that a check happened', () => {
    useMaintenanceStore.getState().setSnapshot(snapshot({ serverTime: 10_000 }), 4_000);
    const s = useMaintenanceStore.getState();
    expect(s.checked).toBe(true);
    expect(s.offsetMs).toBe(6_000);
    expect(s.snapshot?.status).toBe('off');
  });

  it('markActive (a request got the maintenance 503) makes it active until a poll says otherwise', () => {
    useMaintenanceStore.getState().markActive();
    expect(isMaintenanceActive()).toBe(true);
    useMaintenanceStore.getState().setSnapshot(snapshot({ status: 'off' }), Date.now());
    expect(isMaintenanceActive()).toBe(false);
  });

  it('markChecked lets the app proceed after a failed first poll without starting maintenance', () => {
    useMaintenanceStore.getState().markChecked();
    expect(useMaintenanceStore.getState().checked).toBe(true);
    expect(isMaintenanceActive()).toBe(false);
  });

  it('isMaintenanceActive follows the server clock for a scheduled start', () => {
    const now = Date.now();
    useMaintenanceStore.getState().setSnapshot(snapshot({ status: 'scheduled', startsAt: now + 60_000, serverTime: now }), now);
    expect(isMaintenanceActive()).toBe(false);
    useMaintenanceStore.getState().setSnapshot(snapshot({ status: 'scheduled', startsAt: now - 1, serverTime: now }), now);
    expect(isMaintenanceActive()).toBe(true);
  });
});
```

- [ ] **Step 7: Run it to verify it fails, then write `store.ts`**

Run: `cd client && npx vitest run src/maintenance/store.test.ts`
Expected: FAIL, cannot resolve `./store`.

Create `client/src/maintenance/store.ts`:

```ts
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
```

Run again: `cd client && npx vitest run src/maintenance/store.test.ts`
Expected: PASS.

- [ ] **Step 8: Write the failing draft test**

Create `client/src/maintenance/draft.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { clearDraft, clearStorageKeepingDrafts, readDraft, saveDraft, shouldOfferDraft } from './draft';

const fakeStorage = (initial: Record<string, string> = {}) => {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => { data.set(k, v); },
    removeItem: (k: string) => { data.delete(k); },
    clear: () => data.clear(),
  };
};

describe('drafts', () => {
  it('round-trips a draft for the same id and ignores other ids', () => {
    const s = fakeStorage();
    saveDraft(s, 'resume', '42', '{"a":1}');
    expect(readDraft(s, 'resume', '42')).toEqual({ id: '42', data: '{"a":1}' });
    expect(readDraft(s, 'resume', '43')).toBeNull();
    expect(readDraft(s, 'cover-letter', '42')).toBeNull();
  });

  it('keeps resume and cover letter drafts apart and clears one kind', () => {
    const s = fakeStorage();
    saveDraft(s, 'resume', '1', '{}');
    saveDraft(s, 'cover-letter', '1', '{}');
    clearDraft(s, 'resume');
    expect(readDraft(s, 'resume', '1')).toBeNull();
    expect(readDraft(s, 'cover-letter', '1')).not.toBeNull();
  });

  it('treats a corrupt stored draft as no draft', () => {
    const s = fakeStorage({ resumeDraft: '{broken' });
    expect(readDraft(s, 'resume', '1')).toBeNull();
    const s2 = fakeStorage({ resumeDraft: JSON.stringify({ id: '1', data: 5 }) });
    expect(readDraft(s2, 'resume', '1')).toBeNull();
  });

  it('does not throw when storage is full or blocked', () => {
    const blocked = { ...fakeStorage(), setItem: () => { throw new Error('quota'); } };
    expect(() => saveDraft(blocked, 'resume', '1', '{}')).not.toThrow();
  });
});

describe('shouldOfferDraft', () => {
  it('does not offer a draft equal to the server copy, whatever the key order or spacing', () => {
    expect(shouldOfferDraft('{"a":1,"b":{"c":2}}', '{ "b": {"c": 2}, "a": 1 }')).toBe(false);
  });
  it('offers a draft that differs', () => {
    expect(shouldOfferDraft('{"a":2}', '{"a":1}')).toBe(true);
  });
  it('compares raw text when it is not JSON', () => {
    expect(shouldOfferDraft('plain', 'plain')).toBe(false);
    expect(shouldOfferDraft('plain', 'other')).toBe(true);
  });
});

describe('clearStorageKeepingDrafts', () => {
  it('clears everything except the draft keys', () => {
    const s = fakeStorage({ id: '42', slug: 'x', resumeDraft: 'R', clDraft: 'C' });
    clearStorageKeepingDrafts(s);
    expect([...s.data.entries()].sort()).toEqual([['clDraft', 'C'], ['resumeDraft', 'R']]);
  });
  it('works when there are no drafts', () => {
    const s = fakeStorage({ id: '42' });
    clearStorageKeepingDrafts(s);
    expect(s.data.size).toBe(0);
  });
});
```

- [ ] **Step 9: Run it to verify it fails, then write `draft.ts`**

Run: `cd client && npx vitest run src/maintenance/draft.test.ts`
Expected: FAIL, cannot resolve `./draft`.

Create `client/src/maintenance/draft.ts`:

```ts
export type DraftKind = 'resume' | 'cover-letter';

const KEYS: Record<DraftKind, string> = { resume: 'resumeDraft', 'cover-letter': 'clDraft' };
const DRAFT_KEYS = Object.values(KEYS);

export interface Draft {
  id: string;
  /** the whole document as JSON text, exactly as it would have been saved */
  data: string;
}

/**
 * A draft is an edit that was kept on the device because it could not be saved (maintenance).
 * It lives under its own key so it never gets mixed up with the copy loaded from the server.
 */
export const saveDraft = (storage: Pick<Storage, 'setItem'>, kind: DraftKind, id: string, data: string): void => {
  try {
    storage.setItem(KEYS[kind], JSON.stringify({ id, data }));
  } catch {
    // storage full or blocked: the in-memory copy still saves when maintenance ends
  }
};

export const readDraft = (storage: Pick<Storage, 'getItem'>, kind: DraftKind, id: string): Draft | null => {
  try {
    const raw = storage.getItem(KEYS[kind]);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Draft> | null;
    if (!parsed || parsed.id !== id || typeof parsed.data !== 'string') return null;
    return { id: parsed.id, data: parsed.data };
  } catch {
    return null;
  }
};

export const clearDraft = (storage: Pick<Storage, 'removeItem'>, kind: DraftKind): void => {
  try {
    storage.removeItem(KEYS[kind]);
  } catch {
    // nothing to do
  }
};

const stable = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    const entries = Object.keys(value as object).sort().map((k) => `${JSON.stringify(k)}:${stable((value as Record<string, unknown>)[k])}`);
    return `{${entries.join(',')}}`;
  }
  return JSON.stringify(value);
};

const sameJson = (a: string, b: string): boolean => {
  try {
    return stable(JSON.parse(a)) === stable(JSON.parse(b));
  } catch {
    return a === b;
  }
};

/** Only ask the user when the draft really differs from what the server has. */
export const shouldOfferDraft = (draftJson: string, serverJson: string): boolean => !sameJson(draftJson, serverJson);

/** `localStorage.clear()` that leaves unsaved drafts alone. Logout still uses a plain clear. */
export const clearStorageKeepingDrafts = (storage: Pick<Storage, 'getItem' | 'setItem' | 'clear'>): void => {
  const kept = DRAFT_KEYS.map((key) => [key, storage.getItem(key)] as const).filter(([, value]) => value !== null);
  storage.clear();
  kept.forEach(([key, value]) => storage.setItem(key, value as string));
};
```

Run again: `cd client && npx vitest run src/maintenance/draft.test.ts`
Expected: PASS.

- [ ] **Step 10: Write the failing lock test**

Create `client/src/maintenance/lock.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { claimSaveLock } from './lock';

const fakeStorage = () => {
  const data = new Map<string, string>();
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => { data.set(k, v); } };
};

describe('claimSaveLock', () => {
  it('lets the first tab save and blocks a second tab while the lock is fresh', () => {
    const s = fakeStorage();
    expect(claimSaveLock(s, 'k', 'tab-a', 1000)).toBe(true);
    expect(claimSaveLock(s, 'k', 'tab-b', 2000)).toBe(false);
  });
  it('lets the same tab claim again', () => {
    const s = fakeStorage();
    expect(claimSaveLock(s, 'k', 'tab-a', 1000)).toBe(true);
    expect(claimSaveLock(s, 'k', 'tab-a', 1500)).toBe(true);
  });
  it('lets another tab take over once the lock has expired', () => {
    const s = fakeStorage();
    expect(claimSaveLock(s, 'k', 'tab-a', 1000, 15_000)).toBe(true);
    expect(claimSaveLock(s, 'k', 'tab-b', 1000 + 15_001, 15_000)).toBe(true);
  });
  it('different keys do not interfere', () => {
    const s = fakeStorage();
    expect(claimSaveLock(s, 'resume:1', 'tab-a', 1000)).toBe(true);
    expect(claimSaveLock(s, 'resume:2', 'tab-b', 1000)).toBe(true);
  });
  it('saves anyway when storage is unavailable', () => {
    const broken = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
    expect(claimSaveLock(broken, 'k', 'tab-a', 1000)).toBe(true);
  });
});
```

- [ ] **Step 11: Run it to verify it fails, then write `lock.ts`**

Run: `cd client && npx vitest run src/maintenance/lock.test.ts`
Expected: FAIL, cannot resolve `./lock`.

Create `client/src/maintenance/lock.ts`:

```ts
/** Identifies this browser tab, so tabs can tell their own lock from another tab's. */
export const TAB_ID = Math.random().toString(36).slice(2);

/**
 * When maintenance ends, every open tab on the same document would save. The first to claim this
 * short-lived lock does; the others skip. If storage is unavailable, save anyway.
 */
export const claimSaveLock = (
  storage: Pick<Storage, 'getItem' | 'setItem'>,
  key: string,
  owner: string,
  now: number,
  ttlMs = 15_000,
): boolean => {
  try {
    const raw = storage.getItem(key);
    if (raw) {
      const held = JSON.parse(raw) as { owner?: string; at?: number } | null;
      if (held && held.owner !== owner && typeof held.at === 'number' && now - held.at < ttlMs) return false;
    }
    storage.setItem(key, JSON.stringify({ owner, at: now }));
    const check = JSON.parse(storage.getItem(key) ?? 'null') as { owner?: string } | null;
    return check?.owner === owner;
  } catch {
    return true;
  }
};
```

Run again: `cd client && npx vitest run src/maintenance/`
Expected: PASS, all four test files.

- [ ] **Step 12: Commit**

```bash
git add client/src/maintenance/types.ts client/src/maintenance/timing.ts client/src/maintenance/store.ts client/src/maintenance/draft.ts client/src/maintenance/lock.ts
git commit -m "$(cat <<'EOF'
feat(maintenance): add client status, draft and lock logic

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Client polling, hooks and the 503 interceptor

**Files:**
- Create: `client/src/maintenance/api.ts`
- Create: `client/src/maintenance/hooks.ts`
- Modify: `client/src/api/axiosInstance.ts`
- Modify: `client/src/components/editor-chrome/status.ts`

**Interfaces:**
- Consumes: Task 4 (`useMaintenanceStore`, `effectiveStatus`, `pollIntervalMs`, `parseSnapshot`).
- Produces:
  - `api.ts`: `fetchMaintenanceStatus(): Promise<MaintenanceSnapshot | null>` (null when the body is not a snapshot)
  - `hooks.ts`: `useMaintenancePolling(): void` (mount once); `useMaintenance(): { status: MaintenanceStatus; startsAt: number | null; endsAt: number | null; message: string; serverNow: number }`; `useOnMaintenanceEnd(onEnd: () => void): void` (calls once on a transition away from `active`)
  - `status.ts`: `LiveStatus` gains `'paused'`, label `Paused for maintenance`, tone `none`

- [ ] **Step 1: Write the API call**

Create `client/src/maintenance/api.ts`:

```ts
import client from '@/api/axiosInstance';
import { parseSnapshot } from './timing';
import type { MaintenanceSnapshot } from './types';

/** Returns null when the response is not a snapshot (for example the SPA's index.html from a wrong API URL). */
export const fetchMaintenanceStatus = async (): Promise<MaintenanceSnapshot | null> => {
  const response = await client.get('/maintenance/status', { timeout: 8000 });
  return parseSnapshot(response.data);
};
```

- [ ] **Step 2: Write the hooks**

Create `client/src/maintenance/hooks.ts`:

```ts
import { useEffect, useRef, useState } from 'react';
import { fetchMaintenanceStatus } from './api';
import { useMaintenanceStore } from './store';
import { effectiveStatus, pollIntervalMs } from './timing';

/**
 * Polls the status endpoint. Mount it once, at the app root.
 * A failed or malformed poll never changes the state: only an explicit answer from the server does.
 */
export function useMaintenancePolling(): void {
  const forced = useMaintenanceStore((s) => s.forcedActive);
  const pollNowRef = useRef<() => void>(() => {});

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const schedule = () => {
      if (stopped) return;
      const { snapshot, offsetMs, forcedActive } = useMaintenanceStore.getState();
      const serverNow = Date.now() + offsetMs;
      const status = effectiveStatus(snapshot, forcedActive, serverNow);
      timer = setTimeout(() => {
        if (document.hidden) schedule(); // paused while the tab is hidden; the visibility handler catches up
        else void poll();
      }, pollIntervalMs(status, snapshot, serverNow));
    };

    const poll = async () => {
      clearTimeout(timer);
      try {
        const snapshot = await fetchMaintenanceStatus();
        if (stopped) return;
        if (snapshot) useMaintenanceStore.getState().setSnapshot(snapshot, Date.now());
        else useMaintenanceStore.getState().markChecked();
      } catch {
        if (!stopped) useMaintenanceStore.getState().markChecked();
      }
      schedule();
    };

    const onVisible = () => {
      if (!document.hidden) void poll();
    };

    pollNowRef.current = () => void poll();
    document.addEventListener('visibilitychange', onVisible);
    void poll();

    return () => {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  // A request got the maintenance 503: find out the end time and message right away.
  useEffect(() => {
    if (forced) pollNowRef.current();
  }, [forced]);
}

/** The current state plus a clock that ticks once a second while maintenance is scheduled or active. */
export function useMaintenance() {
  const snapshot = useMaintenanceStore((s) => s.snapshot);
  const offsetMs = useMaintenanceStore((s) => s.offsetMs);
  const forced = useMaintenanceStore((s) => s.forcedActive);
  const [now, setNow] = useState(() => Date.now());

  const live = forced || (snapshot !== null && snapshot.status !== 'off');
  useEffect(() => {
    if (!live) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [live]);

  const serverNow = now + offsetMs;
  return {
    status: effectiveStatus(snapshot, forced, serverNow),
    startsAt: snapshot?.startsAt ?? null,
    endsAt: snapshot?.endsAt ?? null,
    message: snapshot?.message ?? '',
    serverNow,
  };
}

/** Calls `onEnd` once when maintenance stops being active. */
export function useOnMaintenanceEnd(onEnd: () => void): void {
  const { status } = useMaintenance();
  const onEndRef = useRef(onEnd);
  onEndRef.current = onEnd;
  const previous = useRef(status);

  useEffect(() => {
    if (previous.current === 'active' && status !== 'active') onEndRef.current();
    previous.current = status;
  }, [status]);
}
```

- [ ] **Step 3: Recognise the maintenance 503 in the axios instance**

In `client/src/api/axiosInstance.ts`:

(a) Add to the imports:

```ts
import { useMaintenanceStore } from '@/maintenance/store';
```

(b) In the response-error interceptor, directly after `(error) => {` and before `if (error.code === 'ECONNABORTED') {`, insert:

```ts
    // The server answers every request with 503 + X-Maintenance while maintenance is active. The header
    // (not the body) is checked because PDF requests use responseType 'blob'. This flips the UI without
    // waiting for the next status poll.
    if (error.response?.status === 503 && error.response.headers?.['x-maintenance'] === '1') {
      useMaintenanceStore.getState().markActive();
    }

```

- [ ] **Step 4: Add the "paused" editor status**

Replace the contents of `client/src/components/editor-chrome/status.ts` with:

```ts
export type LiveStatus = 'idle' | 'updating' | 'saved' | 'error' | 'paused';
export type StatusTone = 'none' | 'working' | 'ok' | 'error';

// The exact texts the editor shows today, in one place.
export const liveStatusLabel = (status: LiveStatus): string => {
  if (status === 'updating') return 'Saving & updating preview...';
  if (status === 'saved') return 'All changes saved';
  if (status === 'error') return 'Update failed, will retry on next edit';
  if (status === 'paused') return 'Paused for maintenance';
  return '';
};

export const statusTone = (status: LiveStatus): StatusTone => {
  if (status === 'updating') return 'working';
  if (status === 'saved') return 'ok';
  if (status === 'error') return 'error';
  return 'none';
};
```

- [ ] **Step 5: Typecheck**

Run: `cd client && npx tsc -p tsconfig.app.json --noEmit`
Expected: no errors from the new files. (`LiveStatus` is also declared inline in `Preview.tsx` and `CLPreview.tsx`; that is fixed in Tasks 7 and 8.)

- [ ] **Step 6: Commit**

```bash
git add client/src/maintenance/api.ts client/src/maintenance/hooks.ts client/src/api/axiosInstance.ts client/src/components/editor-chrome/status.ts
git commit -m "$(cat <<'EOF'
feat(maintenance): poll the status and recognise the maintenance 503

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Client UI (banner, screen, gate) and routing

**Files:**
- Create: `client/src/styles/maintenance.css`
- Create: `client/src/components/maintenance/MaintenanceBanner.tsx`
- Create: `client/src/components/maintenance/MaintenanceScreen.tsx`
- Create: `client/src/components/maintenance/MaintenanceGate.tsx`
- Create: `client/src/components/maintenance/MaintenanceLayer.tsx`
- Modify: `client/src/routes.tsx`
- Modify: `client/src/App.tsx`

**Interfaces:**
- Consumes: Task 5 (`useMaintenance`, `useMaintenancePolling`), Task 4 (`useMaintenanceStore`, `formatClock`, `inCountdown`, `timeLeftLabel`, `progressPercent`).
- Produces:
  - `MaintenanceBanner` props `{ variant: 'editor' | 'page'; showActive?: boolean }` (default export). Renders the dark scheduled bar; the light soft-lock bar when `variant="editor"` and active; the dark public-page bar when `variant="page"`, active and `showActive`.
  - `MaintenanceScreen` (default export, no props).
  - `MaintenanceGate` props `{ children: ReactNode; softLock?: boolean }` (default export).
  - `MaintenanceLayer` (default export, no props): runs the polling and renders the root banner.

- [ ] **Step 1: Write the styles**

Create `client/src/styles/maintenance.css`:

```css
/* Maintenance banner and screen. The screen uses the .landing tokens from landing.css;
   the bars use plain colors because they also render outside any .landing/.app-shell scope. */

.mt-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.25rem 1rem;
  flex-shrink: 0;
  padding: 0.5rem 1rem;
  font-family: 'Geist', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  font-size: 0.8125rem;
  line-height: 1.4;
}
.mt-bar--dark { background: #111110; color: #f4f4f2; }
.dark .mt-bar--dark { background: #f4f4f2; color: #111110; }
.mt-bar--light { background: #ffffff; color: #111110; border-bottom: 2px solid #111110; }
.dark .mt-bar--light { background: #151517; color: #f4f4f2; border-bottom-color: #f4f4f2; }
.mt-bar__time { opacity: 0.65; font-variant-numeric: tabular-nums; }

.mt-screen { display: flex; flex-direction: column; }
.mt-screen__nav { display: flex; align-items: center; justify-content: space-between; padding: 1rem 1.5rem; }
.mt-screen__main {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
  max-width: 30rem;
  margin: 0 auto;
  padding: 4rem 1.5rem 3rem;
}
.mt-screen__title { margin: 1.5rem 0 0; font-size: 1.75rem; font-weight: 600; letter-spacing: -0.02em; }
.mt-screen__lead { margin: 0; color: var(--l-muted); line-height: 1.6; }
.mt-screen__lead b { color: var(--l-ink); font-weight: 600; }
.mt-progress { height: 6px; overflow: hidden; border-radius: 3px; background: var(--l-surface-2); }
.mt-progress > i { display: block; height: 100%; background: var(--l-ink); }
@media (prefers-reduced-motion: no-preference) {
  .mt-progress > i { transition: width 1s linear; }
}
.mt-screen__left { margin: 0; color: var(--l-muted); font-size: 0.75rem; }
.mt-checks {
  display: grid;
  gap: 0.5rem;
  margin: 0.5rem 0 0;
  padding: 1rem 0 0;
  border-top: 1px solid var(--l-hair);
  list-style: none;
  font-size: 0.875rem;
}
.mt-checks li { display: flex; align-items: center; gap: 0.5rem; }
.mt-screen__foot { margin: auto 0 0; padding-top: 2rem; color: var(--l-muted); font-size: 0.75rem; }
.mt-screen__foot a { color: inherit; text-decoration: underline; text-underline-offset: 2px; }
```

- [ ] **Step 2: Write the banner**

Create `client/src/components/maintenance/MaintenanceBanner.tsx`:

```tsx
import { useMaintenance } from '@/maintenance/hooks';
import { formatClock, inCountdown } from '@/maintenance/timing';
import '@/styles/maintenance.css';

interface MaintenanceBannerProps {
  /** 'editor' sits inside an editor page; 'page' sits at the top of any other page. */
  variant: 'editor' | 'page';
  /** For variant 'page': also show the "in progress" bar (landing, privacy and terms pages). */
  showActive?: boolean;
}

export default function MaintenanceBanner({ variant, showActive = false }: MaintenanceBannerProps) {
  const { status, startsAt, endsAt, serverNow } = useMaintenance();

  if (status === 'scheduled' && startsAt !== null) {
    return (
      <div className="mt-bar mt-bar--dark" role="status">
        <span>
          Maintenance starts at <b>{formatClock(startsAt)}</b> ({inCountdown(startsAt - serverNow)}). Your work is saved.
        </span>
        <span className="mt-bar__time">{formatClock(startsAt)}</span>
      </div>
    );
  }

  if (status !== 'active') return null;

  if (variant === 'editor') {
    return (
      <div className="mt-bar mt-bar--light" role="status">
        <span>
          <b>Maintenance in progress.</b> Your edits are kept on this device and will save when we're back.
        </span>
      </div>
    );
  }

  if (!showActive) return null;
  return (
    <div className="mt-bar mt-bar--dark" role="status">
      <span>
        <b>Maintenance in progress.</b> Sign-in and the editor are unavailable{endsAt !== null ? ` until about ${formatClock(endsAt)}` : ' for now'}.
      </span>
    </div>
  );
}
```

- [ ] **Step 3: Write the full-page screen**

Create `client/src/components/maintenance/MaintenanceScreen.tsx`:

```tsx
import { Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import ThemeToggle from '@/components/ThemeToggle';
import { useMaintenance } from '@/maintenance/hooks';
import { formatClock, progressPercent, timeLeftLabel } from '@/maintenance/timing';
import '@/styles/landing.css';
import '@/styles/maintenance.css';

const DEFAULT_MESSAGE = "We're making improvements to ResumeForge.";

export default function MaintenanceScreen() {
  const { startsAt, endsAt, message, serverNow } = useMaintenance();
  const percent = progressPercent(startsAt, endsAt, serverNow);

  return (
    <div className="landing mt-screen">
      <header className="mt-screen__nav">
        <span className="l-ink flex min-h-11 items-center gap-2.5 font-semibold">
          <img src="/icon.png" alt="" width={28} height={28} className="size-7 rounded-md" />
          ResumeForge
        </span>
        <ThemeToggle styleClass="inline-flex min-h-11 min-w-11 items-center justify-center" />
      </header>

      <main id="main" tabIndex={-1} className="mt-screen__main">
        <h1 className="mt-screen__title">Scheduled maintenance</h1>
        <p className="mt-screen__lead">
          {message || DEFAULT_MESSAGE}{' '}
          {endsAt !== null ? (
            <>Back around <b>{formatClock(endsAt)}</b>.</>
          ) : (
            <>We'll be back soon.</>
          )}
        </p>

        {percent !== null && endsAt !== null && (
          <>
            <div
              className="mt-progress"
              role="progressbar"
              aria-label="Maintenance progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
            >
              <i style={{ width: `${percent}%` }} />
            </div>
            <p className="mt-screen__left">{timeLeftLabel(endsAt - serverNow)}</p>
          </>
        )}

        <ul className="mt-checks">
          <li><Check aria-hidden="true" className="size-4" /> Your saved resumes are safe</li>
          <li><Check aria-hidden="true" className="size-4" /> Drafts typed on this device are kept</li>
          <li><Check aria-hidden="true" className="size-4" /> No action needed from you</li>
        </ul>

        <p className="mt-screen__foot">
          This page updates on its own. The <Link to="/">landing page</Link>, privacy policy and terms are still available.
        </p>
      </main>
    </div>
  );
}
```

- [ ] **Step 4: Write the route gate**

Create `client/src/components/maintenance/MaintenanceGate.tsx`:

```tsx
import { useRef, type ReactNode } from 'react';
import Loader from '@/components/SuspenseLoader';
import { useMaintenance } from '@/maintenance/hooks';
import { useMaintenanceStore } from '@/maintenance/store';
import MaintenanceScreen from './MaintenanceScreen';

interface MaintenanceGateProps {
  children: ReactNode;
  /**
   * Editor routes: only block if maintenance was already active when the route mounted, so someone who
   * is already editing keeps their editor (the soft lock) when maintenance starts.
   */
  softLock?: boolean;
}

export default function MaintenanceGate({ children, softLock = false }: MaintenanceGateProps) {
  const checked = useMaintenanceStore((s) => s.checked);
  const { status } = useMaintenance();
  const activeAtMount = useRef<boolean | null>(null);

  // Wait for the first status check, otherwise a page could mount and fetch just as maintenance is on.
  if (!checked) return <Loader label="Loading" />;

  if (activeAtMount.current === null) activeAtMount.current = status === 'active';
  const block = softLock ? activeAtMount.current && status === 'active' : status === 'active';
  return block ? <MaintenanceScreen /> : <>{children}</>;
}
```

- [ ] **Step 5: Write the root layer**

Create `client/src/components/maintenance/MaintenanceLayer.tsx`:

```tsx
import { useLocation } from 'react-router-dom';
import { useMaintenancePolling } from '@/maintenance/hooks';
import MaintenanceBanner from './MaintenanceBanner';

// The editors render their own banner inside the page, so the root bar stays out of their way.
const EDITOR_PATHS = ['/preview', '/cl-preview'];
// Pages that stay up during maintenance: the "in progress" bar explains why sign-in does not work.
const PUBLIC_PATHS = ['/', '/terms-of-service', '/privacy-policy'];

/** Mount once inside the router: runs the status polling and shows the root banner. */
export default function MaintenanceLayer() {
  useMaintenancePolling();
  const { pathname } = useLocation();
  if (EDITOR_PATHS.includes(pathname)) return null;
  return <MaintenanceBanner variant="page" showActive={PUBLIC_PATHS.includes(pathname)} />;
}
```

- [ ] **Step 6: Mount the layer and wrap the routes**

In `client/src/App.tsx`:

(a) Add the import: `import MaintenanceLayer from "./components/maintenance/MaintenanceLayer"`

(b) Replace `        <RouteComponent />` with:

```tsx
        <MaintenanceLayer />
        <RouteComponent />
```

In `client/src/routes.tsx`:

(a) Add the import after `import Loader from './components/SuspenseLoader';`:

```tsx
import MaintenanceGate from '@/components/maintenance/MaintenanceGate';
```

(b) Replace the `<Route path="/login" ... />` and every protected route so each is wrapped in `MaintenanceGate`, with `softLock` on the two editor routes. The full `<Routes>` body becomes:

```tsx
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<MaintenanceGate><Login /></MaintenanceGate>} />
          <Route
            path="/dashboard"
            element={
              <MaintenanceGate>
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              </MaintenanceGate>
            }
          />
          <Route
            path="/templates"
            element={
              <MaintenanceGate>
                <ProtectedRoute>
                  <Templates />
                </ProtectedRoute>
              </MaintenanceGate>
            }
          />
          <Route
            path="/preview"
            element={
              <MaintenanceGate softLock>
                <ProtectedRoute>
                  <Preview />
                </ProtectedRoute>
              </MaintenanceGate>
            }
          />
          <Route
            path="/cl-preview"
            element={
              <MaintenanceGate softLock>
                <ProtectedRoute>
                  <CLPreview />
                </ProtectedRoute>
              </MaintenanceGate>
            }
          />
          <Route
            path="/cl-templates"
            element={
              <MaintenanceGate>
                <ProtectedRoute>
                  <CLTemplates />
                </ProtectedRoute>
              </MaintenanceGate>
            }
          />
          <Route
            path="/cl-dashboard"
            element={
              <MaintenanceGate>
                <ProtectedRoute>
                  <CLDashboard />
                </ProtectedRoute>
              </MaintenanceGate>
            }
          />
          <Route
            path="/ats-scanner"
            element={
              <MaintenanceGate>
                <ProtectedRoute>
                  <ATSScanner />
                </ProtectedRoute>
              </MaintenanceGate>
            }
          />
          <Route path="*" element={<NotFound />} />
          <Route path="/terms-of-service" element={<ToS />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        </Routes>
```

- [ ] **Step 7: Typecheck and look at it**

Run: `cd client && npx tsc -p tsconfig.app.json --noEmit`
Expected: no errors.

Then with the server from Task 3 running and the client dev server up (`cd client && npm run dev`), run `bash server/scripts/maintenance.sh on --message "Looking good?" --ends "<ISO about 30 min ahead>"` and open `/dashboard`, `/login`, `/` and `/ats-scanner` in a browser. Expected: dashboard, login and scanner show the full-page screen with progress bar and checklist; `/` shows the dark "Maintenance in progress" bar; `bash server/scripts/maintenance.sh off` brings the pages back within about 10 seconds. Check dark mode too (the theme toggle on the screen). Then try `schedule` with a start 3 minutes ahead: every page except the editors shows the dark scheduled bar with a live countdown.

- [ ] **Step 8: Commit**

```bash
git add client/src/styles/maintenance.css client/src/components/maintenance/MaintenanceBanner.tsx client/src/components/maintenance/MaintenanceScreen.tsx client/src/components/maintenance/MaintenanceGate.tsx client/src/components/maintenance/MaintenanceLayer.tsx client/src/routes.tsx client/src/App.tsx
git commit -m "$(cat <<'EOF'
feat(maintenance): add banners, maintenance screen and route gate

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Resume editor: pause, drafts, export and dashboard clears

**Files:**
- Create: `client/src/components/maintenance/DraftRecoveryDialog.tsx`
- Modify: `client/src/components/editor-chrome/EditorTopBar.tsx`
- Modify: `client/src/pages/Preview.tsx`
- Modify: `client/src/pages/Dashboard.tsx`

**Interfaces:**
- Consumes: Task 4 (`isMaintenanceActive`, `saveDraft`, `readDraft`, `clearDraft`, `shouldOfferDraft`, `clearStorageKeepingDrafts`, `claimSaveLock`, `TAB_ID`), Task 5 (`useMaintenance`, `useOnMaintenanceEnd`, `LiveStatus`), Task 6 (`MaintenanceBanner`).
- Produces:
  - `DraftRecoveryDialog` props `{ open: boolean; noun: 'resume' | 'cover letter'; onKeepLocal: () => void; onUseSaved: () => void }` (default export).
  - `EditorTopBar` gains optional prop `exportHint?: string` (used as the export button's `title`).

- [ ] **Step 1: Write the recovery dialog**

Create `client/src/components/maintenance/DraftRecoveryDialog.tsx`:

```tsx
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogEyebrow, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { popupGhostClasses, popupPrimaryClasses } from '@/styles/popup-classes';

interface DraftRecoveryDialogProps {
  open: boolean;
  noun: 'resume' | 'cover letter';
  onKeepLocal: () => void;
  onUseSaved: () => void;
}

/** Shown when a document opens and this device holds edits that were never saved (kept during maintenance). */
export default function DraftRecoveryDialog({ open, noun, onKeepLocal, onUseSaved }: DraftRecoveryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={() => { /* a choice is required */ }}>
      <DialogContent onEscapeKeyDown={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogEyebrow>Unsaved changes</DialogEyebrow>
          <DialogTitle>Keep the edits from this device?</DialogTitle>
          <DialogDescription>
            We found edits to this {noun} that were never saved, most likely because maintenance started while you were
            working. Keep them, or go back to the version saved on our servers.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button className={popupGhostClasses} onClick={onUseSaved}>
            Use saved version
          </Button>
          <Button className={popupPrimaryClasses} onClick={onKeepLocal}>
            Keep my edits
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Add the export hint to the top bar**

In `client/src/components/editor-chrome/EditorTopBar.tsx`:

(a) In `EditorTopBarProps`, after the line `  canExport: boolean;` add:

```ts
  exportHint?: string;
```

(b) Replace

```ts
  canExport,
}: EditorTopBarProps) {
```

with

```ts
  canExport,
  exportHint,
}: EditorTopBarProps) {
```

(c) Replace `          disabled={exporting || !canExport}` with:

```tsx
          disabled={exporting || !canExport}
          title={exportHint}
```

- [ ] **Step 3: Preview.tsx, imports and state**

In `client/src/pages/Preview.tsx`:

(a) After `import type { SectionTitles } from '@/utils/section-titles';` add:

```ts
import type { LiveStatus } from '@/components/editor-chrome/status';
import MaintenanceBanner from '@/components/maintenance/MaintenanceBanner';
import DraftRecoveryDialog from '@/components/maintenance/DraftRecoveryDialog';
import { useMaintenance, useOnMaintenanceEnd } from '@/maintenance/hooks';
import { isMaintenanceActive } from '@/maintenance/store';
import { clearDraft, clearStorageKeepingDrafts, readDraft, saveDraft, shouldOfferDraft } from '@/maintenance/draft';
import { claimSaveLock, TAB_ID } from '@/maintenance/lock';
```

(b) Replace

```ts
  const [liveStatus, setLiveStatus] = useState<'idle' | 'updating' | 'saved' | 'error'>('idle');
```

with

```ts
  const [liveStatus, setLiveStatus] = useState<LiveStatus>('idle');
  const { status: maintenanceStatus } = useMaintenance();
  const maintenanceActive = maintenanceStatus === 'active';
  const maintenancePendingRef = useRef(false); // an edit is waiting to be saved once maintenance ends
  // set when the opened resume has unsaved edits on this device that differ from the saved copy
  const [draftChoice, setDraftChoice] = useState<{ draft: string; server: string } | null>(null);
```

- [ ] **Step 4: Preview.tsx, load flow with the draft prompt**

Replace the whole `fetchResumeData` function (from `const fetchResumeData = async (ownerId: string) => {` through its closing `};` just before the comment `// The store is empty after a reload`) with:

```ts
  const applyResumeData = (resumeJson: string) => {
    try {
      setIsUpdateMode(true);
      const parsedData: ResumeFormData = JSON.parse(resumeJson);
      // the layout was arranged for another template: carry it over (column <-> single-column rules)
      const initialLayout = parsedData.sectionLayout && parsedData.sectionLayout.template !== activeTemplate
        ? convertLayout(parsedData.sectionLayout, activeTemplate, parsedData)
        : parsedData.sectionLayout;
      sectionLayoutRef.current = initialLayout;
      setSectionLayout(initialLayout);
      fontFamilyRef.current = parsedData.fontFamily;
      setFontFamily(parsedData.fontFamily);
      colorThemeRef.current = parsedData.colorTheme;
      setColorTheme(parsedData.colorTheme);
      sectionTitlesRef.current = parsedData.sectionTitles;
      setSectionTitles(parsedData.sectionTitles);
      setResumeData(parsedData);
      handleFormSubmit(parsedData); // Use parsedData directly!
    } catch (e) {
      // fallback if not JSON
      setIsUpdateMode(true);
      setResumeData(resumeJson as unknown as ResumeFormData);
      handleFormSubmit(resumeJson as unknown as ResumeFormData); // Use the fallback data directly!
    }
  };

  const fetchResumeData = async (ownerId: string) => {
    setResumeLoading(true);
    const resume_id = localStorage.getItem('id'); // resume id
    if (resume_id) {
      const request = await client.get(`/resume/fetch-data/${resume_id}/${ownerId}`);
      localStorage.setItem('resumeFormData', request.data?.resume_data);
      if (request.data?.resume_data) {
        // Edits kept on this device while maintenance blocked saving: ask before they get replaced by the saved copy.
        const draft = readDraft(localStorage, 'resume', resume_id);
        if (draft && shouldOfferDraft(draft.data, request.data.resume_data)) {
          setDraftChoice({ draft: draft.data, server: request.data.resume_data });
          return; // the page stays on the loader until the user chooses
        }
        applyResumeData(request.data.resume_data);
      }
    }
    setResumeLoading(false);
  };

  const resolveDraft = (keepLocal: boolean) => {
    if (!draftChoice) return;
    const chosen = keepLocal ? draftChoice.draft : draftChoice.server;
    localStorage.setItem('resumeFormData', chosen); // the form reads its fields from here
    clearDraft(localStorage, 'resume');
    setDraftChoice(null);
    applyResumeData(chosen); // keeping the draft also saves it to the server
    setResumeLoading(false);
  };
```

- [ ] **Step 5: Preview.tsx, pause at the network edge**

Replace the whole `handleFormSubmit` function (from `  const handleFormSubmit = async (formData: ResumeFormData) => {` through its closing `  }` before `  handleFormSubmitRef.current = handleFormSubmit;`) with:

```ts
  // Maintenance: keep the latest document in memory and on the device, and save it when maintenance ends.
  const pauseForMaintenance = (data: ResumeFormData) => {
    resumeDataRef.current = data;
    maintenancePendingRef.current = true;
    const id = localStorage.getItem('id');
    if (id) saveDraft(localStorage, 'resume', id, JSON.stringify(data));
    setLiveStatus('paused');
  };

  const handleFormSubmit = async (formData: ResumeFormData) => {
    // the layout, section names, font and color theme live outside the form; always attach the current ones (undefined is dropped from the JSON)
    const data: ResumeFormData = { ...formData, sectionLayout: sectionLayoutRef.current, sectionTitles: sectionTitlesRef.current, fontFamily: fontFamilyRef.current, colorTheme: colorThemeRef.current };
    if (isMaintenanceActive()) {
      pauseForMaintenance(data);
      return;
    }
    const requestId = ++requestIdRef.current;
    setLoading(true);
    if (liveEdit) setLiveStatus('updating');
    try {
      resumeDataRef.current = data;
      setResumeData(data);
      await saveResumeData(data);
      clearDraft(localStorage, 'resume'); // saved: nothing is waiting on this device any more
      const htmlContent = renderToString(<ResumePreview data={data} template={template} />);
      const payload = pdfPayload(data, htmlContent, template || 'andromeda');

      const requestData = await formRequest("POST", `/resume/generate`, payload);
      const blob = new Blob([requestData?.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      if (requestId !== requestIdRef.current) { // a newer edit superseded this one
        URL.revokeObjectURL(url);
        return;
      }
      setPdfUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
      if (liveEdit) setLiveStatus('saved');
    } catch (error) {
      if (isMaintenanceActive()) { // the 503 arrived before the next status poll: not an error, keep the edit
        pauseForMaintenance(data);
        return;
      }
      console.error("Error: ", error);
      if (liveEdit) setLiveStatus('error');
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }
```

- [ ] **Step 6: Preview.tsx, save once when maintenance ends**

Directly after the line `  handleFormSubmitRef.current = handleFormSubmit; // always-fresh handle for the debounced layout callback` add:

```ts

  // When maintenance ends, save the kept document once (several tabs on this resume: only one saves).
  useOnMaintenanceEnd(() => {
    if (!maintenancePendingRef.current || !resumeDataRef.current) return;
    if (!claimSaveLock(localStorage, `maintenance-save:resume:${localStorage.getItem('id')}`, TAB_ID, Date.now())) return;
    maintenancePendingRef.current = false;
    void handleFormSubmitRef.current(resumeDataRef.current);
  });
```

- [ ] **Step 7: Preview.tsx, keep the draft on exit, disable export, banner, dialog**

(a) In `redirectResumes`, replace `      localStorage.clear();` with `      clearStorageKeepingDrafts(localStorage);`.

(b) Replace the loader branch

```tsx
    resumeLoading ? (
      <Loader label="Loading your resume..." />
    ) : (
```

with

```tsx
    resumeLoading ? (
      <>
        <Loader label="Loading your resume..." />
        <DraftRecoveryDialog
          open={draftChoice !== null}
          noun="resume"
          onKeepLocal={() => resolveDraft(true)}
          onUseSaved={() => resolveDraft(false)}
        />
      </>
    ) : (
```

(c) Replace

```tsx
      <div className="app-shell h-screen w-full font-app flex flex-col overflow-hidden">
        <EditorTopBar
```

with

```tsx
      <div className="app-shell h-screen w-full font-app flex flex-col overflow-hidden">
        <MaintenanceBanner variant="editor" />
        <EditorTopBar
```

(d) Replace `          canExport={!!pdfUrl}` with:

```tsx
          canExport={!!pdfUrl && !maintenanceActive}
          exportHint={maintenanceActive ? 'Export is paused during maintenance' : undefined}
```

- [ ] **Step 8: Keep drafts when the dashboard clears storage**

In `client/src/pages/Dashboard.tsx`: add `import { clearStorageKeepingDrafts } from '@/maintenance/draft';` with the other imports, and replace the single `    localStorage.clear();` (inside the mount effect, after `setUserId(Cookies.get('user.id') || '');`) with `    clearStorageKeepingDrafts(localStorage);`.

- [ ] **Step 9: Typecheck**

Run: `cd client && npx tsc -p tsconfig.app.json --noEmit`
Expected: no errors in the touched files.

- [ ] **Step 10: Manual check (resume)**

With server and client running, open a resume with saved data and wait for the preview.
1. `bash server/scripts/maintenance.sh on --message "Check"`. Within about 10 seconds the light "Maintenance in progress" bar appears; the editor stays. Type something and pause 3 seconds: no error toast, the status reads "Paused for maintenance", the Export button is disabled with the hint.
2. In DevTools > Application > Local Storage confirm `resumeDraft` holds `{id, data}`.
3. Click Dashboard: the maintenance screen appears; `resumeDraft` is still in Local Storage.
4. `bash server/scripts/maintenance.sh off`, open the same resume from the dashboard: the "Keep the edits from this device?" dialog appears. "Keep my edits" loads your typed text and saves it (status "All changes saved", `resumeDraft` removed). Repeat 1 to 3 and choose "Use saved version": the old text loads and the draft is removed.
5. Edge: with an editor open, start maintenance then end it without leaving the page after a paused edit: one save runs and the status returns to "All changes saved".
6. Edge: start maintenance by `on` and type within the same 10 seconds before the next poll: the first request fails with 503, no error is shown, and the edit is kept (check `resumeDraft`).

- [ ] **Step 11: Commit**

```bash
git add client/src/components/maintenance/DraftRecoveryDialog.tsx client/src/components/editor-chrome/EditorTopBar.tsx client/src/pages/Preview.tsx client/src/pages/Dashboard.tsx
git commit -m "$(cat <<'EOF'
feat(maintenance): pause the resume editor and keep unsaved edits

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: Cover letter editor

**Files:**
- Modify: `client/src/pages/CLPreview.tsx`
- Modify: `client/src/pages/CLDashboard.tsx`

**Interfaces:**
- Consumes: the same modules as Task 7. `DraftRecoveryDialog` is reused with `noun="cover letter"`.

- [ ] **Step 1: CLPreview.tsx, imports and state**

In `client/src/pages/CLPreview.tsx`:

(a) After `import type { SavedFont } from '@/utils/fonts';` add:

```ts
import type { LiveStatus } from '@/components/editor-chrome/status';
import MaintenanceBanner from '@/components/maintenance/MaintenanceBanner';
import DraftRecoveryDialog from '@/components/maintenance/DraftRecoveryDialog';
import { useMaintenance, useOnMaintenanceEnd } from '@/maintenance/hooks';
import { isMaintenanceActive } from '@/maintenance/store';
import { clearDraft, clearStorageKeepingDrafts, readDraft, saveDraft, shouldOfferDraft } from '@/maintenance/draft';
import { claimSaveLock, TAB_ID } from '@/maintenance/lock';
```

(b) Replace

```ts
  const [liveStatus, setLiveStatus] = useState<'idle' | 'updating' | 'saved' | 'error'>('idle');
```

with

```ts
  const [liveStatus, setLiveStatus] = useState<LiveStatus>('idle');
  const { status: maintenanceStatus } = useMaintenance();
  const maintenanceActive = maintenanceStatus === 'active';
  const maintenancePendingRef = useRef(false); // an edit is waiting to be saved once maintenance ends
  // set when the opened cover letter has unsaved edits on this device that differ from the saved copy
  const [draftChoice, setDraftChoice] = useState<{ draft: string; server: string } | null>(null);
```

- [ ] **Step 2: CLPreview.tsx, load flow with the draft prompt**

Replace the whole `fetchCLData` function (from `  const fetchCLData = async () => {` through its closing `  };` before `  useEffect(() => {\n    toast.dismiss();`) with:

```ts
  const applyCLData = (clJson: string) => {
    try {
      setIsUpdateMode(true);
      const parsedData = JSON.parse(clJson);
      fontFamilyRef.current = parsedData.fontFamily;
      setFontFamily(parsedData.fontFamily);
      setCLData(parsedData);
      handleFormSubmit(parsedData);
    } catch (e) {
      setIsUpdateMode(true);
      setCLData(clJson as unknown as CLFormData);
      handleFormSubmit(clJson as unknown as CLFormData);
    }
  };

  const fetchCLData = async () => {
    setCLLoading(true);
    const coverLetterId = localStorage.getItem('cl-id');
    let awaitingChoice = false;
    try {
      const request = await client.get(`/cover-letter/fetch-data/${coverLetterId}/${userId}`)
      localStorage.setItem('clFormData', request.data?.cover_letter_data);
      if (request.data?.cover_letter_data) {
        // Edits kept on this device while maintenance blocked saving: ask before they get replaced by the saved copy.
        const draft = coverLetterId ? readDraft(localStorage, 'cover-letter', coverLetterId) : null;
        if (draft && shouldOfferDraft(draft.data, request.data.cover_letter_data)) {
          setDraftChoice({ draft: draft.data, server: request.data.cover_letter_data });
          awaitingChoice = true; // the page stays on the loader until the user chooses
        } else {
          applyCLData(request.data.cover_letter_data);
        }
      }
    } catch (error) {
      console.error('Error fetching cover letter data:', error);
      toast.error('Failed to load cover letter data');
    } finally {
      if (!awaitingChoice) setCLLoading(false);
    }
  };

  const resolveDraft = (keepLocal: boolean) => {
    if (!draftChoice) return;
    const chosen = keepLocal ? draftChoice.draft : draftChoice.server;
    localStorage.setItem('clFormData', chosen); // the form reads its fields from here
    clearDraft(localStorage, 'cover-letter');
    setDraftChoice(null);
    applyCLData(chosen); // keeping the draft also saves it to the server
    setCLLoading(false);
  };
```

- [ ] **Step 3: CLPreview.tsx, pause at the network edge**

(a) In `saveCLData`, replace

```ts
      localStorage.setItem('clFormData', JSON.stringify(data));
      setCLData(data);
      return true;
    } catch (error) {
      console.error('Error saving cover letter data:', error);
      if (!silent) toast.error('Failed to save cover letter data');
      return false;
    }
```

with

```ts
      localStorage.setItem('clFormData', JSON.stringify(data));
      clearDraft(localStorage, 'cover-letter'); // saved: nothing is waiting on this device any more
      setCLData(data);
      return true;
    } catch (error) {
      if (isMaintenanceActive()) return false; // not an error: handleFormSubmit keeps the edit
      console.error('Error saving cover letter data:', error);
      if (!silent) toast.error('Failed to save cover letter data');
      return false;
    }
```

(b) Replace the head of `handleFormSubmit`:

```ts
  const handleFormSubmit = async (formData: CLFormData) => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    if (liveEdit) setLiveStatus('updating');
    // the font lives outside the form; always attach the current one (undefined is dropped from the JSON)
    const data: CLFormData = { ...formData, fontFamily: fontFamilyRef.current };
    clDataRef.current = data;
    try {
```

with

```ts
  // Maintenance: keep the latest document in memory and on the device, and save it when maintenance ends.
  const pauseForMaintenance = (data: CLFormData) => {
    clDataRef.current = data;
    maintenancePendingRef.current = true;
    const id = localStorage.getItem('cl-id');
    if (id) saveDraft(localStorage, 'cover-letter', id, JSON.stringify(data));
    setLiveStatus('paused');
  };

  const handleFormSubmit = async (formData: CLFormData) => {
    // the font lives outside the form; always attach the current one (undefined is dropped from the JSON)
    const data: CLFormData = { ...formData, fontFamily: fontFamilyRef.current };
    if (isMaintenanceActive()) {
      pauseForMaintenance(data);
      return;
    }
    const requestId = ++requestIdRef.current;
    setLoading(true);
    if (liveEdit) setLiveStatus('updating');
    clDataRef.current = data;
    try {
```

(c) In the same function's `catch`, replace

```ts
    } catch (error) {
      console.error('Error generating cover letter:', error);
```

with

```ts
    } catch (error) {
      if (isMaintenanceActive()) { // the 503 arrived before the next status poll: not an error, keep the edit
        pauseForMaintenance(data);
        return;
      }
      console.error('Error generating cover letter:', error);
```

(d) Directly after `  handleFormSubmitRef.current = handleFormSubmit; // always-fresh handle for the debounced font callback` add:

```ts

  // When maintenance ends, save the kept document once (several tabs on this cover letter: only one saves).
  useOnMaintenanceEnd(() => {
    if (!maintenancePendingRef.current || !clDataRef.current) return;
    if (!claimSaveLock(localStorage, `maintenance-save:cover-letter:${localStorage.getItem('cl-id')}`, TAB_ID, Date.now())) return;
    maintenancePendingRef.current = false;
    void handleFormSubmitRef.current(clDataRef.current);
  });
```

- [ ] **Step 4: CLPreview.tsx, keep the draft on exit, disable export, banner, dialog**

(a) In `redirectDashboard`, replace `      localStorage.clear();` with `      clearStorageKeepingDrafts(localStorage);`.

(b) Replace the loader branch

```tsx
    clLoading ? (
      <Loader label="Loading your cover letter..." />
    ) : (
```

with

```tsx
    clLoading ? (
      <>
        <Loader label="Loading your cover letter..." />
        <DraftRecoveryDialog
          open={draftChoice !== null}
          noun="cover letter"
          onKeepLocal={() => resolveDraft(true)}
          onUseSaved={() => resolveDraft(false)}
        />
      </>
    ) : (
```

(c) Replace

```tsx
      <div className="app-shell h-screen w-full font-app flex flex-col overflow-hidden">
        <EditorTopBar
```

with

```tsx
      <div className="app-shell h-screen w-full font-app flex flex-col overflow-hidden">
        <MaintenanceBanner variant="editor" />
        <EditorTopBar
```

(d) Replace `          canExport={!!pdfUrl}` with:

```tsx
          canExport={!!pdfUrl && !maintenanceActive}
          exportHint={maintenanceActive ? 'Export is paused during maintenance' : undefined}
```

- [ ] **Step 5: CLDashboard.tsx, keep drafts**

In `client/src/pages/CLDashboard.tsx`: add `import { clearStorageKeepingDrafts } from '@/maintenance/draft';` with the other imports, and replace the single `    localStorage.clear();` (inside the mount effect after `setUserId(Cookies.get('user.id') || '');`) with `    clearStorageKeepingDrafts(localStorage);`.

- [ ] **Step 6: Typecheck**

Run: `cd client && npx tsc -p tsconfig.app.json --noEmit`
Expected: no errors in the touched files.

- [ ] **Step 7: Manual check (cover letter)**

Repeat Task 7 Step 10 items 1 to 5 on a cover letter (`/cl-preview`), checking `clDraft` instead of `resumeDraft` and that the dialog says "cover letter".

- [ ] **Step 8: Commit**

```bash
git add client/src/pages/CLPreview.tsx client/src/pages/CLDashboard.tsx
git commit -m "$(cat <<'EOF'
feat(maintenance): pause the cover letter editor and keep unsaved edits

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: Whole-feature check and cleanup

**Files:**
- Delete (temporary tests): every `*.test.ts` created in Tasks 1 to 4.

- [ ] **Step 1: Run every temporary test one last time**

Run: `cd server && npx vitest run src/utils/maintenance.test.ts src/utils/maintenanceStore.test.ts src/routes/maintenance.test.ts` and `cd client && npx vitest run src/maintenance/`
Expected: all PASS.

- [ ] **Step 2: Typecheck and lint both sides**

Run: `cd server && npx tsc --noEmit`, `cd client && npx tsc -p tsconfig.app.json --noEmit` and `cd client && npx eslint src/maintenance src/components/maintenance src/pages/Preview.tsx src/pages/CLPreview.tsx src/routes.tsx src/App.tsx`
Expected: no new errors. Compare any existing warnings against `git stash` before attributing them to this change.

- [ ] **Step 3: End-to-end walk-through**

With server and client running and a signed-in user:
1. `bash server/scripts/maintenance.sh schedule "<ISO about 4 minutes ahead>" --ends "<ISO about 8 minutes ahead>" --message "Walk-through"`. Dark scheduled bar with a live countdown on `/dashboard` and inside both editors. Polling speeds up near the start (watch the Network tab: `/maintenance/status` every ~10 s in the last 2 minutes).
2. Keep a resume open and type just before the start. At the start time the bar turns light (soft lock) without a reload; typing keeps working; export is disabled.
3. In a second tab open `/dashboard`: full-page screen with progress bar. Open `/` : dark "in progress" bar. Open `/ats-scanner`: screen.
4. `bash server/scripts/maintenance.sh off`: both tabs recover within ~10 s; the editor saves once ("All changes saved"); the dashboard returns.
5. Stop the server entirely (simulate it being unreachable) and reload `/dashboard`: the app proceeds with its normal errors; it does not show the maintenance screen (a failed poll never starts maintenance).
6. Restart the server with `MAINTENANCE_ADMIN_TOKEN` unset: `bash server/scripts/maintenance.sh on` fails with 404 and `status` stays `off`.

- [ ] **Step 4: Delete the temporary test files**

```bash
rm server/src/utils/maintenance.test.ts server/src/utils/maintenanceStore.test.ts server/src/routes/maintenance.test.ts
rm client/src/maintenance/timing.test.ts client/src/maintenance/store.test.ts client/src/maintenance/draft.test.ts client/src/maintenance/lock.test.ts
git status --short
```

Expected: `git status` shows no test files and nothing unexpected (`.superpowers/` is gitignored). Mention in the final summary that the tests were written, passed, and were removed per the standing rule.

- [ ] **Step 5: Final review**

Request one review of the whole branch diff (`git diff master...HEAD`) against the spec, with attention to the five Review Focus items.
