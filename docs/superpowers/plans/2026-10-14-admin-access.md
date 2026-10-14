# Admin Access Implementation Plan

> **For agentic workers:** This plan is executed inline with superpowers:executing-plans (the user's standing choice), task by task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let admins run maintenance mode from a web page and keep using the app while everyone else is blocked, with roles that exist only in the database.

**Architecture:** A `role` column (`user` / `admin` / `super_admin`) plus a unique `super_admin_slot` on `users` is the only source of admin status. Pure rule functions decide who may promote or demote whom; a small service applies them inside database transactions. The session and passport move ahead of the maintenance gate so the gate can let admins through, and `PUT /maintenance` accepts either the optional emergency token or an admin session with CSRF. The client learns whether the viewer is an admin with one probe call, treats maintenance as off for admins, and gets a `/admin` page with a status header and two tabs.

**Tech Stack:** Express 5 + Knex + MySQL + passport (server), React 19 + TypeScript + Vite + Tailwind + zustand (client), Vitest (node environment) for unit tests.

**Spec:** [docs/superpowers/specs/2026-10-14-admin-access-design.md](../specs/2026-10-14-admin-access-design.md) (builds on [2026-10-14-maintenance-mode-design.md](../specs/2026-10-14-maintenance-mode-design.md), already implemented on this branch)

## Global Constraints

- **No new dependencies.** No script, endpoint or UI may create the first super admin: the owner runs one SQL statement by hand.
- Roles are exactly `user`, `admin`, `super_admin`. No environment variable grants a role. `MAINTENANCE_ADMIN_TOKEN` stays an optional emergency path (off when unset) and can only start, schedule or end maintenance.
- At most **two** super admins: `super_admin_slot` is 1 or 2, `UNIQUE`, set exactly when `role = 'super_admin'`. The server refuses a third with a clear 409 and the database rejects it too.
- Rules (spec table): Make admin = any admin, target must be role `user`. Remove admin = any admin, target must be role `admin`, never yourself, never a super admin. Make super admin = super admin only, target `user` or `admin`, refused when two exist. Demote super admin = the other super admin only, never yourself, target becomes `admin`.
- Error status codes: unknown email 404, already that role 409, not allowed 403, non-admin or anonymous on `/admin/*` and on `PUT /maintenance` without credentials 404.
- Email lookups ignore letter case (lower-case both sides).
- `GET /admin/me` returns `{ id, role }`. All `/admin/*` routes require an admin session; the two `/admin/super-admins` routes require a super admin (an admin gets 403).
- `GET /maintenance/status` stays ahead of the session. `PUT /maintenance` passes the gate and checks its own credentials; the session path applies the CSRF check, the token path does not.
- A failed user lookup in the session (database down) means "not signed in", never a 500: the gate still answers 503.
- Google sign-in rejects an email that Google explicitly marks unverified.
- Admin page layout: status header with two tabs (Maintenance, Admins with a count). Copy: confirmation text `This blocks every non-admin user now.`; admin bar `Maintenance is on. Only admins can use the app right now.`
- Per the user's standing rules: test files are temporary (create them for TDD, **never `git add` them**, delete them in the last task; stage explicit paths only); commit only to the current branch `feat/maintenance-page`; do **not** push, open a PR or merge; do **not** create a branch; do **not** run migrations or write to the user's database (the user applies the migration by hand).

## Review Focus

1. The emergency token request while maintenance is active must reach `PUT /maintenance` (gate passthrough) and work with no session; a wrong token is 401 and changes nothing (Tasks 3, 4).
2. A failed session lookup (database down) for a request that carries a cookie must produce the 503 from the gate, not a 500; and anonymous or non-admin requests must never pass the gate (Task 3).
3. Two super admins at most, never zero: the rule functions and service refuse a third, refuse self-demotion, and refuse any action by a non-super admin on a super admin; a database duplicate on the slot is reported as a 409, not a 500 (Tasks 1, 2).
4. An admin who is mid-edit when maintenance starts resumes and saves without losing the edit; a non-admin never bypasses; a failed or slow probe leaves the maintenance screen in place; no flash of the maintenance screen for admins on load (Task 5).
5. A non-admin or anonymous caller of `/admin/*` or of `PUT /maintenance` gets 404 and nothing changes; an admin session on `PUT /maintenance` without a valid CSRF token is rejected (Task 4).

---

## File Structure

Server
- Create `server/src/utils/adminRules.ts`: roles, permission decisions, slot helper, email normalisation (pure).
- Create `server/src/services/adminService.ts`: `AdminService`, store interfaces, `SlotTakenError`.
- Create `server/src/models/KnexAdminStore.ts`: the MySQL implementation of the store.
- Create `server/src/db/migrations/20261014120000_add_user_roles.js`.
- Create `server/src/middlewares/adminAuth.ts`: `isAdminRequest`, `requireAdmin`, `requireSuperAdmin`, `lenientSession`.
- Create `server/src/routes/admin.ts`: `createAdminRouter`.
- Create `server/src/utils/emailVerification.ts`: `isExplicitlyUnverified`.
- Modify `server/src/types/interface.user.ts`, `server/src/middlewares/maintenance.ts`, `server/src/routes/maintenance.ts`, `server/src/controllers/auth.ts`, `server/src/index.ts`, `server/README.md`.

Client
- Create `client/src/admin/types.ts`, `client/src/admin/api.ts`, `client/src/admin/form.ts`, `client/src/admin/permissions.ts`.
- Create `client/src/components/admin/ConfirmDialog.tsx`, `StatusHeader.tsx`, `MaintenanceTab.tsx`, `AdminsTab.tsx`.
- Create `client/src/pages/Admin.tsx`, `client/src/styles/admin.css`.
- Modify `client/src/maintenance/timing.ts`, `store.ts`, `hooks.ts`, `api.ts`, `client/src/components/maintenance/MaintenanceGate.tsx`, `MaintenanceBanner.tsx`, `MaintenanceLayer.tsx`, `client/src/styles/maintenance.css`, `client/src/components/LogoutDialog.tsx`, `client/src/routes.tsx`.

---

### Task 1: Admin rules (pure)

**Files:**
- Create: `server/src/utils/adminRules.ts`
- Test (temporary, do not commit): `server/src/utils/adminRules.test.ts`

**Interfaces:**
- Produces:
  - `type Role = 'user' | 'admin' | 'super_admin'`; `const MAX_SUPER_ADMINS = 2`
  - `interface Person { id: string; role: Role }`
  - `type Decision = { ok: true } | { ok: false; status: 403 | 404 | 409; message: string }`
  - `roleOf(user: { role?: unknown } | null | undefined): Role`; `isAdminRole(role: Role): boolean`
  - `normalizeEmail(value: unknown): string | null`; `freeSuperAdminSlot(used: readonly number[]): number | null`
  - `canMakeAdmin(actor: Person, target: Person): Decision`; `canRemoveAdmin(actor: Person, target: Person): Decision`
  - `canMakeSuperAdmin(actor: Person, target: Person, superAdminCount: number): Decision`
  - `canDemoteSuperAdmin(actor: Person, target: Person, superAdminCount: number): Decision`

- [ ] **Step 1: Write the failing test**

Create `server/src/utils/adminRules.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  canDemoteSuperAdmin,
  canMakeAdmin,
  canMakeSuperAdmin,
  canRemoveAdmin,
  freeSuperAdminSlot,
  isAdminRole,
  normalizeEmail,
  roleOf,
  type Person,
} from './adminRules';

const user = (id = 'u'): Person => ({ id, role: 'user' });
const admin = (id = 'a'): Person => ({ id, role: 'admin' });
const sup = (id = 's'): Person => ({ id, role: 'super_admin' });

const status = (d: { ok: boolean; status?: number }) => (d.ok ? 'ok' : d.status);

describe('roleOf / isAdminRole', () => {
  it('reads the role and defaults to user', () => {
    expect(roleOf({ role: 'admin' })).toBe('admin');
    expect(roleOf({ role: 'super_admin' })).toBe('super_admin');
    expect(roleOf({ role: 'owner' })).toBe('user');
    expect(roleOf({})).toBe('user');
    expect(roleOf(null)).toBe('user');
    expect(roleOf(undefined)).toBe('user');
  });
  it('knows which roles are admins', () => {
    expect(isAdminRole('user')).toBe(false);
    expect(isAdminRole('admin')).toBe(true);
    expect(isAdminRole('super_admin')).toBe(true);
  });
});

describe('normalizeEmail', () => {
  it('trims and lower-cases', () => {
    expect(normalizeEmail('  Owner@Example.COM ')).toBe('owner@example.com');
  });
  it('rejects non-strings, empty and oversized values', () => {
    expect(normalizeEmail(undefined)).toBeNull();
    expect(normalizeEmail(42)).toBeNull();
    expect(normalizeEmail('   ')).toBeNull();
    expect(normalizeEmail(`${'a'.repeat(250)}@x.com`)).toBeNull();
  });
});

describe('freeSuperAdminSlot', () => {
  it('returns the lowest free slot of two', () => {
    expect(freeSuperAdminSlot([])).toBe(1);
    expect(freeSuperAdminSlot([1])).toBe(2);
    expect(freeSuperAdminSlot([2])).toBe(1);
  });
  it('returns null when both are taken', () => {
    expect(freeSuperAdminSlot([1, 2])).toBeNull();
  });
});

describe('canMakeAdmin', () => {
  it('lets an admin or super admin promote a plain user', () => {
    expect(status(canMakeAdmin(admin(), user()))).toBe('ok');
    expect(status(canMakeAdmin(sup(), user()))).toBe('ok');
  });
  it('refuses a plain user as actor', () => {
    expect(status(canMakeAdmin(user('x'), user()))).toBe(403);
  });
  it('answers 409 when the target already has admin access', () => {
    expect(status(canMakeAdmin(admin(), admin('b')))).toBe(409);
    expect(status(canMakeAdmin(admin(), sup('t')))).toBe(409);
  });
});

describe('canRemoveAdmin', () => {
  it('lets an admin remove another admin', () => {
    expect(status(canRemoveAdmin(admin('a'), admin('b')))).toBe('ok');
    expect(status(canRemoveAdmin(sup(), admin('b')))).toBe('ok');
  });
  it('never lets you remove yourself', () => {
    expect(status(canRemoveAdmin(admin('a'), admin('a')))).toBe(403);
  });
  it('never lets anyone remove a super admin this way', () => {
    expect(status(canRemoveAdmin(admin(), sup('t')))).toBe(403);
    expect(status(canRemoveAdmin(sup('s1'), sup('s2')))).toBe(403);
  });
  it('answers 404 for someone who is not an admin, 403 for a non-admin actor', () => {
    expect(status(canRemoveAdmin(admin(), user()))).toBe(404);
    expect(status(canRemoveAdmin(user('x'), admin('b')))).toBe(403);
  });
});

describe('canMakeSuperAdmin', () => {
  it('lets a super admin promote an admin or a user while fewer than two exist', () => {
    expect(status(canMakeSuperAdmin(sup(), admin('b'), 1))).toBe('ok');
    expect(status(canMakeSuperAdmin(sup(), user(), 1))).toBe('ok');
  });
  it('refuses an ordinary admin', () => {
    expect(status(canMakeSuperAdmin(admin(), user(), 1))).toBe(403);
  });
  it('refuses a third super admin with 409', () => {
    expect(status(canMakeSuperAdmin(sup('s1'), admin('b'), 2))).toBe(409);
  });
  it('answers 409 when the target already is one', () => {
    expect(status(canMakeSuperAdmin(sup('s1'), sup('s2'), 2))).toBe(409);
  });
});

describe('canDemoteSuperAdmin', () => {
  it('lets one super admin demote the other', () => {
    expect(status(canDemoteSuperAdmin(sup('s1'), sup('s2'), 2))).toBe('ok');
  });
  it('never lets you demote yourself', () => {
    expect(status(canDemoteSuperAdmin(sup('s1'), sup('s1'), 2))).toBe(403);
  });
  it('refuses an ordinary admin as actor', () => {
    expect(status(canDemoteSuperAdmin(admin(), sup('s2'), 2))).toBe(403);
  });
  it('answers 404 when the target is not a super admin', () => {
    expect(status(canDemoteSuperAdmin(sup('s1'), admin('b'), 2))).toBe(404);
  });
  it('never leaves zero super admins', () => {
    expect(status(canDemoteSuperAdmin(sup('s1'), sup('s2'), 1))).toBe(409);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npx vitest run src/utils/adminRules.test.ts`
Expected: FAIL, cannot resolve `./adminRules`.

- [ ] **Step 3: Write the implementation**

Create `server/src/utils/adminRules.ts`:

```ts
export type Role = 'user' | 'admin' | 'super_admin';

export const MAX_SUPER_ADMINS = 2;

export interface Person {
  id: string;
  role: Role;
}

export type Decision = { ok: true } | { ok: false; status: 403 | 404 | 409; message: string };

const allow: Decision = { ok: true };
const deny = (status: 403 | 404 | 409, message: string): Decision => ({ ok: false, status, message });

export const roleOf = (user: { role?: unknown } | null | undefined): Role => {
  const role = user?.role;
  return role === 'admin' || role === 'super_admin' ? role : 'user';
};

export const isAdminRole = (role: Role): boolean => role === 'admin' || role === 'super_admin';

/** Lower-cased, trimmed email, or null when the value is not a usable email string. */
export const normalizeEmail = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  return email && email.length <= 254 ? email : null;
};

/** The lowest super admin slot (1 or 2) that is not in use, or null when both are. */
export const freeSuperAdminSlot = (used: readonly number[]): number | null => {
  for (let slot = 1; slot <= MAX_SUPER_ADMINS; slot += 1) {
    if (!used.includes(slot)) return slot;
  }
  return null;
};

export const canMakeAdmin = (actor: Person, target: Person): Decision => {
  if (!isAdminRole(actor.role)) return deny(403, 'Only admins can do that');
  if (target.role === 'admin') return deny(409, 'That person is already an admin');
  if (target.role === 'super_admin') return deny(409, 'That person is already a super admin');
  return allow;
};

export const canRemoveAdmin = (actor: Person, target: Person): Decision => {
  if (!isAdminRole(actor.role)) return deny(403, 'Only admins can do that');
  if (target.id === actor.id) return deny(403, "You can't remove yourself");
  if (target.role === 'super_admin') return deny(403, 'A super admin can only be demoted by the other super admin');
  if (target.role === 'user') return deny(404, 'That person is not an admin');
  return allow;
};

export const canMakeSuperAdmin = (actor: Person, target: Person, superAdminCount: number): Decision => {
  if (actor.role !== 'super_admin') return deny(403, 'Only a super admin can do that');
  if (target.role === 'super_admin') return deny(409, 'That person is already a super admin');
  if (superAdminCount >= MAX_SUPER_ADMINS) return deny(409, 'There can be at most two super admins. Demote one first.');
  return allow;
};

export const canDemoteSuperAdmin = (actor: Person, target: Person, superAdminCount: number): Decision => {
  if (actor.role !== 'super_admin') return deny(403, 'Only a super admin can do that');
  if (target.id === actor.id) return deny(403, "You can't demote yourself. Ask the other super admin.");
  if (target.role !== 'super_admin') return deny(404, 'That person is not a super admin');
  if (superAdminCount <= 1) return deny(409, 'There must always be at least one super admin');
  return allow;
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd server && npx vitest run src/utils/adminRules.test.ts`
Expected: PASS, all tests.

- [ ] **Step 5: Commit**

```bash
git add server/src/utils/adminRules.ts
git commit -m "$(cat <<'EOF'
feat(admin): add admin role rules

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Migration, admin service and MySQL store

**Files:**
- Create: `server/src/db/migrations/20261014120000_add_user_roles.js`
- Create: `server/src/services/adminService.ts`
- Create: `server/src/models/KnexAdminStore.ts`
- Modify: `server/src/types/interface.user.ts`
- Test (temporary, do not commit): `server/src/services/adminService.test.ts`

**Interfaces:**
- Consumes: Task 1 (`Role`, `Person`, `roleOf`, `normalizeEmail`, `freeSuperAdminSlot`, the four `can*` functions).
- Produces:
  - `interface AdminUser { id: string; email: string; name: string; role: Role }`
  - `interface AdminTx { findByEmail(email: string): Promise<AdminUser | null>; findById(id: string): Promise<AdminUser | null>; superAdminSlots(): Promise<number[]>; setRole(id: string, role: Role, slot: number | null): Promise<void> }`
  - `interface AdminStore { list(): Promise<AdminUser[]>; transaction<T>(work: (tx: AdminTx) => Promise<T>): Promise<T> }`
  - `class SlotTakenError extends Error`
  - `type Result<T> = { ok: true; value: T } | { ok: false; status: number; message: string }`
  - `class AdminService { constructor(store: AdminStore); list(): Promise<AdminUser[]>; makeAdmin(actor: Person, email: unknown): Promise<Result<AdminUser>>; removeAdmin(actor: Person, targetId: string): Promise<Result<AdminUser>>; makeSuperAdmin(actor: Person, email: unknown): Promise<Result<AdminUser>>; demoteSuperAdmin(actor: Person, targetId: string): Promise<Result<AdminUser>> }`
  - `class KnexAdminStore implements AdminStore`

- [ ] **Step 1: Write the failing test**

Create `server/src/services/adminService.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { AdminService, SlotTakenError, type AdminStore, type AdminTx, type AdminUser } from './adminService';
import type { Person } from '../utils/adminRules';

type Row = AdminUser & { slot: number | null };

const strip = ({ slot: _slot, ...user }: Row): AdminUser => user;

class FakeStore implements AdminStore {
  rows: Row[];
  failNextSetRoleWithSlotTaken = false;
  constructor(rows: Row[]) {
    this.rows = rows;
  }
  async list() {
    return this.rows.filter((r) => r.role !== 'user').map(strip);
  }
  async transaction<T>(work: (tx: AdminTx) => Promise<T>): Promise<T> {
    const tx: AdminTx = {
      findByEmail: async (email) => {
        const row = this.rows.find((r) => r.email.toLowerCase() === email);
        return row ? strip(row) : null;
      },
      findById: async (id) => {
        const row = this.rows.find((r) => r.id === id);
        return row ? strip(row) : null;
      },
      superAdminSlots: async () =>
        this.rows.filter((r) => r.role === 'super_admin').map((r) => r.slot).filter((s): s is number => s !== null),
      setRole: async (id, role, slot) => {
        if (this.failNextSetRoleWithSlotTaken) throw new SlotTakenError();
        const row = this.rows.find((r) => r.id === id)!;
        row.role = role;
        row.slot = slot;
      },
    };
    return work(tx);
  }
}

const row = (id: string, role: Row['role'], slot: number | null = null): Row => ({
  id, email: `${id}@x.com`, name: id, role, slot,
});
const person = (r: Row): Person => ({ id: r.id, role: r.role });

const setup = () => {
  const owner = row('owner', 'super_admin', 1);
  const helper = row('helper', 'admin');
  const alice = row('alice', 'user');
  const store = new FakeStore([owner, helper, alice]);
  return { store, service: new AdminService(store), owner, helper, alice };
};

describe('AdminService.list', () => {
  it('lists only admins and super admins', async () => {
    const { service } = setup();
    expect((await service.list()).map((u) => u.id).sort()).toEqual(['helper', 'owner']);
  });
});

describe('makeAdmin', () => {
  it('promotes a user found by email, ignoring case and spaces', async () => {
    const { service, owner, store } = setup();
    const result = await service.makeAdmin(person(owner), '  ALICE@x.com ');
    expect(result).toMatchObject({ ok: true, value: { id: 'alice', role: 'admin' } });
    expect(store.rows.find((r) => r.id === 'alice')!.role).toBe('admin');
  });
  it('answers 404 for an unknown email and 400 for an empty one', async () => {
    const { service, owner } = setup();
    expect(await service.makeAdmin(person(owner), 'nobody@x.com')).toMatchObject({ ok: false, status: 404 });
    expect(await service.makeAdmin(person(owner), '  ')).toMatchObject({ ok: false, status: 400 });
  });
  it('answers 409 for someone who already has admin access', async () => {
    const { service, owner } = setup();
    expect(await service.makeAdmin(person(owner), 'helper@x.com')).toMatchObject({ ok: false, status: 409 });
  });
});

describe('removeAdmin', () => {
  it('turns an admin back into a user', async () => {
    const { service, owner, store } = setup();
    expect(await service.removeAdmin(person(owner), 'helper')).toMatchObject({ ok: true });
    expect(store.rows.find((r) => r.id === 'helper')!.role).toBe('user');
  });
  it('refuses yourself, a super admin, and an unknown id', async () => {
    const { service, owner, helper } = setup();
    expect(await service.removeAdmin(person(helper), 'helper')).toMatchObject({ ok: false, status: 403 });
    expect(await service.removeAdmin(person(helper), 'owner')).toMatchObject({ ok: false, status: 403 });
    expect(await service.removeAdmin(person(owner), 'ghost')).toMatchObject({ ok: false, status: 404 });
  });
});

describe('makeSuperAdmin', () => {
  it('lets a super admin promote an admin into the free slot', async () => {
    const { service, owner, store } = setup();
    expect(await service.makeSuperAdmin(person(owner), 'helper@x.com')).toMatchObject({ ok: true });
    const helper = store.rows.find((r) => r.id === 'helper')!;
    expect([helper.role, helper.slot]).toEqual(['super_admin', 2]);
  });
  it('refuses an ordinary admin as actor', async () => {
    const { service, helper } = setup();
    expect(await service.makeSuperAdmin(person(helper), 'alice@x.com')).toMatchObject({ ok: false, status: 403 });
  });
  it('refuses a third super admin with 409', async () => {
    const { service, owner } = setup();
    await service.makeSuperAdmin(person(owner), 'helper@x.com');
    expect(await service.makeSuperAdmin(person(owner), 'alice@x.com')).toMatchObject({ ok: false, status: 409 });
  });
  it('reports a database slot clash (a concurrent promotion) as 409, not a crash', async () => {
    const { service, owner, store } = setup();
    store.failNextSetRoleWithSlotTaken = true;
    expect(await service.makeSuperAdmin(person(owner), 'helper@x.com')).toMatchObject({ ok: false, status: 409 });
  });
});

describe('demoteSuperAdmin (ownership handover)', () => {
  it('lets the new owner demote the previous one to admin and frees the slot', async () => {
    const { service, owner, store } = setup();
    await service.makeSuperAdmin(person(owner), 'helper@x.com');
    const newOwner = person(store.rows.find((r) => r.id === 'helper')!);
    expect(await service.demoteSuperAdmin(newOwner, 'owner')).toMatchObject({ ok: true });
    const old = store.rows.find((r) => r.id === 'owner')!;
    expect([old.role, old.slot]).toEqual(['admin', null]);
    expect(store.rows.filter((r) => r.role === 'super_admin')).toHaveLength(1);
  });
  it('refuses demoting yourself, and refuses when you are the only super admin', async () => {
    const { service, owner } = setup();
    expect(await service.demoteSuperAdmin(person(owner), 'owner')).toMatchObject({ ok: false, status: 403 });
  });
  it('refuses an ordinary admin as actor', async () => {
    const { service, helper } = setup();
    expect(await service.demoteSuperAdmin(person(helper), 'owner')).toMatchObject({ ok: false, status: 403 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npx vitest run src/services/adminService.test.ts`
Expected: FAIL, cannot resolve `./adminService`.

- [ ] **Step 3: Write the service**

Create `server/src/services/adminService.ts`:

```ts
import {
  canDemoteSuperAdmin,
  canMakeAdmin,
  canMakeSuperAdmin,
  canRemoveAdmin,
  freeSuperAdminSlot,
  normalizeEmail,
  type Person,
  type Role,
} from '../utils/adminRules';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

/** Work done inside one database transaction, with the rows it reads locked. */
export interface AdminTx {
  findByEmail(email: string): Promise<AdminUser | null>; // email already lower-cased
  findById(id: string): Promise<AdminUser | null>;
  superAdminSlots(): Promise<number[]>;
  setRole(id: string, role: Role, slot: number | null): Promise<void>;
}

export interface AdminStore {
  list(): Promise<AdminUser[]>;
  transaction<T>(work: (tx: AdminTx) => Promise<T>): Promise<T>;
}

/** Thrown by a store when a super admin slot is already taken (the database's unique rule). */
export class SlotTakenError extends Error {
  constructor() {
    super('Super admin slot already taken');
  }
}

export type Result<T> = { ok: true; value: T } | { ok: false; status: number; message: string };

const deny = (status: number, message: string) => ({ ok: false as const, status, message });
const granted = (value: AdminUser) => ({ ok: true as const, value });

const NO_SUCH_USER = 'No user with that email has signed in yet';
const NEEDS_EMAIL = 'Enter the email of a user who has signed in';
const SLOT_TAKEN = 'There can be at most two super admins. Demote one first.';

export class AdminService {
  constructor(private readonly store: AdminStore) {}

  list(): Promise<AdminUser[]> {
    return this.store.list();
  }

  async makeAdmin(actor: Person, email: unknown): Promise<Result<AdminUser>> {
    const normalized = normalizeEmail(email);
    if (!normalized) return deny(400, NEEDS_EMAIL);
    return this.run(async (tx) => {
      const target = await tx.findByEmail(normalized);
      if (!target) return deny(404, NO_SUCH_USER);
      const decision = canMakeAdmin(actor, target);
      if (!decision.ok) return deny(decision.status, decision.message);
      await tx.setRole(target.id, 'admin', null);
      return granted({ ...target, role: 'admin' });
    });
  }

  async removeAdmin(actor: Person, targetId: string): Promise<Result<AdminUser>> {
    return this.run(async (tx) => {
      const target = await tx.findById(targetId);
      if (!target) return deny(404, 'That person is not an admin');
      const decision = canRemoveAdmin(actor, target);
      if (!decision.ok) return deny(decision.status, decision.message);
      await tx.setRole(target.id, 'user', null);
      return granted({ ...target, role: 'user' });
    });
  }

  async makeSuperAdmin(actor: Person, email: unknown): Promise<Result<AdminUser>> {
    const normalized = normalizeEmail(email);
    if (!normalized) return deny(400, NEEDS_EMAIL);
    return this.run(async (tx) => {
      const target = await tx.findByEmail(normalized);
      if (!target) return deny(404, NO_SUCH_USER);
      const slots = await tx.superAdminSlots();
      const decision = canMakeSuperAdmin(actor, target, slots.length);
      if (!decision.ok) return deny(decision.status, decision.message);
      const slot = freeSuperAdminSlot(slots);
      if (slot === null) return deny(409, SLOT_TAKEN);
      await tx.setRole(target.id, 'super_admin', slot);
      return granted({ ...target, role: 'super_admin' });
    });
  }

  async demoteSuperAdmin(actor: Person, targetId: string): Promise<Result<AdminUser>> {
    return this.run(async (tx) => {
      const target = await tx.findById(targetId);
      if (!target) return deny(404, 'That person is not a super admin');
      const slots = await tx.superAdminSlots();
      const decision = canDemoteSuperAdmin(actor, target, slots.length);
      if (!decision.ok) return deny(decision.status, decision.message);
      await tx.setRole(target.id, 'admin', null);
      return granted({ ...target, role: 'admin' });
    });
  }

  private async run(work: (tx: AdminTx) => Promise<Result<AdminUser>>): Promise<Result<AdminUser>> {
    try {
      return await this.store.transaction(work);
    } catch (error) {
      if (error instanceof SlotTakenError) return deny(409, SLOT_TAKEN);
      throw error;
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd server && npx vitest run src/services/adminService.test.ts src/utils/adminRules.test.ts`
Expected: PASS.

- [ ] **Step 5: Add the user fields, the MySQL store and the migration**

In `server/src/types/interface.user.ts`, inside `interface User` add after `avatar?: string;`:

```ts
  role?: 'user' | 'admin' | 'super_admin';
  super_admin_slot?: number | null;
```

Create `server/src/models/KnexAdminStore.ts`:

```ts
import type { Knex } from 'knex';
import knex from '../db/knex';
import { roleOf } from '../utils/adminRules';
import { SlotTakenError, type AdminStore, type AdminTx, type AdminUser } from '../services/adminService';

const COLUMNS = ['id', 'email', 'name', 'role'];

const toAdminUser = (row: { id: string; email: string; name: string; role?: unknown }): AdminUser => ({
  id: row.id,
  email: row.email,
  name: row.name,
  role: roleOf(row),
});

const makeTx = (trx: Knex.Transaction): AdminTx => ({
  findByEmail: async (email) => {
    const row = await trx('users').whereRaw('LOWER(email) = ?', [email]).select(COLUMNS).forUpdate().first();
    return row ? toAdminUser(row) : null;
  },
  findById: async (id) => {
    const row = await trx('users').where('id', id).select(COLUMNS).forUpdate().first();
    return row ? toAdminUser(row) : null;
  },
  superAdminSlots: async () => {
    const rows = await trx('users').where('role', 'super_admin').select('super_admin_slot').forUpdate();
    return rows.map((r: { super_admin_slot: number | null }) => r.super_admin_slot).filter((s): s is number => typeof s === 'number');
  },
  setRole: async (id, role, slot) => {
    try {
      await trx('users').where('id', id).update({ role, super_admin_slot: slot, updated_at: new Date() });
    } catch (error) {
      if ((error as { code?: string }).code === 'ER_DUP_ENTRY') throw new SlotTakenError();
      throw error;
    }
  },
});

/** MySQL implementation. The rows it reads are locked until the transaction ends. */
export class KnexAdminStore implements AdminStore {
  async list(): Promise<AdminUser[]> {
    const rows = await knex('users')
      .whereIn('role', ['admin', 'super_admin'])
      .select(COLUMNS)
      .orderByRaw("FIELD(role, 'super_admin', 'admin')")
      .orderBy('email');
    return rows.map(toAdminUser);
  }

  transaction<T>(work: (tx: AdminTx) => Promise<T>): Promise<T> {
    return knex.transaction((trx) => work(makeTx(trx)));
  }
}
```

Create `server/src/db/migrations/20261014120000_add_user_roles.js`:

```js
/**
 * Adds roles to users. The first super admin is set by hand, see server/README.md.
 * `super_admin_slot` (1 or 2, unique) is what limits the system to two super admins at the database level.
 * The CHECK constraints are enforced by MySQL 8.0.16+ and MariaDB 10.2.1+; the unique index works everywhere.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  await knex.schema.alterTable('users', (table) => {
    table.string('role', 20).notNullable().defaultTo('user');
    table.tinyint('super_admin_slot').unsigned().nullable().unique();
  });
  await knex.raw("ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('user', 'admin', 'super_admin'))");
  await knex.raw(
    "ALTER TABLE users ADD CONSTRAINT users_super_admin_slot_check CHECK ((role = 'super_admin' AND super_admin_slot IN (1, 2)) OR (role <> 'super_admin' AND super_admin_slot IS NULL))",
  );
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  for (const name of ['users_super_admin_slot_check', 'users_role_check']) {
    try {
      await knex.raw(`ALTER TABLE users DROP CHECK ${name}`);
    } catch (error) {
      try {
        await knex.raw(`ALTER TABLE users DROP CONSTRAINT ${name}`);
      } catch (ignored) {
        // already gone, or an older server that never stored the constraint
      }
    }
  }
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('super_admin_slot');
    table.dropColumn('role');
  });
};
```

- [ ] **Step 6: Verify the migration SQL without a database, and typecheck**

Run (no connection is made; this only builds the SQL text):

```bash
cd server && node -e "
const knex = require('knex')({ client: 'mysql2' });
const m = require('./src/db/migrations/20261014120000_add_user_roles.js');
const fakeRaw = [];
const spy = Object.create(knex);
spy.schema = { alterTable: (t, cb) => { const b = knex.schema.alterTable(t, cb); console.log(b.toSQL().map(s => s.sql).join('\n')); return Promise.resolve(); } };
spy.raw = (sql) => { console.log(sql); return Promise.resolve(); };
m.up(spy).then(() => process.exit(0));
"
npx tsc --noEmit
```

Expected: the output shows `alter table \`users\` add \`role\` varchar(20) not null default 'user'`, `add \`super_admin_slot\` tinyint unsigned null`, a unique index on `super_admin_slot`, and the two `ADD CONSTRAINT ... CHECK` statements; `tsc` prints no errors. Do **not** run `knex migrate`: the user applies the migration to their database by hand.

- [ ] **Step 7: Commit**

```bash
git add server/src/services/adminService.ts server/src/models/KnexAdminStore.ts server/src/db/migrations/20261014120000_add_user_roles.js server/src/types/interface.user.ts
git commit -m "$(cat <<'EOF'
feat(admin): add roles migration, admin service and MySQL store

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Admin middleware and the admin-aware gate

**Files:**
- Create: `server/src/middlewares/adminAuth.ts`
- Modify: `server/src/middlewares/maintenance.ts`
- Test (temporary, do not commit): `server/src/middlewares/adminAuth.test.ts`, `server/src/middlewares/maintenance.test.ts`

**Interfaces:**
- Consumes: Task 1 (`roleOf`, `isAdminRole`).
- Produces:
  - `isAdminRequest(req: Request): boolean`
  - `requireAdmin: RequestHandler` (404 for non-admins); `requireSuperAdmin: RequestHandler` (403 for non-super admins)
  - `lenientSession(sessionMiddleware: RequestHandler): RequestHandler`
  - `maintenanceGate(store: MaintenanceStore, options?: { isAdmin?: (req: Request) => boolean }): RequestHandler` (the second argument is new and optional)

- [ ] **Step 1: Write the failing tests**

Create `server/src/middlewares/adminAuth.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import type { Request, RequestHandler, Response } from 'express';
import { isAdminRequest, lenientSession, requireAdmin, requireSuperAdmin } from './adminAuth';

const reqWith = (user: unknown, authenticated = true) =>
  ({ user, isAuthenticated: () => authenticated }) as unknown as Request;

const fakeRes = () => {
  const res = { code: 0, body: undefined as unknown } as { code: number; body: unknown; status: (c: number) => typeof res; json: (b: unknown) => typeof res };
  res.status = (c) => { res.code = c; return res; };
  res.json = (b) => { res.body = b; return res; };
  return res;
};

describe('isAdminRequest', () => {
  it('is true for a signed-in admin or super admin only', () => {
    expect(isAdminRequest(reqWith({ role: 'admin' }))).toBe(true);
    expect(isAdminRequest(reqWith({ role: 'super_admin' }))).toBe(true);
    expect(isAdminRequest(reqWith({ role: 'user' }))).toBe(false);
    expect(isAdminRequest(reqWith({}))).toBe(false);
    expect(isAdminRequest(reqWith({ role: 'admin' }, false))).toBe(false);
    expect(isAdminRequest(reqWith(undefined))).toBe(false);
    expect(isAdminRequest({} as Request)).toBe(false); // passport not set up
  });
});

describe('requireAdmin / requireSuperAdmin', () => {
  it('requireAdmin lets admins through and answers 404 to everyone else', () => {
    const next = vi.fn();
    requireAdmin(reqWith({ role: 'admin' }), fakeRes() as unknown as Response, next);
    expect(next).toHaveBeenCalledOnce();

    const res = fakeRes();
    const blocked = vi.fn();
    requireAdmin(reqWith({ role: 'user' }), res as unknown as Response, blocked);
    expect(blocked).not.toHaveBeenCalled();
    expect(res.code).toBe(404);
  });
  it('requireSuperAdmin lets super admins through and answers 403 to admins', () => {
    const next = vi.fn();
    requireSuperAdmin(reqWith({ role: 'super_admin' }), fakeRes() as unknown as Response, next);
    expect(next).toHaveBeenCalledOnce();

    const res = fakeRes();
    const blocked = vi.fn();
    requireSuperAdmin(reqWith({ role: 'admin' }), res as unknown as Response, blocked);
    expect(blocked).not.toHaveBeenCalled();
    expect(res.code).toBe(403);
  });
});

describe('lenientSession', () => {
  it('passes through when the session lookup works', () => {
    const ok: RequestHandler = (_req, _res, next) => next();
    const next = vi.fn();
    lenientSession(ok)({} as Request, {} as Response, next);
    expect(next).toHaveBeenCalledWith();
  });
  it('treats a failed user lookup as "not signed in" instead of an error', () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    const failing: RequestHandler = (_req, _res, next) => next(new Error('database down'));
    const req = { user: { id: 'u1' } } as unknown as Request;
    const next = vi.fn();
    lenientSession(failing)(req, {} as Response, next);
    expect(next).toHaveBeenCalledWith();
    expect(req.user).toBeUndefined();
    errors.mockRestore();
  });
});
```

Create `server/src/middlewares/maintenance.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import type { Server } from 'http';
import type { AddressInfo } from 'net';
import { maintenanceGate } from './maintenance';
import { MaintenanceStore } from '../utils/maintenanceStore';

let server: Server;
let base = '';
const store = new MaintenanceStore();

// A fake "who is asking": the x-test-admin header marks an admin request.
beforeAll(async () => {
  const app = express();
  app.use(maintenanceGate(store, { isAdmin: (req) => req.header('x-test-admin') === '1' }));
  app.get('/other', (_req, res) => res.json({ ok: true }));
  app.put('/maintenance', (_req, res) => res.json({ reached: true }));
  await new Promise<void>((resolve) => { server = app.listen(0, resolve); });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

describe('maintenanceGate with admins', () => {
  it('lets everyone through while maintenance is off', async () => {
    await store.set({ enabled: false, startsAt: null, endsAt: null, message: '' });
    expect((await fetch(`${base}/other`)).status).toBe(200);
  });

  it('while active: blocks anonymous and non-admins, lets admins through', async () => {
    await store.set({ enabled: true, startsAt: Date.now() - 1000, endsAt: null, message: '' });
    const blocked = await fetch(`${base}/other`);
    expect(blocked.status).toBe(503);
    expect(blocked.headers.get('x-maintenance')).toBe('1');
    expect((await fetch(`${base}/other`, { headers: { 'x-test-admin': '0' } })).status).toBe(503);
    expect((await fetch(`${base}/other`, { headers: { 'x-test-admin': '1' } })).status).toBe(200);
  });

  it('while active: PUT /maintenance always reaches its route (it checks its own credentials)', async () => {
    const res = await fetch(`${base}/maintenance`, { method: 'PUT' });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ reached: true });
  });

  it('only the PUT is passed: a GET to /maintenance is still blocked', async () => {
    expect((await fetch(`${base}/maintenance`)).status).toBe(503);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd server && npx vitest run src/middlewares/adminAuth.test.ts src/middlewares/maintenance.test.ts`
Expected: FAIL (`./adminAuth` missing; the gate tests fail because admins and the PUT are still blocked).

- [ ] **Step 3: Write the middleware and update the gate**

Create `server/src/middlewares/adminAuth.ts`:

```ts
import type { Request, RequestHandler } from 'express';
import { isAdminRole, roleOf } from '../utils/adminRules';

/** True for a signed-in admin or super admin. `req.user` is the users row, so it carries `role`. */
export const isAdminRequest = (req: Request): boolean =>
  req.isAuthenticated?.() === true && isAdminRole(roleOf(req.user as { role?: unknown } | undefined));

/** Admins only. Everyone else gets 404, so the admin area's existence is not revealed. */
export const requireAdmin: RequestHandler = (req, res, next) => {
  if (!isAdminRequest(req)) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  next();
};

/** Super admins only. Use after `requireAdmin`. */
export const requireSuperAdmin: RequestHandler = (req, res, next) => {
  if (roleOf(req.user as { role?: unknown } | undefined) !== 'super_admin') {
    res.status(403).json({ error: 'Only a super admin can do that' });
    return;
  }
  next();
};

/**
 * Wraps passport's session middleware: a failed user lookup (for example the database is down) means
 * "not signed in" instead of an error response, so the maintenance gate can still answer 503.
 */
export const lenientSession = (sessionMiddleware: RequestHandler): RequestHandler => (req, res, next) => {
  sessionMiddleware(req, res, (error?: unknown) => {
    if (error) {
      console.error('Session user lookup failed:', (error as Error).message);
      (req as { user?: unknown }).user = undefined;
    }
    next();
  });
};
```

Replace the contents of `server/src/middlewares/maintenance.ts` with:

```ts
import type { Request, RequestHandler } from 'express';
import { retryAfterSeconds } from '../utils/maintenance';
import type { MaintenanceStore } from '../utils/maintenanceStore';

export interface GateOptions {
  /** Admins pass the gate while maintenance is active. */
  isAdmin?: (req: Request) => boolean;
}

/**
 * While maintenance is active, answer every request with 503, except:
 * - admins (they keep using the app, for example to check an upgrade before reopening it);
 * - `PUT /maintenance`, which checks its own credentials (the emergency token has no session).
 * Mount it after the session (so it can see who is asking) and before the CSRF check, so clients see the
 * 503 and not a CSRF 403. `X-Maintenance` lets the client recognise it even when the body is an unparsed
 * blob (PDF requests).
 */
export const maintenanceGate = (store: MaintenanceStore, { isAdmin = () => false }: GateOptions = {}): RequestHandler =>
  (req, res, next) => {
    const snapshot = store.snapshot();
    if (snapshot.status !== 'active') {
      next();
      return;
    }
    if (req.method === 'PUT' && req.path === '/maintenance') {
      next();
      return;
    }
    if (isAdmin(req)) {
      next();
      return;
    }
    res.set('Retry-After', String(retryAfterSeconds(snapshot)));
    res.set('X-Maintenance', '1');
    res.status(503).json({ error: 'maintenance', endsAt: snapshot.endsAt });
  };
```

- [ ] **Step 4: Run tests and typecheck**

Run: `cd server && npx vitest run src/middlewares && npx tsc --noEmit`
Expected: PASS (the two new files), no type errors. (`src/routes/maintenance.ts` still compiles: it does not use the gate.)

- [ ] **Step 5: Commit**

```bash
git add server/src/middlewares/adminAuth.ts server/src/middlewares/maintenance.ts
git commit -m "$(cat <<'EOF'
feat(admin): add admin middleware and let admins pass the gate

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Admin routes, `PUT /maintenance` credentials, Google guard, wiring and docs

**Files:**
- Create: `server/src/routes/admin.ts`
- Create: `server/src/utils/emailVerification.ts`
- Modify: `server/src/routes/maintenance.ts`, `server/src/controllers/auth.ts`, `server/src/index.ts`, `server/README.md`
- Test (temporary, do not commit): `server/src/routes/admin.test.ts`, `server/src/routes/maintenance.test.ts`, `server/src/utils/emailVerification.test.ts`

**Interfaces:**
- Consumes: Tasks 1 to 3.
- Produces:
  - `createAdminRouter(service: AdminService): express.Router`
  - `createMaintenanceStatusRouter(store: MaintenanceStore): express.Router` (public `GET /status`)
  - `createMaintenanceControlRouter(store: MaintenanceStore, options?: { isAdmin?: (req: Request) => boolean; csrf?: RequestHandler }): express.Router` (`PUT /`)
  - `isExplicitlyUnverified(entry: { verified?: unknown } | undefined): boolean`

- [ ] **Step 1: Write the failing tests**

Create `server/src/utils/emailVerification.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { isExplicitlyUnverified } from './emailVerification';

describe('isExplicitlyUnverified', () => {
  it('is true only when the provider says the email is not verified', () => {
    expect(isExplicitlyUnverified({ verified: false })).toBe(true);
    expect(isExplicitlyUnverified({ verified: 'false' })).toBe(true);
  });
  it('is false for verified, missing and unknown values (no current user is locked out)', () => {
    expect(isExplicitlyUnverified({ verified: true })).toBe(false);
    expect(isExplicitlyUnverified({ verified: 'true' })).toBe(false);
    expect(isExplicitlyUnverified({})).toBe(false);
    expect(isExplicitlyUnverified(undefined)).toBe(false);
  });
});
```

Create `server/src/routes/maintenance.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import express from 'express';
import type { Server } from 'http';
import type { AddressInfo } from 'net';
import { createMaintenanceControlRouter, createMaintenanceStatusRouter } from './maintenance';
import { maintenanceGate } from '../middlewares/maintenance';
import { MaintenanceStore } from '../utils/maintenanceStore';

let server: Server;
let base = '';
let store: MaintenanceStore;

const isAdmin = (req: express.Request) => req.header('x-test-admin') === '1';
// Stands in for the CSRF check: passes only when the request carries x-test-csrf: ok.
const csrf: express.RequestHandler = (req, res, next) => {
  if (req.header('x-test-csrf') === 'ok') next();
  else res.status(403).json({ error: 'csrf' });
};

// Same order as src/index.ts: json, public status, (session), gate, control router.
beforeAll(async () => {
  store = new MaintenanceStore();
  const app = express();
  app.use(express.json());
  app.use('/maintenance', createMaintenanceStatusRouter(store));
  app.use(maintenanceGate(store, { isAdmin }));
  app.use('/maintenance', createMaintenanceControlRouter(store, { isAdmin, csrf }));
  app.get('/other', (_req, res) => res.json({ ok: true }));
  await new Promise<void>((resolve) => { server = app.listen(0, resolve); });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

beforeEach(async () => {
  process.env.MAINTENANCE_ADMIN_TOKEN = 'test-token';
  await store.set({ enabled: false, startsAt: null, endsAt: null, message: '' });
});

const put = (body: unknown, headers: Record<string, string> = {}) =>
  fetch(`${base}/maintenance`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
const status = async () => (await (await fetch(`${base}/maintenance/status`)).json()).status;

describe('GET /maintenance/status', () => {
  it('is public, even while maintenance is active', async () => {
    await store.set({ enabled: true, startsAt: Date.now() - 1000, endsAt: null, message: '' });
    expect(await status()).toBe('active');
  });
});

describe('PUT /maintenance with the emergency token', () => {
  it('works with no session, even while maintenance is active', async () => {
    await store.set({ enabled: true, startsAt: Date.now() - 1000, endsAt: null, message: '' });
    expect((await put({ action: 'off' }, { 'x-admin-token': 'test-token' })).status).toBe(200);
    expect(await status()).toBe('off');
  });
  it('rejects a wrong token with 401 and changes nothing', async () => {
    expect((await put({ action: 'on' }, { 'x-admin-token': 'wrong' })).status).toBe(401);
    expect(await status()).toBe('off');
  });
  it('is disabled (404) when MAINTENANCE_ADMIN_TOKEN is unset', async () => {
    delete process.env.MAINTENANCE_ADMIN_TOKEN;
    expect((await put({ action: 'on' }, { 'x-admin-token': 'anything' })).status).toBe(404);
    expect(await status()).toBe('off');
  });
});

describe('PUT /maintenance with an admin session', () => {
  it('works with a valid CSRF token', async () => {
    expect((await put({ action: 'on', message: 'Upgrade' }, { 'x-test-admin': '1', 'x-test-csrf': 'ok' })).status).toBe(200);
    expect(await status()).toBe('active');
  });
  it('is rejected without a valid CSRF token, and changes nothing', async () => {
    expect((await put({ action: 'on' }, { 'x-test-admin': '1' })).status).toBe(403);
    expect(await status()).toBe('off');
  });
  it('rejects an invalid body with 400', async () => {
    const res = await put({ action: 'pause' }, { 'x-test-admin': '1', 'x-test-csrf': 'ok' });
    expect(res.status).toBe(400);
  });
});

describe('PUT /maintenance without credentials', () => {
  it('answers 404 to anonymous and non-admin callers and changes nothing', async () => {
    expect((await put({ action: 'on' })).status).toBe(404);
    expect((await put({ action: 'on' }, { 'x-test-admin': '0', 'x-test-csrf': 'ok' })).status).toBe(404);
    expect(await status()).toBe('off');
  });
});

describe('the gate', () => {
  it('still blocks ordinary routes for non-admins while active, and lets admins in', async () => {
    await store.set({ enabled: true, startsAt: Date.now() - 1000, endsAt: null, message: '' });
    expect((await fetch(`${base}/other`)).status).toBe(503);
    expect((await fetch(`${base}/other`, { headers: { 'x-test-admin': '1' } })).status).toBe(200);
  });
});
```

Create `server/src/routes/admin.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import express from 'express';
import type { Server } from 'http';
import type { AddressInfo } from 'net';
import { createAdminRouter } from './admin';
import { AdminService, type AdminStore, type AdminTx, type AdminUser } from '../services/adminService';

type Row = AdminUser & { slot: number | null };
const strip = ({ slot: _slot, ...u }: Row): AdminUser => u;

let rows: Row[] = [];
const store: AdminStore = {
  list: async () => rows.filter((r) => r.role !== 'user').map(strip),
  transaction: async <T,>(work: (tx: AdminTx) => Promise<T>) =>
    work({
      findByEmail: async (e) => { const r = rows.find((x) => x.email.toLowerCase() === e); return r ? strip(r) : null; },
      findById: async (id) => { const r = rows.find((x) => x.id === id); return r ? strip(r) : null; },
      superAdminSlots: async () => rows.filter((r) => r.role === 'super_admin').map((r) => r.slot!).filter((s) => s !== null),
      setRole: async (id, role, slot) => { const r = rows.find((x) => x.id === id)!; r.role = role; r.slot = slot; },
    }),
};

let server: Server;
let base = '';

// The x-test-user header stands in for the signed-in user row (JSON); no header = anonymous.
beforeAll(async () => {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    const header = req.header('x-test-user');
    (req as unknown as { isAuthenticated: () => boolean }).isAuthenticated = () => !!header;
    if (header) req.user = JSON.parse(header);
    next();
  });
  app.use('/admin', createAdminRouter(new AdminService(store)));
  await new Promise<void>((resolve) => { server = app.listen(0, resolve); });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

beforeEach(() => {
  rows = [
    { id: 'owner', email: 'owner@x.com', name: 'Owner', role: 'super_admin', slot: 1 },
    { id: 'helper', email: 'helper@x.com', name: 'Helper', role: 'admin', slot: null },
    { id: 'alice', email: 'alice@x.com', name: 'Alice', role: 'user', slot: null },
  ];
});

const as = (id: string, role: string) => ({ 'x-test-user': JSON.stringify({ id, role }), 'content-type': 'application/json' });
const call = (method: string, path: string, headers: Record<string, string>, body?: unknown) =>
  fetch(`${base}/admin${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });

describe('access', () => {
  it('answers 404 to anonymous and ordinary users on every admin route', async () => {
    for (const headers of [{}, as('alice', 'user')]) {
      expect((await call('GET', '/me', headers)).status).toBe(404);
      expect((await call('GET', '/admins', headers)).status).toBe(404);
      expect((await call('POST', '/admins', headers, { email: 'alice@x.com' })).status).toBe(404);
      expect((await call('DELETE', '/admins/helper', headers)).status).toBe(404);
      expect((await call('POST', '/super-admins', headers, { email: 'alice@x.com' })).status).toBe(404);
    }
    expect(rows.find((r) => r.id === 'helper')!.role).toBe('admin');
  });
  it('returns the caller id and role from /me', async () => {
    const res = await call('GET', '/me', as('helper', 'admin'));
    expect(await res.json()).toEqual({ id: 'helper', role: 'admin' });
  });
});

describe('managing admins', () => {
  it('lists admins and super admins', async () => {
    const body = await (await call('GET', '/admins', as('helper', 'admin'))).json();
    expect(body.admins.map((a: AdminUser) => a.id)).toEqual(['owner', 'helper']);
  });
  it('lets an admin make and remove an admin', async () => {
    expect((await call('POST', '/admins', as('helper', 'admin'), { email: 'Alice@X.com' })).status).toBe(200);
    expect(rows.find((r) => r.id === 'alice')!.role).toBe('admin');
    expect((await call('DELETE', '/admins/alice', as('helper', 'admin'))).status).toBe(200);
    expect(rows.find((r) => r.id === 'alice')!.role).toBe('user');
  });
  it('returns the rule messages: 404 unknown, 409 already admin, 403 self', async () => {
    const admin = as('helper', 'admin');
    expect((await call('POST', '/admins', admin, { email: 'nobody@x.com' })).status).toBe(404);
    expect((await call('POST', '/admins', admin, { email: 'owner@x.com' })).status).toBe(409);
    const self = await call('DELETE', '/admins/helper', admin);
    expect(self.status).toBe(403);
    expect((await self.json()).error).toMatch(/yourself/);
  });
});

describe('managing super admins', () => {
  it('an ordinary admin gets 403 and nothing changes', async () => {
    expect((await call('POST', '/super-admins', as('helper', 'admin'), { email: 'alice@x.com' })).status).toBe(403);
    expect((await call('DELETE', '/super-admins/owner', as('helper', 'admin'))).status).toBe(403);
    expect(rows.find((r) => r.id === 'owner')!.role).toBe('super_admin');
  });
  it('supports the ownership handover and enforces the cap', async () => {
    const owner = as('owner', 'super_admin');
    expect((await call('POST', '/super-admins', owner, { email: 'helper@x.com' })).status).toBe(200);
    expect((await call('POST', '/super-admins', owner, { email: 'alice@x.com' })).status).toBe(409); // a third
    const newOwner = as('helper', 'super_admin');
    expect((await call('DELETE', '/super-admins/owner', newOwner)).status).toBe(200);
    expect(rows.find((r) => r.id === 'owner')!.role).toBe('admin');
    expect((await call('DELETE', '/super-admins/helper', newOwner)).status).toBe(403); // yourself
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd server && npx vitest run src/routes src/utils/emailVerification.test.ts`
Expected: FAIL (`./admin`, `./emailVerification` missing; `createMaintenanceStatusRouter` / `createMaintenanceControlRouter` not exported).

- [ ] **Step 3: Write the email helper and the admin router**

Create `server/src/utils/emailVerification.ts`:

```ts
/** True only when the provider explicitly says the email is not verified. Missing or unknown means "not flagged". */
export const isExplicitlyUnverified = (entry: { verified?: unknown } | undefined): boolean =>
  entry?.verified === false || entry?.verified === 'false';
```

Create `server/src/routes/admin.ts`:

```ts
import express, { type Request, type Response } from 'express';
import { requireAdmin, requireSuperAdmin } from '../middlewares/adminAuth';
import { roleOf, type Person } from '../utils/adminRules';
import type { AdminService, Result } from '../services/adminService';

const actorOf = (req: Request): Person => {
  const user = req.user as { id: string; role?: unknown };
  return { id: user.id, role: roleOf(user) };
};

const send = <T,>(res: Response, result: Result<T>) => {
  if (result.ok) res.json(result.value);
  else res.status(result.status).json({ error: result.message });
};

export const createAdminRouter = (service: AdminService) => {
  const router = express.Router();
  router.use(requireAdmin);

  router.get('/me', (req, res) => {
    const actor = actorOf(req);
    res.json({ id: actor.id, role: actor.role });
  });

  router.get('/admins', async (_req, res) => {
    res.json({ admins: await service.list() });
  });

  router.post('/admins', async (req, res) => {
    send(res, await service.makeAdmin(actorOf(req), req.body?.email));
  });

  router.delete('/admins/:id', async (req, res) => {
    send(res, await service.removeAdmin(actorOf(req), req.params.id));
  });

  router.post('/super-admins', requireSuperAdmin, async (req, res) => {
    send(res, await service.makeSuperAdmin(actorOf(req), req.body?.email));
  });

  router.delete('/super-admins/:id', requireSuperAdmin, async (req, res) => {
    send(res, await service.demoteSuperAdmin(actorOf(req), req.params.id));
  });

  return router;
};
```

- [ ] **Step 4: Split the maintenance router**

Replace the contents of `server/src/routes/maintenance.ts` with:

```ts
import express, { type Request, type RequestHandler } from 'express';
import { isValidAdminToken, parseUpdate } from '../utils/maintenance';
import type { MaintenanceStore } from '../utils/maintenanceStore';

/** Public status. Mount it ahead of the session so polling never touches the database. */
export const createMaintenanceStatusRouter = (store: MaintenanceStore) => {
  const router = express.Router();
  router.get('/status', (_req, res) => {
    res.set('Cache-Control', 'no-store');
    res.json(store.snapshot());
  });
  return router;
};

export interface ControlOptions {
  isAdmin?: (req: Request) => boolean;
  /** The CSRF check, applied only on the admin-session path. */
  csrf?: RequestHandler;
}

/**
 * `PUT /maintenance`. Two ways in:
 * - the optional emergency token header (no cookie, so no CSRF);
 * - an admin session, which must pass the CSRF check.
 * Anyone else gets 404 so the route's existence is not revealed.
 */
export const createMaintenanceControlRouter = (
  store: MaintenanceStore,
  { isAdmin = () => false, csrf = (_req, _res, next) => next() }: ControlOptions = {},
) => {
  const router = express.Router();

  const authorize: RequestHandler = (req, res, next) => {
    const header = req.header('x-admin-token');
    if (header !== undefined) {
      const expected = process.env.MAINTENANCE_ADMIN_TOKEN;
      if (!expected) {
        res.status(404).json({ error: 'Not found' }); // emergency path switched off
        return;
      }
      if (!isValidAdminToken(header, expected)) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      next();
      return;
    }
    if (isAdmin(req)) {
      csrf(req, res, next);
      return;
    }
    res.status(404).json({ error: 'Not found' });
  };

  router.put('/', authorize, async (req, res) => {
    const parsed = parseUpdate(req.body, Date.now());
    if (!parsed.ok) {
      res.status(400).json({ error: parsed.error });
      return;
    }
    await store.set(parsed.state);
    res.json(store.snapshot());
  });

  return router;
};
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd server && npx vitest run`
Expected: PASS for every server test file present (the old maintenance, store and rules tests were deleted earlier; the new ones from Tasks 1 to 4 run).

- [ ] **Step 6: Google guard**

In `server/src/controllers/auth.ts`:

(a) Add to the imports (next to the other `../utils/...` imports):

```ts
import { isExplicitlyUnverified } from '../utils/emailVerification';
```

(b) In the Google strategy callback, replace

```ts
  try {
    // Check if user already exists by email
    let user = await userModel.findByEmail(profile?.emails ? profile?.emails[0]?.value : '');
```

with

```ts
  try {
    // An email Google marks as unverified must not be linked to an existing account or create one.
    if (isExplicitlyUnverified(profile?.emails?.[0])) {
      return done(new Error('Google email is not verified'), false);
    }
    // Check if user already exists by email
    let user = await userModel.findByEmail(profile?.emails ? profile?.emails[0]?.value : '');
```

- [ ] **Step 7: Wire it into the server**

Read `server/src/index.ts`, then apply these edits:

(a) After the line `import { maintenanceGate } from './middlewares/maintenance';` add:

```ts
import { createAdminRouter } from './routes/admin';
import { AdminService } from './services/adminService';
import { KnexAdminStore } from './models/KnexAdminStore';
import { isAdminRequest, lenientSession } from './middlewares/adminAuth';
```

and change `import { createMaintenanceRouter } from './routes/maintenance';` to:

```ts
import { createMaintenanceControlRouter, createMaintenanceStatusRouter } from './routes/maintenance';
```

(b) After `const maintenanceStore = createMaintenanceStore();` add:

```ts
const adminService = new AdminService(new KnexAdminStore());
```

(c) Replace

```ts
// Maintenance: the router stays reachable, then the gate answers 503 to everything else while active.
// Both must come before the session and CSRF middleware below.
app.use('/maintenance', createMaintenanceRouter(maintenanceStore));
app.use(maintenanceGate(maintenanceStore));
```

with

```ts
// Public maintenance status first: it stays ahead of the session so polling never touches the database.
app.use('/maintenance', createMaintenanceStatusRouter(maintenanceStore));
```

(d) Replace

```ts
app.use(passport.session());

app.use(csrfProtection);
```

with

```ts
// A failed user lookup (database down) counts as "not signed in", so the gate below can still answer 503.
app.use(lenientSession(passport.session() as RequestHandler));

// Maintenance gate: admins pass, everyone else gets 503. It sits after the session (to see who is asking)
// and before the CSRF check (so clients see the 503, not a CSRF 403).
app.use(maintenanceGate(maintenanceStore, { isAdmin: isAdminRequest }));
// PUT /maintenance checks its own credentials (emergency token, or admin session + CSRF), so it sits
// before the global CSRF check.
app.use('/maintenance', createMaintenanceControlRouter(maintenanceStore, { isAdmin: isAdminRequest, csrf: csrfProtection }));

app.use(csrfProtection);
```

(e) Change the first import line `import express, { Request, Response, NextFunction } from "express";` to:

```ts
import express, { Request, Response, NextFunction, RequestHandler } from "express";
```

(f) After `app.use('/ats', atsRouter);` add:

```ts
app.use('/admin', createAdminRouter(adminService));
```

- [ ] **Step 8: Typecheck and rerun everything**

Run: `cd server && npx tsc --noEmit && npx vitest run`
Expected: no type errors; all server tests PASS.

- [ ] **Step 9: Document it**

Append to `server/README.md` (after the existing "Maintenance mode" section):

````markdown
## Admin access

Admins sign in the normal way (Google, GitHub or LinkedIn); admin status lives only in the `users` table (`role` = `user`, `admin` or `super_admin`). No environment variable can grant it.

1. Apply the migration: `npm run migrate` (it adds `role` and `super_admin_slot` to `users`).
2. Sign in once with the owner's account so a `users` row exists, then make that account the first super admin by hand:

```sql
UPDATE users SET role = 'super_admin', super_admin_slot = 1 WHERE email = 'owner@example.com';
```

3. Open `/admin` on the site. From there super admins and admins manage maintenance, and admins are added and removed. There can be at most two super admins (a database rule): to hand over ownership, make the new owner a super admin, then have them demote you. The same SQL statement repairs the system if the database ever has no super admin.

While maintenance is on, admins can use the whole app and everyone else is blocked. `PUT /maintenance` also still accepts the optional emergency `MAINTENANCE_ADMIN_TOKEN` (see above), which is the way back in if the database is down and nobody can sign in.
````

- [ ] **Step 10: Commit**

```bash
git add server/src/routes/admin.ts server/src/routes/maintenance.ts server/src/utils/emailVerification.ts server/src/controllers/auth.ts server/src/index.ts server/README.md
git commit -m "$(cat <<'EOF'
feat(admin): add admin routes, admin session for maintenance and Google guard

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Client: admin-aware maintenance state

**Files:**
- Modify: `client/src/maintenance/timing.ts`, `client/src/maintenance/store.ts`, `client/src/maintenance/hooks.ts`, `client/src/maintenance/api.ts`
- Modify: `client/src/components/maintenance/MaintenanceGate.tsx`, `MaintenanceBanner.tsx`, `MaintenanceLayer.tsx`, `client/src/styles/maintenance.css`, `client/src/components/LogoutDialog.tsx`
- Test (temporary, do not commit): `client/src/maintenance/admin-status.test.ts`

**Interfaces:**
- Consumes: the existing maintenance modules.
- Produces:
  - `timing.ts`: `rawStatus(snapshot, forcedActive, serverNow): MaintenanceStatus` (what the server says); `effectiveStatus(snapshot, forcedActive, serverNow, viewerIsAdmin = false): MaintenanceStatus` (becomes `'off'` for an admin while active)
  - `store.ts`: state `viewerIsAdmin: boolean`, `adminChecked: boolean`; actions `setViewerAdmin(isAdmin: boolean)`, `resetAdmin()`; `setSnapshot` resets both when the new snapshot is not active; `isMaintenanceActive()` is admin-aware
  - `api.ts`: `probeAdmin(): Promise<boolean>`
  - `hooks.ts`: `useMaintenance(tick?)` now also returns `rawStatus` and `adminBypass`; `status` is admin-aware; new `useAdminProbe(): void`

- [ ] **Step 1: Write the failing test**

Create `client/src/maintenance/admin-status.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { effectiveStatus, rawStatus } from './timing';
import { isMaintenanceActive, useMaintenanceStore } from './store';
import type { MaintenanceSnapshot } from './types';

const NOW = Date.UTC(2026, 9, 20, 12, 0, 0);
const snap = (over: Partial<MaintenanceSnapshot> = {}): MaintenanceSnapshot => ({
  status: 'off', startsAt: null, endsAt: null, message: '', serverTime: NOW, ...over,
});
const active = snap({ status: 'active', startsAt: NOW - 1000 });

describe('rawStatus / effectiveStatus for admins', () => {
  it('rawStatus is what the server says', () => {
    expect(rawStatus(active, false, NOW)).toBe('active');
    expect(rawStatus(null, true, NOW)).toBe('active');
    expect(rawStatus(snap(), false, NOW)).toBe('off');
  });
  it('an admin sees maintenance as off while the server says active', () => {
    expect(effectiveStatus(active, false, NOW, true)).toBe('off');
    expect(effectiveStatus(null, true, NOW, true)).toBe('off');
  });
  it('a non-admin (the default) still sees it active', () => {
    expect(effectiveStatus(active, false, NOW)).toBe('active');
    expect(effectiveStatus(active, false, NOW, false)).toBe('active');
  });
  it('an admin still sees "scheduled" as scheduled (nothing is blocked yet)', () => {
    const scheduled = snap({ status: 'scheduled', startsAt: NOW + 60_000 });
    expect(effectiveStatus(scheduled, false, NOW, true)).toBe('scheduled');
  });
});

describe('the store and the admin flag', () => {
  beforeEach(() =>
    useMaintenanceStore.setState({
      snapshot: null, offsetMs: 0, forcedActive: false, checked: false, viewerIsAdmin: false, adminChecked: false,
    }),
  );

  it('starts with the admin check pending', () => {
    const s = useMaintenanceStore.getState();
    expect([s.viewerIsAdmin, s.adminChecked]).toEqual([false, false]);
  });
  it('an admin viewer is not blocked: isMaintenanceActive is false even though the server says active', () => {
    useMaintenanceStore.getState().setSnapshot({ ...active, serverTime: Date.now() }, Date.now());
    expect(isMaintenanceActive()).toBe(true);
    useMaintenanceStore.getState().setViewerAdmin(true);
    expect(isMaintenanceActive()).toBe(false);
    expect(useMaintenanceStore.getState().adminChecked).toBe(true);
  });
  it('a non-admin probe result keeps maintenance active but marks the check done', () => {
    useMaintenanceStore.getState().setSnapshot({ ...active, serverTime: Date.now() }, Date.now());
    useMaintenanceStore.getState().setViewerAdmin(false);
    expect(isMaintenanceActive()).toBe(true);
    expect(useMaintenanceStore.getState().adminChecked).toBe(true);
  });
  it('the admin flag resets when a poll says maintenance is no longer active', () => {
    useMaintenanceStore.getState().setSnapshot({ ...active, serverTime: Date.now() }, Date.now());
    useMaintenanceStore.getState().setViewerAdmin(true);
    useMaintenanceStore.getState().setSnapshot(snap({ serverTime: Date.now() }), Date.now());
    const s = useMaintenanceStore.getState();
    expect([s.viewerIsAdmin, s.adminChecked]).toEqual([false, false]);
  });
  it('the admin flag survives another poll that still says active', () => {
    useMaintenanceStore.getState().setSnapshot({ ...active, serverTime: Date.now() }, Date.now());
    useMaintenanceStore.getState().setViewerAdmin(true);
    useMaintenanceStore.getState().setSnapshot({ ...active, serverTime: Date.now() }, Date.now());
    expect(useMaintenanceStore.getState().viewerIsAdmin).toBe(true);
  });
  it('resetAdmin clears both flags (sign-out)', () => {
    useMaintenanceStore.getState().setViewerAdmin(true);
    useMaintenanceStore.getState().resetAdmin();
    const s = useMaintenanceStore.getState();
    expect([s.viewerIsAdmin, s.adminChecked]).toEqual([false, false]);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd client && npx vitest run src/maintenance/admin-status.test.ts`
Expected: FAIL (`rawStatus` is not exported, `setViewerAdmin` is not a function).

- [ ] **Step 3: Update `timing.ts` and `store.ts`**

In `client/src/maintenance/timing.ts` replace the `effectiveStatus` function (the comment block above it stays) with:

```ts
/** What the server says right now, ignoring who is asking. */
export const rawStatus = (
  snapshot: MaintenanceSnapshot | null,
  forcedActive: boolean,
  serverNow: number,
): MaintenanceStatus => {
  if (forcedActive) return 'active';
  if (!snapshot || snapshot.status === 'off') return 'off';
  if (snapshot.status === 'active') return 'active';
  return snapshot.startsAt !== null && serverNow >= snapshot.startsAt ? 'active' : 'scheduled';
};

/** What this viewer should treat the state as: an admin is not blocked, so for them "active" means "off". */
export const effectiveStatus = (
  snapshot: MaintenanceSnapshot | null,
  forcedActive: boolean,
  serverNow: number,
  viewerIsAdmin = false,
): MaintenanceStatus => {
  const status = rawStatus(snapshot, forcedActive, serverNow);
  return status === 'active' && viewerIsAdmin ? 'off' : status;
};
```

Replace the contents of `client/src/maintenance/store.ts` with:

```ts
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd client && npx vitest run src/maintenance/admin-status.test.ts`
Expected: PASS.

- [ ] **Step 5: Probe API, hooks**

Append to `client/src/maintenance/api.ts`:

```ts

/**
 * Asks the server whether the signed-in viewer is an admin. During maintenance only an admin gets an answer
 * (everyone else gets the 503), so any failure means "not an admin".
 */
export const probeAdmin = async (): Promise<boolean> => {
  try {
    const response = await client.get('/admin/me', { timeout: 8000 });
    const role = response.data?.role;
    return role === 'admin' || role === 'super_admin';
  } catch {
    return false;
  }
};
```

In `client/src/maintenance/hooks.ts`:

(a) Replace `import { fetchMaintenanceStatus } from './api';` with `import { fetchMaintenanceStatus, probeAdmin } from './api';` and `import { effectiveStatus, pollIntervalMs } from './timing';` with `import { effectiveStatus, pollIntervalMs, rawStatus } from './timing';`. Add `import { isSignedIn } from '@/components/not-found/actions';` below them.

(b) In `useMaintenance`, after the line `const forced = useMaintenanceStore((s) => s.forcedActive);` add:

```ts
  const viewerIsAdmin = useMaintenanceStore((s) => s.viewerIsAdmin);
```

(c) Replace the `return {` block of `useMaintenance` (from `  return {` to its closing `  };`) with:

```ts
  const raw = rawStatus(snapshot, forced, serverNow);
  const adminBypass = raw === 'active' && viewerIsAdmin;
  return {
    status: adminBypass ? ('off' as const) : raw,
    rawStatus: raw,
    adminBypass,
    startsAt: snapshot?.startsAt ?? null,
    endsAt: snapshot?.endsAt ?? null,
    message: snapshot?.message ?? '',
    serverNow,
  };
```

(d) Append at the end of the file:

```ts

/**
 * While maintenance is active and the viewer is signed in, ask once whether they are an admin. An admin is
 * then not blocked (their effective status becomes "off"); anyone else keeps the maintenance screen.
 */
export function useAdminProbe(): void {
  const { rawStatus: raw } = useMaintenance(false);
  const adminChecked = useMaintenanceStore((s) => s.adminChecked);

  useEffect(() => {
    if (raw !== 'active' || adminChecked || !isSignedIn()) return;
    let cancelled = false;
    void probeAdmin().then((isAdmin) => {
      if (!cancelled) useMaintenanceStore.getState().setViewerAdmin(isAdmin);
    });
    return () => {
      cancelled = true;
    };
  }, [raw, adminChecked]);
}
```

- [ ] **Step 6: Gate, banner, layer, styles, logout**

Replace the contents of `client/src/components/maintenance/MaintenanceGate.tsx` with:

```tsx
import { useRef, type ReactNode } from 'react';
import Loader from '@/components/SuspenseLoader';
import { isSignedIn } from '@/components/not-found/actions';
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
  const adminChecked = useMaintenanceStore((s) => s.adminChecked);
  const { status, rawStatus } = useMaintenance();
  const activeAtMount = useRef<boolean | null>(null);

  // Wait for the first status check, otherwise a page could mount and fetch just as maintenance is on.
  if (!checked) return <Loader label="Loading" />;

  // While maintenance is on and the viewer is signed in, wait for the admin check so an admin never sees a
  // flash of the maintenance screen. An editor that is already open (soft lock) is never unmounted for this.
  const waitingForAdminCheck = rawStatus === 'active' && !adminChecked && isSignedIn();
  if (softLock) {
    if (activeAtMount.current === null) {
      if (waitingForAdminCheck) return <Loader label="Loading" />;
      activeAtMount.current = status === 'active';
    }
  } else if (waitingForAdminCheck) {
    return <Loader label="Loading" />;
  }

  const block = softLock ? activeAtMount.current && status === 'active' : status === 'active';
  return block ? <MaintenanceScreen /> : <>{children}</>;
}
```

Replace the contents of `client/src/components/maintenance/MaintenanceBanner.tsx` with:

```tsx
import { Link } from 'react-router-dom';
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
  const { status, adminBypass, startsAt, endsAt, serverNow } = useMaintenance();

  if (adminBypass) {
    return (
      <div className="mt-bar mt-bar--dark" role="status">
        <span>
          <b>Maintenance is on.</b> Only admins can use the app right now.
        </span>
        <Link to="/admin" className="mt-bar__link">Open admin page</Link>
      </div>
    );
  }

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

Replace the contents of `client/src/components/maintenance/MaintenanceLayer.tsx` with:

```tsx
import { useLocation } from 'react-router-dom';
import { useAdminProbe, useMaintenancePolling } from '@/maintenance/hooks';
import MaintenanceBanner from './MaintenanceBanner';

// The editors render their own banner inside the page, so the root bar stays out of their way.
const EDITOR_PATHS = ['/preview', '/cl-preview'];
// The admin page shows the maintenance state itself.
const ADMIN_PATH = '/admin';
// Pages that stay up during maintenance: the "in progress" bar explains why sign-in does not work.
const PUBLIC_PATHS = ['/', '/terms-of-service', '/privacy-policy'];

/** Mount once inside the router: runs the status polling and the admin probe, and shows the root banner. */
export default function MaintenanceLayer() {
  useMaintenancePolling();
  useAdminProbe();
  const { pathname } = useLocation();
  if (EDITOR_PATHS.includes(pathname) || pathname === ADMIN_PATH) return null;
  return <MaintenanceBanner variant="page" showActive={PUBLIC_PATHS.includes(pathname)} />;
}
```

Append to `client/src/styles/maintenance.css`:

```css
.mt-bar__link { color: inherit; text-decoration: underline; text-underline-offset: 2px; white-space: nowrap; }
```

In `client/src/components/LogoutDialog.tsx`, read the file; add `import { useMaintenanceStore } from '@/maintenance/store';` with the other imports, and directly before the existing `localStorage.clear();` line add:

```ts
    useMaintenanceStore.getState().resetAdmin();
```

- [ ] **Step 7: Run tests and typecheck**

Run: `cd client && npx tsc -p tsconfig.app.json --noEmit && npx vitest run src/maintenance`
Expected: no type errors; PASS. (Other pages that call `useMaintenance()` read only `status`, so the wider return value changes nothing for them.)

- [ ] **Step 8: Commit**

```bash
git add client/src/maintenance/timing.ts client/src/maintenance/store.ts client/src/maintenance/hooks.ts client/src/maintenance/api.ts client/src/components/maintenance/MaintenanceGate.tsx client/src/components/maintenance/MaintenanceBanner.tsx client/src/components/maintenance/MaintenanceLayer.tsx client/src/styles/maintenance.css client/src/components/LogoutDialog.tsx
git commit -m "$(cat <<'EOF'
feat(admin): let admins bypass the maintenance screen on the client

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Client: admin API and pure helpers

**Files:**
- Create: `client/src/admin/types.ts`, `client/src/admin/api.ts`, `client/src/admin/form.ts`, `client/src/admin/permissions.ts`
- Test (temporary, do not commit): `client/src/admin/form.test.ts`, `client/src/admin/permissions.test.ts`

**Interfaces:**
- Produces:
  - `types.ts`: `AdminRole = 'admin' | 'super_admin'`; `AdminRow { id; email; name; role: AdminRole }`; `AdminMe { id; role: AdminRole }`
  - `form.ts`: `MESSAGE_MAX`; `MaintenanceForm { mode: 'now' | 'schedule'; message: string; startsAt: string; endsAt: string }`; `emptyForm`; `MaintenancePayload { action: 'on' | 'off' | 'schedule'; startsAt?: string; endsAt?: string; message?: string }`; `FormErrors { message?; startsAt?; endsAt? }`; `buildPayload(form, now): { ok: true; body: MaintenancePayload } | { ok: false; errors: FormErrors }`
  - `permissions.ts`: `RowAction = 'remove' | 'makeSuper' | 'demote'`; `MAX_SUPER_ADMINS`; `rowActions(me: AdminMe, row: AdminRow, rows: AdminRow[]): RowAction[]`
  - `api.ts`: `loadAdminMe(): Promise<AdminMeResult>`; `errorMessage(error, fallback?)`; `fetchAdmins()`; `makeAdmin(email)`; `removeAdmin(id)`; `makeSuperAdmin(email)`; `demoteSuperAdmin(id)`; `sendMaintenance(body): Promise<MaintenanceSnapshot | null>`

- [ ] **Step 1: Types**

Create `client/src/admin/types.ts`:

```ts
export type AdminRole = 'admin' | 'super_admin';

export interface AdminRow {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
}

export interface AdminMe {
  id: string;
  role: AdminRole;
}
```

- [ ] **Step 2: Write the failing tests**

Create `client/src/admin/form.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { MESSAGE_MAX, buildPayload, emptyForm, type MaintenanceForm } from './form';

const NOW = new Date('2026-10-20T10:00').getTime(); // local time, like the inputs
const form = (over: Partial<MaintenanceForm>): MaintenanceForm => ({ ...emptyForm, ...over });

describe('buildPayload: start now', () => {
  it('needs nothing else', () => {
    expect(buildPayload(form({}), NOW)).toEqual({ ok: true, body: { action: 'on' } });
  });
  it('trims the message and sends an optional end as an ISO date', () => {
    const result = buildPayload(form({ message: '  Upgrade  ', endsAt: '2026-10-20T12:00' }), NOW);
    expect(result).toEqual({
      ok: true,
      body: { action: 'on', message: 'Upgrade', endsAt: new Date('2026-10-20T12:00').toISOString() },
    });
  });
  it('rejects an end that is not after now', () => {
    const result = buildPayload(form({ endsAt: '2026-10-20T09:00' }), NOW);
    expect(result).toMatchObject({ ok: false, errors: { endsAt: expect.stringMatching(/after/i) } });
  });
});

describe('buildPayload: schedule', () => {
  it('sends the start and end as ISO dates', () => {
    const result = buildPayload(form({ mode: 'schedule', startsAt: '2026-10-21T15:00', endsAt: '2026-10-21T16:00' }), NOW);
    expect(result).toEqual({
      ok: true,
      body: {
        action: 'schedule',
        startsAt: new Date('2026-10-21T15:00').toISOString(),
        endsAt: new Date('2026-10-21T16:00').toISOString(),
      },
    });
  });
  it('needs a start in the future', () => {
    expect(buildPayload(form({ mode: 'schedule' }), NOW)).toMatchObject({ ok: false, errors: { startsAt: expect.any(String) } });
    expect(buildPayload(form({ mode: 'schedule', startsAt: '2026-10-20T09:00' }), NOW)).toMatchObject({
      ok: false,
      errors: { startsAt: expect.stringMatching(/future/i) },
    });
  });
  it('rejects an end that is not after the start', () => {
    const result = buildPayload(form({ mode: 'schedule', startsAt: '2026-10-21T15:00', endsAt: '2026-10-21T14:00' }), NOW);
    expect(result).toMatchObject({ ok: false, errors: { endsAt: expect.stringMatching(/after/i) } });
  });
});

describe('buildPayload: message and bad dates', () => {
  it('rejects an over-long message', () => {
    const result = buildPayload(form({ message: 'x'.repeat(MESSAGE_MAX + 1) }), NOW);
    expect(result).toMatchObject({ ok: false, errors: { message: expect.any(String) } });
  });
  it('accepts a message of exactly the maximum length', () => {
    expect(buildPayload(form({ message: 'x'.repeat(MESSAGE_MAX) }), NOW).ok).toBe(true);
  });
  it('rejects an unparseable end', () => {
    expect(buildPayload(form({ endsAt: 'not a date' }), NOW)).toMatchObject({ ok: false, errors: { endsAt: expect.any(String) } });
  });
  it('reports several errors at once', () => {
    const result = buildPayload(form({ mode: 'schedule', message: 'x'.repeat(MESSAGE_MAX + 1) }), NOW);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(Object.keys(result.errors).sort()).toEqual(['message', 'startsAt']);
  });
});
```

Create `client/src/admin/permissions.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { rowActions } from './permissions';
import type { AdminMe, AdminRow } from './types';

const row = (id: string, role: AdminRow['role']): AdminRow => ({ id, email: `${id}@x.com`, name: id, role });
const meSuper: AdminMe = { id: 's1', role: 'super_admin' };
const meAdmin: AdminMe = { id: 'a1', role: 'admin' };

describe('rowActions', () => {
  it('offers nothing on your own row', () => {
    const rows = [row('s1', 'super_admin')];
    expect(rowActions(meSuper, rows[0], rows)).toEqual([]);
  });
  it('an admin can only remove other admins, and has nothing for super admins', () => {
    const rows = [row('s1', 'super_admin'), row('a1', 'admin'), row('a2', 'admin')];
    expect(rowActions(meAdmin, rows[2], rows)).toEqual(['remove']);
    expect(rowActions(meAdmin, rows[0], rows)).toEqual([]);
  });
  it('a super admin can remove an admin and make them a super admin while fewer than two exist', () => {
    const rows = [row('s1', 'super_admin'), row('a2', 'admin')];
    expect(rowActions(meSuper, rows[1], rows)).toEqual(['remove', 'makeSuper']);
  });
  it('hides "make super admin" once two super admins exist', () => {
    const rows = [row('s1', 'super_admin'), row('s2', 'super_admin'), row('a3', 'admin')];
    expect(rowActions(meSuper, rows[2], rows)).toEqual(['remove']);
  });
  it('a super admin can demote the other super admin', () => {
    const rows = [row('s1', 'super_admin'), row('s2', 'super_admin')];
    expect(rowActions(meSuper, rows[1], rows)).toEqual(['demote']);
  });
});
```

- [ ] **Step 3: Run them to verify they fail**

Run: `cd client && npx vitest run src/admin`
Expected: FAIL, cannot resolve `./form` and `./permissions`.

- [ ] **Step 4: Write `form.ts` and `permissions.ts`**

Create `client/src/admin/form.ts`:

```ts
export const MESSAGE_MAX = 200;

export interface MaintenanceForm {
  mode: 'now' | 'schedule';
  message: string;
  /** datetime-local text ("2026-10-20T15:00"), in the admin's own timezone */
  startsAt: string;
  endsAt: string;
}

export const emptyForm: MaintenanceForm = { mode: 'now', message: '', startsAt: '', endsAt: '' };

export interface MaintenancePayload {
  action: 'on' | 'off' | 'schedule';
  startsAt?: string;
  endsAt?: string;
  message?: string;
}

export interface FormErrors {
  message?: string;
  startsAt?: string;
  endsAt?: string;
}

const parseLocal = (value: string): number | null => {
  if (!value) return null;
  const time = new Date(value).getTime(); // "YYYY-MM-DDTHH:mm" is read as local time
  return Number.isNaN(time) ? null : time;
};

/** Validates the maintenance form and builds the body for `PUT /maintenance` (dates sent as ISO strings). */
export const buildPayload = (
  form: MaintenanceForm,
  now: number,
): { ok: true; body: MaintenancePayload } | { ok: false; errors: FormErrors } => {
  const errors: FormErrors = {};
  const message = form.message.trim();
  if (message.length > MESSAGE_MAX) errors.message = `Keep the message under ${MESSAGE_MAX} characters`;

  let start: number | null = now;
  if (form.mode === 'schedule') {
    start = parseLocal(form.startsAt);
    if (start === null) errors.startsAt = 'Choose when maintenance starts';
    else if (start <= now) errors.startsAt = 'The start must be in the future';
  }

  let end: number | null = null;
  if (form.endsAt) {
    end = parseLocal(form.endsAt);
    if (end === null) errors.endsAt = 'Enter a valid date and time';
    else if (start !== null && end <= start) errors.endsAt = 'The end must be after the start';
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const body: MaintenancePayload = { action: form.mode === 'schedule' ? 'schedule' : 'on' };
  if (form.mode === 'schedule' && start !== null) body.startsAt = new Date(start).toISOString();
  if (end !== null) body.endsAt = new Date(end).toISOString();
  if (message) body.message = message;
  return { ok: true, body };
};
```

Create `client/src/admin/permissions.ts`:

```ts
import type { AdminMe, AdminRow } from './types';

export type RowAction = 'remove' | 'makeSuper' | 'demote';

export const MAX_SUPER_ADMINS = 2;

/**
 * Which buttons to offer on a row. Mirrors the server rules (the server is what actually enforces them):
 * nothing on your own row; admins can remove admins; only super admins can make a super admin (while fewer
 * than two exist) or demote the other one.
 */
export const rowActions = (me: AdminMe, row: AdminRow, rows: AdminRow[]): RowAction[] => {
  if (row.id === me.id) return [];
  const superAdmins = rows.filter((r) => r.role === 'super_admin').length;
  if (row.role === 'admin') {
    const actions: RowAction[] = ['remove'];
    if (me.role === 'super_admin' && superAdmins < MAX_SUPER_ADMINS) actions.push('makeSuper');
    return actions;
  }
  return me.role === 'super_admin' ? ['demote'] : [];
};
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd client && npx vitest run src/admin`
Expected: PASS.

- [ ] **Step 6: Write the API module**

Create `client/src/admin/api.ts`:

```ts
import client from '@/api/axiosInstance';
import { getCsrfToken } from '@/utils/helper';
import { parseSnapshot } from '@/maintenance/timing';
import type { MaintenanceSnapshot } from '@/maintenance/types';
import type { MaintenancePayload } from './form';
import type { AdminMe, AdminRow } from './types';

export type AdminMeResult =
  | { kind: 'admin'; me: AdminMe }
  | { kind: 'not-admin' }
  | { kind: 'maintenance' }
  | { kind: 'error' };

/** Who is asking? 404/401 = not an admin, 503 = maintenance is on and you are not an admin. */
export const loadAdminMe = async (): Promise<AdminMeResult> => {
  try {
    const { data } = await client.get('/admin/me');
    return { kind: 'admin', me: { id: data.id, role: data.role } };
  } catch (error) {
    const status = (error as { response?: { status?: number } }).response?.status;
    if (status === 503) return { kind: 'maintenance' };
    if (status === 404 || status === 401) return { kind: 'not-admin' };
    return { kind: 'error' };
  }
};

/** The server's own message when it sent one (for example "You can't remove yourself"). */
export const errorMessage = (error: unknown, fallback = 'Something went wrong. Please try again.'): string => {
  const message = (error as { response?: { data?: { error?: unknown } } })?.response?.data?.error;
  return typeof message === 'string' && message ? message : fallback;
};

export const fetchAdmins = async (): Promise<AdminRow[]> => {
  const { data } = await client.get('/admin/admins');
  return data.admins as AdminRow[];
};

const write = async (method: 'post' | 'put' | 'delete', url: string, data?: unknown): Promise<unknown> => {
  await getCsrfToken();
  const response = await client.request({ method, url, data });
  return response.data;
};

export const makeAdmin = (email: string) => write('post', '/admin/admins', { email });
export const removeAdmin = (id: string) => write('delete', `/admin/admins/${encodeURIComponent(id)}`);
export const makeSuperAdmin = (email: string) => write('post', '/admin/super-admins', { email });
export const demoteSuperAdmin = (id: string) => write('delete', `/admin/super-admins/${encodeURIComponent(id)}`);

/** Sets, schedules or ends maintenance. Returns the new status snapshot. */
export const sendMaintenance = async (body: MaintenancePayload): Promise<MaintenanceSnapshot | null> =>
  parseSnapshot(await write('put', '/maintenance', body));
```

- [ ] **Step 7: Typecheck**

Run: `cd client && npx tsc -p tsconfig.app.json --noEmit`
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add client/src/admin/types.ts client/src/admin/api.ts client/src/admin/form.ts client/src/admin/permissions.ts
git commit -m "$(cat <<'EOF'
feat(admin): add admin API client and form helpers

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Client: the admin page

**Files:**
- Create: `client/src/styles/admin.css`
- Create: `client/src/components/admin/ConfirmDialog.tsx`, `StatusHeader.tsx`, `MaintenanceTab.tsx`, `AdminsTab.tsx`
- Create: `client/src/pages/Admin.tsx`
- Modify: `client/src/routes.tsx`

**Interfaces:**
- Consumes: Task 5 (`useMaintenance`, `useMaintenanceStore.setSnapshot`), Task 6 (everything).
- Produces: the `/admin` route and page (default export `Admin`). These are React components; verification is the typecheck and the user's browser test (the client test environment has no DOM).

- [ ] **Step 1: Styles**

Create `client/src/styles/admin.css`:

```css
/* Admin page. Variables come from the .app-shell scope in landing.css. */

.ad-status {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem 1rem;
  padding: 0.875rem 1rem;
}
.ad-status__title { margin: 0.125rem 0 0; font-size: 1.125rem; font-weight: 600; letter-spacing: -0.01em; }

.ad-tabs { display: flex; gap: 1.25rem; border-bottom: 1px solid var(--l-hair); }
.ad-tab {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  min-height: 2.75rem;
  padding: 0.25rem 0;
  border: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: var(--l-muted);
  font: inherit;
  font-size: 0.9375rem;
  cursor: pointer;
}
.ad-tab:hover { color: var(--l-ink); }
.ad-tab[aria-selected='true'] { border-bottom-color: var(--l-ink); color: var(--l-ink); font-weight: 600; }
.ad-count {
  padding: 0 0.4375rem;
  border: 1px solid var(--l-hair-strong);
  border-radius: 999px;
  font-size: 0.6875rem;
  line-height: 1.25rem;
}

.ad-badge {
  display: inline-block;
  padding: 0.0625rem 0.5rem;
  border: 1px solid var(--l-hair-strong);
  border-radius: 6px;
  color: var(--l-muted);
  font-size: 0.75rem;
  white-space: nowrap;
}
.ad-badge--super { border-color: var(--l-ink); color: var(--l-ink); font-weight: 600; }

.ad-error { margin: 0.25rem 0 0; color: #b3261e; font-size: 0.8125rem; }
.dark .ad-error { color: #ff8a80; }
.ad-hint { margin: 0.25rem 0 0; color: var(--l-muted); font-size: 0.8125rem; }
.ad-field { margin-bottom: 1rem; }
.ad-rowactions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 0.375rem; }
```

- [ ] **Step 2: Confirmation dialog**

Create `client/src/components/admin/ConfirmDialog.tsx`:

```tsx
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogEyebrow, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { popupDangerClasses, popupGhostClasses, popupPrimaryClasses } from '@/styles/popup-classes';

interface ConfirmDialogProps {
  open: boolean;
  eyebrow: string;
  title: string;
  description: string;
  confirmLabel: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  eyebrow,
  title,
  description,
  confirmLabel,
  danger = false,
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next && !busy) onCancel(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogEyebrow>{eyebrow}</DialogEyebrow>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button className={popupGhostClasses} onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button className={danger ? popupDangerClasses : popupPrimaryClasses} onClick={onConfirm} disabled={busy}>
            {busy ? 'Working...' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 3: Status header**

Create `client/src/components/admin/StatusHeader.tsx`:

```tsx
import type { MaintenanceStatus } from '@/maintenance/types';

interface StatusHeaderProps {
  status: MaintenanceStatus;
  startsAt: number | null;
  endsAt: number | null;
  mode: 'now' | 'schedule';
  busy: boolean;
  onPrimary: () => void;
}

const formatWhen = (timestamp: number) =>
  new Date(timestamp).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });

export default function StatusHeader({ status, startsAt, endsAt, mode, busy, onPrimary }: StatusHeaderProps) {
  let title = 'Everything is live';
  let detail = 'Users can use the app normally.';
  let label = mode === 'schedule' ? 'Schedule maintenance' : 'Start maintenance';

  if (status === 'scheduled' && startsAt !== null) {
    title = 'Maintenance is scheduled';
    detail = `Starts ${formatWhen(startsAt)}${endsAt !== null ? `, estimated end ${formatWhen(endsAt)}` : ''}.`;
    label = 'Cancel maintenance';
  } else if (status === 'active') {
    title = 'Maintenance is on';
    detail = `Only admins can use the app.${endsAt !== null ? ` Estimated end ${formatWhen(endsAt)}.` : ''}`;
    label = 'End maintenance';
  }

  return (
    <div className="ad-status app-card" role="status">
      <div>
        <p className="l-eyebrow l-muted m-0">Status</p>
        <p className="ad-status__title">{title}</p>
        <p className="l-muted m-0 text-sm">{detail}</p>
      </div>
      <button type="button" className="l-btn l-btn--primary" disabled={busy} onClick={onPrimary}>
        {label}
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Maintenance tab**

Create `client/src/components/admin/MaintenanceTab.tsx`:

```tsx
import type { ReactNode } from 'react';
import { MESSAGE_MAX, type FormErrors, type MaintenanceForm } from '@/admin/form';
import { inputClasses, labelClasses } from '@/styles/form-classes';

interface MaintenanceTabProps {
  form: MaintenanceForm;
  errors: FormErrors;
  /** maintenance is already on or scheduled: end it before changing the details */
  locked: boolean;
  onChange: (patch: Partial<MaintenanceForm>) => void;
}

function Field({ id, label, error, hint, children }: { id: string; label: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <div className="ad-field">
      <label htmlFor={id} className={labelClasses}>{label}</label>
      {children}
      {error ? <p className="ad-error" role="alert">{error}</p> : hint ? <p className="ad-hint">{hint}</p> : null}
    </div>
  );
}

export default function MaintenanceTab({ form, errors, locked, onChange }: MaintenanceTabProps) {
  return (
    <div className="app-card max-w-2xl p-5">
      {locked && (
        <p className="ad-hint mb-4">Maintenance is already on or scheduled. End it to change the details.</p>
      )}

      <div className="app-seg mb-5" role="group" aria-label="When to start">
        <button type="button" aria-pressed={form.mode === 'now'} disabled={locked} onClick={() => onChange({ mode: 'now' })}>
          Start now
        </button>
        <button type="button" aria-pressed={form.mode === 'schedule'} disabled={locked} onClick={() => onChange({ mode: 'schedule' })}>
          Schedule
        </button>
      </div>

      {form.mode === 'schedule' && (
        <Field id="ad-starts" label="Starts at" error={errors.startsAt} hint="In your local time.">
          <input
            id="ad-starts"
            type="datetime-local"
            className={inputClasses}
            value={form.startsAt}
            disabled={locked}
            onChange={(event) => onChange({ startsAt: event.target.value })}
          />
        </Field>
      )}

      <Field
        id="ad-message"
        label="Message shown to users"
        error={errors.message}
        hint={`${form.message.trim().length}/${MESSAGE_MAX}. Leave empty for the default message.`}
      >
        <textarea
          id="ad-message"
          className={inputClasses}
          rows={3}
          value={form.message}
          disabled={locked}
          onChange={(event) => onChange({ message: event.target.value })}
        />
      </Field>

      <Field id="ad-ends" label="Estimated end (optional)" error={errors.endsAt} hint="Shown to users as an estimate. Maintenance only ends when you end it.">
        <input
          id="ad-ends"
          type="datetime-local"
          className={inputClasses}
          value={form.endsAt}
          disabled={locked}
          onChange={(event) => onChange({ endsAt: event.target.value })}
        />
      </Field>
    </div>
  );
}
```

- [ ] **Step 5: Admins tab**

Create `client/src/components/admin/AdminsTab.tsx`:

```tsx
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import {
  demoteSuperAdmin,
  errorMessage,
  fetchAdmins,
  makeAdmin,
  makeSuperAdmin,
  removeAdmin,
} from '@/admin/api';
import { rowActions, type RowAction } from '@/admin/permissions';
import type { AdminMe, AdminRow } from '@/admin/types';
import { inputClasses, labelClasses } from '@/styles/form-classes';
import ConfirmDialog from './ConfirmDialog';

interface AdminsTabProps {
  me: AdminMe;
  onCount: (count: number) => void;
}

const ACTION_COPY: Record<RowAction, { label: string; confirm: string; danger: boolean; describe: (email: string) => { title: string; text: string } }> = {
  remove: {
    label: 'Remove',
    confirm: 'Remove admin',
    danger: true,
    describe: (email) => ({
      title: `Remove ${email} as admin?`,
      text: 'They will no longer be able to open the admin page or use the app during maintenance.',
    }),
  },
  makeSuper: {
    label: 'Make super admin',
    confirm: 'Make super admin',
    danger: false,
    describe: (email) => ({
      title: `Make ${email} a super admin?`,
      text: 'Super admins can manage other super admins. There can be at most two, and only the other super admin can demote them.',
    }),
  },
  demote: {
    label: 'Demote',
    confirm: 'Demote',
    danger: true,
    describe: (email) => ({
      title: `Demote ${email}?`,
      text: 'They become an ordinary admin.',
    }),
  },
};

export default function AdminsTab({ me, onCount }: AdminsTabProps) {
  const [rows, setRows] = useState<AdminRow[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [email, setEmail] = useState('');
  const [adding, setAdding] = useState(false);
  const [pending, setPending] = useState<{ action: RowAction; row: AdminRow } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const list = await fetchAdmins();
      setRows(list);
      setLoadFailed(false);
      onCount(list.length);
    } catch {
      setLoadFailed(true);
    }
  }, [onCount]);

  useEffect(() => {
    void load();
  }, [load]);

  const submitAdd = async (event: FormEvent) => {
    event.preventDefault();
    if (!email.trim()) return;
    setAdding(true);
    try {
      await makeAdmin(email);
      toast.success('Admin added');
      setEmail('');
      await load();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setAdding(false);
    }
  };

  const runPending = async () => {
    if (!pending) return;
    setBusy(true);
    try {
      if (pending.action === 'remove') await removeAdmin(pending.row.id);
      else if (pending.action === 'makeSuper') await makeSuperAdmin(pending.row.email);
      else await demoteSuperAdmin(pending.row.id);
      toast.success('Done');
      setPending(null);
      await load();
    } catch (error) {
      toast.error(errorMessage(error));
      setPending(null);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const copy = pending ? ACTION_COPY[pending.action].describe(pending.row.email) : null;

  return (
    <div className="app-card max-w-3xl p-5">
      {loadFailed && <p className="ad-error" role="alert">Couldn't load the admins. Reload the page to try again.</p>}
      {!rows && !loadFailed && <p className="l-muted m-0 text-sm">Loading...</p>}

      {rows && (
        <table className="app-table">
          <thead>
            <tr>
              <th scope="col">Person</th>
              <th scope="col">Role</th>
              <th scope="col"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>
                  <div>{row.email}</div>
                  {row.name && <div className="l-muted text-xs">{row.name}</div>}
                </td>
                <td>
                  <span className={`ad-badge ${row.role === 'super_admin' ? 'ad-badge--super' : ''}`}>
                    {row.role === 'super_admin' ? 'Super admin' : 'Admin'}{row.id === me.id ? ' · you' : ''}
                  </span>
                </td>
                <td>
                  <div className="ad-rowactions">
                    {rowActions(me, row, rows).map((action) => (
                      <button
                        key={action}
                        type="button"
                        className="l-btn l-btn--ghost"
                        onClick={() => setPending({ action, row })}
                      >
                        {ACTION_COPY[action].label}
                      </button>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <form onSubmit={submitAdd} className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label htmlFor="ad-email" className={labelClasses}>Make someone an admin</label>
          <input
            id="ad-email"
            type="email"
            className={`${inputClasses} !mt-0`}
            placeholder="Email of a user who has signed in"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        <button type="submit" className="l-btn l-btn--ghost" disabled={adding || !email.trim()}>
          {adding ? 'Adding...' : 'Make admin'}
        </button>
      </form>

      <ConfirmDialog
        open={pending !== null}
        eyebrow="Admin access"
        title={copy?.title ?? ''}
        description={copy?.text ?? ''}
        confirmLabel={pending ? ACTION_COPY[pending.action].confirm : ''}
        danger={pending ? ACTION_COPY[pending.action].danger : false}
        busy={busy}
        onConfirm={() => void runPending()}
        onCancel={() => setPending(null)}
      />
    </div>
  );
}
```

- [ ] **Step 6: The page**

Create `client/src/pages/Admin.tsx`:

```tsx
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { errorMessage, loadAdminMe, sendMaintenance, type AdminMeResult } from '@/admin/api';
import { buildPayload, emptyForm, type FormErrors, type MaintenanceForm, type MaintenancePayload } from '@/admin/form';
import type { AdminMe } from '@/admin/types';
import AppShell from '@/components/app-shell/AppShell';
import AdminsTab from '@/components/admin/AdminsTab';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import MaintenanceTab from '@/components/admin/MaintenanceTab';
import StatusHeader from '@/components/admin/StatusHeader';
import MaintenanceScreen from '@/components/maintenance/MaintenanceScreen';
import Loader from '@/components/SuspenseLoader';
import { useMaintenance } from '@/maintenance/hooks';
import { useMaintenanceStore } from '@/maintenance/store';
import NotFound from '@/pages/NotFound';
import '@/styles/admin.css';

type Tab = 'maintenance' | 'admins';

function AdminConsole({ me }: { me: AdminMe }) {
  const { rawStatus, startsAt, endsAt } = useMaintenance();
  const [tab, setTab] = useState<Tab>('maintenance');
  const [form, setForm] = useState<MaintenanceForm>(emptyForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [confirm, setConfirm] = useState<'start' | 'end' | null>(null);
  const [busy, setBusy] = useState(false);
  const [adminCount, setAdminCount] = useState<number | null>(null);
  const onCount = useCallback((count: number) => setAdminCount(count), []);

  const patchForm = (patch: Partial<MaintenanceForm>) => {
    setForm((current) => ({ ...current, ...patch }));
    setErrors({});
  };

  const onPrimary = () => {
    if (rawStatus !== 'off') {
      setConfirm('end');
      return;
    }
    const result = buildPayload(form, Date.now());
    if (!result.ok) {
      setErrors(result.errors);
      setTab('maintenance');
      return;
    }
    setErrors({});
    setConfirm('start');
  };

  const apply = async () => {
    let body: MaintenancePayload;
    if (confirm === 'end') {
      body = { action: 'off' };
    } else {
      const result = buildPayload(form, Date.now());
      if (!result.ok) {
        setErrors(result.errors);
        setConfirm(null);
        return;
      }
      body = result.body;
    }
    setBusy(true);
    try {
      const snapshot = await sendMaintenance(body);
      if (snapshot) useMaintenanceStore.getState().setSnapshot(snapshot, Date.now());
      toast.success(
        body.action === 'off' ? 'Maintenance ended' : body.action === 'schedule' ? 'Maintenance scheduled' : 'Maintenance started',
      );
      if (body.action !== 'off') setForm(emptyForm);
      setConfirm(null);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const confirmCopy =
    confirm === 'end'
      ? rawStatus === 'scheduled'
        ? { title: 'Cancel the scheduled maintenance?', text: 'Nothing will be blocked.', label: 'Cancel maintenance' }
        : { title: 'End maintenance?', text: 'Everyone can use the app again.', label: 'End maintenance' }
      : form.mode === 'schedule'
        ? { title: 'Schedule maintenance?', text: 'Users see a notice until it starts. Then this blocks every non-admin user.', label: 'Schedule' }
        : { title: 'Start maintenance now?', text: 'This blocks every non-admin user now.', label: 'Start maintenance' };

  return (
    <div className="w-full px-4 py-8 sm:px-8 lg:px-10 lg:py-12">
      <header className="mb-6">
        <h1 className="app-title m-0">Admin</h1>
        <p className="l-muted m-0 mt-1 text-sm">
          Signed in as {me.role === 'super_admin' ? 'a super admin' : 'an admin'}.
        </p>
      </header>

      <div className="flex max-w-3xl flex-col gap-5">
        <StatusHeader
          status={rawStatus}
          startsAt={startsAt}
          endsAt={endsAt}
          mode={form.mode}
          busy={busy}
          onPrimary={onPrimary}
        />

        <div className="ad-tabs" role="tablist" aria-label="Admin sections">
          <button
            type="button"
            role="tab"
            id="ad-tab-maintenance"
            aria-selected={tab === 'maintenance'}
            aria-controls="ad-panel-maintenance"
            className="ad-tab"
            onClick={() => setTab('maintenance')}
          >
            Maintenance
          </button>
          <button
            type="button"
            role="tab"
            id="ad-tab-admins"
            aria-selected={tab === 'admins'}
            aria-controls="ad-panel-admins"
            className="ad-tab"
            onClick={() => setTab('admins')}
          >
            Admins{adminCount !== null && <span className="ad-count">{adminCount}</span>}
          </button>
        </div>

        <section id="ad-panel-maintenance" role="tabpanel" aria-labelledby="ad-tab-maintenance" hidden={tab !== 'maintenance'}>
          <MaintenanceTab form={form} errors={errors} locked={rawStatus !== 'off'} onChange={patchForm} />
        </section>
        <section id="ad-panel-admins" role="tabpanel" aria-labelledby="ad-tab-admins" hidden={tab !== 'admins'}>
          <AdminsTab me={me} onCount={onCount} />
        </section>
      </div>

      <ConfirmDialog
        open={confirm !== null}
        eyebrow="Maintenance"
        title={confirmCopy.title}
        description={confirmCopy.text}
        confirmLabel={confirmCopy.label}
        danger={confirm === 'end' ? false : true}
        busy={busy}
        onConfirm={() => void apply()}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}

export default function Admin() {
  const [access, setAccess] = useState<AdminMeResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    void loadAdminMe().then((result) => {
      if (!cancelled) setAccess(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!access) return <Loader label="Loading" />;
  if (access.kind === 'not-admin') return <NotFound />;
  if (access.kind === 'maintenance') return <MaintenanceScreen />;
  if (access.kind === 'error') {
    return (
      <AppShell>
        <div className="w-full px-4 py-8 sm:px-8 lg:px-10 lg:py-12">
          <h1 className="app-title m-0">Admin</h1>
          <p className="l-muted mt-2 text-sm">
            Couldn't load the admin page. If the database is down nobody can sign in; use the emergency maintenance
            token from the server instead.
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <AdminConsole me={access.me} />
    </AppShell>
  );
}
```

- [ ] **Step 7: Route**

In `client/src/routes.tsx`:

(a) After `const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));` add:

```tsx
const Admin = lazy(() => import('./pages/Admin'));
```

(b) Directly before `<Route path="*" element={<NotFound />} />` add:

```tsx
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <Admin />
              </ProtectedRoute>
            }
          />
```

(`/admin` is deliberately not wrapped in `MaintenanceGate`: the server decides, and the page shows the maintenance screen itself to non-admins.)

- [ ] **Step 8: Typecheck and lint**

Run: `cd client && npx tsc -p tsconfig.app.json --noEmit && npx eslint src/admin src/components/admin src/pages/Admin.tsx src/maintenance src/components/maintenance`
Expected: no type errors; no new lint errors.

- [ ] **Step 9: Commit**

```bash
git add client/src/styles/admin.css client/src/components/admin/ConfirmDialog.tsx client/src/components/admin/StatusHeader.tsx client/src/components/admin/MaintenanceTab.tsx client/src/components/admin/AdminsTab.tsx client/src/pages/Admin.tsx client/src/routes.tsx
git commit -m "$(cat <<'EOF'
feat(admin): add the admin page

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: Whole-feature check and cleanup

**Files:**
- Delete (temporary tests): every `*.test.ts` created in Tasks 1 to 6.

- [ ] **Step 1: Run every test, typecheck and lint once more**

Run:

```bash
cd server && npx vitest run && npx tsc --noEmit
cd ../client && npx vitest run src/maintenance src/admin && npx tsc -p tsconfig.app.json --noEmit
npx eslint src/admin src/components/admin src/pages/Admin.tsx src/maintenance src/components/maintenance
```

Expected: all tests PASS; no type errors; no new lint errors beyond ones that already existed before this plan (compare against `git stash` if in doubt).

- [ ] **Step 2: Check the migration SQL once more**

Repeat the no-database SQL check from Task 2 Step 6. Expected: unchanged output. Do not run the migration.

- [ ] **Step 3: What the user will test by hand** (do not drive a browser; list this in the final message)

1. Apply the migration (`npm run migrate` in `server/`), then run the one SQL statement from the README to make yourself `super_admin` slot 1.
2. Sign in, open `/admin`: status header, Maintenance and Admins tabs. A second account opening `/admin` sees the 404 page.
3. Make a second account an admin; try Make super admin, then sign in as that account and demote the first (handover). Try a third super admin (409 message), demoting yourself (403 message), removing a super admin as an ordinary admin (no buttons).
4. Start maintenance from the page. A normal account (other browser or private window) sees the maintenance screen; the admin keeps using the dashboard and editors, with the dark "Only admins can use the app right now" bar.
5. Admin mid-edit when maintenance starts: the editor pauses briefly, then resumes and saves.
6. End maintenance from the page; the other account recovers within about 10 seconds. Schedule one for a few minutes ahead and check the notice and the start.
7. Emergency path: with `MAINTENANCE_ADMIN_TOKEN` set, `bash scripts/maintenance.sh on` and `off` still work while maintenance is active and with no login.

- [ ] **Step 4: Delete the temporary test files**

```bash
rm server/src/utils/adminRules.test.ts server/src/utils/emailVerification.test.ts server/src/services/adminService.test.ts server/src/middlewares/adminAuth.test.ts server/src/middlewares/maintenance.test.ts server/src/routes/admin.test.ts server/src/routes/maintenance.test.ts
rm client/src/maintenance/admin-status.test.ts client/src/admin/form.test.ts client/src/admin/permissions.test.ts
git status --short
```

Expected: `git status` shows no test files and nothing unexpected.

- [ ] **Step 5: Final review**

Request one fresh-context review of the whole diff for this feature (`git diff <the commit before Task 1>..HEAD`) against the spec, with attention to the five Review Focus items. Apply the Critical and Important findings in one fix pass, each with a test that failed first (recreate the temporary test files as needed and delete them again). Do not push, open a PR or merge.
