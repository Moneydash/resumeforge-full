# ATS Scanner Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign `/ats-scanner` inside the shared `AppShell`, with the scan steps playing through visibly one at a time before results open on a findings-beside-extracted-text layout, and a verified privacy reassurance line.

**Architecture:** `ATSScanner.tsx` stays the container (file state, the scan request, errors, pacing loop) and renders small presentational pieces from `client/src/components/ats/`. The pacing rules live in a pure `tick` function so they are unit-testable without a DOM. Tokens come from the existing `.app-shell` scope; a small `ats.css` adds status colors and the page-specific classes.

**Tech Stack:** React 19, Vite 6, Tailwind 4 (layout utilities only), `lucide-react`, `react-router-dom` 7, `sonner`, `axios`, Vitest 5 in the `node` environment (tests use `react-dom/server`).

**Spec:** [docs/superpowers/specs/2026-10-11-ats-scanner-design.md](../specs/2026-10-11-ats-scanner-design.md)

All paths are relative to the repo root. Run client commands from `client/`.

## Global Constraints

- Only `/ats-scanner` changes (plus one added condition in `client/src/routes.tsx`). No server, API or scoring changes; the scanner stays stateless.
- Behavior kept exactly: `POST /ats/scan` (CSRF token first via `getCsrfToken()`, `FormData` field `resume`), PDF only, `MAX_FILE_SIZE_MB = 5`, the two validation toasts (`Only PDF files are supported.` and `File is too large. Maximum size is 5 MB.`), the error messages in `getScanErrorMessage` (rate limit with minutes, expired session, API `error`, `Error.message`, generic), the four step labels exactly as today (`'Uploading your resume...'`, `'Reading the text layer...'`, `'Checking sections and structure...'`, `'Evaluating results...'`), "Scan another" resetting file and result, and `'No text could be extracted from this file.'`.
- Step pacing: each step is on screen at least `STEP_MIN_MS = 900` ms before it is checked off; steps 1 to 3 advance on that minimum; the last step also waits for the response; after the last step there is a `FINISH_BEAT_MS = 500` ms beat, then the results open; a failed request stops everything at once and returns to the file-selected state. The stepping is presentation pacing, not live server progress; the per-step data lines are real (file size, pages and characters read, checks run, verdict) and appear only once that data exists.
- Privacy line, verbatim: `Your PDF is read in memory to build this report and is not stored. We do not sell your personal information.` plus a link to `/privacy-policy`. It must not say "never shared with anyone" (the privacy policy allows sharing with service providers, legal authorities and with consent). Shown in the idle and file-selected states only.
- Monochrome warm neutrals plus the ink-blue accent. Status colors (pass, warn, fail) appear only on the status icon, the verdict chip and the score bar, always with an icon and text. No yellow, no gradients, no emoji; icons from `lucide-react` only.
- Reuse the dashboard tokens through `.app-shell` (`AppShell`); the global shadcn theme in `client/src/index.css` and `client/src/styles/landing.css` are not modified. Portaled content would use global shadcn tokens (none is used on this page).
- Accessibility: 4.5:1 contrast for text and status colors in light and dark (verified by a script in Task 5), visible focus rings, 44px controls, one h1 always (sr-only in the results state), `role="status"` live regions for progress and the verdict, icon-only controls labeled, focus moves to the results heading when results open, the spinner and transitions respect `prefers-reduced-motion`.
- Do not push. Commits stay local on `page-revamp` unless the user asks.
- Test files, the browser harness and any snapshots may be created for verification but must never be staged or committed. Every commit step stages explicit paths only; Task 5 deletes them all and checks `git status`.
- Commit messages end with the line: `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`

## Review Focus

1. **Fast response must not skip the steps:** with the response ready from the start, all four steps still show for at least 900 ms each and the results open about 4.1 s after the scan starts. Pinned by the `tick` tests in Task 1.
2. **Slow response must not fake completion:** the last step holds (spinner, not checked) until the response arrives, however long that takes. Pinned by the `tick` tests in Task 1.
3. **Failure mid-pacing:** a request that fails while the steps are playing must stop the timer, show the error toast and return to the file-selected state (no stuck spinner, no results, no timer left running after unmount). Pinned by the container code review step in Task 4 and the browser check in Task 5.
4. **Privacy copy drifting into unverified claims:** the line must keep matching what the server does and what the policy says. Pinned by the copy tests in Task 2 (exact line, link, forbidden phrases).
5. **A scan with no failures or warnings, or an empty extracted text:** the page must show the passed checks expanded (no empty "Needs attention" section) and the "No text could be extracted" message instead of a blank panel. Pinned by the tests in Task 3.

---

### Task 1: Types and pure logic

**Files:**
- Create: `client/src/components/ats/types.ts`
- Create: `client/src/components/ats/verdict-meta.ts`
- Create: `client/src/components/ats/findings.ts`
- Create: `client/src/components/ats/scan-progress.ts`
- Test (temporary, never committed): `client/src/components/ats/scan-logic.test.ts`

**Interfaces:**
- Produces (`types.ts`): `type Verdict = 'friendly' | 'partial' | 'not_friendly'`, `type CheckStatus = 'pass' | 'warn' | 'fail'`, `interface ScanCheck { id: string; label: string; status: CheckStatus; detail: string }`, `interface ScanResult { verdict: Verdict; score: number; parseTimeMs: number; pagesRead: number; totalPages: number; checks: ScanCheck[]; extractedText: string }`.
- Produces (`verdict-meta.ts`): `type Tone = 'pass' | 'warn' | 'fail'`, `VERDICT_META: Record<Verdict, { title: string; description: string; tone: Tone; Icon: LucideIcon }>`, `CHECK_META: Record<CheckStatus, { Icon: LucideIcon; tone: Tone; label: string }>`.
- Produces (`findings.ts`): `groupFindings(checks: ScanCheck[]): { attention: ScanCheck[]; passed: ScanCheck[] }` (failures before warnings, original order within each).
- Produces (`scan-progress.ts`): `SCAN_STEPS`, `STEP_MIN_MS`, `FINISH_BEAT_MS`, `TICK_MS`, `interface PacingState { step: number; elapsedInStep: number; finished: boolean; beatElapsed: number }`, `INITIAL_PACING`, `canAdvance(step, elapsedInStep, responseReady): boolean`, `tick(state, deltaMs, responseReady): { state: PacingState; reveal: boolean }`, `formatFileSize(bytes): string`, `stepDetail(step, file: { size: number }, result: ScanResult | null): string | null`.

- [ ] **Step 1: Write the failing test**

Create `client/src/components/ats/scan-logic.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { groupFindings } from './findings';
import {
  FINISH_BEAT_MS,
  INITIAL_PACING,
  SCAN_STEPS,
  STEP_MIN_MS,
  TICK_MS,
  canAdvance,
  formatFileSize,
  stepDetail,
  tick,
} from './scan-progress';
import type { PacingState } from './scan-progress';
import type { ScanCheck, ScanResult } from './types';

const check = (id: string, status: ScanCheck['status']): ScanCheck => ({ id, label: id, status, detail: `${id} detail` });

const result = (over: Partial<ScanResult> = {}): ScanResult => ({
  verdict: 'partial',
  score: 72,
  parseTimeMs: 1400,
  pagesRead: 2,
  totalPages: 2,
  checks: [check('a', 'pass'), check('b', 'warn'), check('c', 'fail'), check('d', 'pass')],
  extractedText: 'x'.repeat(1204),
  ...over,
});

// Runs ticks until the results would open; returns how many ms that took.
const msUntilReveal = (responseReadyAt: (elapsedMs: number) => boolean, limitMs = 120000) => {
  let state: PacingState = INITIAL_PACING;
  let elapsed = 0;
  while (elapsed < limitMs) {
    elapsed += TICK_MS;
    const out = tick(state, TICK_MS, responseReadyAt(elapsed));
    state = out.state;
    if (out.reveal) return elapsed;
  }
  return null;
};

describe('SCAN_STEPS', () => {
  it('keeps the original wording', () => {
    expect([...SCAN_STEPS]).toEqual([
      'Uploading your resume...',
      'Reading the text layer...',
      'Checking sections and structure...',
      'Evaluating results...',
    ]);
  });
});

describe('canAdvance', () => {
  it('needs the minimum time on every step', () => {
    for (let step = 0; step < SCAN_STEPS.length; step++) {
      expect(canAdvance(step, STEP_MIN_MS - 1, true)).toBe(false);
    }
  });

  it('advances steps 1 to 3 on time alone, but the last step also needs the response', () => {
    expect(canAdvance(0, STEP_MIN_MS, false)).toBe(true);
    expect(canAdvance(2, STEP_MIN_MS, false)).toBe(true);
    expect(canAdvance(3, STEP_MIN_MS, false)).toBe(false);
    expect(canAdvance(3, STEP_MIN_MS, true)).toBe(true);
  });
});

describe('tick', () => {
  it('a response that is already back still plays all four steps, then a short beat', () => {
    const total = msUntilReveal(() => true);
    expect(total).toBe(SCAN_STEPS.length * STEP_MIN_MS + FINISH_BEAT_MS);
  });

  it('a slow response holds the last step and never reveals early', () => {
    let state: PacingState = INITIAL_PACING;
    for (let i = 0; i < 300; i++) {
      const out = tick(state, TICK_MS, false); // 30 s with no response
      state = out.state;
      expect(out.reveal).toBe(false);
    }
    expect(state.step).toBe(SCAN_STEPS.length - 1);
    expect(state.finished).toBe(false);
  });

  it('opens the results about one beat after a late response arrives', () => {
    const total = msUntilReveal((elapsed) => elapsed >= 10000);
    expect(total).not.toBeNull();
    expect(total!).toBeGreaterThanOrEqual(10000 + FINISH_BEAT_MS);
    expect(total!).toBeLessThanOrEqual(10000 + FINISH_BEAT_MS + 2 * TICK_MS);
  });

  it('never skips a step, even for one very large tick', () => {
    const out = tick(INITIAL_PACING, 60000, true);
    expect(out.state.step).toBe(1);
    expect(out.reveal).toBe(false);
  });
});

describe('formatFileSize', () => {
  it('formats KB and MB', () => {
    expect(formatFileSize(188620)).toBe('184.2 KB');
    expect(formatFileSize(2 * 1024 * 1024)).toBe('2.00 MB');
  });
});

describe('stepDetail', () => {
  const file = { size: 188620 };

  it('shows the upload size immediately, and the rest only once the result exists', () => {
    expect(stepDetail(0, file, null)).toBe('184.2 KB uploaded');
    expect(stepDetail(1, file, null)).toBeNull();
    expect(stepDetail(2, file, null)).toBeNull();
    expect(stepDetail(3, file, null)).toBeNull();
  });

  it('reports real numbers from the result', () => {
    const r = result();
    expect(stepDetail(1, file, r)).toBe('2 of 2 pages read · 1,204 characters');
    expect(stepDetail(2, file, r)).toBe('4 checks run');
    expect(stepDetail(3, file, r)).toBe('Partially ATS-friendly');
  });

  it('uses singular nouns', () => {
    const r = result({ totalPages: 1, pagesRead: 1, checks: [check('a', 'pass')] });
    expect(stepDetail(1, file, r)).toContain('1 of 1 page read');
    expect(stepDetail(2, file, r)).toBe('1 check run');
  });
});

describe('groupFindings', () => {
  it('puts failures before warnings and keeps passed checks separate, preserving order', () => {
    const checks = [check('p1', 'pass'), check('w1', 'warn'), check('f1', 'fail'), check('w2', 'warn'), check('f2', 'fail'), check('p2', 'pass')];
    const { attention, passed } = groupFindings(checks);
    expect(attention.map((c) => c.id)).toEqual(['f1', 'f2', 'w1', 'w2']);
    expect(passed.map((c) => c.id)).toEqual(['p1', 'p2']);
  });

  it('handles all-pass and empty input', () => {
    expect(groupFindings([check('p', 'pass')]).attention).toEqual([]);
    expect(groupFindings([])).toEqual({ attention: [], passed: [] });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run (from `client/`): `npx vitest run src/components/ats/scan-logic.test.ts`
Expected: FAIL, "Failed to resolve import './findings'" (or "Cannot find module").

- [ ] **Step 3: Create `client/src/components/ats/types.ts`**

```ts
export type Verdict = 'friendly' | 'partial' | 'not_friendly';
export type CheckStatus = 'pass' | 'warn' | 'fail';

export interface ScanCheck {
  id: string;
  label: string;
  status: CheckStatus;
  detail: string;
}

export interface ScanResult {
  verdict: Verdict;
  score: number; // 0-100 readability score
  parseTimeMs: number;
  pagesRead: number;
  totalPages: number;
  checks: ScanCheck[];
  extractedText: string;
}
```

- [ ] **Step 4: Create `client/src/components/ats/verdict-meta.ts`**

```ts
import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { CheckStatus, Verdict } from './types';

export type Tone = 'pass' | 'warn' | 'fail';

export const VERDICT_META: Record<Verdict, { title: string; description: string; tone: Tone; Icon: LucideIcon }> = {
  friendly: {
    title: 'ATS-friendly',
    description: 'All of your resume data was read quickly and completely.',
    tone: 'pass',
    Icon: CheckCircle2,
  },
  partial: {
    title: 'Partially ATS-friendly',
    description: 'Most of your resume was read, but some data was slow or hard to read.',
    tone: 'warn',
    Icon: AlertTriangle,
  },
  not_friendly: {
    title: 'Not ATS-friendly',
    description: 'An ATS would likely miss or misread important parts of this resume.',
    tone: 'fail',
    Icon: XCircle,
  },
};

export const CHECK_META: Record<CheckStatus, { Icon: LucideIcon; tone: Tone; label: string }> = {
  pass: { Icon: CheckCircle2, tone: 'pass', label: 'Passed' },
  warn: { Icon: AlertTriangle, tone: 'warn', label: 'Warning' },
  fail: { Icon: XCircle, tone: 'fail', label: 'Failed' },
};
```

- [ ] **Step 5: Create `client/src/components/ats/findings.ts`**

```ts
import type { ScanCheck } from './types';

/** Failures first, then warnings (each in their original order); passed checks are kept apart. */
export function groupFindings(checks: ScanCheck[]): { attention: ScanCheck[]; passed: ScanCheck[] } {
  return {
    attention: [...checks.filter((c) => c.status === 'fail'), ...checks.filter((c) => c.status === 'warn')],
    passed: checks.filter((c) => c.status === 'pass'),
  };
}
```

- [ ] **Step 6: Create `client/src/components/ats/scan-progress.ts`**

```ts
import { VERDICT_META } from './verdict-meta';
import type { ScanResult } from './types';

// Scan progress steps shown while a scan is running (wording unchanged from the previous page)
export const SCAN_STEPS = [
  'Uploading your resume...',
  'Reading the text layer...',
  'Checking sections and structure...',
  'Evaluating results...',
] as const;

export const STEP_MIN_MS = 900;
export const FINISH_BEAT_MS = 500;
export const TICK_MS = 100;

const LAST_STEP = SCAN_STEPS.length - 1;

export interface PacingState {
  step: number; // the step currently on screen (0-based)
  elapsedInStep: number;
  finished: boolean; // every step is checked off
  beatElapsed: number;
}

export const INITIAL_PACING: PacingState = { step: 0, elapsedInStep: 0, finished: false, beatElapsed: 0 };

/** A step may be checked off after its minimum time; the last one also needs the API response. */
export const canAdvance = (step: number, elapsedInStep: number, responseReady: boolean): boolean =>
  elapsedInStep >= STEP_MIN_MS && (step < LAST_STEP || responseReady);

/**
 * Advances the pacing by one tick. At most one step is checked off per tick, so no step is ever skipped.
 * `reveal` turns true once all steps are done and the closing beat has passed.
 */
export function tick(state: PacingState, deltaMs: number, responseReady: boolean): { state: PacingState; reveal: boolean } {
  if (state.finished) {
    const beatElapsed = state.beatElapsed + deltaMs;
    return { state: { ...state, beatElapsed }, reveal: beatElapsed >= FINISH_BEAT_MS };
  }
  const elapsedInStep = state.elapsedInStep + deltaMs;
  if (!canAdvance(state.step, elapsedInStep, responseReady)) {
    return { state: { ...state, elapsedInStep }, reveal: false };
  }
  if (state.step === LAST_STEP) {
    return { state: { ...state, elapsedInStep: 0, finished: true }, reveal: false };
  }
  return { state: { ...state, step: state.step + 1, elapsedInStep: 0 }, reveal: false };
}

export const formatFileSize = (bytes: number): string =>
  bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / (1024 * 1024)).toFixed(2)} MB`;

/** One line of real data shown under a completed step; null until that data exists. */
export function stepDetail(step: number, file: { size: number }, result: ScanResult | null): string | null {
  if (step === 0) return `${formatFileSize(file.size)} uploaded`;
  if (!result) return null;
  if (step === 1) {
    const pages = result.totalPages === 1 ? 'page' : 'pages';
    return `${result.pagesRead} of ${result.totalPages} ${pages} read · ${result.extractedText.length.toLocaleString('en-US')} characters`;
  }
  if (step === 2) {
    const count = result.checks.length;
    return `${count} ${count === 1 ? 'check' : 'checks'} run`;
  }
  if (step === LAST_STEP) return VERDICT_META[result.verdict].title;
  return null;
}
```

- [ ] **Step 7: Run tests and type-check**

Run (from `client/`): `npx vitest run src/components/ats && npx tsc -b && npx eslint src/components/ats --ignore-pattern "**/*.test.ts"`
Expected: all tests PASS; tsc exit 0; eslint prints nothing. (If the "ms until reveal" test is off by one tick, fix `tick`, not the expectation: the closing beat starts on the tick after the last step is checked off, so the total is exactly `4 * 900 + 500` ms.)

- [ ] **Step 8: Commit (explicit paths; the test file is never staged)**

```bash
git add client/src/components/ats/types.ts client/src/components/ats/verdict-meta.ts client/src/components/ats/findings.ts client/src/components/ats/scan-progress.ts
git commit -m "$(cat <<'EOF'
feat(ats): add scan types, step pacing and findings grouping

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Styles and the scan-in-progress pieces

**Files:**
- Create: `client/src/styles/ats.css`
- Create: `client/src/components/ats/privacy-copy.ts`
- Create: `client/src/components/ats/PrivacyNote.tsx`
- Create: `client/src/components/ats/ScanDropzone.tsx`
- Create: `client/src/components/ats/ScanFileCard.tsx`
- Create: `client/src/components/ats/IdleSteps.tsx`
- Create: `client/src/components/ats/ScanProgress.tsx`
- Test (temporary, never committed): `client/src/components/ats/scan-parts.test.tsx`

**Interfaces:**
- Consumes: Task 1 (`SCAN_STEPS`, `stepDetail`, `formatFileSize`, `ScanResult`), `.app-*` and `.l-*` classes.
- Produces (`privacy-copy.ts`): `PRIVACY_COPY: { note: string; link: string }`.
- Produces: default exports `PrivacyNote()` (no props), `ScanDropzone({ maxSizeMb: number; onFile: (file: File | undefined) => void })`, `ScanFileCard({ file: File; onRemove?: () => void })`, `IdleSteps()` (no props), `ScanProgress({ step: number; finished: boolean; file: { size: number; name: string }; result: ScanResult | null })`.
- Produces (`ats.css`): `.ats-pass`, `.ats-warn`, `.ats-fail`, `.ats-bg-pass`, `.ats-bg-warn`, `.ats-bg-fail`, `.ats-chip`, `.ats-score`, `.ats-bar`, `.ats-bar__fill`, `.ats-drop`, `.ats-filethumb`, `.ats-step`, `.ats-dot`, `.ats-disclosure`, `.ats-pre`, and a disabled style for `.l-btn`.

- [ ] **Step 1: Write the failing test**

Create `client/src/components/ats/scan-parts.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import type { ReactElement } from 'react';
import PrivacyNote from './PrivacyNote';
import ScanDropzone from './ScanDropzone';
import ScanFileCard from './ScanFileCard';
import IdleSteps from './IdleSteps';
import ScanProgress from './ScanProgress';
import { PRIVACY_COPY } from './privacy-copy';
import type { ScanResult } from './types';

const noop = () => {};
const render = (node: ReactElement) => renderToStaticMarkup(<MemoryRouter>{node}</MemoryRouter>);
const file = { size: 188620, name: 'alex-morgan-resume.pdf' };
const result: ScanResult = {
  verdict: 'partial',
  score: 72,
  parseTimeMs: 1400,
  pagesRead: 2,
  totalPages: 2,
  checks: [
    { id: 'a', label: 'A', status: 'pass', detail: 'a' },
    { id: 'b', label: 'B', status: 'warn', detail: 'b' },
  ],
  extractedText: 'x'.repeat(1204),
};

describe('PrivacyNote', () => {
  it('says exactly the verified things and links to the privacy policy', () => {
    expect(PRIVACY_COPY.note).toBe(
      'Your PDF is read in memory to build this report and is not stored. We do not sell your personal information.',
    );
    const html = render(<PrivacyNote />);
    expect(html).toContain('is not stored');
    expect(html).toContain('We do not sell your personal information.');
    expect(html).toContain('href="/privacy-policy"');
  });

  it('never claims more than the server and the policy support', () => {
    const text = `${PRIVACY_COPY.note} ${PRIVACY_COPY.link}`.toLowerCase();
    for (const phrase of ['never shared', 'no one', 'nobody', 'encrypt', 'guarantee', 'deleted after', 'anonymous', 'third part']) {
      expect(text, phrase).not.toContain(phrase);
    }
  });
});

describe('ScanDropzone', () => {
  const html = render(<ScanDropzone maxSizeMb={5} onFile={noop} />);

  it('is a real button with the file limits, and the hidden input only accepts PDFs', () => {
    expect(html).toContain('<button');
    expect(html).toContain('Drag and drop your resume here');
    expect(html).toContain('PDF only, up to 5 MB');
    expect(html).toContain('accept="application/pdf,.pdf"');
    expect(html).toContain('aria-label="Choose a PDF resume"');
  });
});

describe('ScanFileCard', () => {
  it('shows the name and size, and a labeled Remove button only when removable', () => {
    const f = new File(['x'.repeat(188620)], 'alex-morgan-resume.pdf', { type: 'application/pdf' });
    const removable = render(<ScanFileCard file={f} onRemove={noop} />);
    expect(removable).toContain('alex-morgan-resume.pdf');
    expect(removable).toContain('184.2 KB');
    expect(removable).toContain('aria-label="Remove file"');
    expect(render(<ScanFileCard file={f} />)).not.toContain('Remove file');
  });
});

describe('IdleSteps', () => {
  it('lists the three analysis steps that run after the upload', () => {
    const html = render(<IdleSteps />);
    for (const label of ['Reading the text layer', 'Checking sections and structure', 'Evaluating results']) {
      expect(html).toContain(label);
    }
    expect(html).not.toContain('Uploading your resume');
    expect(html).toContain('After upload');
  });
});

describe('ScanProgress', () => {
  it('announces progress and marks done, current and upcoming steps', () => {
    const html = render(<ScanProgress step={1} finished={false} file={file} result={null} />);
    expect(html).toContain('role="status"');
    expect(html.split('data-state="done"').length - 1).toBe(1);
    expect(html.split('data-state="current"').length - 1).toBe(1);
    expect(html.split('data-state="todo"').length - 1).toBe(2);
    expect(html.split('aria-current="step"').length - 1).toBe(1);
  });

  it('shows the upload size under the first step but no data that does not exist yet', () => {
    const html = render(<ScanProgress step={2} finished={false} file={file} result={null} />);
    expect(html).toContain('184.2 KB uploaded');
    expect(html).not.toContain('characters');
    expect(html).not.toContain('checks run');
  });

  it('shows real numbers once the result exists and the step is done', () => {
    const html = render(<ScanProgress step={3} finished={false} file={file} result={result} />);
    expect(html).toContain('2 of 2 pages read · 1,204 characters');
    expect(html).toContain('2 checks run');
    expect(html).not.toContain('Partially ATS-friendly'); // the verdict line belongs to the last step, still running
  });

  it('when finished, every step is done and the verdict line appears', () => {
    const html = render(<ScanProgress step={3} finished={true} file={file} result={result} />);
    expect(html.split('data-state="done"').length - 1).toBe(4);
    expect(html).not.toContain('aria-current="step"');
    expect(html).toContain('Partially ATS-friendly');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run (from `client/`): `npx vitest run src/components/ats/scan-parts.test.tsx`
Expected: FAIL, "Failed to resolve import './PrivacyNote'".

- [ ] **Step 3: Create `client/src/styles/ats.css`**

```css
/* ATS scanner classes. Variables come from the .app-shell scope in landing.css. */

.app-shell {
  --ats-pass: #17673f;
  --ats-warn: #8a5300;
  --ats-fail: #b3261e;
}
.dark .app-shell {
  --ats-pass: #4cc38a;
  --ats-warn: #f0b24a;
  --ats-fail: #ff8a80;
}

.ats-pass { color: var(--ats-pass); }
.ats-warn { color: var(--ats-warn); }
.ats-fail { color: var(--ats-fail); }
.ats-bg-pass { background: var(--ats-pass); }
.ats-bg-warn { background: var(--ats-warn); }
.ats-bg-fail { background: var(--ats-fail); }

.ats-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.1875rem 0.625rem;
  border: 1px solid currentColor;
  border-radius: 6px;
  font-size: 0.8125rem;
  font-weight: 600;
}

.ats-score { font-size: 2.75rem; line-height: 1; font-weight: 600; letter-spacing: -0.04em; font-variant-numeric: tabular-nums; }
.ats-bar { height: 4px; overflow: hidden; border-radius: 2px; background: var(--l-surface-2); }
.ats-bar__fill { display: block; height: 100%; }

.ats-drop {
  display: flex;
  width: 100%;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 3rem 1.25rem;
  border: 1px dashed var(--l-hair-strong);
  border-radius: 10px;
  background: transparent;
  color: var(--l-muted);
  font: inherit;
  text-align: center;
  cursor: pointer;
  transition: background-color 150ms ease-out, border-color 150ms ease-out;
}
.ats-drop:hover, .ats-drop[data-active='true'] { background: var(--l-surface); border-color: var(--l-accent); }
.ats-drop__title { color: var(--l-ink); font-size: 1rem; font-weight: 600; }

.ats-filethumb {
  display: flex;
  width: 2rem;
  height: 2.5rem;
  flex: none;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--l-hair-strong);
  border-radius: 3px;
  background: var(--l-surface);
  color: var(--l-muted);
}

.ats-step { display: flex; align-items: flex-start; gap: 0.75rem; padding: 0.75rem 0; border-bottom: 1px solid var(--l-hair); }
.ats-step:last-child { border-bottom: 0; }
.ats-step__label { display: block; }
.ats-step__detail { display: block; margin-top: 0.125rem; font-size: 0.8125rem; }
.ats-step[data-state='todo'] .ats-step__label { color: var(--l-muted); }
.ats-step[data-state='current'] .ats-step__label { color: var(--l-ink); font-weight: 500; }
.ats-dot { display: block; width: 1rem; height: 1rem; border: 1px solid var(--l-hair-strong); border-radius: 50%; }

.ats-disclosure {
  display: flex;
  width: 100%;
  min-height: 2.75rem;
  align-items: center;
  gap: 0.5rem;
  padding: 0 0.875rem;
  border: 0;
  background: transparent;
  color: var(--l-ink);
  font: inherit;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
}

.ats-pre {
  margin: 0;
  max-height: 28rem;
  overflow: auto;
  padding: 0.875rem;
  background: var(--l-surface);
  color: var(--l-ink);
  font-family: ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace;
  font-size: 0.75rem;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

.l-btn:disabled { opacity: 0.55; cursor: not-allowed; }
```

- [ ] **Step 4: Create `client/src/components/ats/privacy-copy.ts`**

```ts
// Verified against the code and the policy: the upload is held in memory only (multer.memoryStorage, stateless
// route, local pdfjs-dist scanning), and the privacy policy says "We do not sell your personal information".
// It also allows sharing with service providers, legal authorities and with consent, so do NOT say "never shared".
export const PRIVACY_COPY = {
  note: 'Your PDF is read in memory to build this report and is not stored. We do not sell your personal information.',
  link: 'Read the Privacy Policy',
} as const;
```

- [ ] **Step 5: Create `client/src/components/ats/PrivacyNote.tsx`**

```tsx
import { Link } from 'react-router-dom';
import { PRIVACY_COPY } from './privacy-copy';

export default function PrivacyNote() {
  return (
    <p className="l-muted m-0 text-sm leading-relaxed">
      {PRIVACY_COPY.note}{' '}
      <Link to="/privacy-policy" className="l-link">
        {PRIVACY_COPY.link}
      </Link>
    </p>
  );
}
```

- [ ] **Step 6: Create `client/src/components/ats/ScanDropzone.tsx`**

```tsx
import { useRef, useState } from 'react';
import type { ChangeEvent, DragEvent } from 'react';
import { UploadCloud } from 'lucide-react';

interface ScanDropzoneProps {
  maxSizeMb: number;
  onFile: (file: File | undefined) => void;
}

export default function ScanDropzone({ maxSizeMb, onFile }: ScanDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
    onFile(event.dataTransfer.files?.[0]);
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onFile(event.target.files?.[0]);
    event.target.value = ''; // allow re-selecting the same file
  };

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(event) => {
        event.preventDefault();
        setDragActive(true);
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        setDragActive(false);
      }}
    >
      <button type="button" className="ats-drop" data-active={dragActive} onClick={() => inputRef.current?.click()}>
        <UploadCloud aria-hidden="true" className="size-6" />
        <span className="ats-drop__title">Drag and drop your resume here</span>
        <span>or browse &middot; PDF only, up to {maxSizeMb} MB</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        aria-label="Choose a PDF resume"
        onChange={handleChange}
      />
    </div>
  );
}
```

- [ ] **Step 7: Create `client/src/components/ats/ScanFileCard.tsx`**

```tsx
import { FileText, X } from 'lucide-react';
import { formatFileSize } from './scan-progress';

interface ScanFileCardProps {
  file: File;
  onRemove?: () => void;
}

export default function ScanFileCard({ file, onRemove }: ScanFileCardProps) {
  return (
    <div className="app-card flex items-center justify-between gap-4 p-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className="ats-filethumb" aria-hidden="true">
          <FileText className="size-4" />
        </div>
        <div className="min-w-0">
          <p className="l-ink m-0 truncate font-semibold">{file.name}</p>
          <p className="l-muted m-0 text-sm">{formatFileSize(file.size)}</p>
        </div>
      </div>
      {onRemove && (
        <button type="button" className="app-iconbtn" aria-label="Remove file" onClick={onRemove}>
          <X aria-hidden="true" className="size-4" />
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 8: Create `client/src/components/ats/IdleSteps.tsx`**

```tsx
import { SCAN_STEPS } from './scan-progress';

// The steps that run after the upload (the first step is the upload itself)
const ANALYSIS_STEPS = SCAN_STEPS.slice(1).map((label) => label.replace(/\.\.\.$/, ''));

export default function IdleSteps() {
  return (
    <div>
      <ol className="app-card m-0 grid list-none grid-cols-1 p-0 sm:grid-cols-3">
        {ANALYSIS_STEPS.map((label, index) => (
          <li key={label} className="l-border border-b p-3 text-sm last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
            <span className="l-eyebrow l-muted mb-1 block">Step {index + 1}</span>
            <span className="l-ink">{label}</span>
          </li>
        ))}
      </ol>
      <p className="l-muted m-0 mt-2 text-sm">After upload, the scanner runs these three steps on your file.</p>
    </div>
  );
}
```

- [ ] **Step 9: Create `client/src/components/ats/ScanProgress.tsx`**

```tsx
import { CheckCircle2, Loader2 } from 'lucide-react';
import { SCAN_STEPS, stepDetail } from './scan-progress';
import type { ScanResult } from './types';

interface ScanProgressProps {
  step: number;
  finished: boolean;
  file: { size: number; name: string };
  result: ScanResult | null;
}

export default function ScanProgress({ step, finished, file, result }: ScanProgressProps) {
  return (
    <div role="status" aria-live="polite" className="app-card px-4 py-1">
      <ol className="m-0 list-none p-0">
        {SCAN_STEPS.map((label, index) => {
          const done = finished || index < step;
          const current = !finished && index === step;
          const detail = done ? stepDetail(index, file, result) : null;
          return (
            <li
              key={label}
              className="ats-step"
              data-state={done ? 'done' : current ? 'current' : 'todo'}
              aria-current={current ? 'step' : undefined}
            >
              <span aria-hidden="true" className="mt-0.5">
                {done ? (
                  <CheckCircle2 className="ats-pass size-4" />
                ) : current ? (
                  <Loader2 className="l-accent size-4 animate-spin" />
                ) : (
                  <span className="ats-dot" />
                )}
              </span>
              <span>
                <span className="ats-step__label">{label}</span>
                {detail && <span className="l-muted ats-step__detail">{detail}</span>}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
```

- [ ] **Step 10: Run tests, type-check and lint**

Run (from `client/`): `npx vitest run src/components/ats && npx tsc -b && npx eslint src/components/ats --ignore-pattern "**/*.test.ts" --ignore-pattern "**/*.test.tsx"`
Expected: all tests PASS (Task 1 and Task 2); tsc exit 0; eslint prints nothing.

- [ ] **Step 11: Commit**

```bash
git add client/src/styles/ats.css client/src/components/ats/privacy-copy.ts client/src/components/ats/PrivacyNote.tsx client/src/components/ats/ScanDropzone.tsx client/src/components/ats/ScanFileCard.tsx client/src/components/ats/IdleSteps.tsx client/src/components/ats/ScanProgress.tsx
git commit -m "$(cat <<'EOF'
feat(ats): add dropzone, file card, step progress and privacy note

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Results pieces

**Files:**
- Create: `client/src/components/ats/VerdictCard.tsx`
- Create: `client/src/components/ats/FindingsList.tsx`
- Create: `client/src/components/ats/ExtractedTextPanel.tsx`
- Create: `client/src/components/ats/ScanResults.tsx`
- Test (temporary, never committed): `client/src/components/ats/scan-results.test.tsx`

**Interfaces:**
- Consumes: Task 1 (`ScanResult`, `ScanCheck`, `VERDICT_META`, `CHECK_META`, `groupFindings`), Task 2 CSS classes.
- Produces: default exports `VerdictCard({ result })`, `FindingsList({ checks })`, `ExtractedTextPanel({ text })`, `ScanResults({ result, fileName, onReset })`.

- [ ] **Step 1: Write the failing test**

Create `client/src/components/ats/scan-results.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import VerdictCard from './VerdictCard';
import FindingsList from './FindingsList';
import ExtractedTextPanel from './ExtractedTextPanel';
import ScanResults from './ScanResults';
import type { ScanCheck, ScanResult } from './types';

const noop = () => {};
const check = (id: string, status: ScanCheck['status']): ScanCheck => ({ id, label: `Label ${id}`, status, detail: `Detail ${id}` });
const result = (over: Partial<ScanResult> = {}): ScanResult => ({
  verdict: 'partial',
  score: 72,
  parseTimeMs: 1400,
  pagesRead: 2,
  totalPages: 2,
  checks: [check('p1', 'pass'), check('w1', 'warn'), check('f1', 'fail'), check('p2', 'pass')],
  extractedText: 'ALEX MORGAN\nBackend Engineer',
  ...over,
});

describe('VerdictCard', () => {
  const html = renderToStaticMarkup(<VerdictCard result={result()} />);

  it('shows the verdict, description, score and an accessible bar', () => {
    expect(html).toContain('Partially ATS-friendly');
    expect(html).toContain('Most of your resume was read');
    expect(html).toContain('>72<');
    expect(html).toContain('role="progressbar"');
    expect(html).toContain('aria-valuenow="72"');
    expect(html).toContain('width:72%');
  });

  it('shows the read time and pages on one line', () => {
    expect(html).toContain('1.4 s to read · 2 of 2 pages read');
  });

  it('uses the status color only through tone classes, never a gradient', () => {
    expect(html).toContain('ats-warn');
    expect(html).not.toMatch(/gradient|yellow/);
  });

  it('maps every verdict to its own tone', () => {
    expect(renderToStaticMarkup(<VerdictCard result={result({ verdict: 'friendly' })} />)).toContain('ats-pass');
    expect(renderToStaticMarkup(<VerdictCard result={result({ verdict: 'not_friendly' })} />)).toContain('ats-fail');
  });
});

describe('FindingsList', () => {
  it('lists failures before warnings under Needs attention, with passed checks collapsed', () => {
    const html = renderToStaticMarkup(<FindingsList checks={result().checks} />);
    expect(html).toContain('Needs attention · 2');
    expect(html.indexOf('Label f1')).toBeGreaterThan(-1);
    expect(html.indexOf('Label f1')).toBeLessThan(html.indexOf('Label w1'));
    expect(html).toContain('2 checks passed');
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain('Label p1');
  });

  it('labels each status with text as well as an icon', () => {
    const html = renderToStaticMarkup(<FindingsList checks={result().checks} />);
    expect(html).toContain('Failed');
    expect(html).toContain('Warning');
  });

  it('with nothing to fix, shows the passed checks expanded and no Needs attention section', () => {
    const html = renderToStaticMarkup(<FindingsList checks={[check('p1', 'pass'), check('p2', 'pass')]} />);
    expect(html).not.toContain('Needs attention');
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain('Label p1');
    expect(html).toContain('Label p2');
  });

  it('renders nothing for an empty list', () => {
    expect(renderToStaticMarkup(<FindingsList checks={[]} />)).not.toContain('<li');
  });
});

describe('ExtractedTextPanel', () => {
  it('shows the extracted text and the explanation', () => {
    const html = renderToStaticMarkup(<ExtractedTextPanel text={'ALEX MORGAN\nBackend Engineer'} />);
    expect(html).toContain('What the ATS sees');
    expect(html).toContain('ALEX MORGAN');
    expect(html).toContain('If it looks scrambled or incomplete, an ATS will see the same.');
  });

  it('shows the empty message instead of a blank panel', () => {
    expect(renderToStaticMarkup(<ExtractedTextPanel text="" />)).toContain('No text could be extracted from this file.');
  });

  it('on small screens the body is collapsed behind a labeled toggle', () => {
    const html = renderToStaticMarkup(<ExtractedTextPanel text="abc" />);
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('hidden lg:block');
  });
});

describe('ScanResults', () => {
  const html = renderToStaticMarkup(<ScanResults result={result()} fileName="alex-morgan-resume.pdf" onReset={noop} />);

  it('has the file name as a focusable heading, Scan another, and both columns', () => {
    expect(html).toContain('alex-morgan-resume.pdf');
    expect(html).toMatch(/<h2[^>]*tabindex="-1"/);
    expect(html).toContain('Scan another');
    expect(html).toContain('Needs attention');
    expect(html).toContain('What the ATS sees');
  });

  it('announces the verdict politely and has no h1 of its own', () => {
    expect(html).toContain('Scan complete. Partially ATS-friendly, score 72 out of 100.');
    expect(html).toContain('role="status"');
    expect(html).not.toContain('<h1');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run (from `client/`): `npx vitest run src/components/ats/scan-results.test.tsx`
Expected: FAIL, "Failed to resolve import './VerdictCard'".

- [ ] **Step 3: Create `client/src/components/ats/VerdictCard.tsx`**

```tsx
import { VERDICT_META } from './verdict-meta';
import type { ScanResult } from './types';

export default function VerdictCard({ result }: { result: ScanResult }) {
  const meta = VERDICT_META[result.verdict];
  const Icon = meta.Icon;
  const readLine = `${(result.parseTimeMs / 1000).toFixed(1)} s to read · ${result.pagesRead} of ${result.totalPages} pages read`;

  return (
    <section aria-label="Verdict" className="app-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <span className={`ats-chip ats-${meta.tone}`}>
            <Icon aria-hidden="true" className="size-4" />
            {meta.title}
          </span>
          <p className="l-muted m-0 mt-3 max-w-xs text-sm leading-relaxed">{meta.description}</p>
        </div>
        <p className="m-0 flex items-baseline gap-1 whitespace-nowrap">
          <span className="ats-score">{result.score}</span>
          <span className="l-muted">/100</span>
        </p>
      </div>
      <div
        className="ats-bar mt-4"
        role="progressbar"
        aria-label="Readability score"
        aria-valuenow={result.score}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <i className={`ats-bar__fill ats-bg-${meta.tone}`} style={{ width: `${result.score}%` }} />
      </div>
      <p className="l-muted m-0 mt-3 font-mono text-xs">{readLine}</p>
      <p className="l-muted m-0 mt-2 text-xs">Readability score: how completely and cleanly an ATS can read your file.</p>
    </section>
  );
}
```

- [ ] **Step 4: Create `client/src/components/ats/FindingsList.tsx`**

```tsx
import { useState } from 'react';
import { ChevronRight, CheckCircle2 } from 'lucide-react';
import { groupFindings } from './findings';
import { CHECK_META } from './verdict-meta';
import type { ScanCheck } from './types';

function FindingRow({ check }: { check: ScanCheck }) {
  const meta = CHECK_META[check.status];
  const Icon = meta.Icon;
  return (
    <li className="l-border flex gap-3 border-t px-4 py-3 first:border-t-0">
      <span className={`ats-${meta.tone} mt-0.5 shrink-0`}>
        <Icon aria-hidden="true" className="size-4" />
        <span className="sr-only">{meta.label}</span>
      </span>
      <div className="min-w-0">
        <p className="l-ink m-0 font-semibold">{check.label}</p>
        <p className="l-muted m-0 mt-0.5 text-sm leading-relaxed">{check.detail}</p>
      </div>
    </li>
  );
}

export default function FindingsList({ checks }: { checks: ScanCheck[] }) {
  const { attention, passed } = groupFindings(checks);
  // With nothing to fix, the passed checks are the whole story, so show them.
  const [showPassed, setShowPassed] = useState(attention.length === 0);
  const passedLabel = `${passed.length} ${passed.length === 1 ? 'check' : 'checks'} passed`;

  return (
    <div className="flex flex-col gap-4">
      {attention.length > 0 && (
        <section aria-labelledby="ats-attention">
          <h3 id="ats-attention" className="l-eyebrow l-muted m-0 mb-2">
            {`Needs attention · ${attention.length}`}
          </h3>
          <ul className="app-card m-0 list-none p-0">
            {attention.map((check) => (
              <FindingRow key={check.id} check={check} />
            ))}
          </ul>
        </section>
      )}

      {passed.length > 0 && (
        <section className="app-card">
          <button
            type="button"
            className="ats-disclosure"
            aria-expanded={showPassed}
            aria-controls="ats-passed"
            onClick={() => setShowPassed((value) => !value)}
          >
            <CheckCircle2 aria-hidden="true" className="ats-pass size-4" />
            {passedLabel}
            <ChevronRight aria-hidden="true" className={`ml-auto size-4 ${showPassed ? 'rotate-90' : ''}`} />
          </button>
          {showPassed && (
            <ul id="ats-passed" className="l-border m-0 list-none border-t p-0">
              {passed.map((check) => (
                <FindingRow key={check.id} check={check} />
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Create `client/src/components/ats/ExtractedTextPanel.tsx`**

```tsx
import { useState } from 'react';
import { ChevronRight } from 'lucide-react';

export default function ExtractedTextPanel({ text }: { text: string }) {
  // From lg up the panel is always open (and sticky); below that it starts collapsed behind a toggle.
  const [expanded, setExpanded] = useState(false);

  return (
    <section aria-labelledby="ats-text-title" className="app-card overflow-hidden lg:sticky lg:top-6">
      <button
        type="button"
        className="ats-disclosure l-border border-b lg:pointer-events-none"
        aria-expanded={expanded}
        aria-controls="ats-text-body"
        onClick={() => setExpanded((value) => !value)}
      >
        <span id="ats-text-title">What the ATS sees</span>
        <ChevronRight aria-hidden="true" className={`ml-auto size-4 lg:hidden ${expanded ? 'rotate-90' : ''}`} />
      </button>
      <div id="ats-text-body" className={expanded ? 'block' : 'hidden lg:block'}>
        <p className="l-muted m-0 px-4 pb-3 pt-3 text-sm leading-relaxed">
          This is the raw text extracted from your file. If it looks scrambled or incomplete, an ATS will see the same.
        </p>
        <pre className="ats-pre">{text || 'No text could be extracted from this file.'}</pre>
      </div>
    </section>
  );
}
```

- [ ] **Step 6: Create `client/src/components/ats/ScanResults.tsx`**

```tsx
import { useEffect, useRef } from 'react';
import { RotateCcw } from 'lucide-react';
import ExtractedTextPanel from './ExtractedTextPanel';
import FindingsList from './FindingsList';
import VerdictCard from './VerdictCard';
import { VERDICT_META } from './verdict-meta';
import type { ScanResult } from './types';

interface ScanResultsProps {
  result: ScanResult;
  fileName: string;
  onReset: () => void;
}

export default function ScanResults({ result, fileName, onReset }: ScanResultsProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Move focus to the results when they open, so keyboard and screen reader users land on them.
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="l-eyebrow l-muted m-0">Results</p>
          <h2 ref={headingRef} tabIndex={-1} className="app-title m-0 mt-1 break-words">
            {fileName}
          </h2>
        </div>
        <button type="button" className="l-btn l-btn--ghost" onClick={onReset}>
          <RotateCcw aria-hidden="true" className="size-4" />
          Scan another
        </button>
      </div>

      <p role="status" aria-live="polite" className="sr-only">
        {`Scan complete. ${VERDICT_META[result.verdict].title}, score ${result.score} out of 100.`}
      </p>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <VerdictCard result={result} />
          <FindingsList checks={result.checks} />
        </div>
        <ExtractedTextPanel text={result.extractedText} />
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Run tests, type-check and lint**

Run (from `client/`): `npx vitest run src/components/ats && npx tsc -b && npx eslint src/components/ats --ignore-pattern "**/*.test.ts" --ignore-pattern "**/*.test.tsx"`
Expected: all tests PASS; tsc exit 0; eslint prints nothing. (If a `>72<` or `1.4 s to read · ...` assertion fails because React inserted comment nodes between text parts, fix the component to render the value as one string, as written, rather than loosening the test.)

- [ ] **Step 8: Commit**

```bash
git add client/src/components/ats/VerdictCard.tsx client/src/components/ats/FindingsList.tsx client/src/components/ats/ExtractedTextPanel.tsx client/src/components/ats/ScanResults.tsx
git commit -m "$(cat <<'EOF'
feat(ats): add verdict card, findings list, extracted text panel and results view

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Container rewrite, footer hide and build

**Files:**
- Modify (full replace): `client/src/pages/ATSScanner.tsx`
- Modify: `client/src/routes.tsx` (one added condition)
- Test (temporary, never committed): `client/src/components/ats/ats-page.test.tsx`

**Interfaces:**
- Consumes: everything from Tasks 1 to 3, `AppShell`, `client` (axios instance), `getCsrfToken`.
- Produces: default export `ATSScanner` (route element for `/ats-scanner`, already lazy-imported by `routes.tsx`).

- [ ] **Step 1: Write the failing test**

Create `client/src/components/ats/ats-page.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/components/ThemeToggle', () => ({ default: () => null }));

import ATSScanner from '@/pages/ATSScanner';

describe('ATS scanner page (first render)', () => {
  const html = renderToStaticMarkup(
    <MemoryRouter initialEntries={['/ats-scanner']}>
      <ATSScanner />
    </MemoryRouter>,
  );

  it('renders inside the app shell with ATS scanner as the current destination', () => {
    expect(html).toContain('app-shell');
    const current = (html.match(/<a [^>]*>/g) ?? []).filter((tag) => tag.includes('aria-current="page"'));
    expect(current).toHaveLength(1);
    expect(current[0]).toContain('href="/ats-scanner"');
  });

  it('starts idle: one h1, the dropzone, the analysis steps and the privacy note', () => {
    expect(html.split('<h1').length - 1).toBe(1);
    expect(html).toContain('ATS scanner');
    expect(html).toContain('Drag and drop your resume here');
    expect(html).toContain('After upload');
    expect(html).toContain('is not stored');
    expect(html).toContain('href="/privacy-policy"');
    expect(html).not.toContain('Scan resume');
  });

  it('has none of the old styling, back button or floating logout', () => {
    expect(html).not.toMatch(/gradient|yellow|Back to Dashboard|fixed bottom-6/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run (from `client/`): `npx vitest run src/components/ats/ats-page.test.tsx`
Expected: FAIL (3 failures against the old page: no `app-shell`, `gradient`/`yellow` present).

- [ ] **Step 3: Replace `client/src/pages/ATSScanner.tsx` entirely**

```tsx
import React, { useEffect, useRef, useState } from 'react';
import { ScanText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import client from '@/api/axiosInstance';
import { getCsrfToken } from '@/utils/helper';
import AppShell from '@/components/app-shell/AppShell';
import IdleSteps from '@/components/ats/IdleSteps';
import PrivacyNote from '@/components/ats/PrivacyNote';
import ScanDropzone from '@/components/ats/ScanDropzone';
import ScanFileCard from '@/components/ats/ScanFileCard';
import ScanProgress from '@/components/ats/ScanProgress';
import ScanResults from '@/components/ats/ScanResults';
import { INITIAL_PACING, TICK_MS, tick } from '@/components/ats/scan-progress';
import type { PacingState } from '@/components/ats/scan-progress';
import type { ScanResult } from '@/components/ats/types';
import '@/styles/ats.css';

const MAX_FILE_SIZE_MB = 5;
const ACCEPTED_TYPES = ['application/pdf'];

const getScanErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { error?: string; retryAfter?: number } | undefined;
    if (error.response?.status === 429) {
      const minutes = Math.ceil((data?.retryAfter ?? 1800) / 60);
      return `You've reached the scan limit. Please try again in about ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}.`;
    }
    if (error.response?.status === 401 || error.response?.status === 403) {
      return 'Your session has expired or is invalid. Please sign in again.';
    }
    if (data?.error) return data.error;
  }
  if (error instanceof Error) return error.message;
  return 'Something went wrong while scanning your resume.';
};

const ATSScanner: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [scanning, setScanning] = useState(false);
  const [pacing, setPacing] = useState<PacingState>(INITIAL_PACING);
  const [pendingResult, setPendingResult] = useState<ScanResult | null>(null); // the response, held until the steps finish
  const [result, setResult] = useState<ScanResult | null>(null); // revealed results

  const pacingRef = useRef<PacingState>(INITIAL_PACING);
  const pendingRef = useRef<ScanResult | null>(null);
  const tickTimer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const stopTicking = () => {
    clearInterval(tickTimer.current);
    tickTimer.current = undefined;
  };

  useEffect(() => {
    toast.dismiss();
    return stopTicking; // don't leave the timer running after leaving the page
  }, []);

  const validateFile = (candidate: File): boolean => {
    if (!ACCEPTED_TYPES.includes(candidate.type)) {
      toast.error('Only PDF files are supported.');
      return false;
    }
    if (candidate.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      toast.error(`File is too large. Maximum size is ${MAX_FILE_SIZE_MB} MB.`);
      return false;
    }
    return true;
  };

  const handleFileSelected = (candidate: File | undefined) => {
    if (!candidate || !validateFile(candidate)) return;
    setFile(candidate);
    setResult(null);
  };

  const handleRemoveFile = () => {
    setFile(null);
    setResult(null);
  };

  // The API is a single request, so the steps are paced locally: each shows for a minimum time, the last one
  // also waits for the response, and the results open only after every step has been checked off.
  const startPacing = () => {
    stopTicking();
    pacingRef.current = INITIAL_PACING;
    setPacing(INITIAL_PACING);
    tickTimer.current = setInterval(() => {
      const next = tick(pacingRef.current, TICK_MS, pendingRef.current !== null);
      pacingRef.current = next.state;
      setPacing(next.state);
      if (next.reveal) {
        stopTicking();
        setResult(pendingRef.current);
        setScanning(false);
      }
    }, TICK_MS);
  };

  // Upload the PDF and show what an ATS would read from it
  const handleScan = async () => {
    if (!file || scanning) return;

    setScanning(true);
    pendingRef.current = null;
    setPendingResult(null);
    startPacing();

    try {
      await getCsrfToken();
      const formData = new FormData();
      formData.append('resume', file);

      const response = await client.post<{ success: boolean; result: ScanResult }>('/ats/scan', formData);
      pendingRef.current = response.data.result;
      setPendingResult(response.data.result);
    } catch (error) {
      console.error('ATS scan failed:', error);
      toast.error(getScanErrorMessage(error));
      stopTicking();
      setScanning(false);
      setPacing(INITIAL_PACING);
    }
  };

  // Clear the current file and result so the user can scan another resume
  const handleReset = () => {
    setFile(null);
    setResult(null);
    setPendingResult(null);
    pendingRef.current = null;
  };

  const phase = result ? 'results' : scanning ? 'scanning' : file ? 'selected' : 'idle';

  return (
    <AppShell>
      <div className="w-full px-4 py-8 sm:px-8 lg:px-10 lg:py-12">
        {phase === 'results' && result ? (
          <>
            <h1 className="sr-only">ATS scanner</h1>
            <ScanResults result={result} fileName={file?.name ?? 'Your resume'} onReset={handleReset} />
          </>
        ) : (
          <>
            <header className="mb-8">
              <h1 className="app-title m-0">ATS scanner</h1>
              <p className="l-muted m-0 mt-1 text-sm">Upload your resume and see if an ATS can read it.</p>
            </header>

            <div className="flex max-w-2xl flex-col gap-4">
              {phase === 'idle' && (
                <>
                  <ScanDropzone maxSizeMb={MAX_FILE_SIZE_MB} onFile={handleFileSelected} />
                  <IdleSteps />
                  <PrivacyNote />
                </>
              )}

              {file && phase !== 'idle' && (
                <ScanFileCard file={file} onRemove={phase === 'selected' ? handleRemoveFile : undefined} />
              )}

              {file && phase === 'scanning' && (
                <ScanProgress step={pacing.step} finished={pacing.finished} file={file} result={pendingResult} />
              )}

              {file && (phase === 'selected' || phase === 'scanning') && (
                <button
                  type="button"
                  className="l-btn l-btn--primary w-full"
                  onClick={handleScan}
                  disabled={scanning}
                  aria-busy={scanning || undefined}
                >
                  {scanning ? (
                    <>
                      <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                      Scanning...
                    </>
                  ) : (
                    <>
                      <ScanText aria-hidden="true" className="size-4" />
                      Scan resume
                    </>
                  )}
                </button>
              )}

              {phase === 'selected' && <PrivacyNote />}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
};

export default ATSScanner;
```

- [ ] **Step 4: Hide the global footer on `/ats-scanner` in `client/src/routes.tsx`**

The condition currently contains `!location.pathname.startsWith('/cl-dashboard') && `. Insert `!location.pathname.startsWith('/ats-scanner') && ` right after it, so that part reads:

```tsx
!location.pathname.startsWith('/dashboard') && !location.pathname.startsWith('/cl-dashboard') && !location.pathname.startsWith('/ats-scanner') && !location.pathname.startsWith('/preview') && ...
```

(Keep the rest of the line exactly as it is.)

- [ ] **Step 5: Review the failure path by reading the code**

Confirm by reading `handleScan` and the interval callback that, on a failed request: the interval is stopped (`stopTicking()`), `scanning` is false, pacing is reset, the toast shows `getScanErrorMessage(error)`, `file` is kept (so the page returns to the file-selected state), and no result is revealed (`pendingRef.current` stays null so `tick` can never finish the last step). Also confirm the unmount effect returns `stopTicking`. If any of these does not hold, fix it before continuing.

- [ ] **Step 6: Type-check, lint, run all temporary tests, build**

Run (from `client/`): `npx tsc -b && npx eslint src/pages/ATSScanner.tsx src/routes.tsx src/components/ats --ignore-pattern "**/*.test.ts" --ignore-pattern "**/*.test.tsx" && npx vitest run && npx vite build --outDir node_modules/.tmp/ats-build --emptyOutDir`
Expected: tsc exit 0; eslint prints nothing (the new page has no hook-dependency warnings: its only effect has an empty dependency array); all temporary tests PASS (Tasks 1 to 4 and any left from earlier plans); the build completes (the chunk-size warning is the app's existing bundle). Then `rm -rf node_modules/.tmp/ats-build`.

- [ ] **Step 7: Commit**

```bash
git add client/src/pages/ATSScanner.tsx client/src/routes.tsx
git commit -m "$(cat <<'EOF'
feat(ats): redesign ATS scanner with step-by-step scan and side-by-side results

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Verification and cleanup

**Files:**
- Create (scratch only, outside the repo): a contrast script in the session scratchpad directory
- Create (temporary harness, never committed): `client/harness.html`, `client/src/harness.tsx`
- Delete: the harness, every `*.test.ts(x)` created in Tasks 1 to 4, and the build output
- No product code changes unless a check fails (then fix in the owning file, re-run, and commit that fix separately)

- [ ] **Step 1: Contrast check of the status colors**

Write this to the scratchpad directory as `ats-contrast.mjs` and run it with `node`:

```js
const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const pairs = {
  'light pass on bg': ['#17673f', '#ffffff'], 'light pass on surface': ['#17673f', '#f6f5f2'],
  'light warn on bg': ['#8a5300', '#ffffff'], 'light warn on surface': ['#8a5300', '#f6f5f2'],
  'light fail on bg': ['#b3261e', '#ffffff'], 'light fail on surface': ['#b3261e', '#f6f5f2'],
  'dark pass on bg': ['#4cc38a', '#0b0b0c'], 'dark pass on surface': ['#4cc38a', '#151517'],
  'dark warn on bg': ['#f0b24a', '#0b0b0c'], 'dark warn on surface': ['#f0b24a', '#151517'],
  'dark fail on bg': ['#ff8a80', '#0b0b0c'], 'dark fail on surface': ['#ff8a80', '#151517'],
};
let bad = 0;
for (const [name, [fg, bg]] of Object.entries(pairs)) {
  const r = ratio(fg, bg);
  if (r < 4.5) bad++;
  console.log(`${r.toFixed(2)}  ${r >= 4.5 ? 'ok  ' : 'FAIL'}  ${name}`);
}
process.exit(bad ? 1 : 0);
```

Expected: every line `ok`, exit 0. If any fails, adjust that token in `ats.css` (both blocks as needed), re-run.

- [ ] **Step 2: Create the harness (real page, fake API)**

Create `client/harness.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link href="https://fonts.googleapis.com/css2?family=Geist:wght@100..900&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="/src/index.css" />
    <title>ATS harness</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/harness.tsx"></script>
  </body>
</html>
```

Create `client/src/harness.tsx` (it renders the real `ATSScanner` and replaces the HTTP layer with an adapter; the URL query picks the behavior: `?delay=<ms>` response delay, default 0; `?fail=429|401|500` to fail; `?clean=1` for a result with no failures or warnings; `?empty=1` for empty extracted text):

```tsx
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';
import client from './api/axiosInstance';
import { ThemeProvider } from './contexts/ThemeContext';
import ATSScanner from './pages/ATSScanner';

const params = new URLSearchParams(location.search);
const delay = Number(params.get('delay') ?? 0);
const fail = params.get('fail');

const TEXT = 'ALEX MORGAN\nBackend Engineer\nalex.morgan@example.com | Portland, OR\n\nSUMMARY\nBackend engineer building reliable APIs and data pipelines.\n\nEXPERIENCE\nSenior Backend Engineer, Northwind Freight\n2021 - Present\n- Led the move of the order service to an event-driven design.\n';
const checks = params.get('clean')
  ? [
      { id: 'text', label: 'Text layer', status: 'pass', detail: 'Selectable text was found on every page.' },
      { id: 'sections', label: 'Section headings', status: 'pass', detail: 'Summary and Experience were identified.' },
    ]
  : [
      { id: 'contact', label: 'Contact details', status: 'fail', detail: 'No phone number was found in the text layer.' },
      { id: 'sections', label: 'Section headings', status: 'warn', detail: 'Skills could not be identified as its own section.' },
      { id: 'order', label: 'Reading order', status: 'warn', detail: 'Some lines appear out of order.' },
      { id: 'text', label: 'Text layer', status: 'pass', detail: 'Selectable text was found on every page.' },
      { id: 'pages', label: 'Pages', status: 'pass', detail: 'All pages were read.' },
    ];
const result = {
  verdict: params.get('clean') ? 'friendly' : 'partial',
  score: params.get('clean') ? 96 : 72,
  parseTimeMs: 1400,
  pagesRead: 2,
  totalPages: 2,
  checks,
  extractedText: params.get('empty') ? '' : TEXT,
};

// Fake HTTP layer: csrf token and scan only.
client.defaults.adapter = async (config) => {
  const url = config.url ?? '';
  const respond = (status: number, data: unknown) => ({ data, status, statusText: String(status), headers: {}, config });
  if (url.includes('csrf-token')) return respond(200, { csrfToken: 'harness' });
  await new Promise((resolve) => setTimeout(resolve, delay));
  if (fail) {
    const error = Object.assign(new Error('Request failed'), {
      isAxiosError: true,
      response: respond(Number(fail), fail === '429' ? { retryAfter: 600 } : { error: 'Scan failed in the harness.' }),
    });
    throw error;
  }
  return respond(200, { success: true, result });
};

createRoot(document.getElementById('root')!).render(
  <ThemeProvider>
    <MemoryRouter initialEntries={['/ats-scanner']}>
      <Toaster position="top-right" />
      <Routes>
        <Route path="*" element={<ATSScanner />} />
      </Routes>
    </MemoryRouter>
  </ThemeProvider>,
);
```

- [ ] **Step 3: Start the dev server**

Run (from `client/`, in the background): `yarn dev`
Expected: Vite prints a local URL; note the port. The harness is at `<url>/harness.html`.

- [ ] **Step 4: Browser pass (Claude in Chrome tools; skip and say so if the user declines browser use)**

Open `<url>/harness.html?delay=0` and choose any small PDF file (the harness accepts any real PDF; a one-page PDF is fine). Check, in light and dark at widths 375, 768 and 1440:
- Idle: sidebar with ATS scanner active, drop zone, the three analysis steps, the privacy line with its link; no horizontal scroll.
- Click Scan resume with `delay=0`: all four steps play through visibly (about 0.9 s each), each completed step shows its data line, then after the last step and a short beat the results open. Total about 4 s even though the fake API answered instantly.
- Open `?delay=8000`: the last step holds with a spinner until the response arrives, then finishes and opens the results.
- `?fail=429`, `?fail=401`, `?fail=500`: the matching error toast appears, the steps stop, and the page is back at the file-selected state with the Scan button enabled.
- Results (`?delay=0`): focus is on the file name heading; failures listed before warnings; "2 checks passed" collapsed and expandable by keyboard; extracted text panel beside the findings (sticky at 1440px); at 375px the text panel is collapsed behind its toggle. `?clean=1`: passed checks expanded and no "Needs attention" section. `?empty=1`: "No text could be extracted from this file."
- Keyboard: Tab order is skip link, sidebar, drop zone button, then the page; every focused element shows a ring.
- No horizontal scroll at any width: run `document.documentElement.scrollWidth <= window.innerWidth`.

- [ ] **Step 5: Stop the dev server, delete every temporary file, verify the tree**

```bash
rm -f client/harness.html client/src/harness.tsx
find client/src -name "*.test.ts" -o -name "*.test.tsx" | xargs rm -f
rm -rf client/node_modules/.tmp/ats-build
git status --short
git ls-files | grep -E '\.test\.|harness|__snapshots__' || echo "no test or harness files tracked"
```

Expected: `git status --short` prints nothing (clean) and the second command prints `no test or harness files tracked`. If anything else is listed, resolve it before reporting.

- [ ] **Step 6: Report**

Summarize faithfully: which checks passed, anything skipped (for example the browser pass, if declined), the commits on `page-revamp`, and that nothing was pushed. State plainly that the real upload and scan against the live API was not exercised (no sign-in possible here) and ask the user to click through it once, watching that the four steps play out and the results open afterward, and that the privacy line reads correctly.
