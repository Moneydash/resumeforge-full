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

- While the state is `active`, any request gets `503 { error: 'maintenance', endsAt }` with `Retry-After` and `X-Maintenance: 1` headers. The client detects maintenance from `X-Maintenance`, because PDF requests use `responseType: 'blob'` and their error body is not parsed JSON. CORS therefore exposes both headers (`exposedHeaders`).
- The allowlist (`GET /maintenance/status`, `PUT /maintenance`) is implemented by mounting the maintenance router before the gate, so those two routes never reach it.
- Both the router and the gate are mounted before `csrfProtection` and the session. Otherwise a stale CSRF token yields a 403 that hides the 503 from the client, and the admin `PUT` would need a CSRF token.
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
- **Public-page variant.** On the landing, privacy and terms pages the active state shows a dark top bar: "Maintenance in progress. Sign-in and the editor are unavailable until about 4:00 PM."
- **Full-page maintenance screen.** Replaces every route except landing, privacy and terms. Monochrome, left-aligned layout: wordmark, "Scheduled maintenance" headline, the message with the expected return time, a progress bar with "About N minutes left", and a trust checklist (saved resumes are safe, drafts typed on this device are kept, no action needed). A footer line notes that the landing and legal pages are still available. It keeps polling in the background and leaves on its own when maintenance ends.

A route wrapper decides what to show. Non-editor routes switch to the screen as soon as maintenance is active. Editor routes switch only if maintenance was already active when the route mounted, so someone already editing keeps the soft lock. Until the first status check finishes, wrapped routes show the loader.

Layouts were chosen from browser mockups (full-page screen: option B; banners: option A).

### Editor behavior while active

Applies to both editors (resume and cover letter).

- The pause happens at the network edge: `handleFormSubmit` in `Preview.tsx` and `CLPreview.tsx` stops before calling save and generate, and keeps the latest document in memory. The form's live-edit timer is left alone, because the form only copies edits to `localStorage` when it submits.
- A 503 that arrives before the client knows about maintenance (between polls) is treated the same way: the request is not reported as an error, the document is kept, and the editor shows "Paused for maintenance".
- The PDF export button is disabled with a hint.
- When status leaves `active`, the editor runs one save of the kept document. The save is guarded by a short-lived `localStorage` lock so several open tabs do not each save.
- Leaving the editor during maintenance (Dashboard button, closing the tab) must not lose the kept document. See the draft guard below, and note that the existing `localStorage.clear()` calls on the editor exit and dashboard mount must preserve drafts.

### Unsaved-draft guard

Today, opening a resume overwrites the local copy with the server copy (`Preview.tsx`, `localStorage.setItem('resumeFormData', ...)`). An edit that was kept on the device during maintenance but never saved would therefore be silently lost when the user reopens the resume.

- When an edit is paused, the full document is also written to a separate key (`resumeDraft` / `clDraft`) as `{ id, data }`. The key is removed when a save succeeds.
- When a resume or cover letter opens, if a draft exists for that id and differs from the server copy, the editor shows a dialog before loading: "Keep my edits" (load the draft, then save it) or "Use the saved version" (discard the draft).
- No timestamps are compared, so clock skew cannot cause a wrong prompt.
- `localStorage.clear()` in the editor exit and on the two dashboards is replaced by a helper that clears everything except the draft keys. Logout still clears everything, so a draft never outlives a sign-out.

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
