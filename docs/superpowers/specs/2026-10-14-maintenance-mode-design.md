# Maintenance Mode Design

## Goal

Take ResumeForge down for maintenance without losing anyone's in-progress work and without confusing users. Turning maintenance on or off must take one command and no deploy.

## Decisions

- **Control:** an admin flips the state through a secret-protected endpoint. The client polls a public status endpoint.
- **Storage:** no new database table. State is held in memory and mirrored to Redis when `REDIS_URL` is set (same optional pattern as the ATS rate limiter in `server/src/middlewares/ats.ts`).
- **Mid-edit users (soft lock):** the editor stays on screen. Autosave and PDF generation pause, typing keeps working, and one save runs when maintenance ends.
- **Public pages:** the landing, privacy and terms pages stay up during maintenance. Everything that needs the backend (login, dashboards, editor, ATS scanner) shows the maintenance screen.

## Phases

1. **Scheduled.** An admin sets a start time. Clients show a banner with a countdown. Nothing is blocked.
2. **Active.** The server rejects all non-allowlisted requests with 503. Clients show the soft-lock banner in the editor and the full-page maintenance screen elsewhere.
3. **Ending.** Polling sees the state return to `off`. Clients dismiss the UI and resume autosave.

## Server

### State

One object: `{ status: 'off' | 'scheduled' | 'active', startsAt, endsAt, message }`.

- A module `server/src/maintenance.ts` holds it in memory.
- If `REDIS_URL` is set, it mirrors the state to a single Redis key. It reads the key on boot and refreshes it every few seconds so multiple instances stay in step.
- `status` is derived from the clock: a scheduled state becomes active once `startsAt` passes. Nothing has to flip at an exact second.
- If Redis is unreachable, log the error and keep using the in-memory copy. Never block requests because of a Redis failure.
- Without Redis, a server restart resets the state to `off`. The docs state this and recommend Redis in production.

### Endpoints

- `GET /maintenance/status` is public and never gated. It returns the state plus the server time, so the client can compute the countdown without trusting its own clock.
- `PUT /maintenance` sets, schedules or clears the state. It requires an `x-admin-token` header matching `MAINTENANCE_ADMIN_TOKEN`, compared in constant time. If the env var is unset, the endpoint is disabled.

### Gate

A middleware mounted after CORS and before the routers.

- While the state is `active`, any request outside the allowlist gets `503 { error: 'maintenance', endsAt }` with a `Retry-After` header.
- The allowlist is `GET /maintenance/status` and `PUT /maintenance`.
- It must run before `csrfProtection`. Otherwise a stale CSRF token yields a 403 that hides the 503 from the client.
- Requests already in flight (for example a PDF render) are not interrupted. The gate only affects new requests.
- Login and OAuth routes are gated, so nobody starts an OAuth flow that cannot complete.

## Client

### Status hook

`useMaintenanceStatus` polls `GET /maintenance/status` and exposes `{ status, startsAt, endsAt, message, serverOffset }`.

- Polls every 60 seconds normally, and every 10 seconds when a scheduled start is under 2 minutes away or maintenance is active.
- Pauses while the tab is hidden.
- A failed poll never triggers maintenance. Only an explicit response from the server does.
- Countdowns use the server time from the response, offset against the local clock.

### Interceptor

A response interceptor in `client/src/api/axiosInstance.ts` catches `503 { error: 'maintenance' }` and sets the hook state to active immediately, closing the gap between polls. Autosave failures of this kind are treated as paused, not as errors, so no error toast appears.

### UI

Mounted once at the app root:

- **Scheduled banner.** Full-width dark top bar that pushes the page down: "Maintenance starts at 3:00 PM (in 12 min). Your work is saved." Start time on the right. Not dismissible.
- **Soft-lock banner.** Full-width light top bar with a dark bottom rule, shown only when the editor is open and sticky: "Maintenance in progress. Your edits are kept on this device and will save when we're back."
- **Full-page maintenance screen.** Replaces every route except landing, privacy and terms. Monochrome, left-aligned layout: wordmark, "Scheduled maintenance" headline, the message with the expected return time, a progress bar with "About N minutes left", and a trust checklist (saved resumes are safe, drafts typed on this device are kept, no action needed). A footer line notes that the landing and legal pages are still available. It keeps polling in the background and leaves on its own when maintenance ends.

Layouts were chosen from browser mockups (full-page screen: option B; banners: option A).

### Editor behavior while active

- The live-edit timer in `ResumeForm` does nothing, and the PDF download button is disabled with a tooltip.
- `localStorage` mirroring (`resumeFormData`) keeps running as it does today.
- When status returns to `off`, the form runs one save, then the banner disappears. The save is guarded so multiple open tabs do not each save.

### Stale-draft guard

The `localStorage` payload gains a `savedAt` timestamp. On load, the client compares it with the server's `updated_at`. If the local copy is newer, it asks the user to choose "Keep my local edits" or "Use the saved version". This covers a user who closes the tab during maintenance and returns later. It also fixes an existing behavior where the local copy silently wins.

## Operations

No admin UI. A wrapper script at `server/scripts/maintenance.sh` calls the endpoint:

- `maintenance schedule "<start ISO>" --ends "<end ISO>" --message "<text>"`
- `maintenance on` / `maintenance off`
- `maintenance status`

`endsAt` is only an estimate. Clients trust the polled `status`, not the clock, for when maintenance has ended.

## Testing

- **Server:** state transitions (scheduled becomes active on time, then off); admin token (missing, wrong, correct, and endpoint disabled when the env var is unset); gate (allowlist honored, 503 body and `Retry-After` correct, runs before CSRF); Redis failure falls back to memory.
- **Client:** hook polling cadence; failed poll leaves state unchanged; interceptor flips state on 503; live-edit is a no-op while active; exactly one save on resume; stale-draft prompt appears only when the local copy is newer.
- **Manual:** run the script against a local server with the editor open, walk through scheduled, active, off, and confirm typed text survives.

## Out of scope

Admin dashboard, per-user bypass or allowlisting, email notifications, maintenance history log.
