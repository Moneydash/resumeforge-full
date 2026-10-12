# Resume Editor Top Bar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the chrome of the resume editor (`/preview`) with a single top bar, a labeled section rail, a calm canvas and the shared loader, while keeping every line of the page's logic exactly as it is.

**Architecture:** Two presentational components (`EditorTopBar`, `SectionRail`) plus pure status helpers live in `client/src/components/editor-chrome/`, styled by `client/src/styles/editor-chrome.css` on top of the shared `.app-shell` tokens. `Preview.tsx` changes markup only, in four small slices, each its own commit. A temporary guard test fingerprints the page's logic section and checks the wiring after every slice.

**Tech Stack:** React 19, Vite 6, Tailwind 4 (layout utilities only), `lucide-react`, Radix tooltip (already used), Vitest 5 in the `node` environment (tests use `react-dom/server` and plain file reads).

**Spec:** [docs/superpowers/specs/2026-10-12-editor-top-bar-design.md](../specs/2026-10-12-editor-top-bar-design.md)

All paths are relative to the repo root. Run client commands from `client/`. Work happens on branch `preview-page-revamp`.

## Global Constraints

- **The logic workflow must not change (the user's condition).** Everything in `client/src/pages/Preview.tsx` from `const Preview: React.FC = () => {` up to (not including) the line `  return (` stays byte-for-byte identical. Baseline: 384 lines, SHA-256 `28fbe2121b0afbdbe5cd12ae6cf2f673abb19ab3110c78ca236dbc365d801fd2` (computed on the LF-normalized text). Imports above that region may change (unused icons and components are removed). If the guard fails, stop and undo the change; never edit the logic to make a test pass.
- **Line endings:** `Preview.tsx` has CRLF line endings in the working tree. Every edit goes through the helper script in Task 2 Step 1, which converts to LF, applies exact replacements and writes CRLF back. Do not use editors or tools that rewrite line endings, and do not leave mixed endings (check with the guard test).
- **Rail width stays exactly 48px (`w-12` / `3rem`):** the resize effect computes `clientX - 48`.
- **Scroll-to-section depends on the DOM:** the form column div keeps the class `relative`, and the element with `ref={formContainerRef}` keeps its class string `flex-1 overflow-y-auto px-6 py-4 scroll-smooth no-scrollbar` and gets no `relative`, `absolute`, `fixed` or `sticky` (its `offsetTop` arithmetic relies on the column being the offset parent). The new column header must not be positioned either.
- **Heights:** the root stays `h-screen w-full flex flex-col overflow-hidden`; the top bar is a 3.5rem (`h-14`), non-shrinking first child; the existing content container keeps `flex-1`; the form column keeps `h-1/2 lg:h-full`; the width arithmetic (`window.innerWidth >= 1024`, `calc(100% - ${sidebarWidth}px - ${designOpen ? DESIGN_PANEL_WIDTH : 0}px)`) is untouched.
- **Handlers keep their exact arguments:** `handleExportPDF({ ...resumeData, sectionLayout: sectionLayoutRef.current, sectionTitles: sectionTitlesRef.current, fontFamily: fontFamilyRef.current, colorTheme: colorThemeRef.current })` appears exactly once in `Preview.tsx`; `redirectResumes`, `setDesignOpen`, `scrollToSection`, `startResize`, `handleFormSubmit`, the `ResumeForm` props and the `DesignPanel` props are wired exactly as today; `id="exportButton"` exists exactly once across `Preview.tsx` and `EditorTopBar.tsx`.
- **Template label value:** the top bar shows the same value the page shows today: `Template: ` plus the template id with underscores replaced by spaces and each word capitalized (`(template || 'andromeda').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())`). (The mockup showed a sample product name; the real value is today's.)
- **Out of scope:** the Design panel, `ResumeForm` and its class strings, the resume template renderers, PDF generation, `/cl-preview`, the existing Lexical `client/src/styles/editor.css` and `client/src/components/editor/`.
- Status colors must meet 4.5:1 in light and dark (values below are the ones already verified on the other pages). No gradients, no glass blur, no emoji; icons from `lucide-react` only.
- Do not push. Commits stay local on `preview-page-revamp` unless the user asks.
- Test files and any harness must never be staged or committed. Every commit step stages explicit paths only; the final task deletes them and checks `git status`.
- Commit messages end with the line: `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`

## Review Focus

1. **Logic region drift:** any accidental edit between the component's first line and `return (` (imports excepted). Pinned by the fingerprint test (Task 0, re-run after every slice).
2. **Broken scroll-to-section:** adding `relative` or any positioning to the scroll container, or removing `relative` from the form column. Pinned by the DOM invariants test (Task 0).
3. **Resize math off by the rail width:** changing the rail's width. Pinned by the rail width test (Task 0 for the old rail, Task 1 for the new CSS).
4. **Export button duplicated or lost:** two `id="exportButton"` elements, or the export call changing arguments. Pinned by the wiring test (Task 0).
5. **Top bar overflowing on narrow screens or hiding actions:** icon-only buttons below `md` must keep accessible names, and the status and template text must drop out instead of wrapping. Pinned by the top bar tests (Task 1) and the manual narrow-window check each slice.

---

### Task 0: Guard tests (temporary) and a green baseline

**Files:**
- Create (temporary, never committed): `client/src/components/editor-chrome/preview-guard.test.ts`

These tests must pass **before** any change (they are characterization tests, so they start green) and after every slice.

- [ ] **Step 1: Write the guard test**

Create `client/src/components/editor-chrome/preview-guard.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const here = (relative: string) => fileURLToPath(new URL(relative, import.meta.url));
const read = (relative: string) => readFileSync(here(relative), 'utf-8').replace(/\r\n/g, '\n'); // CRLF-safe
const preview = () => read('../../pages/Preview.tsx');
const topBarPath = '../editor-chrome/EditorTopBar.tsx';
const count = (haystack: string, needle: string) => haystack.split(needle).length - 1;

const LOGIC_SHA256 = '28fbe2121b0afbdbe5cd12ae6cf2f673abb19ab3110c78ca236dbc365d801fd2';

const logicSection = (source: string) => {
  const start = source.indexOf('const Preview: React.FC = () => {');
  const end = source.indexOf('\n  return (\n', start);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end);
};

describe('the logic workflow is untouched', () => {
  it('the logic section is byte-for-byte the baseline', () => {
    const logic = logicSection(preview());
    expect(logic.split('\n').length).toBe(384);
    expect(createHash('sha256').update(logic, 'utf8').digest('hex')).toBe(LOGIC_SHA256);
  });

  it('the file has consistent line endings (no mixed CRLF and LF)', () => {
    const raw = readFileSync(here('../../pages/Preview.tsx'), 'utf-8');
    const crlf = count(raw, '\r\n');
    const lf = count(raw, '\n') - crlf;
    expect(lf === 0 || crlf === 0, `crlf=${crlf} lf=${lf}`).toBe(true);
  });
});

describe('the wiring is intact', () => {
  const source = preview();

  it('id="exportButton" exists exactly once across the page and the top bar', () => {
    const topBar = existsSync(here(topBarPath)) ? read(topBarPath) : '';
    expect(count(source, 'id="exportButton"') + count(topBar, 'id="exportButton"')).toBe(1);
  });

  it('the export call keeps its exact arguments, once', () => {
    const call =
      'handleExportPDF({ ...resumeData, sectionLayout: sectionLayoutRef.current, sectionTitles: sectionTitlesRef.current, fontFamily: fontFamilyRef.current, colorTheme: colorThemeRef.current })';
    expect(count(source, call)).toBe(1);
  });

  it('the page still wires the dashboard redirect, the design toggle, section scrolling and resizing', () => {
    expect(source).toContain('redirectResumes');
    expect(source).toContain('setDesignOpen((open) => !open)');
    expect(source).toContain('scrollToSection');
    expect(source).toContain('onMouseDown={startResize}');
    expect(source).toContain('onTouchStart={startResize}');
  });

  it('the ResumeForm props and all twelve section refs are still passed', () => {
    for (const prop of ['onSubmit={handleFormSubmit}', 'loading={loading}', 'liveEdit={liveEdit}', 'template={template}']) {
      expect(source, prop).toContain(prop);
    }
    const block = source.slice(source.indexOf('sectionRefs={{'), source.indexOf('}}', source.indexOf('sectionRefs={{')));
    for (const name of ['personal', 'summary', 'socials', 'experience', 'education', 'skills', 'languages', 'interests', 'projects', 'awards', 'certifications', 'references']) {
      expect(block, name).toContain(`${name}Ref,`);
    }
  });

  it('the DesignPanel is rendered with exactly the same props', () => {
    for (const prop of [
      '{designOpen && (',
      'tab={designTab}',
      'onTabChange={setDesignTab}',
      'onClose={() => setDesignOpen(false)}',
      'isDarkMode={isDarkMode}',
      'template={activeTemplate}',
      'fontSaved={fontFamily}',
      'onFontChange={handleFontChange}',
      'sections={{ template: activeTemplate, data: resumeData, layout: sectionLayout, onChange: handleLayoutChange, titles: sectionTitles, onTitlesChange: handleTitlesChange }}',
      'color={isColorTemplate(activeTemplate) ? { template: activeTemplate, theme: colorTheme, onChange: handleColorChange } : undefined}',
      "templates={{ kind: 'resume', current: activeTemplate, onSelect: handleTemplateChange }}",
    ]) {
      expect(source, prop).toContain(prop);
    }
  });

  it('the layout arithmetic and the PDF iframe are unchanged', () => {
    expect(source).toContain("width: window.innerWidth >= 1024 ? `${sidebarWidth}px` : '100%'");
    expect(source).toContain("minWidth: window.innerWidth >= 1024 ? `${sidebarMin}px` : 'auto'");
    expect(source).toContain("maxWidth: window.innerWidth >= 1024 ? `${sidebarMax}px` : 'none'");
    expect(source).toContain("transition: isResizing ? 'none' : 'width 0.15s cubic-bezier(.4,2,.6,1)'");
    expect(source).toContain('calc(100% - ${sidebarWidth}px - ${designOpen ? DESIGN_PANEL_WIDTH : 0}px)');
    expect(source).toContain('src={`${pdfUrl}#sidebar=0&zoom=100&toolbar=0`}');
    expect(source).toContain('title="Resume Preview"');
  });
});

describe('DOM invariants that scroll-to-section and resizing rely on', () => {
  const source = preview();

  it('the form scroll container keeps its class string and is not positioned', () => {
    const at = source.indexOf('ref={formContainerRef}');
    expect(at).toBeGreaterThan(-1);
    const tag = source.slice(at, source.indexOf('>', at));
    expect(tag).toContain('className="flex-1 overflow-y-auto px-6 py-4 scroll-smooth no-scrollbar"');
    expect(tag).not.toMatch(/\b(relative|absolute|fixed|sticky)\b/);
  });

  it('the form column stays position: relative', () => {
    const styleAt = source.indexOf("width: window.innerWidth >= 1024 ? `${sidebarWidth}px`");
    const columnStart = source.lastIndexOf('<div', styleAt);
    const columnOpening = source.slice(columnStart, styleAt);
    expect(columnOpening).toMatch(/\brelative\b/);
  });

  it('the rail is exactly 48px wide (the resize math subtracts 48)', () => {
    const css = existsSync(here('../../styles/editor-chrome.css')) ? read('../../styles/editor-chrome.css') : '';
    if (css.includes('.ec-rail')) {
      const rule = css.slice(css.indexOf('.ec-rail {'), css.indexOf('}', css.indexOf('.ec-rail {')));
      expect(rule).toContain('width: 3rem');
    } else {
      expect(source).toContain('w-12');
    }
    expect(preview()).toContain('clientX - 48');
  });
});
```

- [ ] **Step 2: Run it against the untouched page: it must be GREEN**

Run (from `client/`): `npx vitest run src/components/editor-chrome/preview-guard.test.ts`
Expected: all tests PASS on the current, unmodified `Preview.tsx` (this proves the baseline fingerprint and the invariants are correctly captured). If the fingerprint test fails here, the baseline in this plan is stale: recompute it with the snippet in the plan's Global Constraints and stop to report before changing anything. Note: `'clientX - 48'` lives in the logic section, so it is covered twice.

- [ ] **Step 3: No commit** (temporary test; nothing to stage). Record in the ledger that the baseline is green.

---

### Task 1: Components, styles and helpers (no page change yet)

**Files:**
- Create: `client/src/components/editor-chrome/status.ts`
- Create: `client/src/components/editor-chrome/EditorTopBar.tsx`
- Create: `client/src/components/editor-chrome/SectionRail.tsx`
- Create: `client/src/styles/editor-chrome.css`
- Modify (full replace): `client/src/components/SuspenseLoader.tsx`
- Test (temporary, never committed): `client/src/components/editor-chrome/editor-chrome.test.tsx`

**Interfaces:**
- Produces (`status.ts`): `type LiveStatus = 'idle' | 'updating' | 'saved' | 'error'`, `type StatusTone = 'none' | 'working' | 'ok' | 'error'`, `liveStatusLabel(status: LiveStatus): string`, `statusTone(status: LiveStatus): StatusTone`.
- Produces (`EditorTopBar.tsx`): default export `EditorTopBar(props: EditorTopBarProps)` where `EditorTopBarProps = { templateLabel: string; status: LiveStatus; designOpen: boolean; canOpenDesign: boolean; onToggleDesign: () => void; onDashboard: () => void; onExport: () => void; exporting: boolean; canExport: boolean }`.
- Produces (`SectionRail.tsx`): default export `SectionRail({ items, onSelect })` with `items: { icon: React.ComponentType<{ size?: number }>; label: string; ref: React.RefObject<HTMLDivElement> }[]` and `onSelect: (ref: React.RefObject<HTMLDivElement>) => void`.
- Produces (`SuspenseLoader.tsx`): default export `Loader({ label?: string })`, default label `Loading` (existing call sites pass no props).
- Produces (`editor-chrome.css`): `.ec-topbar`, `.ec-topbar__left`, `.ec-topbar__right`, `.ec-brand`, `.ec-sep`, `.ec-template`, `.ec-status`, `.ec-dot`, `.ec-iconbtn`, `.ec-rail`, `.ec-rail__item`, `.ec-rail__btn`, `.ec-rail__tip`, `.ec-colhead`, `.ec-formcol`, `.ec-resize`, `.ec-resize__grip`, `.ec-canvas`, `.ec-page`, `.ec-state`, `.ec-state__title`.

- [ ] **Step 1: Write the failing test**

Create `client/src/components/editor-chrome/editor-chrome.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { User, FileText } from 'lucide-react';
import type { RefObject } from 'react';

vi.mock('@/components/ThemeToggle', () => ({ default: () => null }));

import EditorTopBar from './EditorTopBar';
import SectionRail from './SectionRail';
import { liveStatusLabel, statusTone } from './status';
import Loader from '@/components/SuspenseLoader';

const noop = () => {};
const css = readFileSync(fileURLToPath(new URL('../../styles/editor-chrome.css', import.meta.url)), 'utf-8');

const bar = (over: Partial<Parameters<typeof EditorTopBar>[0]> = {}) =>
  renderToStaticMarkup(
    <EditorTopBar
      templateLabel="Template: Cigar"
      status="idle"
      designOpen={false}
      canOpenDesign={true}
      onToggleDesign={noop}
      onDashboard={noop}
      onExport={noop}
      exporting={false}
      canExport={true}
      {...over}
    />,
  ).replace(/&amp;/g, '&');

describe('status helpers', () => {
  it('keeps the exact texts the page shows today', () => {
    expect(liveStatusLabel('updating')).toBe('Saving & updating preview...');
    expect(liveStatusLabel('saved')).toBe('All changes saved');
    expect(liveStatusLabel('error')).toBe('Update failed, will retry on next edit');
    expect(liveStatusLabel('idle')).toBe('');
  });

  it('maps every status to a tone', () => {
    expect(statusTone('idle')).toBe('none');
    expect(statusTone('updating')).toBe('working');
    expect(statusTone('saved')).toBe('ok');
    expect(statusTone('error')).toBe('error');
  });
});

describe('EditorTopBar', () => {
  it('shows the brand, the template label and the three actions', () => {
    const html = bar();
    expect(html).toContain('ResumeForge');
    expect(html).toContain('Template: Cigar');
    expect(html).toContain('aria-label="Design"');
    expect(html).toContain('aria-label="Dashboard"');
    expect(html).toContain('Export PDF');
  });

  it('keeps id="exportButton" exactly once', () => {
    expect(bar().split('id="exportButton"').length - 1).toBe(1);
  });

  it('Design reports its pressed state and is disabled until a PDF exists', () => {
    expect(bar({ designOpen: true })).toContain('aria-pressed="true"');
    expect(bar({ designOpen: false })).toContain('aria-pressed="false"');
    expect(bar({ canOpenDesign: false })).toMatch(/aria-label="Design"[^>]*disabled|disabled[^>]*aria-label="Design"/);
    expect(bar({ canOpenDesign: true })).not.toMatch(/aria-label="Design"[^>]*disabled=/);
  });

  it('Export is disabled while exporting or without a PDF, and says so while exporting', () => {
    expect(bar({ exporting: true })).toContain('Exporting...');
    expect(bar({ exporting: true })).toMatch(/id="exportButton"[^>]*disabled|disabled[^>]*id="exportButton"/);
    expect(bar({ canExport: false })).toMatch(/id="exportButton"[^>]*disabled|disabled[^>]*id="exportButton"/);
    const ready = bar();
    expect(ready).not.toMatch(/id="exportButton"[^>]*disabled=/);
    expect(ready).not.toContain('Exporting...');
  });

  it('shows the live status text only when there is one, as a polite status region', () => {
    expect(bar({ status: 'idle' })).not.toContain('All changes saved');
    expect(bar({ status: 'saved' })).toContain('All changes saved');
    expect(bar({ status: 'updating' })).toContain('Saving & updating preview...');
    expect(bar({ status: 'error' })).toContain('Update failed, will retry on next edit');
    expect(bar({ status: 'saved' })).toContain('aria-live="polite"');
  });

  it('drops the secondary text below md but keeps accessible names on icon-only buttons', () => {
    const html = bar();
    expect(html).toMatch(/hidden md:inline[^>]*>Dashboard</);
    expect(html).toMatch(/hidden md:inline[^>]*>Export PDF</);
    expect(html).toContain('aria-label="Export PDF"');
  });

  it('carries no gradient, glass or old indigo styling', () => {
    expect(bar()).not.toMatch(/gradient|backdrop|indigo|purple|hover:scale/);
  });
});

describe('SectionRail', () => {
  const ref = { current: null } as RefObject<HTMLDivElement>;
  const items = [
    { icon: User, label: 'Personal Details', ref },
    { icon: FileText, label: 'Summary', ref },
  ];
  const html = renderToStaticMarkup(<SectionRail items={items} onSelect={noop} />);

  it('is a labeled nav with a labeled, focusable button per section', () => {
    expect(html).toContain('<nav');
    expect(html).toContain('aria-label="Resume sections"');
    expect(html.split('<button').length - 1).toBe(2);
    expect(html).toContain('aria-label="Personal Details"');
    expect(html).toContain('aria-label="Summary"');
    expect(html).toContain('type="button"');
  });

  it('shows each label as a tip that appears on hover and keyboard focus', () => {
    expect(html).toContain('ec-rail__tip');
    expect(css).toMatch(/\.ec-rail__item:focus-within \.ec-rail__tip/);
    expect(css).toMatch(/\.ec-rail__item:hover \.ec-rail__tip/);
  });
});

describe('editor-chrome.css', () => {
  it('keeps the rail exactly 48px wide and the top bar 3.5rem (the rail starts below it)', () => {
    const rail = css.slice(css.indexOf('.ec-rail {'), css.indexOf('}', css.indexOf('.ec-rail {')));
    expect(rail).toContain('width: 3rem');
    expect(rail).toContain('top: 3.5rem');
    const bar = css.slice(css.indexOf('.ec-topbar {'), css.indexOf('}', css.indexOf('.ec-topbar {')));
    expect(bar).toContain('height: 3.5rem');
  });

  it('never positions the column header (scroll-to-section relies on offsetTop)', () => {
    const head = css.slice(css.indexOf('.ec-colhead {'), css.indexOf('}', css.indexOf('.ec-colhead {')));
    expect(head).not.toMatch(/position\s*:/);
  });

  it('moves nothing except spinners and respects reduced motion through the shared rule', () => {
    expect(css).not.toMatch(/@keyframes/);
    expect(css).not.toMatch(/gradient/);
  });
});

describe('SuspenseLoader label', () => {
  it('defaults to Loading and accepts a custom label', () => {
    expect(renderToStaticMarkup(<Loader />)).toContain('>Loading<');
    expect(renderToStaticMarkup(<Loader label="Loading your resume..." />)).toContain('>Loading your resume...<');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run (from `client/`): `npx vitest run src/components/editor-chrome/editor-chrome.test.tsx`
Expected: FAIL, "Failed to resolve import './EditorTopBar'" (the guard test still passes).

- [ ] **Step 3: Create `client/src/components/editor-chrome/status.ts`**

```ts
export type LiveStatus = 'idle' | 'updating' | 'saved' | 'error';
export type StatusTone = 'none' | 'working' | 'ok' | 'error';

// The exact texts the editor shows today, in one place.
export const liveStatusLabel = (status: LiveStatus): string => {
  if (status === 'updating') return 'Saving & updating preview...';
  if (status === 'saved') return 'All changes saved';
  if (status === 'error') return 'Update failed, will retry on next edit';
  return '';
};

export const statusTone = (status: LiveStatus): StatusTone => {
  if (status === 'updating') return 'working';
  if (status === 'saved') return 'ok';
  if (status === 'error') return 'error';
  return 'none';
};
```

- [ ] **Step 4: Create `client/src/styles/editor-chrome.css`**

```css
/* Resume editor chrome. Tokens come from the .app-shell scope in landing.css. */

.app-shell {
  --ec-ok: #17673f;
  --ec-err: #b3261e;
}
.dark .app-shell {
  --ec-ok: #4cc38a;
  --ec-err: #ff8a80;
}

/* Top bar */
.ec-topbar {
  display: flex;
  height: 3.5rem;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0 0.75rem 0 1rem;
  border-bottom: 1px solid var(--l-hair);
  background: var(--l-bg);
}
.ec-topbar__left, .ec-topbar__right { display: flex; min-width: 0; align-items: center; gap: 0.75rem; }
.ec-topbar__right { flex-shrink: 0; gap: 0.5rem; }
.ec-brand { display: flex; align-items: center; gap: 0.5rem; color: var(--l-ink); font-size: 0.9375rem; font-weight: 600; white-space: nowrap; }
.ec-brand img { width: 1.375rem; height: 1.375rem; border-radius: 5px; }
.ec-sep { width: 1px; height: 1.125rem; background: var(--l-hair-strong); }
.ec-template { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.ec-status { align-items: center; gap: 0.375rem; color: var(--l-muted); font-size: 0.75rem; white-space: nowrap; }
.ec-status[data-tone='error'] { color: var(--ec-err); }
.ec-dot { display: block; width: 6px; height: 6px; flex: none; border-radius: 50%; background: var(--l-hair-strong); }
.ec-dot[data-tone='ok'] { background: var(--ec-ok); }
.ec-dot[data-tone='error'] { background: var(--ec-err); }

.ec-iconbtn {
  display: inline-flex;
  width: 2.75rem;
  height: 2.75rem;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--l-hair-strong);
  border-radius: 6px;
  background: transparent;
  color: var(--l-ink);
  cursor: pointer;
  transition: background-color 150ms ease-out, border-color 150ms ease-out;
}
.ec-iconbtn:hover:not(:disabled) { background: var(--l-surface); }
.ec-iconbtn[aria-pressed='true'] { border-color: var(--l-ink); box-shadow: inset 0 0 0 1px var(--l-ink); }
.ec-iconbtn:disabled { opacity: 0.55; cursor: not-allowed; }

/* Section rail: exactly 48px wide, because the resize math subtracts 48 */
.ec-rail {
  position: fixed;
  left: 0;
  top: 3.5rem;
  bottom: 0;
  z-index: 40;
  display: flex;
  width: 3rem;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  border-right: 1px solid var(--l-hair);
  background: var(--l-surface);
}
.ec-rail__item { position: relative; }
.ec-rail__btn {
  display: flex;
  width: 2.5rem;
  height: 2.5rem;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--l-muted);
  cursor: pointer;
  transition: background-color 150ms ease-out, color 150ms ease-out;
}
.ec-rail__btn:hover { background: var(--l-bg); color: var(--l-ink); }
.ec-rail__tip {
  position: absolute;
  left: 100%;
  top: 50%;
  z-index: 50;
  margin-left: 0.5rem;
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
  background: var(--l-ink);
  color: var(--l-ink-fg);
  font-size: 0.75rem;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transform: translateY(-50%);
  transition: opacity 150ms ease-out;
}
.ec-rail__item:hover .ec-rail__tip,
.ec-rail__item:focus-within .ec-rail__tip { opacity: 1; }

/* Form column. The header must never be positioned (scroll-to-section uses offsetTop). */
.ec-colhead { flex-shrink: 0; padding: 0.875rem 1.5rem; border-bottom: 1px solid var(--l-hair); }
.ec-formcol { border-right: 1px solid var(--l-hair); background: var(--l-bg); }
.ec-resize { background: transparent; transition: background-color 150ms ease-out; }
.ec-resize:hover, .ec-resize.is-active { background: var(--l-surface); }
.ec-resize__grip { color: var(--l-hair-strong); }
.ec-resize:hover .ec-resize__grip, .ec-resize.is-active .ec-resize__grip { color: var(--l-ink); }

/* Preview canvas and its states */
.ec-canvas { background: var(--l-surface-2); }
.ec-page {
  border: 1px solid var(--l-hair-strong);
  border-radius: 4px;
  background: #ffffff;
  box-shadow: 0 18px 36px -22px var(--l-shadow);
}
.ec-state {
  display: flex;
  height: 100%;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1.5rem;
  border: 1px dashed var(--l-hair-strong);
  border-radius: 10px;
  color: var(--l-muted);
  text-align: center;
}
.ec-state__title { margin: 0; color: var(--l-ink); font-size: 1rem; font-weight: 500; }
```

- [ ] **Step 5: Create `client/src/components/editor-chrome/EditorTopBar.tsx`**

```tsx
import { FileIcon, LayoutDashboard, Loader2, Palette } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import '@/styles/landing.css';
import '@/styles/editor-chrome.css';
import { liveStatusLabel, statusTone } from './status';
import type { LiveStatus } from './status';

export interface EditorTopBarProps {
  templateLabel: string;
  status: LiveStatus;
  designOpen: boolean;
  canOpenDesign: boolean;
  onToggleDesign: () => void;
  onDashboard: () => void;
  onExport: () => void;
  exporting: boolean;
  canExport: boolean;
}

export default function EditorTopBar({
  templateLabel,
  status,
  designOpen,
  canOpenDesign,
  onToggleDesign,
  onDashboard,
  onExport,
  exporting,
  canExport,
}: EditorTopBarProps) {
  const label = liveStatusLabel(status);
  const tone = statusTone(status);

  return (
    <header className="ec-topbar">
      <div className="ec-topbar__left">
        <div className="ec-brand">
          <img src="/icon.png" alt="" width={22} height={22} />
          ResumeForge
        </div>
        <span className="ec-sep hidden md:block" aria-hidden="true" />
        <span className="l-eyebrow l-muted ec-template hidden md:inline">{templateLabel}</span>
        <div className="ec-status hidden sm:inline-flex" role="status" aria-live="polite" data-tone={tone}>
          {label && (
            <>
              {status === 'updating' ? (
                <Loader2 aria-hidden="true" className="size-3 animate-spin" />
              ) : (
                <span className="ec-dot" data-tone={tone} aria-hidden="true" />
              )}
              {label}
            </>
          )}
        </div>
      </div>

      <div className="ec-topbar__right">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="ec-iconbtn"
                aria-label="Design"
                aria-pressed={designOpen}
                disabled={!canOpenDesign}
                onClick={onToggleDesign}
              >
                <Palette aria-hidden="true" className="size-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Design</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <button type="button" className="l-btn l-btn--ghost" aria-label="Dashboard" onClick={onDashboard}>
          <LayoutDashboard aria-hidden="true" className="size-4" />
          <span className="hidden md:inline">Dashboard</span>
        </button>

        <button
          type="button"
          id="exportButton"
          className="l-btn l-btn--primary"
          aria-label={exporting ? 'Exporting' : 'Export PDF'}
          disabled={exporting || !canExport}
          onClick={onExport}
        >
          {exporting ? (
            <>
              <Loader2 aria-hidden="true" className="size-4 animate-spin" />
              <span className="hidden md:inline">Exporting...</span>
            </>
          ) : (
            <>
              <FileIcon aria-hidden="true" className="size-4" />
              <span className="hidden md:inline">Export PDF</span>
            </>
          )}
        </button>

        <ThemeToggle styleClass="inline-flex min-h-11 min-w-11 items-center justify-center" />
      </div>
    </header>
  );
}
```

- [ ] **Step 6: Create `client/src/components/editor-chrome/SectionRail.tsx`**

```tsx
import type { ComponentType, RefObject } from 'react';
import '@/styles/landing.css';
import '@/styles/editor-chrome.css';

export interface RailItem {
  icon: ComponentType<{ size?: number }>;
  label: string;
  ref: RefObject<HTMLDivElement>;
}

interface SectionRailProps {
  items: RailItem[];
  onSelect: (ref: RefObject<HTMLDivElement>) => void;
}

// The page passes its own sidebarItems and scrollToSection, so the scrolling behavior is unchanged.
export default function SectionRail({ items, onSelect }: SectionRailProps) {
  return (
    <nav className="ec-rail" aria-label="Resume sections">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.label} className="ec-rail__item">
            <button type="button" className="ec-rail__btn" aria-label={item.label} onClick={() => onSelect(item.ref)}>
              <Icon size={16} />
            </button>
            <span className="ec-rail__tip" aria-hidden="true">
              {item.label}
            </span>
          </div>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 7: Replace `client/src/components/SuspenseLoader.tsx`**

```tsx
import React from "react";
import "@/styles/landing.css";
import "@/styles/loader.css";

interface LoaderProps {
  label?: string;
}

// Fallback shown while a lazy route's code loads (and while the editor loads a resume).
// Calm and brand-forward: the mark, a thin moving bar and a label.
const Loader: React.FC<LoaderProps> = ({ label = "Loading" }) => (
  <div className="app-loader" role="status" aria-live="polite">
    <img className="app-loader__mark" src="/icon.png" alt="" width={44} height={44} />
    <div className="app-loader__track" aria-hidden="true">
      <i />
    </div>
    <p className="l-eyebrow app-loader__label">{label}</p>
  </div>
);

export default Loader;
```

- [ ] **Step 8: Run tests, type-check and lint**

Run (from `client/`): `npx vitest run src/components/editor-chrome && npx tsc -b && npx eslint src/components/editor-chrome src/components/SuspenseLoader.tsx --ignore-pattern "**/*.test.ts" --ignore-pattern "**/*.test.tsx"`
Expected: all tests PASS (the new tests and the guard); tsc exit 0; eslint prints nothing. (If a `disabled` regex assertion fails because of attribute order in the server output, adjust the regex in the test, never the component's accessibility attributes.)

- [ ] **Step 9: Commit (explicit paths; test files are never staged)**

```bash
git add client/src/components/editor-chrome/status.ts client/src/components/editor-chrome/EditorTopBar.tsx client/src/components/editor-chrome/SectionRail.tsx client/src/styles/editor-chrome.css client/src/components/SuspenseLoader.tsx
git commit -m "$(cat <<'EOF'
feat(editor): add the editor top bar, section rail and chrome styles

Presentational pieces only; the page is not changed yet. SuspenseLoader gains
an optional label.

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Slice 1 in the page: the top bar (the structural slice)

**Files:**
- Modify: `client/src/pages/Preview.tsx` (markup and imports only, via the helper script)
- Test (temporary): append to `client/src/components/editor-chrome/preview-guard.test.ts`
- Scratch (outside the repo, in the session scratchpad directory): `preview_edit.py`

**Interfaces:**
- Consumes: `EditorTopBar` (Task 1) and the page's existing `template`, `liveEdit`, `liveStatus`, `designOpen`, `setDesignOpen`, `pdfUrl`, `redirectResumes`, `handleExportPDF`, `resumeData`, `loadingExport` and the four `*Ref` values.

- [ ] **Step 1: Create the CRLF-safe edit helper**

Write `preview_edit.py` to the scratchpad directory:

```python
import sys

PATH = "client/src/pages/Preview.tsx"


def load():
    raw = open(PATH, encoding="utf-8", newline="").read()
    return raw.replace("\r\n", "\n")


def save(text):
    open(PATH, "w", encoding="utf-8", newline="").write(text.replace("\n", "\r\n"))  # the file uses CRLF


def replace_once(text, old, new):
    count = text.count(old)
    if count != 1:
        sys.exit(f"expected exactly one match, found {count}: {old[:70]!r}")
    return text.replace(old, new)


def replace_between(text, start_marker, end_marker, new):
    """Replace from the start of the line holding start_marker up to the start of the line holding end_marker."""
    if text.count(start_marker) != 1 or text.count(end_marker) != 1:
        sys.exit(f"markers must each occur once: {start_marker!r} {text.count(start_marker)}, {end_marker!r} {text.count(end_marker)}")
    a = text.rfind("\n", 0, text.index(start_marker)) + 1
    b = text.rfind("\n", 0, text.index(end_marker)) + 1
    if b <= a:
        sys.exit("end marker is before the start marker")
    return text[:a] + new + text[b:]
```

Every edit in this plan is a Python snippet that does `from preview_edit import *` (run from the repo root with the scratchpad directory on `PYTHONPATH`), then `t = load()`, the replacements, and `save(t)`.

- [ ] **Step 2: Add the slice's failing test**

Append to `client/src/components/editor-chrome/preview-guard.test.ts`:

```ts
describe('slice 1: the top bar is in the page and the old headers are gone', () => {
  const source = preview();

  it('renders EditorTopBar with the existing handlers and state', () => {
    expect(source).toContain('<EditorTopBar');
    expect(source).toContain("templateLabel={`Template: ${(template || 'andromeda').replace(/_/g, ' ').replace(/\\b\\w/g, (c) => c.toUpperCase())}`}");
    expect(source).toContain("status={liveEdit ? liveStatus : 'idle'}");
    expect(source).toContain('designOpen={designOpen}');
    expect(source).toContain('canOpenDesign={!!pdfUrl}');
    expect(source).toContain('onToggleDesign={() => setDesignOpen((open) => !open)}');
    expect(source).toContain('onDashboard={redirectResumes}');
    expect(source).toContain('exporting={loadingExport}');
    expect(source).toContain('canExport={!!pdfUrl}');
  });

  it('the root carries the shared token scope and no gradient classes remain in the chrome', () => {
    expect(source).toContain('className="app-shell h-screen w-full font-app flex flex-col overflow-hidden"');
    expect(source).not.toContain('bg-gradient-to-r');
  });

  it('the old preview header and the form header branding are gone', () => {
    expect(source).not.toContain('Preview Header - Fixed');
    expect(source).not.toContain('Resume Preview\n');
    expect(source).not.toContain('<ThemeToggle');
    expect(source).not.toContain('Template: {(template');
  });

  it('the rail starts below the 3.5rem bar and is still 48px wide', () => {
    expect(source).toContain('fixed left-0 top-14 bottom-0 w-12');
  });
});
```

Run (from `client/`): `npx vitest run src/components/editor-chrome/preview-guard.test.ts`
Expected: the new "slice 1" tests FAIL (the page has no top bar yet); the baseline guard tests still PASS.

- [ ] **Step 3: Apply the slice with a script**

Write this to the scratchpad as `slice1.py` and run it from the repo root with `PYTHONPATH=<scratchpad dir> python <scratchpad>/slice1.py`:

```python
from preview_edit import *

t = load()

# 1. imports: add the top bar; drop what only the removed headers used
t = replace_once(t, "import ThemeToggle from '../components/ThemeToggle';\n", "")
t = replace_once(t, "import { Button } from '@/components/ui/button';\n", "import EditorTopBar from '@/components/editor-chrome/EditorTopBar';\n")
t = replace_once(t, "  FileIcon,\n  Eye,\n  Loader2,\n  LayoutDashboard,\n  GripVertical,\n  Palette\n} from 'lucide-react';", "  FileIcon,\n  Loader2,\n  GripVertical\n} from 'lucide-react';")
t = replace_once(t, "import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';\n", "")

# 2. root: shared token scope, top bar as the first child
old_root = '''      <div className="h-screen w-full bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 font-app flex flex-col">
        {/* Fixed Navigation Sidebar */}'''
new_root = '''      <div className="app-shell h-screen w-full font-app flex flex-col overflow-hidden">
        <EditorTopBar
          templateLabel={`Template: ${(template || 'andromeda').replace(/_/g, ' ').replace(/\\b\\w/g, (c) => c.toUpperCase())}`}
          status={liveEdit ? liveStatus : 'idle'}
          designOpen={designOpen}
          canOpenDesign={!!pdfUrl}
          onToggleDesign={() => setDesignOpen((open) => !open)}
          onDashboard={redirectResumes}
          onExport={() => handleExportPDF({ ...resumeData, sectionLayout: sectionLayoutRef.current, sectionTitles: sectionTitlesRef.current, fontFamily: fontFamilyRef.current, colorTheme: colorThemeRef.current })}
          exporting={loadingExport}
          canExport={!!pdfUrl}
        />
        {/* Fixed Navigation Sidebar */}'''
t = replace_once(t, old_root, new_root)

# 3. the old rail starts below the bar (replaced by SectionRail in slice 2)
t = replace_once(t, 'className="fixed left-0 top-0 h-full w-12 bg-white', 'className="fixed left-0 top-14 bottom-0 w-12 bg-white')

# 4. the form header keeps only a quiet label (brand, theme toggle and template pill moved to the top bar)
new_form_header = '''            {/* Header - Fixed */}
            <div className="ec-colhead">
              <p className="l-eyebrow l-muted m-0">Edit resume</p>
            </div>

'''
t = replace_between(t, '{/* Header - Fixed */}', '{/* Form Content - Scrollable */}', new_form_header)

# 5. the preview header is gone: everything it held lives in the top bar
t = replace_between(t, '{/* Preview Header - Fixed */}', '{/* Preview Content - Scrollable */}', '')

save(t)
print('slice 1 applied')
```

Note on the label expression: in the Python string above `\\b\\w` is the regular-expression text `\b\w` as it must appear in the TSX file.

- [ ] **Step 4: Verify: guard, tests, types, lint, build**

Run (from `client/`): `npx vitest run src/components/editor-chrome && npx tsc -b && npx eslint src/pages/Preview.tsx src/components/editor-chrome --ignore-pattern "**/*.test.ts" --ignore-pattern "**/*.test.tsx"`
Expected: **the logic fingerprint, line-ending, wiring and DOM-invariant tests all PASS** (if any fails, undo the slice with `git checkout -- client/src/pages/Preview.tsx` and report; never adjust the logic or the baseline), the slice tests PASS, tsc exit 0 (it flags any import left unused), eslint reports at most the warnings `Preview.tsx` already had.
Then: `npx vite build --outDir node_modules/.tmp/editor-build --emptyOutDir` (expect success), then `rm -rf node_modules/.tmp/editor-build`.

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/Preview.tsx
git commit -m "$(cat <<'EOF'
feat(editor): replace the editor headers with a single top bar

Markup only; the page logic is unchanged.

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 6: Hand the user the click-through checklist (do not skip)**

Tell the user, in the chat, to check on `/preview` with a resume that has saved data: (1) the top bar shows the brand, "Template: ..." and the status; (2) edit a field, the preview updates and the status shows "Saving & updating preview..." then "All changes saved"; (3) Design opens and closes; (4) Dashboard works; (5) Export PDF downloads; (6) the sidebar resize handle still works; (7) clicking a rail icon still scrolls the form to that section; (8) dark mode; (9) a narrow window (the status and template text drop out, buttons become icons). Ask them to report anything that looks or behaves off before the next slice. Do not continue until they confirm or say to continue.

---

### Task 3: Slice 2: the labeled section rail

**Files:**
- Modify: `client/src/pages/Preview.tsx` (markup and one import)
- Test (temporary): append to `preview-guard.test.ts`

- [ ] **Step 1: Add the slice's failing test**

Append to `preview-guard.test.ts`:

```ts
describe('slice 2: the rail is the SectionRail component', () => {
  const source = preview();

  it('uses SectionRail with the page\'s own items and scroll handler', () => {
    expect(source).toContain("import SectionRail from '@/components/editor-chrome/SectionRail';");
    expect(source).toContain('<SectionRail items={sidebarItems} onSelect={scrollToSection} />');
  });

  it('the old hover-only tooltip markup is gone', () => {
    expect(source).not.toContain('group-hover:opacity-100');
    expect(source).not.toContain('{/* Tooltip */}');
    expect(source).not.toContain('fixed left-0 top-14 bottom-0 w-12');
  });
});
```

Run: `npx vitest run src/components/editor-chrome/preview-guard.test.ts`
Expected: the new tests FAIL, the baseline and the earlier slice tests PASS. (The earlier slice test that expects `fixed left-0 top-14 bottom-0 w-12` must be updated in the same file: change that assertion to accept the SectionRail instead. Replace the slice 1 test `the rail starts below the 3.5rem bar and is still 48px wide` body with: `expect(source.includes('fixed left-0 top-14 bottom-0 w-12') || source.includes('<SectionRail')).toBe(true);`.)

- [ ] **Step 2: Apply the slice**

Write `slice2.py` to the scratchpad and run it as before:

```python
from preview_edit import *

t = load()

t = replace_once(t, "import EditorTopBar from '@/components/editor-chrome/EditorTopBar';\n",
                 "import EditorTopBar from '@/components/editor-chrome/EditorTopBar';\nimport SectionRail from '@/components/editor-chrome/SectionRail';\n")

# the old fixed rail (from its comment to the main content comment) becomes the component
t = replace_between(
    t,
    '{/* Fixed Navigation Sidebar */}',
    '{/* Main Content Area - Adjusted for fixed sidebar */}',
    '        {/* Fixed Navigation Sidebar */}\n        <SectionRail items={sidebarItems} onSelect={scrollToSection} />\n\n',
)

save(t)
print('slice 2 applied')
```

- [ ] **Step 3: Verify (same as Task 2 Step 4)**

Run: `npx vitest run src/components/editor-chrome && npx tsc -b && npx eslint src/pages/Preview.tsx src/components/editor-chrome --ignore-pattern "**/*.test.ts" --ignore-pattern "**/*.test.tsx"` and a build (then remove the build output).
Expected: the logic fingerprint and all invariants still PASS (including "rail is exactly 48px": now checked in `editor-chrome.css`), the slice tests PASS, tsc exit 0, eslint no new problems.

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/Preview.tsx
git commit -m "$(cat <<'EOF'
feat(editor): use the labeled, keyboard-friendly section rail

The rail buttons get accessible names and their labels show on focus as well
as hover. Scroll behavior is unchanged.

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 5: Click-through checklist for the user**

Ask the user to check: every rail icon still scrolls the form to its section (all 12), the label tip shows on hover and when tabbing to an icon, the rail sits below the top bar without a gap or overlap, the sidebar resize still tracks the mouse correctly (the handle should follow the cursor exactly), dark mode. Wait for their confirmation before continuing.

---

### Task 4: Slice 3: form column, resize handle and canvas

**Files:**
- Modify: `client/src/pages/Preview.tsx` (class names and the state boxes only)
- Test (temporary): append to `preview-guard.test.ts`

- [ ] **Step 1: Add the slice's failing test**

Append to `preview-guard.test.ts`:

```ts
describe('slice 3: the form column, resize handle and canvas use the neutral tokens', () => {
  const source = preview();

  it('no glass blur, shadows or dark-mode color ternaries remain in the chrome', () => {
    expect(source).not.toContain('backdrop-blur');
    expect(source).not.toContain('shadow-2xl');
    expect(source).not.toContain('shadow-xl');
    // isDarkMode is now only read in the logic region's destructure and passed to the DesignPanel
    const afterLogic = source.slice(source.indexOf('\n  return (\n'));
    expect(afterLogic.split('isDarkMode').length - 1).toBe(1);
  });

  it('the form column keeps h-1/2 lg:h-full, flex-col, overflow-hidden and relative', () => {
    expect(source).toContain('className="ec-formcol h-1/2 lg:h-full flex flex-col overflow-hidden relative"');
  });

  it('the resize handle keeps its behavior wiring and layout classes', () => {
    expect(source).toContain('onMouseDown={startResize}');
    expect(source).toContain('onTouchStart={startResize}');
    expect(source).toContain('aria-label="Resize sidebar"');
    expect(source).toContain('role="separator"');
    expect(source).toContain("hidden lg:flex absolute top-0 right-0 h-full w-4 items-center justify-center cursor-ew-resize z-30");
  });

  it('the canvas and its two states keep their texts', () => {
    expect(source).toContain('className="ec-canvas flex-1 overflow-y-auto p-4 sm:p-6 no-scrollbar"');
    expect(source).toContain('Generating your PDF preview...');
    expect(source).toContain('Please wait while we generate your resume preview.');
    expect(source).toContain('No PDF generated yet');
    expect(source).toContain('Please complete and submit the form to generate your resume preview');
  });
});
```

Run: `npx vitest run src/components/editor-chrome/preview-guard.test.ts`
Expected: the new tests FAIL; everything else PASSES.

- [ ] **Step 2: Apply the slice**

Write `slice3.py` to the scratchpad and run it as before. Each replacement matches the exact current text, so a stale match aborts the script instead of editing the wrong thing:

```python
from preview_edit import *

t = load()

# 1. the form column container: tokens instead of the dark-mode ternary (style prop untouched, `relative` kept)
old_column = '''            className={`
              ${isDarkMode
                ? 'bg-gray-800/95 backdrop-blur-xl border-gray-700/50'
                : 'bg-white/95 backdrop-blur-xl border-gray-200/50'
              }
              h-1/2 lg:h-full
              border-r
              shadow-xl
              flex flex-col
              overflow-hidden
              relative
            `}
'''
new_column = '            className="ec-formcol h-1/2 lg:h-full flex flex-col overflow-hidden relative"\n'
t = replace_once(t, old_column, new_column)

# 2. the resize handle: same layout classes and handlers, neutral colors
old_resize = '''            <div
              onMouseDown={startResize}
              onTouchStart={startResize}
              className={`
                  hidden lg:flex absolute top-0 right-0 h-full w-4 items-center justify-center cursor-ew-resize z-30
                  transition-colors duration-200
                  ${isResizing ? 'bg-blue-200/60' : 'bg-transparent hover:bg-blue-100/60'}
                `}
              style={{
                touchAction: 'none',
              }}
              aria-label="Resize sidebar"
              role="separator"
            >
              <GripVertical size={22} className="text-black dark:text-white" />
            </div>
'''
new_resize = '''            <div
              onMouseDown={startResize}
              onTouchStart={startResize}
              className={`ec-resize hidden lg:flex absolute top-0 right-0 h-full w-4 items-center justify-center cursor-ew-resize z-30 ${isResizing ? 'is-active' : ''}`}
              style={{
                touchAction: 'none',
              }}
              aria-label="Resize sidebar"
              role="separator"
            >
              <GripVertical size={22} className="ec-resize__grip" />
            </div>
'''
t = replace_once(t, old_resize, new_resize)

# 3. the preview content: a calm canvas with the page on it (same three branches, same texts, same iframe)
new_content = '''            {/* Preview Content - Scrollable */}
            <div className="ec-canvas flex-1 overflow-y-auto p-4 sm:p-6 no-scrollbar">
              {loading && !liveEdit ? (
                <div className="ec-state">
                  <Loader2 className="w-8 h-8 animate-spin mb-2" />
                  <p className="ec-state__title">Generating your PDF preview...</p>
                  <p className="text-sm text-center max-w-md m-0">
                    Please wait while we generate your resume preview.
                  </p>
                </div>
              ) : pdfUrl ? (
                <div className="ec-page h-full overflow-hidden">
                  <iframe
                    src={`${pdfUrl}#sidebar=0&zoom=100&toolbar=0`}
                    className="w-full h-full border-none"
                    title="Resume Preview"
                  />
                </div>
              ) : (
                <div className="ec-state">
                  <FileIcon className="w-8 h-8 mb-2" />
                  <p className="ec-state__title">No PDF generated yet</p>
                  <p className="text-sm text-center max-w-md m-0">
                    Please complete and submit the form to generate your resume preview
                  </p>
                </div>
              )}
            </div>
          </div>
'''
a = t.index('{/* Preview Content - Scrollable */}')
a = t.rfind('\n', 0, a) + 1
b = t.index('          {designOpen && (')
t = t[:a] + new_content + '\n' + t[b:]

save(t)
print('slice 3 applied')
```

(The block before `{designOpen && (` ends the preview-area `</div>`; `new_content` includes that closing `</div>` for the preview area and keeps the blank line before the Design panel block. Read the result around those lines and confirm the nesting matches the original: preview content div, then the preview area closing div, then `{designOpen && (`.)

- [ ] **Step 3: Verify (same as before)**

Run: `npx vitest run src/components/editor-chrome && npx tsc -b && npx eslint src/pages/Preview.tsx src/components/editor-chrome --ignore-pattern "**/*.test.ts" --ignore-pattern "**/*.test.tsx"` and a build (then remove the build output).
Expected: logic fingerprint and every invariant PASS (the form column is still `relative`, the scroll container untouched), the slice tests PASS, tsc exit 0, eslint no new problems. Also read the diff (`git diff`) once and confirm that only class names, the three state boxes and the resize handle markup changed.

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/Preview.tsx
git commit -m "$(cat <<'EOF'
feat(editor): restyle the form column, resize handle and preview canvas

Class names and the state boxes only; handlers and layout arithmetic are
unchanged.

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 5: Click-through checklist for the user**

Ask the user to check: the form column header ("Edit resume"), typing in the form still updates the preview, clicking a rail icon still scrolls to the right section **exactly** (this is the most fragile behavior), the resize handle works and shows its grip on hover and while dragging, the PDF page sits on the calm canvas, the generating state (submit a first-time resume), the empty state, dark mode, a narrow window (form stacked over preview). Wait for their confirmation.

---

### Task 5: Slice 4: the loading state

**Files:**
- Modify: `client/src/pages/Preview.tsx`
- Test (temporary): append to `preview-guard.test.ts`

- [ ] **Step 1: Add the slice's failing test**

Append to `preview-guard.test.ts`:

```ts
describe('slice 4: the full-screen loading state uses the shared loader', () => {
  const source = preview();

  it('renders the loader with the page\'s own label and keeps the loading branch', () => {
    expect(source).toContain("import Loader from '@/components/SuspenseLoader';");
    expect(source).toContain('resumeLoading ? (');
    expect(source).toContain('<Loader label="Loading your resume..." />');
  });

  it('no gradient background classes remain anywhere in the page', () => {
    expect(source).not.toMatch(/bg-gradient/);
  });
});
```

Run: `npx vitest run src/components/editor-chrome/preview-guard.test.ts`
Expected: the new tests FAIL; everything else PASSES.

- [ ] **Step 2: Apply the slice**

Write `slice4.py` to the scratchpad and run it as before:

```python
from preview_edit import *

t = load()

t = replace_once(t, "import EditorTopBar from '@/components/editor-chrome/EditorTopBar';\n",
                 "import EditorTopBar from '@/components/editor-chrome/EditorTopBar';\nimport Loader from '@/components/SuspenseLoader';\n")

old_loading = '''      <div className="h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
        <div className="flex flex-col items-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 dark:text-blue-400 mb-4" />
          <span className="text-lg font-semibold text-gray-700 dark:text-gray-200">Loading your resume...</span>
        </div>
      </div>
'''
t = replace_once(t, old_loading, '      <Loader label="Loading your resume..." />\n')

save(t)
print('slice 4 applied')
```

- [ ] **Step 3: Verify (same as before)**

Run: `npx vitest run src/components/editor-chrome && npx tsc -b && npx eslint src/pages/Preview.tsx src/components/editor-chrome --ignore-pattern "**/*.test.ts" --ignore-pattern "**/*.test.tsx"` and a build (then remove the build output).
Expected: all guards and slice tests PASS; tsc exit 0 (`Loader2` is still used by the generating state, so its import stays); eslint no new problems.

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/Preview.tsx
git commit -m "$(cat <<'EOF'
feat(editor): use the shared loader while a resume loads

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 5: Click-through checklist for the user**

Ask the user to check: opening `/preview` shows the mark with the moving bar and "Loading your resume..." (hard refresh, or throttle the network in dev tools to see it), then the editor appears; light and dark; reduced motion if they use it.

---

### Task 6: Final verification and cleanup

**Files:**
- Delete: every temporary test file and any build output
- No product changes unless a check fails

- [ ] **Step 1: One last full run of the guard against the final file**

Run (from `client/`): `npx vitest run src/components/editor-chrome`
Expected: every test PASSES, in particular the logic fingerprint (the logic section is byte-for-byte the baseline after all four slices), the line-ending test, the wiring tests and the DOM invariants. Also run `git diff 07bb1f2..HEAD --stat -- client/src/pages/Preview.tsx` and confirm only markup and imports changed, then run this check to print the number of changed lines inside the logic region (expect 0):

```bash
git diff 07bb1f2..HEAD -U0 -- client/src/pages/Preview.tsx | grep -E '^@@' | head -20
```

Each hunk header's old-file line range must lie either within the import block (lines 1 to 47) or at or after line 433; none may start between 49 and 432.

- [ ] **Step 2: Whole-project checks**

Run (from `client/`): `npx tsc -b && npx eslint src --ignore-pattern "**/*.test.ts" --ignore-pattern "**/*.test.tsx"` and `npx vite build --outDir node_modules/.tmp/editor-build --emptyOutDir`, then `rm -rf node_modules/.tmp/editor-build`.
Expected: tsc exit 0, no new eslint errors, build succeeds.

- [ ] **Step 3: Delete every temporary file and verify the tree**

```bash
find client/src -name "*.test.ts" -o -name "*.test.tsx" | xargs rm -f
rm -rf client/node_modules/.tmp/editor-build
git status --short
git ls-files | grep -E '\.test\.|harness|__snapshots__' || echo "no test or harness files tracked"
git log --oneline -7
```

Expected: `git status --short` prints nothing and the second command prints `no test or harness files tracked`.

- [ ] **Step 4: Report**

Summarize faithfully: the five commits on `preview-page-revamp`, that the logic fingerprint matched the baseline after every slice, that nothing is pushed, and the checks that passed. State plainly what I could not verify (the live editor flows, the PDF generation, the visual layout) and ask the user to run the full click-through once on the final state: edit and live update, template switch, font, color and section order in the Design panel, resize, scroll-to-section, Dashboard, Export PDF, dark mode, a narrow window. Mention that the Design panel and the form fields keep their current look (scope B and C), and offer the cover letter editor as the next step with the same components.
