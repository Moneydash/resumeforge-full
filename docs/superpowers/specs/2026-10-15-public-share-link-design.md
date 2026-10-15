# Public Share Link for Resumes — Design

Date: 2026-10-15

## Goal

Let a resume owner share a resume through a public link, controlled by an on/off toggle.

- **On:** anyone with the link can view the resume, logged in or not.
- **Off:** the link still exists (same URL if turned on again) but visitors are shown the 404 page.
- Applies to **resumes only**, not cover letters.
- A visitor can view the rendered resume page and download it as a PDF.

## Decisions

- Share control lives **only on the dashboard**, in the resume actions menu next to clone / rename / delete. Not in the Preview page.
- Default is off. The token is created lazily on first enable and then kept.
- Templates render in the browser only, and `/resume/generate` is login-only and accepts arbitrary HTML, so it is not exposed publicly. The public PDF is made by the server opening the app's own public page in Puppeteer and printing it.
- Public viewing pauses during maintenance (the existing maintenance gate applies to the public API routes).

## Server

### Migration
Add to `user_resume_data`:
- `share_token` — string, unique, nullable, 22-char URL-safe random.
- `share_enabled` — boolean, default false.

### Owner endpoint (authenticated)
`POST /resume/share/:id/:userId` with body `{ enabled: boolean }`.
- Same middleware as the other `/resume` routes (`authRateLimit`, `isAuthenticated`, `validateSocialLogin`).
- Verifies the resume belongs to the user (`findByIdAndUserId`).
- Creates `share_token` if missing, sets `share_enabled`.
- Returns `{ enabled, token }`.
- Resume list/fetch responses include `share_enabled` and `share_token` so the dashboard knows the current state.

### Public endpoints (no auth)
Mounted before `csrfProtection` (GET only), with their own rate limit.
- `GET /public/resume/:token` — returns the fields the template needs (resume data, template, font/theme settings). No `user_id` or internal ids.
- `GET /public/resume/:token/pdf` — checks the token first, then Puppeteer opens `${FRONTEND_URL}/r/:token?print=1` and prints it using the existing launch/measure helpers. The PDF is cached in memory keyed by token + `updated_at`. Stricter rate limit than the data endpoint.
- Both return **404** when the token is unknown or malformed, `share_enabled` is false, or `deleted_at` is set. These cases are indistinguishable.
- PDF generation failure returns 500 with a generic message; no HTML is leaked.

### Model
`ResumeModel`: `findByShareToken(token)` (only enabled, not deleted) and `setShare(id, userId, enabled)`.

## Client

- **Route `/r/:token`**, outside `ProtectedRoute` and `MaintenanceGate`. Fetches the public endpoint and renders `ResumePreview` read-only. Shows a "Download PDF" button. A 404 response renders the existing `NotFound` page. With `?print=1` all chrome is hidden and only the resume is shown.
- **Share dialog** opened from `ResumeActionsMenu`: an on/off switch; when on, a read-only link field with a Copy button; when off, a note that the link stays reserved but shows 404. A failed toggle rolls the switch back and shows an error.

## Testing

- Server (jest/supertest): public data and PDF endpoints return 404 when off, 200 when on, 404 after soft delete; token is stable across off/on; owner endpoint rejects another user's resume; malformed token returns 404.
- Client: manual checklist for the share dialog, public page, PDF download, and the 404 when off.
- Test files created for this are removed before commit.

## Out of scope

Cover letters, a Share control in the Preview page, link expiry/passwords, view analytics, regenerating the token.
