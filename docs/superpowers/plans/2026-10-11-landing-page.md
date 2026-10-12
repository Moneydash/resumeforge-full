# Landing Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the generic AI-template landing page at `/` with a trust-first, monochrome "Product stage" page that follows the app's light/dark theme toggle.

**Architecture:** `Home.tsx` becomes a thin composer over eight small blocks in `client/src/components/landing/`. All copy lives in `landing/content.ts`; the editor mock's section and frame data lives in `landing/mock-frames.ts`. Design tokens are CSS variables scoped to a `.landing` wrapper in `client/src/styles/landing.css`, so the global shadcn theme and every other page stay untouched.

**Tech Stack:** React 19, Vite 6, Tailwind 4 (utilities for layout only), `lucide-react` icons, `react-router-dom` 7, Vitest 5 in the `node` environment (tests use `react-dom/server`).

**Spec:** [docs/superpowers/specs/2026-10-11-landing-page-design.md](../specs/2026-10-11-landing-page-design.md)

All paths below are relative to the repo root. Run client commands from `client/` (package manager is yarn; `npx` works too).

## Global Constraints

- Honesty rule: no invented testimonials, logos, ratings, review scores or user counts. Every claim must match something the app actually does. The hero resume is fictional and labeled "Sample resume".
- Monochrome plus one restrained ink-blue accent. No gradients, no pill badges, no colored icon tiles.
- Radius 6px on buttons, 10px on the editor window, never pill-shaped. 1px hairline borders. One shadow, on the editor window only.
- Font is Geist (already loaded in `client/index.html`). No new fonts, no new dependencies, no backend changes.
- Tokens are scoped to `.landing` in `client/src/styles/landing.css`; `client/src/index.css` is not modified.
- Light and dark both supported through the existing `.dark` class on `<html>` (`ThemeContext`).
- Text contrast at least 4.5:1 in both themes; visible focus rings; tap targets at least 44px; skip link; sequential heading levels (one h1, then h2, then h3); no horizontal scroll at 375px; icons from `lucide-react` only, no emoji.
- Motion: one fade-up on hero load (about 300ms), the editor-mock toggle loop (only while on screen), hover color changes at 150ms. No scale or lift on hover. Everything respects `prefers-reduced-motion`.
- All primary actions go to `/login`. `/templates` is behind sign-in, so the template strip links to `/login` too.
- Only `/` is in scope. The global fixed `Footer.tsx` is not edited, only hidden on `/` via `routes.tsx`.
- Test files may be created for verification but must never be staged or committed. Every commit step below stages explicit paths only; Task 6 deletes all test files and checks `git status`.
- Do not push. Commits stay local on branch `page-revamp` unless the user asks.
- Commit messages end with the line: `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`

## Review Focus

1. **First paint without JS, and under reduced motion:** the mock must show a correct, consistent resume (toggle states match which sections are on the paper) before any effect runs. Pinned by the frame-consistency test in Task 1.
2. **Horizontal scroll at 375px:** the editor window bleeds off the right edge on desktop; on a phone the page must not scroll sideways. Pinned by the `scrollWidth` check in Task 6.
3. **Copy drifting into unverified claims:** invented numbers, social proof, "guarantee" language about ATS. Pinned by the forbidden-pattern test over all of `content.ts` in Task 4.
4. **Template thumbnails out of sync with the template list:** a template without a thumbnail must be omitted, not render a broken image. Pinned by the thumbnail-coverage test in Task 4.
5. **Mobile menu stuck open or unreachable by keyboard:** it must start closed, close on Escape and on link click, and expose `aria-expanded`. Pinned by the closed-by-default test in Task 2 and the browser keyboard pass in Task 6.

---

### Task 1: Tokens, styles and the editor mock

**Files:**
- Create: `client/src/styles/landing.css`
- Create: `client/src/components/landing/mock-frames.ts`
- Create: `client/src/components/landing/content.ts`
- Create: `client/src/components/landing/EditorMock.tsx`
- Test (temporary, never committed): `client/src/components/landing/editor-mock.test.tsx`

**Interfaces:**
- Produces (`mock-frames.ts`): `MOCK_SECTIONS` (readonly tuple of `'summary' | 'experience' | 'education' | 'projects' | 'skills'`), `type MockSection`, `type MockFrame = Record<MockSection, boolean>`, `MOCK_FRAMES: readonly MockFrame[]` (frame 0 is the static/no-JS state), `FRAME_MS: number`.
- Produces (`content.ts`): `MOCK_COPY`, `SAMPLE_RESUME`.
- Produces (`EditorMock.tsx`): default export `EditorMock` (no props); named export `SectionToggleList({ frame }: { frame: MockFrame })`, reused by `FeatureRows` in Task 3.
- Produces (`landing.css`): classes `.landing`, `.l-skip`, `.l-bg`, `.l-surface`, `.l-ink`, `.l-muted`, `.l-accent`, `.l-border`, `.l-eyebrow`, `.l-btn`, `.l-btn--primary`, `.l-btn--ghost`, `.l-btn--inverse`, `.l-navlink`, `.l-link`, `.l-inverse`, `.l-inverse-muted`, `.l-window`, `.l-canvas`, `.l-switch`, `.l-paper*`, `.l-thumb`, `.l-fade-up`, `.l-fade-in`.

- [ ] **Step 1: Write the failing test**

Create `client/src/components/landing/editor-mock.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import EditorMock from './EditorMock';
import { MOCK_FRAMES, MOCK_SECTIONS } from './mock-frames';

describe('EditorMock', () => {
  const html = renderToStaticMarkup(<EditorMock />);

  it('every frame defines every section', () => {
    for (const frame of MOCK_FRAMES) {
      expect(Object.keys(frame).sort()).toEqual([...MOCK_SECTIONS].sort());
    }
  });

  it('no frame hides more than two sections', () => {
    for (const frame of MOCK_FRAMES) {
      const hidden = MOCK_SECTIONS.filter((id) => !frame[id]).length;
      expect(hidden).toBeLessThanOrEqual(2);
    }
  });

  it('first frame renders statically with toggles matching the paper', () => {
    const first = MOCK_FRAMES[0];
    for (const id of MOCK_SECTIONS) {
      expect(html.includes(`data-paper-section="${id}"`)).toBe(first[id]);
    }
    const on = MOCK_SECTIONS.filter((id) => first[id]).length;
    const off = MOCK_SECTIONS.length - on;
    expect(html.split('data-on="true"').length - 1).toBe(on);
    expect(html.split('data-on="false"').length - 1).toBe(off);
  });

  it('labels the resume as a sample and exposes one accessible description', () => {
    expect(html).toContain('Sample resume');
    expect(html.split('role="img"').length - 1).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run (from `client/`): `npx vitest run src/components/landing/editor-mock.test.tsx`
Expected: FAIL, "Failed to resolve import './EditorMock'".

- [ ] **Step 3: Create `client/src/components/landing/mock-frames.ts`**

```ts
import type { SectionId } from '@/utils/section-layout';

export const MOCK_SECTIONS = ['summary', 'experience', 'education', 'projects', 'skills'] as const satisfies readonly SectionId[];

export type MockSection = (typeof MOCK_SECTIONS)[number];
export type MockFrame = Record<MockSection, boolean>;

const ALL_ON: MockFrame = { summary: true, experience: true, education: true, projects: true, skills: true };

/** Frame 0 is what renders without JS and under reduced motion. */
export const MOCK_FRAMES: readonly MockFrame[] = [
  { ...ALL_ON, projects: false },
  ALL_ON,
  { ...ALL_ON, education: false },
  ALL_ON,
];

export const FRAME_MS = 2800;
```

- [ ] **Step 4: Create `client/src/components/landing/content.ts`**

```ts
export const MOCK_COPY = {
  ariaLabel: 'Editor preview: turning resume sections on and off updates a live preview of a sample resume.',
  title: 'Sample resume',
  exportLabel: 'Export PDF',
  sectionsLabel: 'Sections',
} as const;

/** Fictional sample shown in the hero mock. Not a real person. */
export const SAMPLE_RESUME = {
  name: 'Alex Morgan',
  role: 'Backend Engineer',
  contact: 'alex.morgan@example.com · Portland, OR',
  summary: 'Backend engineer building reliable APIs and data pipelines for logistics and payments teams.',
  experience: [
    {
      title: 'Senior Backend Engineer',
      org: 'Northwind Freight',
      dates: '2021 – Present',
      points: ['Led the move of the order service to an event-driven design.', 'Mentored four engineers through their first on-call rotations.'],
    },
    {
      title: 'Software Engineer',
      org: 'Brightline Pay',
      dates: '2018 – 2021',
      points: ['Built the reconciliation service used by the finance team.'],
    },
  ],
  education: { degree: 'B.S. Computer Science', school: 'State University', dates: '2018' },
  projects: 'Open-source command-line tool for validating OpenAPI specs.',
  skills: 'Go · PostgreSQL · Kafka · Docker · AWS',
} as const;
```

- [ ] **Step 5: Create `client/src/styles/landing.css`**

```css
/* Landing page tokens and component classes. Scoped to .landing so the global theme is untouched.
   Unlayered on purpose: only color/appearance lives here; layout stays in Tailwind utilities. */

.landing {
  --l-bg: #ffffff;
  --l-surface: #f6f5f2;
  --l-surface-2: #efeee9;
  --l-ink: #111110;
  --l-ink-fg: #ffffff;
  --l-muted: #5c5b56;
  --l-hair: #e5e3dc;
  --l-hair-strong: #cfcdc5;
  --l-accent: #1f3f8f;
  --l-shadow: rgba(0, 0, 0, 0.28);

  position: relative;
  min-height: 100vh;
  background: var(--l-bg);
  color: var(--l-ink);
  font-family: 'Geist', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
}

.dark .landing {
  --l-bg: #0b0b0c;
  --l-surface: #151517;
  --l-surface-2: #1b1b1e;
  --l-ink: #f4f4f2;
  --l-ink-fg: #0b0b0c;
  --l-muted: #a3a29c;
  --l-hair: rgba(255, 255, 255, 0.1);
  --l-hair-strong: rgba(255, 255, 255, 0.22);
  --l-accent: #8fb0ff;
  --l-shadow: rgba(0, 0, 0, 0.7);
}

.landing main:focus { outline: none; }
.landing :focus-visible { outline: 2px solid var(--l-accent); outline-offset: 2px; }
.landing section[id] { scroll-margin-top: 5rem; }

@media (prefers-reduced-motion: no-preference) {
  html:has(.landing) { scroll-behavior: smooth; }
}

/* Color helpers */
.l-bg { background: var(--l-bg); }
.l-surface { background: var(--l-surface); }
.l-ink { color: var(--l-ink); }
.l-muted { color: var(--l-muted); }
.l-accent { color: var(--l-accent); }
.l-border { border-color: var(--l-hair); }

.l-eyebrow {
  font-family: ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace;
  font-size: 0.75rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

/* Buttons and links */
.l-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-height: 2.75rem;
  padding: 0 1.125rem;
  border: 1px solid transparent;
  border-radius: 6px;
  font-size: 0.9375rem;
  font-weight: 500;
  line-height: 1;
  text-decoration: none;
  cursor: pointer;
  transition: background-color 150ms ease-out, color 150ms ease-out, border-color 150ms ease-out;
}
.l-btn--primary { background: var(--l-ink); color: var(--l-ink-fg); }
.l-btn--primary:hover { background: color-mix(in srgb, var(--l-ink) 82%, var(--l-bg)); }
.l-btn--ghost { border-color: var(--l-hair-strong); color: var(--l-ink); background: transparent; }
.l-btn--ghost:hover { background: var(--l-surface); }
.l-btn--inverse { background: var(--l-ink-fg); color: var(--l-ink); }
.l-btn--inverse:hover { background: color-mix(in srgb, var(--l-ink-fg) 88%, var(--l-ink)); }

.l-navlink { color: var(--l-muted); text-decoration: none; transition: color 150ms ease-out; }
.l-navlink:hover { color: var(--l-ink); }

.l-link { color: var(--l-ink); text-decoration: underline; text-decoration-color: var(--l-accent); text-underline-offset: 3px; transition: color 150ms ease-out; }
.l-link:hover { color: var(--l-accent); }

.l-skip {
  position: absolute;
  left: 0.75rem;
  top: -4rem;
  z-index: 60;
  padding: 0.625rem 1rem;
  border-radius: 6px;
  background: var(--l-ink);
  color: var(--l-ink-fg);
  font-weight: 500;
}
.l-skip:focus { top: 0.75rem; }

/* Inverted band (closing CTA) */
.l-inverse { background: var(--l-ink); color: var(--l-ink-fg); }
.l-inverse-muted { color: color-mix(in srgb, var(--l-ink-fg) 78%, var(--l-ink)); }

/* Editor mock */
.l-window {
  background: var(--l-surface);
  border: 1px solid var(--l-hair);
  border-radius: 10px;
  box-shadow: 0 24px 48px -24px var(--l-shadow);
  overflow: hidden;
}
.l-canvas { background: var(--l-surface-2); }

.l-switch {
  position: relative;
  display: inline-block;
  flex: none;
  width: 1.625rem;
  height: 0.9375rem;
  border-radius: 999px;
  background: var(--l-hair-strong);
  transition: background-color 150ms ease-out;
}
.l-switch::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: calc(0.9375rem - 4px);
  height: calc(0.9375rem - 4px);
  border-radius: 50%;
  background: var(--l-bg);
  transition: transform 150ms ease-out;
}
.l-switch[data-on='true'] { background: var(--l-ink); }
.l-switch[data-on='true']::after { transform: translateX(0.6875rem); }

/* The resume paper stays white in both themes, like a real page. */
.l-paper {
  height: 18rem;
  padding: 1.125rem 1.25rem;
  overflow: hidden;
  border-radius: 3px 3px 0 0;
  background: #ffffff;
  color: #27272a;
  font-size: 0.625rem;
  line-height: 1.5;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}
.l-paper-name { font-size: 1rem; font-weight: 700; letter-spacing: -0.01em; color: #111111; }
.l-paper-role { margin-bottom: 0.5rem; font-size: 0.6875rem; color: #2f4a8a; }
.l-paper-h {
  margin: 0.625rem 0 0.25rem;
  padding-bottom: 2px;
  border-bottom: 1px solid #d4d4d8;
  font-size: 0.5625rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #111111;
}
.l-paper b { color: #111111; }

/* Template thumbnails */
.l-thumb { border: 1px solid var(--l-hair); transition: border-color 150ms ease-out; }
a:hover > .l-thumb, a:focus-visible > .l-thumb { border-color: var(--l-hair-strong); }

/* Motion */
@keyframes l-fade-up { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
@keyframes l-fade-in { from { opacity: 0; } to { opacity: 1; } }
.l-fade-up { animation: l-fade-up 300ms ease-out both; }
.l-fade-in { animation: l-fade-in 200ms ease-out both; }

@media (prefers-reduced-motion: reduce) {
  .landing *, .landing *::before, .landing *::after {
    animation: none !important;
    transition: none !important;
  }
}
```

- [ ] **Step 6: Create `client/src/components/landing/EditorMock.tsx`**

```tsx
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { GripVertical } from 'lucide-react';
import { SECTION_LABELS } from '@/utils/section-layout';
import { MOCK_COPY, SAMPLE_RESUME } from './content';
import { FRAME_MS, MOCK_FRAMES, MOCK_SECTIONS } from './mock-frames';
import type { MockFrame, MockSection } from './mock-frames';

export const SectionToggleList = ({ frame }: { frame: MockFrame }) => (
  <ul className="m-0 list-none p-0">
    {MOCK_SECTIONS.map((id) => (
      <li key={id} className="l-border flex items-center justify-between gap-2 border-b py-2 last:border-b-0">
        <span className="l-ink flex items-center gap-1.5 text-[0.8125rem]">
          <GripVertical aria-hidden="true" className="l-muted size-3.5" />
          {SECTION_LABELS[id]}
        </span>
        <span className="l-switch" data-on={frame[id]} />
      </li>
    ))}
  </ul>
);

const PaperSection = ({ id, title, children }: { id: MockSection; title: string; children: ReactNode }) => (
  <div data-paper-section={id} className="l-fade-in">
    <div className="l-paper-h">{title}</div>
    {children}
  </div>
);

const ResumePaper = ({ frame }: { frame: MockFrame }) => (
  <div className="l-paper">
    <div className="l-paper-name">{SAMPLE_RESUME.name}</div>
    <div className="l-paper-role">{SAMPLE_RESUME.role}</div>
    <div>{SAMPLE_RESUME.contact}</div>
    {frame.summary && (
      <PaperSection id="summary" title={SECTION_LABELS.summary}>
        <p className="m-0">{SAMPLE_RESUME.summary}</p>
      </PaperSection>
    )}
    {frame.experience && (
      <PaperSection id="experience" title={SECTION_LABELS.experience}>
        {SAMPLE_RESUME.experience.map((job) => (
          <div key={job.org} className="mb-1">
            <div>
              <b>{job.title}</b>, {job.org} · {job.dates}
            </div>
            <ul className="m-0 list-disc pl-3">
              {job.points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </div>
        ))}
      </PaperSection>
    )}
    {frame.education && (
      <PaperSection id="education" title={SECTION_LABELS.education}>
        <div>
          <b>{SAMPLE_RESUME.education.degree}</b>, {SAMPLE_RESUME.education.school} · {SAMPLE_RESUME.education.dates}
        </div>
      </PaperSection>
    )}
    {frame.projects && (
      <PaperSection id="projects" title={SECTION_LABELS.projects}>
        <p className="m-0">{SAMPLE_RESUME.projects}</p>
      </PaperSection>
    )}
    {frame.skills && (
      <PaperSection id="skills" title={SECTION_LABELS.skills}>
        <p className="m-0">{SAMPLE_RESUME.skills}</p>
      </PaperSection>
    )}
  </div>
);

export default function EditorMock() {
  const [frameIndex, setFrameIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = rootRef.current;
    if (!node || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let timer: ReturnType<typeof setInterval> | undefined;
    const start = () => {
      if (timer === undefined) {
        timer = setInterval(() => setFrameIndex((i) => (i + 1) % MOCK_FRAMES.length), FRAME_MS);
      }
    };
    const stop = () => {
      if (timer !== undefined) {
        clearInterval(timer);
        timer = undefined;
      }
    };

    if (typeof IntersectionObserver === 'undefined') {
      start();
      return stop;
    }
    const observer = new IntersectionObserver(([entry]) => (entry.isIntersecting ? start() : stop()));
    observer.observe(node);
    return () => {
      observer.disconnect();
      stop();
    };
  }, []);

  const frame = MOCK_FRAMES[frameIndex];

  return (
    <div ref={rootRef} role="img" aria-label={MOCK_COPY.ariaLabel} className="l-window">
      <div className="l-border l-surface flex items-center justify-between border-b px-3 py-2 text-xs">
        <span className="l-ink font-medium">{MOCK_COPY.title}</span>
        <span className="l-border l-muted rounded-md border px-2 py-0.5">{MOCK_COPY.exportLabel}</span>
      </div>
      <div className="grid grid-cols-[7rem_1fr] sm:grid-cols-[8.5rem_1fr]">
        <div className="l-border l-surface border-r p-3">
          <p className="l-eyebrow l-muted mb-1">{MOCK_COPY.sectionsLabel}</p>
          <SectionToggleList frame={frame} />
        </div>
        <div className="l-canvas px-3 pt-4 sm:px-5">
          <ResumePaper frame={frame} />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Run test to verify it passes**

Run (from `client/`): `npx vitest run src/components/landing/editor-mock.test.tsx`
Expected: PASS, 4 tests.

- [ ] **Step 8: Type-check**

Run (from `client/`): `npx tsc -b`
Expected: no output, exit 0.

- [ ] **Step 9: Commit (explicit paths; the test file is never staged)**

```bash
git add client/src/styles/landing.css client/src/components/landing/mock-frames.ts client/src/components/landing/content.ts client/src/components/landing/EditorMock.tsx
git commit -m "$(cat <<'EOF'
feat(landing): add landing tokens and editor mock

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Nav and hero

**Files:**
- Modify: `client/src/components/landing/content.ts` (append)
- Create: `client/src/components/landing/LandingNav.tsx`
- Create: `client/src/components/landing/Hero.tsx`
- Test (temporary, never committed): `client/src/components/landing/nav-hero.test.tsx`

**Interfaces:**
- Consumes: `EditorMock` default export (Task 1); CSS classes from Task 1; existing `ThemeToggle` (`@/components/ThemeToggle`, takes optional `styleClass` string and renders `class="... ${styleClass}"`, so always pass one).
- Produces (`content.ts`): `type NavItem = { label: string; href: string } | { label: string; to: string }`, `NAV_ITEMS: readonly NavItem[]`, `NAV_COPY`, `HERO_COPY`.
- Produces: default exports `LandingNav` and `Hero` (no props).

- [ ] **Step 1: Write the failing test**

Create `client/src/components/landing/nav-hero.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import type { ReactElement } from 'react';

vi.mock('@/components/ThemeToggle', () => ({ default: () => null }));

import LandingNav from './LandingNav';
import Hero from './Hero';

const render = (node: ReactElement) => renderToStaticMarkup(<MemoryRouter>{node}</MemoryRouter>);

describe('LandingNav', () => {
  const html = render(<LandingNav />);

  it('starts with the mobile menu closed', () => {
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain('id="landing-mobile-menu"');
  });

  it('has a skip link to main content', () => {
    expect(html).toContain('href="#main"');
  });

  it('links Features and Templates to in-page anchors and Privacy to its route', () => {
    expect(html).toContain('href="#features"');
    expect(html).toContain('href="#templates"');
    expect(html).toContain('href="/privacy-policy"');
  });

  it('sends sign in and get started to /login', () => {
    expect(html.split('href="/login"').length - 1).toBeGreaterThanOrEqual(2);
  });
});

describe('Hero', () => {
  const html = render(<Hero />);

  it('has exactly one h1 with the agreed headline', () => {
    expect(html.split('<h1').length - 1).toBe(1);
    expect(html).toContain('Build a resume you can stand behind.');
  });

  it('primary action goes to /login and secondary scrolls to templates', () => {
    expect(html).toContain('href="/login"');
    expect(html).toContain('href="#templates"');
  });

  it('includes the editor mock', () => {
    expect(html).toContain('Sample resume');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run (from `client/`): `npx vitest run src/components/landing/nav-hero.test.tsx`
Expected: FAIL, "Failed to resolve import './LandingNav'".

- [ ] **Step 3: Append to `client/src/components/landing/content.ts`**

```ts
export type NavItem = { label: string; href: string } | { label: string; to: string };

export const NAV_ITEMS: readonly NavItem[] = [
  { label: 'Features', href: '#features' },
  { label: 'Templates', href: '#templates' },
  { label: 'Privacy', to: '/privacy-policy' },
];

export const NAV_COPY = {
  brand: 'ResumeForge',
  signIn: 'Sign in',
  cta: 'Get started',
  skip: 'Skip to content',
  openMenu: 'Open menu',
  closeMenu: 'Close menu',
} as const;

export const HERO_COPY = {
  eyebrow: 'Resume & cover letter builder',
  headline: 'Build a resume you can stand behind.',
  sub: 'Pick a template, shape every section, preview it live and export a clean PDF.',
  primary: 'Build your resume',
  secondary: 'Browse templates',
  note: 'No credit card required · PDF export · Sign in with Google or GitHub',
} as const;
```

- [ ] **Step 4: Create `client/src/components/landing/LandingNav.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import { NAV_COPY, NAV_ITEMS } from './content';
import type { NavItem } from './content';

const MENU_ID = 'landing-mobile-menu';
const itemClass = 'l-navlink inline-flex min-h-11 items-center rounded-md px-2 text-[0.9375rem]';

export default function LandingNav() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const close = () => setOpen(false);

  const renderItem = (item: NavItem) =>
    'to' in item ? (
      <Link key={item.label} to={item.to} className={itemClass} onClick={close}>
        {item.label}
      </Link>
    ) : (
      <a key={item.label} href={item.href} className={itemClass} onClick={close}>
        {item.label}
      </a>
    );

  return (
    <header className="l-bg l-border sticky top-0 z-40 border-b">
      <a href="#main" className="l-skip">
        {NAV_COPY.skip}
      </a>
      <nav aria-label="Primary" className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="l-ink flex min-h-11 items-center gap-2.5 font-semibold no-underline">
          <img src="/icon.png" alt="" width={28} height={28} className="size-7 rounded-md" />
          {NAV_COPY.brand}
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map(renderItem)}
          <ThemeToggle styleClass="inline-flex min-h-11 min-w-11 items-center justify-center" />
          <Link to="/login" className={itemClass}>
            {NAV_COPY.signIn}
          </Link>
          <Link to="/login" className="l-btn l-btn--primary ml-1">
            {NAV_COPY.cta}
          </Link>
        </div>

        <div className="flex items-center gap-1 md:hidden">
          <ThemeToggle styleClass="inline-flex min-h-11 min-w-11 items-center justify-center" />
          <button
            type="button"
            className="l-ink inline-flex min-h-11 min-w-11 items-center justify-center rounded-md"
            aria-expanded={open}
            aria-controls={MENU_ID}
            aria-label={open ? NAV_COPY.closeMenu : NAV_COPY.openMenu}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X aria-hidden="true" className="size-5" /> : <Menu aria-hidden="true" className="size-5" />}
          </button>
        </div>
      </nav>

      {open && (
        <div id={MENU_ID} className="l-border l-bg border-t px-4 pb-4 pt-2 md:hidden">
          <div className="flex flex-col">
            {NAV_ITEMS.map(renderItem)}
            <Link to="/login" className={itemClass} onClick={close}>
              {NAV_COPY.signIn}
            </Link>
            <Link to="/login" className="l-btn l-btn--primary mt-2" onClick={close}>
              {NAV_COPY.cta}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
```

- [ ] **Step 5: Create `client/src/components/landing/Hero.tsx`**

```tsx
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import EditorMock from './EditorMock';
import { HERO_COPY } from './content';

export default function Hero() {
  return (
    <section aria-labelledby="hero-title" className="overflow-x-clip">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-12 sm:px-6 lg:grid-cols-[1fr_1.25fr] lg:gap-10 lg:px-8 lg:pb-24 lg:pt-20">
        <div className="l-fade-up">
          <p className="l-eyebrow l-muted mb-4">{HERO_COPY.eyebrow}</p>
          <h1 id="hero-title" className="mb-5 text-4xl font-semibold leading-[1.06] tracking-[-0.035em] sm:text-5xl lg:text-[3.5rem]">
            {HERO_COPY.headline}
          </h1>
          <p className="l-muted mb-8 max-w-md text-lg leading-relaxed">{HERO_COPY.sub}</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link to="/login" className="l-btn l-btn--primary">
              {HERO_COPY.primary}
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
            <a href="#templates" className="l-btn l-btn--ghost">
              {HERO_COPY.secondary}
            </a>
          </div>
          <p className="l-muted mt-5 text-sm">{HERO_COPY.note}</p>
        </div>
        <div className="l-fade-up lg:-mr-16">
          <EditorMock />
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 6: Run tests and type-check**

Run (from `client/`): `npx vitest run src/components/landing && npx tsc -b`
Expected: PASS (editor-mock and nav-hero tests), tsc exit 0.

- [ ] **Step 7: Commit**

```bash
git add client/src/components/landing/content.ts client/src/components/landing/LandingNav.tsx client/src/components/landing/Hero.tsx
git commit -m "$(cat <<'EOF'
feat(landing): add nav and hero

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Trust strip and feature rows

**Files:**
- Modify: `client/src/components/landing/content.ts` (append)
- Create: `client/src/components/landing/TrustStrip.tsx`
- Create: `client/src/components/landing/FeatureRows.tsx`
- Test (temporary, never committed): `client/src/components/landing/trust-features.test.tsx`

**Interfaces:**
- Consumes: `SectionToggleList` (named export of `EditorMock.tsx`) and `MOCK_FRAMES` (Task 1); `TEMPLATE_THUMBS` from `@/utils/template-thumbs`; `clTemplates` default export of `@/utils/cl-templates-type` (array of `{ id, name, available, ... }`).
- Produces (`content.ts`): `TRUST_ITEMS`, `FEATURES_COPY`, `FEATURE_ROWS` (array of `{ id: 'controls' | 'ats' | 'letters'; title: string; body: string }`), `ATS_STEPS: readonly string[]`, `LETTER_PREVIEW_IDS: readonly string[]`.
- Produces: default exports `TrustStrip` and `FeatureRows` (no props). `FeatureRows` renders `<section id="features">`.

- [ ] **Step 1: Write the failing test**

Create `client/src/components/landing/trust-features.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import type { ReactElement } from 'react';
import TrustStrip from './TrustStrip';
import FeatureRows from './FeatureRows';
import { ATS_STEPS, FEATURE_ROWS, TRUST_ITEMS } from './content';

const render = (node: ReactElement) => renderToStaticMarkup(<MemoryRouter>{node}</MemoryRouter>);

describe('TrustStrip', () => {
  const html = render(<TrustStrip />);

  it('renders three items and links to the privacy policy', () => {
    expect(TRUST_ITEMS).toHaveLength(3);
    for (const item of TRUST_ITEMS) expect(html).toContain(item.title);
    expect(html).toContain('href="/privacy-policy"');
  });

  it('uses an h2 for the section and h3 for items (no skipped levels)', () => {
    expect(html).toContain('<h2');
    expect(html.split('<h3').length - 1).toBe(3);
    expect(html).not.toContain('<h1');
  });
});

describe('FeatureRows', () => {
  const html = render(<FeatureRows />);

  it('is the #features section with one h3 per row', () => {
    expect(html).toContain('id="features"');
    expect(html.split('<h3').length - 1).toBe(FEATURE_ROWS.length);
  });

  it('shows the scanner steps taken from the real scanner copy', () => {
    for (const step of ATS_STEPS) expect(html).toContain(step);
  });

  it('only uses images that have alt text', () => {
    const imgs = html.match(/<img[^>]*>/g) ?? [];
    for (const img of imgs) expect(img).toMatch(/alt="[^"]+"/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run (from `client/`): `npx vitest run src/components/landing/trust-features.test.tsx`
Expected: FAIL, "Failed to resolve import './TrustStrip'".

- [ ] **Step 3: Append to `client/src/components/landing/content.ts`**

```ts
export const TRUST_ITEMS = [
  {
    title: 'Check ATS readability',
    body: 'Upload a PDF to the built-in scanner and see what an applicant tracking system can read from it.',
  },
  {
    title: 'Control the details',
    body: 'Reorder, hide and rename sections. Choose fonts, and recolor selected templates.',
  },
  {
    title: 'Straightforward privacy',
    body: 'We do not sell your personal information. Export your resume as a PDF whenever you need it.',
    link: { label: 'Read the privacy policy', to: '/privacy-policy' },
  },
] as const;

export const FEATURES_COPY = {
  srTrustHeading: 'Why ResumeForge',
  heading: 'What you can do',
  sub: 'The tools are the same whether you are writing a first resume or updating an old one.',
} as const;

export const FEATURE_ROWS = [
  {
    id: 'controls',
    title: 'Shape every section',
    body: 'Reorder sections, hide what does not apply, rename headings to suit your field, and pick fonts and colors. The preview updates as you work.',
  },
  {
    id: 'ats',
    title: 'See what an ATS reads',
    body: 'Upload your exported PDF to the scanner. It reads the text layer, checks sections and structure, and reports what it could extract.',
  },
  {
    id: 'letters',
    title: 'Match it with a cover letter',
    body: 'Write a cover letter in the same editor, with its own templates and the same font choices.',
  },
] as const;

/** Mirrors the scanner's own progress steps in ATSScanner.tsx. */
export const ATS_STEPS = ['Reading the text layer', 'Checking sections and structure', 'Evaluating results'] as const;

export const LETTER_PREVIEW_IDS = ['aether', 'aqua', 'terra'] as const;
```

- [ ] **Step 4: Create `client/src/components/landing/TrustStrip.tsx`**

```tsx
import { Link } from 'react-router-dom';
import { FEATURES_COPY, TRUST_ITEMS } from './content';

export default function TrustStrip() {
  return (
    <section aria-labelledby="trust-title" className="l-border border-y">
      <h2 id="trust-title" className="sr-only">
        {FEATURES_COPY.srTrustHeading}
      </h2>
      <div className="l-border mx-auto grid max-w-6xl md:grid-cols-3 md:divide-x">
        {TRUST_ITEMS.map((item) => (
          <div key={item.title} className="l-border border-b px-4 py-6 last:border-b-0 sm:px-6 md:border-b-0 lg:px-8">
            <h3 className="mb-1.5 text-[0.9375rem] font-semibold">{item.title}</h3>
            <p className="l-muted m-0 text-sm leading-relaxed">{item.body}</p>
            {'link' in item && (
              <Link to={item.link.to} className="l-link mt-2 inline-block text-sm">
                {item.link.label}
              </Link>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Create `client/src/components/landing/FeatureRows.tsx`**

```tsx
import type { ReactNode } from 'react';
import { CheckCircle2, FileText, ScanText } from 'lucide-react';
import clTemplates from '@/utils/cl-templates-type';
import { TEMPLATE_THUMBS } from '@/utils/template-thumbs';
import { SectionToggleList } from './EditorMock';
import { ATS_STEPS, FEATURES_COPY, FEATURE_ROWS, LETTER_PREVIEW_IDS } from './content';
import { MOCK_FRAMES } from './mock-frames';

const ATS_ICONS = [FileText, ScanText, CheckCircle2];

const letterPreviews = LETTER_PREVIEW_IDS.flatMap((id) => {
  const template = clTemplates.find((t) => t.id === id);
  const src = TEMPLATE_THUMBS[id];
  return template && src ? [{ id, src, name: template.name }] : [];
});

const VISUALS: Record<(typeof FEATURE_ROWS)[number]['id'], ReactNode> = {
  controls: (
    <div className="l-window max-w-xs p-4">
      <SectionToggleList frame={MOCK_FRAMES[0]} />
    </div>
  ),
  ats: (
    <ol className="l-window m-0 max-w-xs list-none p-4">
      {ATS_STEPS.map((step, index) => {
        const Icon = ATS_ICONS[index];
        return (
          <li key={step} className="l-border flex items-center gap-3 border-b py-2.5 text-sm last:border-b-0">
            <Icon aria-hidden="true" className="l-accent size-4 shrink-0" />
            {step}
          </li>
        );
      })}
    </ol>
  ),
  letters: (
    <div className="grid max-w-sm grid-cols-3 gap-3">
      {letterPreviews.map((preview) => (
        <img
          key={preview.id}
          src={preview.src}
          alt={`${preview.name} cover letter template`}
          width={280}
          height={362}
          loading="lazy"
          className="l-border aspect-[17/22] w-full rounded-sm border object-cover object-top"
        />
      ))}
    </div>
  ),
};

export default function FeatureRows() {
  return (
    <section id="features" aria-labelledby="features-title" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
      <div className="mb-12 max-w-xl">
        <h2 id="features-title" className="mb-3 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
          {FEATURES_COPY.heading}
        </h2>
        <p className="l-muted m-0 text-lg leading-relaxed">{FEATURES_COPY.sub}</p>
      </div>
      <div className="flex flex-col gap-14 lg:gap-20">
        {FEATURE_ROWS.map((row, index) => (
          <div
            key={row.id}
            className={`l-border grid items-center gap-8 border-t pt-10 md:grid-cols-2 md:gap-12 ${index % 2 === 1 ? 'md:[&>*:first-child]:order-2' : ''}`}
          >
            <div>
              <h3 className="mb-2 text-xl font-semibold tracking-[-0.02em]">{row.title}</h3>
              <p className="l-muted m-0 max-w-md leading-relaxed">{row.body}</p>
            </div>
            <div className={index % 2 === 1 ? 'md:justify-self-start' : 'md:justify-self-end'}>{VISUALS[row.id]}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 6: Run tests and type-check**

Run (from `client/`): `npx vitest run src/components/landing && npx tsc -b`
Expected: PASS, tsc exit 0.

- [ ] **Step 7: Commit**

```bash
git add client/src/components/landing/content.ts client/src/components/landing/TrustStrip.tsx client/src/components/landing/FeatureRows.tsx
git commit -m "$(cat <<'EOF'
feat(landing): add trust strip and feature rows

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Template strip, closing CTA, footer, and the honesty test

**Files:**
- Modify: `client/src/components/landing/content.ts` (append)
- Create: `client/src/components/landing/TemplateStrip.tsx`
- Create: `client/src/components/landing/ClosingCta.tsx`
- Create: `client/src/components/landing/LandingFooter.tsx`
- Test (temporary, never committed): `client/src/components/landing/strip-footer-copy.test.tsx`

**Interfaces:**
- Consumes: default export `templates` of `@/utils/templates-type` and `clTemplates` of `@/utils/cl-templates-type` (arrays of `{ id, name, available }`); `TEMPLATE_THUMBS` (record of id to image URL); all of `content.ts`.
- Produces (`content.ts`): `templateStripCopy(resumeCount: number, letterCount: number)` returning `{ heading: string; sub: string }`, `CTA_COPY`, `FOOTER_COPY`.
- Produces: default exports `TemplateStrip` (renders `<section id="templates">`), `ClosingCta`, `LandingFooter` (no props).

- [ ] **Step 1: Write the failing test**

Create `client/src/components/landing/strip-footer-copy.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import type { ReactElement } from 'react';
import templates from '@/utils/templates-type';
import clTemplates from '@/utils/cl-templates-type';
import { TEMPLATE_THUMBS } from '@/utils/template-thumbs';
import TemplateStrip from './TemplateStrip';
import ClosingCta from './ClosingCta';
import LandingFooter from './LandingFooter';
import * as content from './content';

const render = (node: ReactElement) => renderToStaticMarkup(<MemoryRouter>{node}</MemoryRouter>);

describe('TemplateStrip', () => {
  const html = render(<TemplateStrip />);

  it('every available template has a thumbnail (nothing is silently dropped)', () => {
    for (const t of [...templates, ...clTemplates].filter((x) => x.available)) {
      expect(TEMPLATE_THUMBS[t.id], t.id).toBeTruthy();
    }
  });

  it('renders one image per available resume template, each with alt text, linking to /login', () => {
    const expected = templates.filter((t) => t.available).length;
    const imgs = html.match(/<img[^>]*>/g) ?? [];
    expect(imgs).toHaveLength(expected);
    for (const img of imgs) expect(img).toMatch(/alt="[^"]+"/);
    expect(html).toContain('id="templates"');
    expect(html).toContain('href="/login"');
  });

  it('states the real template counts', () => {
    expect(html).toContain(`${templates.filter((t) => t.available).length} resume templates`);
  });
});

describe('ClosingCta and LandingFooter', () => {
  it('closing CTA goes to /login', () => {
    expect(render(<ClosingCta />)).toContain('href="/login"');
  });

  it('footer links to privacy and terms and shows the current year', () => {
    const html = render(<LandingFooter />);
    expect(html).toContain('href="/privacy-policy"');
    expect(html).toContain('href="/terms-of-service"');
    expect(html).toContain(String(new Date().getFullYear()));
  });
});

describe('copy honesty (spec: no invented social proof, no guarantees)', () => {
  const all = JSON.stringify({
    ...content,
    strip: content.templateStripCopy(10, 5),
  });

  const forbidden: [string, RegExp][] = [
    ['testimonial / social proof', /testimonial|trusted by|loved by|as seen|join (thousands|millions)/i],
    ['user or resume counts', /\b\d[\d,.]*\s?(k|m|\+)?\s+(users|people|resumes created|professionals|companies|downloads)\b/i],
    ['ratings and stars', /\brated\b|★|⭐|\d(\.\d)?\s?\/\s?5\b|five.star/i],
    ['ATS guarantees', /guarantee|beat(s)? the ats|pass(es)? (every |any )?ats|100\s?%/i],
    ['superlatives', /\bbest\b|#1|number one|world.class/i],
    ['emoji', /\p{Extended_Pictographic}/u],
  ];

  for (const [label, pattern] of forbidden) {
    it(`contains no ${label}`, () => {
      expect(all).not.toMatch(pattern);
    });
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run (from `client/`): `npx vitest run src/components/landing/strip-footer-copy.test.tsx`
Expected: FAIL, "Failed to resolve import './TemplateStrip'".

- [ ] **Step 3: Append to `client/src/components/landing/content.ts`**

```ts
export const templateStripCopy = (resumeCount: number, letterCount: number) => ({
  heading: 'Pick a template, then make it yours.',
  sub: `${resumeCount} resume templates and ${letterCount} cover letter templates. Every one is editable, and any of them can use any font.`,
});

export const CTA_COPY = {
  heading: 'Start your resume today.',
  sub: 'Sign in with Google or GitHub to begin.',
  button: 'Get started',
} as const;

export const FOOTER_COPY = {
  brand: 'ResumeForge',
  privacy: 'Privacy Policy',
  terms: 'Terms of Service',
} as const;
```

- [ ] **Step 4: Create `client/src/components/landing/TemplateStrip.tsx`**

```tsx
import { Link } from 'react-router-dom';
import templates from '@/utils/templates-type';
import clTemplates from '@/utils/cl-templates-type';
import { TEMPLATE_THUMBS } from '@/utils/template-thumbs';
import { templateStripCopy } from './content';

// A template without a thumbnail is omitted rather than rendered as a broken image.
const shown = (list: typeof templates) => list.filter((t) => t.available && TEMPLATE_THUMBS[t.id]);
const resumeTemplates = shown(templates);
const letterCount = shown(clTemplates).length;

export default function TemplateStrip() {
  const copy = templateStripCopy(resumeTemplates.length, letterCount);

  return (
    <section id="templates" aria-labelledby="templates-title" className="l-surface l-border border-y">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="mb-10 max-w-xl">
          <h2 id="templates-title" className="mb-3 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
            {copy.heading}
          </h2>
          <p className="l-muted m-0 text-lg leading-relaxed">{copy.sub}</p>
        </div>
        <ul className="m-0 grid list-none grid-cols-2 gap-4 p-0 sm:grid-cols-3 lg:grid-cols-5">
          {resumeTemplates.map((template) => (
            <li key={template.id}>
              <Link to="/login" className="block no-underline">
                <img
                  src={TEMPLATE_THUMBS[template.id]}
                  alt={`${template.name} resume template`}
                  width={280}
                  height={362}
                  loading="lazy"
                  className="l-thumb aspect-[17/22] w-full rounded-sm object-cover object-top"
                />
                <span className="l-ink mt-2 block text-sm font-medium">{template.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Create `client/src/components/landing/ClosingCta.tsx`**

```tsx
import { Link } from 'react-router-dom';
import { CTA_COPY } from './content';

export default function ClosingCta() {
  return (
    <section aria-labelledby="cta-title" className="l-inverse">
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-14 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8 lg:py-16">
        <div>
          <h2 id="cta-title" className="mb-2 text-3xl font-semibold tracking-[-0.03em]">
            {CTA_COPY.heading}
          </h2>
          <p className="l-inverse-muted m-0 text-lg">{CTA_COPY.sub}</p>
        </div>
        <Link to="/login" className="l-btn l-btn--inverse">
          {CTA_COPY.button}
        </Link>
      </div>
    </section>
  );
}
```

- [ ] **Step 6: Create `client/src/components/landing/LandingFooter.tsx`**

```tsx
import { Link } from 'react-router-dom';
import { FOOTER_COPY } from './content';

export default function LandingFooter() {
  return (
    <footer className="l-border l-bg border-t">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
        <p className="l-muted m-0 text-sm">
          © {new Date().getFullYear()} {FOOTER_COPY.brand}
        </p>
        <nav aria-label="Footer" className="flex gap-2">
          <Link to="/privacy-policy" className="l-navlink inline-flex min-h-11 items-center rounded-md px-2 text-sm">
            {FOOTER_COPY.privacy}
          </Link>
          <Link to="/terms-of-service" className="l-navlink inline-flex min-h-11 items-center rounded-md px-2 text-sm">
            {FOOTER_COPY.terms}
          </Link>
        </nav>
      </div>
    </footer>
  );
}
```

- [ ] **Step 7: Run tests and type-check**

Run (from `client/`): `npx vitest run src/components/landing && npx tsc -b`
Expected: PASS for all landing tests including every "contains no ..." case; tsc exit 0. If a forbidden-pattern test fails, the copy is wrong: fix the copy in `content.ts`, never loosen the pattern.

- [ ] **Step 8: Commit**

```bash
git add client/src/components/landing/content.ts client/src/components/landing/TemplateStrip.tsx client/src/components/landing/ClosingCta.tsx client/src/components/landing/LandingFooter.tsx
git commit -m "$(cat <<'EOF'
feat(landing): add template strip, closing CTA and footer

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Compose the page and hide the global footer on `/`

**Files:**
- Modify (full replace): `client/src/pages/Home.tsx`
- Modify: `client/src/routes.tsx:25`

**Interfaces:**
- Consumes: default exports of all eight landing blocks and `@/styles/landing.css`.
- Produces: default export `Home` (route element for `/`, already lazy-imported by `routes.tsx`).

- [ ] **Step 1: Replace `client/src/pages/Home.tsx` entirely**

```tsx
import '@/styles/landing.css';
import LandingNav from '@/components/landing/LandingNav';
import Hero from '@/components/landing/Hero';
import TrustStrip from '@/components/landing/TrustStrip';
import FeatureRows from '@/components/landing/FeatureRows';
import TemplateStrip from '@/components/landing/TemplateStrip';
import ClosingCta from '@/components/landing/ClosingCta';
import LandingFooter from '@/components/landing/LandingFooter';

const Home = () => (
  <div className="landing">
    <LandingNav />
    <main id="main" tabIndex={-1}>
      <Hero />
      <TrustStrip />
      <FeatureRows />
      <TemplateStrip />
      <ClosingCta />
    </main>
    <LandingFooter />
  </div>
);

export default Home;
```

- [ ] **Step 2: Hide the global footer on `/` in `client/src/routes.tsx`**

Change line 25 from:

```tsx
  const showFooter = !location.pathname.startsWith('/preview') && !location.pathname.startsWith('/cl-preview') && !location.pathname.startsWith('/terms-of-service') && !location.pathname.startsWith('/privacy-policy') && !location.pathname.startsWith('/login');
```

to (note `!==` for `/`, not `startsWith`, which would hide the footer on every route):

```tsx
  const showFooter = location.pathname !== '/' && !location.pathname.startsWith('/preview') && !location.pathname.startsWith('/cl-preview') && !location.pathname.startsWith('/terms-of-service') && !location.pathname.startsWith('/privacy-policy') && !location.pathname.startsWith('/login');
```

- [ ] **Step 3: Type-check, lint and run all temporary tests**

Run (from `client/`): `npx tsc -b && npx eslint src/components/landing src/pages/Home.tsx src/routes.tsx && npx vitest run src/components/landing`
Expected: tsc exit 0; eslint prints nothing (no errors, no warnings); all landing tests PASS.

- [ ] **Step 4: Production build smoke test**

Run (from `client/`): `npx vite build --outDir node_modules/.tmp/landing-build --emptyOutDir`
Expected: build completes, no CSS or import errors. The throwaway output goes under `node_modules`, so the existing `client/dist/` is not touched; run `git status --short` afterwards and expect nothing new.

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/Home.tsx client/src/routes.tsx
git commit -m "$(cat <<'EOF'
feat(landing): compose redesigned landing page and hide global footer on /

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Browser verification, contrast check and cleanup

**Files:**
- Create (scratch only, outside the repo): contrast script in the session scratchpad directory
- Delete: every `*.test.tsx` created in Tasks 1 to 4
- No product code changes unless a check fails (then fix in the owning file, re-run, and commit that fix separately)

- [ ] **Step 1: Contrast check of the token pairs**

Write this to the scratchpad directory as `contrast.mjs` and run it with `node`:

```js
const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const pairs = {
  'light muted on bg': ['#5c5b56', '#ffffff'], 'light muted on surface': ['#5c5b56', '#f6f5f2'],
  'light ink on bg': ['#111110', '#ffffff'], 'light accent on bg': ['#1f3f8f', '#ffffff'],
  'dark muted on bg': ['#a3a29c', '#0b0b0c'], 'dark muted on surface': ['#a3a29c', '#151517'],
  'dark ink on bg': ['#f4f4f2', '#0b0b0c'], 'dark accent on bg': ['#8fb0ff', '#0b0b0c'],
  'paper role on white': ['#2f4a8a', '#ffffff'],
};
let bad = 0;
for (const [name, [fg, bg]] of Object.entries(pairs)) {
  const r = ratio(fg, bg);
  if (r < 4.5) bad++;
  console.log(`${r.toFixed(2)}  ${r >= 4.5 ? 'ok  ' : 'FAIL'}  ${name}`);
}
process.exit(bad ? 1 : 0);
```

Expected: every line `ok`, exit 0. If any fails, adjust that token in `landing.css` (both light and dark blocks), re-run.

- [ ] **Step 2: Start the dev server**

Run (from `client/`, in the background): `yarn dev`
Expected: Vite prints a local URL (default `http://localhost:5173/`).

- [ ] **Step 3: Visual pass in the browser (Claude in Chrome tools)**

Load the tools in one `ToolSearch` call, open a new tab at the dev URL, and for each of widths 375, 768 and 1440 in both light and dark (switch with the nav toggle) check:
- Hero, trust strip, three feature rows, template strip, closing band and footer all render; nothing overlaps or clips.
- At 375px: the mobile menu button shows, the desktop links do not, and the editor mock fits the width.
- Dark mode: the resume paper stays white; the closing band inverts to a light band with dark text.
- The toggle loop in the mock flips switches and the paper content together.

- [ ] **Step 4: No horizontal scroll at 375px (Review Focus 2)**

At width 375, run in the page: `document.documentElement.scrollWidth <= window.innerWidth`
Expected: `true`. Repeat at 768 and 1440. If `false`, find the overflowing element (largest `getBoundingClientRect().right`) and fix it in the owning component.

- [ ] **Step 5: Keyboard and menu pass (Review Focus 5)**

At 375px: press Tab from the page top. Expected order: skip link (visible, jumps to main), logo, theme toggle, menu button. Open the menu with Enter; `aria-expanded` becomes `true`; Escape closes it; clicking a link closes it. Every focused element shows a visible ring.

- [ ] **Step 6: Reduced motion**

In the page console, confirm the guard by evaluating `window.matchMedia('(prefers-reduced-motion: reduce)').matches` is `false` normally, then emulate reduced motion with the browser's rendering emulation if the tool supports it; with it on, the mock must stay on frame 0 (Projects off) and the hero must not animate. If the tool cannot emulate it, state that explicitly in the final report and rely on the unit test plus the code guard in `EditorMock.tsx`.

- [ ] **Step 7: Other pages unaffected**

Open `/nope` (404) and `/privacy-policy`. Expected: `/nope` still shows the old fixed footer; `/privacy-policy` shows none (as before); `/` shows only the new static footer.

- [ ] **Step 8: Stop the dev server, delete every temporary test file, verify the tree**

```bash
rm -f client/src/components/landing/*.test.tsx
git status --short
git ls-files | grep -E '\.test\.|__snapshots__' || echo "no test files tracked"
```

Expected: `git status --short` shows nothing (clean) and the second command prints `no test files tracked`. If anything else is listed, resolve it before reporting.

- [ ] **Step 9: Report**

Summarize to the user, faithfully: which checks passed, anything skipped (for example reduced-motion emulation), the commits made on `page-revamp`, and that nothing was pushed. Mention the open copy decision: the page avoids the word "free" because the Terms of Service has a conditional billing clause and the code has no pricing; ask whether they want "Free to start" added.
