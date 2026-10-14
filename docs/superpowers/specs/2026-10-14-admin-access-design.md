# Admin Access Design

Builds on [2026-10-14-maintenance-mode-design.md](2026-10-14-maintenance-mode-design.md).

## Goal

Let admins run maintenance mode from a web page and keep using the app while everyone else is blocked, without a shared token for day-to-day use. Admin status must be hard to obtain: it exists only in the database, and nothing in the environment or the website can create the first admin.

## Decisions

- **Sign-in stays as is** (Google, GitHub, LinkedIn). No passwords, no separate admin login.
- **Roles live only in the `users` table:** `user`, `admin`, `super_admin`. No environment variable grants a role.
- **Admins and super admins have identical access** to the admin page and to the maintenance controls. The only extra power of a super admin is managing super admins.
- **At most two super admins**, so ownership can be handed over: a super admin promotes the new owner, who then demotes the previous one.
- **The first super admin is set by hand in the database.** No script, no endpoint, no UI can do it.
- **`MAINTENANCE_ADMIN_TOKEN` stays** as an optional emergency path. It is off unless the variable is set. It can only start, schedule or end maintenance; it grants no admin status and no data access.
- **Admins bypass the maintenance gate** and use the whole app normally while maintenance is on. Outside maintenance admins are ordinary users in the app.
- **Admin page layout:** status header with tabs (chosen from browser mockups, option B).

## Roles and rules

| Action | Who may do it | Result |
|---|---|---|
| Make admin | admin or super admin | an existing user (signed in at least once) with role `user` becomes `admin` |
| Remove admin | admin or super admin | an `admin` becomes `user`. Not yourself. Never a super admin |
| Make super admin | super admin only | an existing `user` or `admin` becomes `super_admin`. Refused if two exist |
| Demote super admin | the other super admin only | the target becomes `admin`. Not yourself |

- Lookups by email ignore letter case.
- Making an admin of someone who is already an admin or super admin answers 409. An unknown email answers 404.
- A demotion never leaves zero super admins: the actor is a different super admin and stays one. The check runs in a database transaction that locks the super admin rows, so two simultaneous demotions cannot leave nobody.
- If a super admin were somehow lost, the owner repairs it with a manual SQL update (see Operations).

## Data

One migration on `users`:

- `role` VARCHAR(20) NOT NULL DEFAULT `'user'`, constrained to `user`, `admin`, `super_admin`.
- `super_admin_slot` TINYINT NULL with a UNIQUE index, constrained to 1 or 2, and set exactly when `role = 'super_admin'`.

The unique slot is what enforces "at most two" in the database itself: a third super admin has no free slot value, so the insert or update fails. The CHECK constraints are enforced by MySQL 8.0.16+ and MariaDB 10.2.1+; the unique index works everywhere, and the server enforces the same rules in code.

## Server

### Middleware order

1. CORS, JSON.
2. `GET /maintenance/status` (public). It stays ahead of the session so polling never touches the database.
3. Cookie parser, session, passport. A failed user lookup (for example, the database is down) is treated as "not signed in" instead of an error, so the gate can still answer.
4. The maintenance gate. While maintenance is active, admin requests pass, and so does `PUT /maintenance` (it checks its own credentials, so the emergency token still works when nobody has a session); everyone else gets the same 503 and headers as today.
5. `PUT /maintenance`, mounted before the global CSRF check. It applies the CSRF check itself, and only on the admin-session path (the token path involves no cookie).
6. The global CSRF check, then the existing routers and the new `/admin` routes.

The user row loaded for the session already carries `role`, so no extra query is needed to know whether a request comes from an admin. A role change takes effect on that person's next request.

### Endpoints

- `PUT /maintenance` accepts either credential:
  - the optional `x-admin-token` header, exactly as today (no CSRF, no cookie involved);
  - an admin session, which must pass the CSRF check like every other state-changing call.
  Without a token header and without an admin session the route answers 404, so its existence is not revealed. A wrong token answers 401, and the route stays disabled (404) when `MAINTENANCE_ADMIN_TOKEN` is unset and the caller is not an admin.
- `GET /admin/me` returns `{ id, role }` for admins (the page needs `id` to mark your own row) and 404 for everyone else.
- `GET /admin/admins` lists admins and super admins as `{ id, email, name, role }`.
- `POST /admin/admins` `{ email }`: make admin. `DELETE /admin/admins/:id`: remove admin.
- `POST /admin/super-admins` `{ email }`: make super admin. `DELETE /admin/super-admins/:id`: demote to admin.
- All `/admin` routes require an admin session; the two super-admin routes require a super admin (an admin gets 403).
- Rule checks are a pure module that returns an allow/deny reason, so the same decisions apply everywhere and can be tested without a database. The database writes run in transactions.

### Sign-in hardening

The Google strategy rejects a sign-in whose email Google marks as unverified. LinkedIn already rejects unverified emails, and GitHub returns only the primary email, which GitHub requires to be verified. So a role granted to an email cannot be claimed with an unverified one.

## Client

### Admin page

`/admin`, with no link in the navigation, behind the normal sign-in. A signed-in non-admin sees the standard 404 page. If maintenance is on and the viewer is not an admin, the maintenance screen shows.

- **Status header** (always visible): "Everything is live", "Maintenance is scheduled for {time}", or "Maintenance is on", with one primary button: Start maintenance, Schedule maintenance (when the form is in Schedule mode), or End maintenance. Starting and ending ask for confirmation ("This blocks every non-admin user now.").
- **Tabs:** Maintenance and Admins (with a count).
- **Maintenance tab:** Start now / Schedule toggle, message (up to 200 characters), estimated end (optional), and a start time when scheduling. Times are entered in the admin's local timezone and sent as ISO dates. The server's validation messages (past start, end before start) are shown next to the fields.
- **Admins tab:** one row per admin with a badge (Super admin, Admin; "you" on your own row) and only the actions the rules allow: Remove, Make super admin, Demote. A field at the bottom takes an email and has a Make admin button. Server refusals (409, 403, 404) appear as toasts with the server's message.
- The page refreshes its state after every action and polls the status while open.

### Admins during maintenance

- The client keeps a `viewerIsAdmin` flag. When maintenance is active and the viewer is signed in, the app calls `/admin/me` once. 200 sets the flag. A 503, 401 or 404 leaves it false. The flag resets when maintenance stops being active or on sign-out.
- With the flag set, the effective status is "off" for that viewer: route gates do not show the maintenance screen, and editors do not pause. An admin who was mid-edit when maintenance started sees the editor pause briefly, then resume and save as soon as the flag is set (the existing end-of-maintenance save runs).
- Until the probe answers, gated routes show the loader instead of flashing the maintenance screen.
- Admins see a slim dark bar: "Maintenance is on. Only admins can use the app right now." with a link to `/admin`.
- During a database outage nobody can load a session, admins included. The admin page says so when it cannot authenticate and points to the emergency token path.

## Operations

- **First super admin**, run once by the owner in the database (the person must have signed in once so the row exists):
  `UPDATE users SET role = 'super_admin', super_admin_slot = 1 WHERE email = 'owner@example.com';`
- The same statement repairs the system if the database ever has no super admin.
- `README` documents the SQL, the page, and the emergency token path.
- Sessions are in memory, so a server restart signs everyone out. Unsaved edits stay on the user's device and are offered back after sign-in (already built).

## Testing

- **Rules module** (pure): every row of the table above, including self-actions, the two-super-admin cap, 404/409/403 outcomes, and case-insensitive email matching.
- **Gate:** admin passes while active; non-admin and anonymous get the 503; a failed user lookup gets the 503, not a 500.
- **`PUT /maintenance`:** token path unchanged and reachable while maintenance is active; admin session works with a CSRF token and fails without; no credential answers 404.
- **Client:** `effectiveStatus` with the admin flag (admin sees "off" while the server says active), probe outcomes, flag reset.
- **Manual with a real database:** the migration, the unique-slot rejection of a third super admin, simultaneous demotions, and an ownership handover.

## Out of scope

Audit log, invitation emails, per-admin permissions, verifying emails on all sign-ins (a follow-up for the roadmap), rate limiting the admin endpoints, an admin link in the navigation.
