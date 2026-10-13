# Keyword Matcher - Design

Date: 2026-10-13
Branch: `feat/job-description-keyword-matcher`

## Goal

Extend the ATS scanner ([client/src/pages/ATSScanner.tsx](../../../client/src/pages/ATSScanner.tsx)) so a user can list the keywords and skills they care about and see which ones appear in their resume and which are missing. Roadmap item 1 ([feature-roadmap.md](../../feature-roadmap.md)). Plain text matching, no AI, no paid APIs.

## Confirmed decisions

- **Chips only.** The user types or pastes the keywords themselves. There is no job-posting paste, no keyword extraction, no skills dictionary and no stopword list. (Dropped to cut scope; the user controls exactly what is checked, for any industry.)
- **Saved per user.** Keywords are saved so nobody retypes them (new table, below). The resume PDF, its extracted text and any job posting are never stored.
- **Suggestions instead of deletion.** Removing an active chip moves it to a Suggestions list. Clicking a suggestion moves it back. This supports switching industries and returning (IT, then Sales, then IT) with one click per skill.
- **Entry points (option 3).** The keyword box is available before the scan, and again on the results page, where editing re-matches instantly with no re-upload and no new scan (so no rate-limit cost).
- Named profiles (for example "IT" and "Sales") are deferred. Suggestions cover the need for now.

## Behavior

### Keyword box (`KeywordBox`)
- Chip input plus a Suggestions row. Enter or comma adds a chip. Pasting comma- or line-separated text splits it into chips.
- Normalization: trim, collapse inner whitespace, case-insensitive uniqueness (first spelling kept). A term lives in only one of the two lists.
- Limits: 40 characters per term, 100 active, 200 suggestions. When suggestions are full, the oldest is dropped. Over-limit input shows an inline message instead of silently truncating.
- Removing an active chip moves it to Suggestions (newest first). Clicking a suggestion moves it to active. Each suggestion has an × for permanent deletion, and a "Clear suggestions" action empties the list.
- Changes save automatically (debounced `PUT`). A small saved/saving/failed state is shown; failure keeps local edits and offers retry.
- Chips and buttons are real controls: keyboard operable, labeled, with visible focus. Add/remove changes are announced through a polite live region.

### Matching (`keyword-match.ts`, pure)
- Input: `extractedText` from the scan result and the active keywords. Runs in the browser.
- Case-insensitive, word-boundary aware, with special handling for terms such as `C++`, `C#`, `.NET`, `Node.js`.
- Light normalization: simple plural/suffix stemming (so "manage", "managed", "managing" match each other) and a small built-in alias map for common acronym pairs (CRM, KPI, B2B, SaaS, P&L and similar). Anything else is literal, and the UI says so ("Based on exact wording").
- Output: `{ matched: string[], missing: string[], percent: number }`, original chip order kept. With no active keywords there is no result and the section shows an empty prompt.
- Separate from the ATS readability score, which is unchanged.

### Placement
- **Before scan** (idle and file-selected states): the keyword box below the dropzone / file row. Optional; scanning works without keywords.
- **Results:** a "Keyword match" section in the left column under the findings, containing the percent, a thin bar (`role="progressbar"`), the matched list, the missing list (status colors only on matched/missing with icon and text) and the same editable box.
- If the user adds keywords before scanning, the match appears with the results. If they have none, the section shows the box with a prompt.

## Data model

New Knex migration in `server/src/db/migrations/`:

`ats_keyword_preferences`
- `id` (PK), `user_id` (FK to users, unique, cascade on delete)
- `active_keywords` (JSON array of strings, default `[]`)
- `suggested_keywords` (JSON array of strings, default `[]`)
- `created_at`, `updated_at`

One row per user, created on first save. No row means both lists are empty.

## API

Both behind `isAuthenticated`, `validateSocialLogin(['google','github','linkedin'])` and the existing CSRF protection, in the existing ATS router. They do not use `atsRateLimit` (that limit is for scans).

- `GET /ats/keywords` returns `{ success, keywords: { active, suggested } }`.
- `PUT /ats/keywords` with `{ active, suggested }` replaces both lists. Validated with zod: arrays of strings, each trimmed and 1 to 40 characters, at most 100 active and 200 suggested, no case-insensitive duplicates within or across lists (server normalizes and rejects with 400 and a clear message otherwise).

New controller `server/src/controllers/atsKeywords.ts` and a small DB helper following existing controller/db patterns. The scan endpoint is unchanged.

## Privacy

The privacy note on the scanner page keeps its existing claims and gains one sentence: your saved keyword list is stored with your account; your PDF is not. This must be checked against the privacy policy page before shipping.

## Client structure

In `client/src/components/ats/`: `KeywordBox`, `KeywordChip` (if needed), `KeywordMatch` (results section), `keyword-match.ts` (pure matching and list-normalization helpers, including move active/suggested logic), and a `useKeywordPreferences` hook for load and debounced save. Styles added to `client/src/styles/ats.css`, following the existing monochrome/ink-blue system. `types.ts` gains the keyword types; `ScanResult` is unchanged.

## Out of scope

Job-posting paste and extraction, AI suggestions, saved postings, named profiles, editing the resume, any change to scan scoring, exporting the match report.

## Verification

- `tsc -b`, lint and production build pass (client); server builds and the migration runs and rolls back.
- Temporary unit tests (deleted before commit) for the matcher (boundaries, `C++`/`C#`/`.NET`, stemming, aliases, empty cases) and the list helpers (normalize, dedupe, limits, move between lists, oldest-dropped).
- Server: manual requests for GET/PUT covering valid input, over-limit, duplicates and unauthenticated access.
- UI checked in light and dark at 375, 768 and 1440px with a keyboard pass. The real scan flow is verified by the user clicking through once.
