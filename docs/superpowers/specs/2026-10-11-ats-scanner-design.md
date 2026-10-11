# ATS Scanner Redesign - Design

Date: 2026-10-11
Branch: `page-revamp` (all work happens on this branch; no new branch or worktree)

## Goal

Redesign `/ats-scanner` ([client/src/pages/ATSScanner.tsx](../../../client/src/pages/ATSScanner.tsx)) in the language of the redesigned landing page and dashboards: monochrome warm neutrals, one quiet ink-blue accent, no gradients, with status colors used only for status.

The current page uses the old gradient background, yellow as the accent (upload zone, scan button, spinner), a large tinted verdict card, a gradient icon tile, its own header with a "Back to Dashboard" button and the floating logout button, and a single long results column that puts the extracted text at the very bottom, far from the findings it explains. Its scan steps also flash past or never show: the results replace them the moment the API answers.

Third page of the `page-revamp` effort (landing page: [2026-10-11-landing-page-design.md](2026-10-11-landing-page-design.md); dashboards: [2026-10-11-dashboard-design.md](2026-10-11-dashboard-design.md)). Only `/ats-scanner` is in scope.

## Confirmed requirements

- **Layout:** the shared `AppShell` sidebar with **ATS scanner** as the active item. The back button, the header theme toggle and the floating logout button go away (the sidebar has Theme and Log out).
- **Results layout (chosen from mockups):** verdict and findings on the left, the extracted text ("What the ATS sees") on the right and kept in view, so each finding can be checked against the text. Stacks on phones, with the text panel collapsed behind a disclosure.
- **Scan progress is shown step by step (user requirement):** after the upload starts, the four existing steps play through visibly, one at a time, and the results open only after the last step completes. Rules:
  - Each step is on screen for at least `STEP_MIN_MS` (900 ms) before it is checked off, even if the response is already back.
  - Steps 1 to 3 advance on that minimum timing; the last step ("Evaluating results") also waits for the response, so a slow connection shows real waiting on that step.
  - As each step completes it shows one line of real data from this scan: file size uploaded; pages read and characters extracted; number of checks run; the verdict. These lines appear only once the data exists.
  - After the last step completes there is a short beat (about 500 ms) and then the results open.
  - If the request fails, stepping stops at once, the existing error toast is shown, and the page returns to the file-selected state.
  - The stepping is presentation pacing, not live server progress (the API is one request). The data shown in each line is real; the timing is not claimed to be.
- **Color restraint:** status colors (pass, warn, fail) appear only on the status icon, the verdict chip and the score bar, always with an icon and text. The yellow accent is removed; focus, links and the active step use the shared ink-blue accent.
- **Findings:** failures first, then warnings; passed checks are collapsed behind "N checks passed" (a disclosure with `aria-expanded`). If nothing needs attention, the passed checks are shown expanded.
- **Behavior kept exactly:** the `POST /ats/scan` call (CSRF token first, `FormData` field `resume`), PDF only, 5 MB maximum, the validation toasts, the error messages (rate limit with minutes, expired session, API message, generic), the step wording, "Scan another" resetting the file and result, and the "No text could be extracted from this file." empty text.
- **Privacy reassurance (user request):** the page tells users plainly that their file is not stored, so they do not think it is kept or sold. Only claims verified in the code and the privacy policy are used: the upload is held in memory only and never written to disk (`multer.memoryStorage()`, route documented as stateless), scanning uses the local `pdfjs-dist` library with no network calls and no logging of content, and the privacy policy says "We do not sell your personal information" (it also allows sharing with service providers, legal authorities and with consent, so the page must not say "never shared with anyone"). The line is: "Your PDF is read in memory to build this report and is not stored. We do not sell your personal information." followed by a link to the Privacy Policy (`/privacy-policy`). It shows in the idle and file-selected states, under the drop zone or the Scan button. If the server's behavior ever changes, this line must be revisited.
- **Copy honesty (rest of the page):** the score is described as it is today ("how completely and cleanly an ATS can read your file"); nothing else is claimed about retention or privacy.

## Page structure

1. **AppShell** with the page content to the right of the sidebar (full width, same padding as the dashboards).
2. **Header**: h1 "ATS scanner", one line of sub-copy ("Upload your resume and see if an ATS can read it.").
3. **Idle**: a dashed hairline drop zone (real keyboard-reachable control: drag and drop, Enter or Space to browse, "PDF only, up to 5 MB"), then the three analysis step names and a one-line note that they run after upload, then the privacy line described above.
4. **File selected**: a file row (name, size, a labeled Remove button), a **Scan resume** primary button, and the same privacy line under it.
5. **Scanning**: the file row, then the step list as a bordered card with `role="status"` and `aria-live="polite"`. Per step: done (check), current (spinner), upcoming (muted); a completed step shows its one-line data. The button reads "Scanning..." and is disabled.
6. **Results**: header row with "Results" eyebrow, the file name, and **Scan another** at the top right. Two columns from `lg`:
   - Left: verdict card (status chip, description, large tabular score out of 100, thin bar with `role="progressbar"`, one mono line "x.x s to read · N of M pages read"), then "Needs attention · N" with the failing and warning findings, then the collapsed "N checks passed".
   - Right: "What the ATS sees" panel, sticky from `lg`, mono text in a scrollable area, with the existing explanation line.
   - Focus moves to the results heading when the results open, and a polite live region announces the verdict.

## Visual system

Reuses the landing and dashboard tokens through the existing `.app-shell` scope in [client/src/styles/landing.css](../../../client/src/styles/landing.css); the global shadcn theme is untouched. Additions (status colors for pass, warn and fail with at least 4.5:1 contrast on the surface in light and dark, and the ATS-specific classes) go in `client/src/styles/ats.css`.

- Type, radius, hairlines and buttons as on the dashboards (44px-tall controls, 8 to 10px radius, no shadows).
- Motion: color transitions only; the spinner animation and step transitions respect `prefers-reduced-motion` (the stepping itself still runs, since it is timing, not motion).
- Accessibility: 4.5:1 contrast, visible focus rings, one h1, icon-only controls labeled, color never the only signal.

## Implementation structure

`ATSScanner.tsx` stays the container (file state, the scan request, errors, step pacing) and renders presentational pieces in `client/src/components/ats/`, inside `AppShell`:

- `types.ts`: `ScanResult`, `ScanCheck`, `Verdict`, `CheckStatus` (moved out of the page file; shapes unchanged).
- `scan-progress.ts`: pure helpers, unit-testable without a DOM: `SCAN_STEPS`, `STEP_MIN_MS`, `canAdvance(step, elapsedInStepMs, responseReady)` and `stepDetail(step, file, result)`.
- `ScanDropzone`, `ScanFileCard`, `ScanProgress`, `ScanResults`, `VerdictCard`, `FindingsList`, `ExtractedTextPanel`, `PrivacyNote` (the reassurance line and the policy link; its copy lives in one exported constant so it can be checked in one place).
- `client/src/routes.tsx`: one added condition hides the global fixed `Footer` on `/ats-scanner`.

**Pacing:** the container drives a `scanStep` (0 to 3) and a `complete` flag from a small timer loop that asks `canAdvance` whether the current step may be checked off. The response is held in state until the steps finish, then `phase` becomes `results`. Timers are cleared on unmount and on failure.

**Findings grouping** is a pure function (`groupFindings(checks)` returning `{ attention, passed }`, failures before warnings, original order kept within each) so it can be tested.

## Out of scope

- Any page other than `/ats-scanner`.
- The API, the server, the scoring, or new scan features (exporting the report, history, copying text).
- Storing uploaded files or reports (the scanner stays stateless), or any change to server behavior.
- New dependencies or fonts.

## Verification

- `tsc -b`, lint and a production build pass.
- Temporary unit tests (in the `node` environment, with `react-dom/server`) cover `canAdvance`, `stepDetail`, `groupFindings`, the findings list, the verdict card, the progress list and the page's first render.
- I cannot sign in or call the live scanner, so the page is checked in a temporary browser harness with fake results in light and dark at 375, 768 and 1440px, including a keyboard pass and the stepping with a fast and a slow fake response.
- The real upload and scan against the live API is verified by the user clicking through once after the work is done.
- The harness and all test files (and snapshots) are deleted before committing; commits stage explicit paths only.
