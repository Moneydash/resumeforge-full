# Templates Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign `/templates` inside the shared `AppShell`, grouped by collection with large crisp previews, no "coming soon" branch, and immediate navigation with loading feedback.

**Architecture:** `Templates.tsx` stays the container (resume id, redirect, data fetch, selection) and renders a presentational `TemplatesView` in `AppShell`. A pure `groupTemplates` decides which collections to show. Ten medium previews are generated once from the existing snapshots and committed, so the page stops loading about 7 MB of full-size images.

**Tech Stack:** React 19, Vite 6, Tailwind 4 (layout utilities only), `lucide-react`, `react-router-dom` 7, `sonner`, Pillow (one-off image generation), Vitest 5 in the `node` environment (tests use `react-dom/server`).

**Spec:** [docs/superpowers/specs/2026-10-11-templates-design.md](../specs/2026-10-11-templates-design.md)

All paths are relative to the repo root. Run client commands from `client/`.

## Global Constraints

- Only `/templates` changes, plus the small shell tweak in Task 3 (the Resumes item stays active on `/templates`, and Cover letters on `/cl-templates`) and one added condition in `client/src/routes.tsx`.
- No "coming soon" toast and no `available` check on this page (all 10 templates are available). The `available`, `icon` and `features` fields stay in the data untouched; this page does not show `icon` or `features`.
- Behavior kept exactly: `resumeId` = `localStorage.getItem('id') || ` the `resumeId` query parameter `|| ''`; with no id the page redirects to `/dashboard`; resume data is fetched with `GET /resume/fetch-data/<resumeId>/<userId>` (`userId` from the `user.id` cookie) and stored in `localStorage.resumeFormData`; selecting a template stores `id` (the resume id) and `template` (the template id) in `localStorage` and navigates to `/preview?template=<templateId>`.
- Selecting navigates immediately through `usePendingNavigation` (key `template:<id>`, message `Opening "<name>"...`); the two `localStorage` writes happen in its `beforeNavigate` callback, so they run only when the click was accepted. The 1.5 s wait is removed.
- No gradients, no emojis, no hover lift, scale or zoom, no feature checklists, no closing banner, no claims ("HR Approved", "Join the Growing Community" and "ATS Optimized" are gone). Icons from `lucide-react` only.
- Reuse the shared tokens through `.app-shell` and the dashboard classes (`.app-card`, `.app-seg`, `.l-btn`, `.app-title`); `landing.css`, `dashboard.css` and the global shadcn theme are not modified.
- Accessibility: one h1; one h2 per shown collection; the filter is a `role="group"` named "Collection" with `aria-pressed` buttons; the card button's accessible name is `Use <template name>`; previews are decorative (`alt=""`); 44px controls; visible focus rings; 4.5:1 contrast (shared tokens).
- Preview images: medium JPEGs (about 560px wide, quality 75), each at most 200 KB, loaded with `loading="lazy"`. The full-size snapshots in `client/src/assets/snapshots/` are kept.
- The old `client/src/components/TemplateCard.tsx` is deleted only after a repo-wide search shows no remaining importer (Task 5), and the stale line in `client/README.md` is updated.
- Do not push. Commits stay local on `page-revamp` unless the user asks.
- Test files, any harness and any snapshots may be created for verification but must never be staged or committed. Every commit step stages explicit paths only; Task 6 deletes them all and checks `git status`.
- Commit messages end with the line: `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`

## Review Focus

1. **No resume id:** the page must render nothing (not crash, not flash content) while it redirects to `/dashboard`, even where `localStorage` does not exist (server-side render in tests). Pinned by the page test in Task 5.
2. **A template with no preview image** (for example a new template added to the data later): the card must show a plain "No preview" placeholder, not a broken image. Pinned by the card test in Task 4.
3. **Filtering to a collection with no templates, or data with only one collection:** no empty heading is rendered. Pinned by the `groupTemplates` tests in Task 2.
4. **Image weight regression:** the previews must stay small and complete (10 files, each at most 200 KB, at 560px wide) so the page never goes back to loading megabytes. Pinned by the size test in Task 1 and the dimension script in Task 1.
5. **Active sidebar item on `/templates`:** Resumes must be marked current (not nothing, and not Cover letters). Pinned by the shell test in Task 3.
6. **Double selection:** clicking two templates quickly must navigate once, to the first. Covered by the existing `beginPending` rule (one pending key at a time); the card test in Task 4 checks only the pending visuals, and the container test in Task 5 checks the wiring uses the shared hook.

---

### Task 1: Generate the previews and map them

**Files:**
- Create: `client/src/assets/template-previews/<id>.jpg` (10 files: `andromeda`, `cigar`, `comet`, `milky_way`, `apollo`, `artemis`, `athena`, `hera`, `hermes`, `zeus`)
- Create: `client/src/components/template-picker/template-previews.ts`
- Test (temporary, never committed): `client/src/components/template-picker/template-previews.test.ts`
- Scratch (outside the repo, in the session scratchpad directory): `make_previews.py`

**Interfaces:**
- Produces: `TEMPLATE_PREVIEWS: Record<string, string>` mapping every resume template id to its preview image URL.

- [ ] **Step 1: Write the failing test**

Create `client/src/components/template-picker/template-previews.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import templates from '@/utils/templates-type';
import { TEMPLATE_PREVIEWS } from './template-previews';

const dir = fileURLToPath(new URL('../../assets/template-previews/', import.meta.url));

describe('template previews', () => {
  it('has a preview for every resume template', () => {
    for (const template of templates) {
      expect(TEMPLATE_PREVIEWS[template.id], template.id).toBeTruthy();
    }
  });

  it('has exactly one small image per template (page weight must not regress)', () => {
    const files = readdirSync(dir).filter((name) => name.endsWith('.jpg'));
    expect(files.sort()).toEqual(templates.map((t) => `${t.id}.jpg`).sort());
    for (const file of files) {
      const size = statSync(`${dir}${file}`).size;
      expect(size, file).toBeGreaterThan(10_000);
      expect(size, file).toBeLessThanOrEqual(200_000);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run (from `client/`): `npx vitest run src/components/template-picker/template-previews.test.ts`
Expected: FAIL, "Failed to resolve import './template-previews'".

- [ ] **Step 3: Generate the previews**

Write `make_previews.py` to the scratchpad directory, then run it from the repo root with `python <scratchpad>/make_previews.py`:

```python
import os
from PIL import Image

ROOT = "client/src/assets"
OUT = f"{ROOT}/template-previews"
WIDTH = 560

SOURCES = {
    "andromeda": "galaxy/andromeda.jpg",
    "cigar": "galaxy/cigar.jpg",
    "comet": "galaxy/comet.jpg",
    "milky_way": "galaxy/milky-way.jpg",
    "apollo": "greek/apollo.jpg",
    "artemis": "greek/artemis.jpg",
    "athena": "greek/athena.jpg",
    "hera": "greek/hera.jpg",
    "hermes": "greek/hermes.jpg",
    "zeus": "greek/zeus.jpg",
}

os.makedirs(OUT, exist_ok=True)
total = 0
for template_id, source in SOURCES.items():
    image = Image.open(f"{ROOT}/snapshots/{source}").convert("RGB")
    if image.width > WIDTH:  # never upscale
        image = image.resize((WIDTH, round(image.height * WIDTH / image.width)), Image.Resampling.LANCZOS)
    target = f"{OUT}/{template_id}.jpg"
    image.save(target, "JPEG", quality=75, optimize=True, progressive=True)
    size = os.path.getsize(target)
    total += size
    print(f"{template_id:10s} {image.width}x{image.height}  {size / 1024:6.1f} KB")
print(f"total {total / 1024:.0f} KB (was about 7 MB of snapshots)")
```

Expected: ten lines, each `560x<height>` (a snapshot narrower than 560px would keep its own width; if that happens, note it in the ledger), each size well under 200 KB, a total well under 1 MB.

- [ ] **Step 4: Create `client/src/components/template-picker/template-previews.ts`**

```ts
// Medium previews (about 560px wide, generated from the full-size snapshots) for the template picker.
import andromeda from '@/assets/template-previews/andromeda.jpg';
import cigar from '@/assets/template-previews/cigar.jpg';
import comet from '@/assets/template-previews/comet.jpg';
import milkyWay from '@/assets/template-previews/milky_way.jpg';
import apollo from '@/assets/template-previews/apollo.jpg';
import artemis from '@/assets/template-previews/artemis.jpg';
import athena from '@/assets/template-previews/athena.jpg';
import hera from '@/assets/template-previews/hera.jpg';
import hermes from '@/assets/template-previews/hermes.jpg';
import zeus from '@/assets/template-previews/zeus.jpg';

export const TEMPLATE_PREVIEWS: Record<string, string> = {
  andromeda,
  cigar,
  comet,
  milky_way: milkyWay,
  apollo,
  artemis,
  athena,
  hera,
  hermes,
  zeus,
};
```

- [ ] **Step 5: Run test and type-check**

Run (from `client/`): `npx vitest run src/components/template-picker && npx tsc -b`
Expected: 2 tests PASS; tsc exit 0.

- [ ] **Step 6: Check dimensions with a script (Review Focus 4)**

Run (from the repo root): `python -c "from PIL import Image; import glob; [print(p, Image.open(p).size) for p in sorted(glob.glob('client/src/assets/template-previews/*.jpg'))]"`
Expected: ten lines, every width `560`.

- [ ] **Step 7: Commit (explicit paths; the test file is never staged)**

```bash
git add client/src/assets/template-previews client/src/components/template-picker/template-previews.ts
git commit -m "$(cat <<'EOF'
feat(templates): add medium template previews

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Collection grouping

**Files:**
- Create: `client/src/components/template-picker/collections.ts`
- Test (temporary, never committed): `client/src/components/template-picker/collections.test.ts`

**Interfaces:**
- Produces: `type CollectionFilterId = 'all' | 'galaxy' | 'greek'`; `COLLECTIONS: readonly { id: 'galaxy' | 'greek'; filterLabel: string; heading: string }[]`; `interface TemplateGroup { id: 'galaxy' | 'greek'; heading: string; templates: Template[] }`; `groupTemplates(templates: Template[], selected: CollectionFilterId): TemplateGroup[]`; `filterCounts(templates: Template[]): Record<CollectionFilterId, number>`.

- [ ] **Step 1: Write the failing test**

Create `client/src/components/template-picker/collections.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import templates from '@/utils/templates-type';
import type { Template } from '@/types';
import { COLLECTIONS, filterCounts, groupTemplates } from './collections';

const only = (theme: 'galaxy' | 'greek'): Template[] => templates.filter((t) => t.theme === theme);

describe('groupTemplates', () => {
  it('"all" gives both collections with their headings, in order, covering every template once', () => {
    const groups = groupTemplates(templates, 'all');
    expect(groups.map((g) => g.id)).toEqual(['galaxy', 'greek']);
    expect(groups.map((g) => g.heading)).toEqual(['Galaxy collection', 'Greek Gods collection']);
    expect(groups.reduce((n, g) => n + g.templates.length, 0)).toBe(templates.length);
  });

  it('a collection filter gives just that group', () => {
    expect(groupTemplates(templates, 'galaxy').map((g) => g.id)).toEqual(['galaxy']);
    expect(groupTemplates(templates, 'greek').map((g) => g.id)).toEqual(['greek']);
  });

  it('keeps the data order inside each group', () => {
    const galaxy = groupTemplates(templates, 'galaxy')[0].templates.map((t) => t.id);
    expect(galaxy).toEqual(only('galaxy').map((t) => t.id));
  });

  it('never renders an empty collection', () => {
    expect(groupTemplates(only('galaxy'), 'all').map((g) => g.id)).toEqual(['galaxy']);
    expect(groupTemplates(only('galaxy'), 'greek')).toEqual([]);
    expect(groupTemplates([], 'all')).toEqual([]);
  });
});

describe('filterCounts', () => {
  it('counts each collection and the total from the data', () => {
    const counts = filterCounts(templates);
    expect(counts.all).toBe(templates.length);
    expect(counts.galaxy).toBe(only('galaxy').length);
    expect(counts.greek).toBe(only('greek').length);
    expect(counts.galaxy + counts.greek).toBe(counts.all);
  });
});

describe('COLLECTIONS', () => {
  it('has short filter labels and full headings', () => {
    expect(COLLECTIONS.map((c) => c.filterLabel)).toEqual(['Galaxy', 'Greek']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run (from `client/`): `npx vitest run src/components/template-picker/collections.test.ts`
Expected: FAIL, "Failed to resolve import './collections'".

- [ ] **Step 3: Create `client/src/components/template-picker/collections.ts`**

```ts
import type { Template } from '@/types';

export type CollectionFilterId = 'all' | 'galaxy' | 'greek';

export const COLLECTIONS = [
  { id: 'galaxy', filterLabel: 'Galaxy', heading: 'Galaxy collection' },
  { id: 'greek', filterLabel: 'Greek', heading: 'Greek Gods collection' },
] as const;

export interface TemplateGroup {
  id: 'galaxy' | 'greek';
  heading: string;
  templates: Template[];
}

/** The collections to show for the current filter, in a fixed order, keeping data order; empty ones are dropped. */
export function groupTemplates(templates: Template[], selected: CollectionFilterId): TemplateGroup[] {
  return COLLECTIONS.filter((collection) => selected === 'all' || selected === collection.id)
    .map((collection) => ({
      id: collection.id,
      heading: collection.heading,
      templates: templates.filter((template) => template.theme === collection.id),
    }))
    .filter((group) => group.templates.length > 0);
}

export function filterCounts(templates: Template[]): Record<CollectionFilterId, number> {
  return {
    all: templates.length,
    galaxy: templates.filter((template) => template.theme === 'galaxy').length,
    greek: templates.filter((template) => template.theme === 'greek').length,
  };
}
```

- [ ] **Step 4: Run tests, type-check and lint**

Run (from `client/`): `npx vitest run src/components/template-picker && npx tsc -b && npx eslint src/components/template-picker --ignore-pattern "**/*.test.ts" --ignore-pattern "**/*.test.tsx"`
Expected: all tests PASS; tsc exit 0; eslint prints nothing.

- [ ] **Step 5: Commit**

```bash
git add client/src/components/template-picker/collections.ts
git commit -m "$(cat <<'EOF'
feat(templates): add collection grouping and counts

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Keep Resumes active on the templates routes

**Files:**
- Modify: `client/src/components/app-shell/nav-items.ts`
- Modify: `client/src/components/app-shell/AppShell.tsx` (one line)
- Test (temporary, never committed): `client/src/components/app-shell/shell-active.test.tsx`

**Interfaces:**
- Changes: `NavItem` gains an optional `activeFor?: readonly string[]` (extra route prefixes that count as this item); `isActive(pathname: string, to: string, activeFor?: readonly string[]): boolean`. Existing two-argument calls keep working.

- [ ] **Step 1: Write the failing test**

Create `client/src/components/app-shell/shell-active.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/components/ThemeToggle', () => ({ default: () => null }));

import AppShell from './AppShell';
import { isActive } from './nav-items';

const currentLinks = (path: string) => {
  const html = renderToStaticMarkup(
    <MemoryRouter initialEntries={[path]}>
      <AppShell>
        <p>body</p>
      </AppShell>
    </MemoryRouter>,
  );
  return (html.match(/<a [^>]*>/g) ?? []).filter((tag) => tag.includes('aria-current="page"'));
};

describe('isActive', () => {
  it('still matches the exact route and its children', () => {
    expect(isActive('/dashboard', '/dashboard')).toBe(true);
    expect(isActive('/dashboard/x', '/dashboard')).toBe(true);
    expect(isActive('/cl-dashboard', '/dashboard')).toBe(false);
  });

  it('also matches the extra routes of the same section', () => {
    expect(isActive('/templates', '/dashboard', ['/templates'])).toBe(true);
    expect(isActive('/cl-templates', '/dashboard', ['/templates'])).toBe(false);
  });
});

describe('AppShell active item', () => {
  it('marks Resumes current on /templates', () => {
    const current = currentLinks('/templates');
    expect(current).toHaveLength(1);
    expect(current[0]).toContain('href="/dashboard"');
  });

  it('marks Cover letters current on /cl-templates, not Resumes', () => {
    const current = currentLinks('/cl-templates');
    expect(current).toHaveLength(1);
    expect(current[0]).toContain('href="/cl-dashboard"');
  });

  it('keeps the existing behavior on the dashboards and the scanner', () => {
    expect(currentLinks('/dashboard')[0]).toContain('href="/dashboard"');
    expect(currentLinks('/cl-dashboard')[0]).toContain('href="/cl-dashboard"');
    expect(currentLinks('/ats-scanner')[0]).toContain('href="/ats-scanner"');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run (from `client/`): `npx vitest run src/components/app-shell/shell-active.test.tsx`
Expected: FAIL (`/templates` marks nothing current, and the 3-argument `isActive` returns false).

- [ ] **Step 3: Replace `client/src/components/app-shell/nav-items.ts`**

```ts
import { FileText, Mail, ScanText } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface NavItem {
  key: 'resumes' | 'letters' | 'ats';
  label: string;
  to: string;
  icon: LucideIcon;
  pendingMessage: string;
  /** Other routes that belong to this section, so the item stays marked current there. */
  activeFor?: readonly string[];
}

export const NAV_ITEMS: readonly NavItem[] = [
  { key: 'resumes', label: 'Resumes', to: '/dashboard', icon: FileText, pendingMessage: 'Opening resumes...', activeFor: ['/templates'] },
  { key: 'letters', label: 'Cover letters', to: '/cl-dashboard', icon: Mail, pendingMessage: 'Opening cover letters...', activeFor: ['/cl-templates'] },
  { key: 'ats', label: 'ATS scanner', to: '/ats-scanner', icon: ScanText, pendingMessage: 'Opening the ATS scanner...' },
];

export const isActive = (pathname: string, to: string, activeFor: readonly string[] = []) =>
  [to, ...activeFor].some((route) => pathname === route || pathname.startsWith(`${route}/`));
```

- [ ] **Step 4: Update the call in `client/src/components/app-shell/AppShell.tsx`**

Change the line `const active = isActive(pathname, item.to);` to:

```tsx
        const active = isActive(pathname, item.to, item.activeFor);
```

- [ ] **Step 5: Run tests, type-check and lint**

Run (from `client/`): `npx vitest run src/components/app-shell && npx tsc -b && npx eslint src/components/app-shell --ignore-pattern "**/*.test.tsx"`
Expected: all tests PASS; tsc exit 0; eslint prints nothing.

- [ ] **Step 6: Commit**

```bash
git add client/src/components/app-shell/nav-items.ts client/src/components/app-shell/AppShell.tsx
git commit -m "$(cat <<'EOF'
feat(app-shell): keep the section active on its template routes

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Card, filter and view

**Files:**
- Create: `client/src/styles/templates.css`
- Create: `client/src/components/template-picker/TemplateCard.tsx`
- Create: `client/src/components/template-picker/CollectionFilter.tsx`
- Create: `client/src/components/template-picker/TemplatesView.tsx`
- Test (temporary, never committed): `client/src/components/template-picker/templates-view.test.tsx`

**Interfaces:**
- Consumes: Task 1 (`TEMPLATE_PREVIEWS`), Task 2 (`CollectionFilterId`, `COLLECTIONS`, `groupTemplates`, `filterCounts`), `Template` from `@/types`, `.app-card`, `.app-seg`, `.app-title`, `.l-*` classes.
- Produces: default exports `TemplateCard({ template: Template; pending: boolean; onSelect: (id: string) => void })`, `CollectionFilter({ selected: CollectionFilterId; counts: Record<CollectionFilterId, number>; onChange: (id: CollectionFilterId) => void })`, `TemplatesView({ templates: Template[]; selected: CollectionFilterId; onSelectedChange: (id: CollectionFilterId) => void; pendingId: string | null; onSelectTemplate: (id: string) => void })`.
- Produces (`templates.css`): `.tpl-preview`, `.tpl-grid`, `.tpl-group-head`, `.tpl-desc`, `.tpl-count`, `.tpl-card`.

- [ ] **Step 1: Write the failing test**

Create `client/src/components/template-picker/templates-view.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import templates from '@/utils/templates-type';
import type { Template } from '@/types';
import TemplateCard from './TemplateCard';
import CollectionFilter from './CollectionFilter';
import TemplatesView from './TemplatesView';
import type { CollectionFilterId } from './collections';

const noop = () => {};
const cigar = templates.find((t) => t.id === 'cigar') as Template;

const view = (selected: CollectionFilterId = 'all', pendingId: string | null = null, list: Template[] = templates) =>
  renderToStaticMarkup(
    <TemplatesView templates={list} selected={selected} onSelectedChange={noop} pendingId={pendingId} onSelectTemplate={noop} />,
  );

describe('TemplateCard', () => {
  it('shows the preview, name, category, description and a clearly named button', () => {
    const html = renderToStaticMarkup(<TemplateCard template={cigar} pending={false} onSelect={noop} />);
    expect(html).toContain(cigar.name);
    expect(html).toContain(cigar.category);
    expect(html).toContain(cigar.description);
    expect(html).toContain('<img');
    expect(html).toContain('loading="lazy"');
    expect(html).toContain('alt=""');
    expect(html).toContain(`aria-label="Use ${cigar.name}"`);
    expect(html).toContain('Use this template');
  });

  it('has no hover-only effects, gradients, emojis or feature list', () => {
    const html = renderToStaticMarkup(<TemplateCard template={cigar} pending={false} onSelect={noop} />);
    expect(html).not.toMatch(/gradient|hover:scale|hover:-translate|group-hover|opacity-0/);
    expect(html).not.toMatch(/\p{Extended_Pictographic}/u);
    for (const feature of cigar.features) expect(html).not.toContain(feature);
  });

  it('shows Opening... and aria-busy only while pending', () => {
    const busy = renderToStaticMarkup(<TemplateCard template={cigar} pending={true} onSelect={noop} />);
    const idle = renderToStaticMarkup(<TemplateCard template={cigar} pending={false} onSelect={noop} />);
    expect(busy).toContain('Opening...');
    expect(busy).toContain('aria-busy="true"');
    expect(idle).not.toContain('Opening...');
    expect(idle).not.toContain('aria-busy');
  });

  it('shows a placeholder instead of a broken image when a template has no preview', () => {
    const unknown = { ...cigar, id: 'not_a_real_template', name: 'Brand New' };
    const html = renderToStaticMarkup(<TemplateCard template={unknown} pending={false} onSelect={noop} />);
    expect(html).toContain('No preview');
    expect(html).not.toContain('<img');
  });
});

describe('CollectionFilter', () => {
  const counts = { all: 10, galaxy: 4, greek: 6 };
  const html = renderToStaticMarkup(<CollectionFilter selected="galaxy" counts={counts} onChange={noop} />);

  it('is a named group of three buttons with counts and one pressed', () => {
    expect(html).toContain('role="group"');
    expect(html).toContain('aria-label="Collection"');
    for (const label of ['All', 'Galaxy', 'Greek']) expect(html).toContain(label);
    for (const n of ['>10<', '>4<', '>6<']) expect(html).toContain(n);
    expect(html.match(/aria-pressed="true"/g)).toHaveLength(1);
    expect(html.match(/aria-pressed="false"/g)).toHaveLength(2);
  });
});

describe('TemplatesView', () => {
  it('has one h1, the subheading and the filter', () => {
    const html = view();
    expect(html.split('<h1').length - 1).toBe(1);
    expect(html).toContain('Choose a template');
    expect(html).toContain('You can change the template later from the editor.');
    expect(html).toContain('aria-label="Collection"');
  });

  it('"All" shows both collections with headings and counts, and every template', () => {
    const html = view('all');
    expect(html).toContain('Galaxy collection');
    expect(html).toContain('Greek Gods collection');
    expect(html).toContain('4 templates');
    expect(html).toContain('6 templates');
    expect(html.split('<article').length - 1).toBe(templates.length);
    expect(html.split('<h2').length - 1).toBe(2);
  });

  it('a collection filter shows only that group', () => {
    const html = view('galaxy');
    expect(html).toContain('Galaxy collection');
    expect(html).not.toContain('Greek Gods collection');
    expect(html.split('<article').length - 1).toBe(templates.filter((t) => t.theme === 'galaxy').length);
  });

  it('marks only the pending template busy', () => {
    const html = view('all', 'cigar');
    expect(html.split('aria-busy="true"').length - 1).toBe(1);
    expect(html.split('Opening...').length - 1).toBe(1);
  });

  it('carries none of the old claims, toasts or styling', () => {
    const html = view();
    expect(html).not.toMatch(/coming soon|HR Approved|community|ATS Optimized|Join the|Easy Customization/i);
    expect(html).not.toMatch(/gradient|backdrop-blur/);
    expect(html).not.toMatch(/\p{Extended_Pictographic}/u);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run (from `client/`): `npx vitest run src/components/template-picker/templates-view.test.tsx`
Expected: FAIL, "Failed to resolve import './TemplateCard'".

- [ ] **Step 3: Create `client/src/styles/templates.css`**

```css
/* Templates page classes. Variables come from the .app-shell scope in landing.css. */

.tpl-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr));
  gap: 1rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.tpl-group-head {
  display: flex;
  align-items: baseline;
  gap: 0.75rem;
  margin: 2rem 0 1rem;
  padding-bottom: 0.625rem;
  border-bottom: 1px solid var(--l-hair);
}
.tpl-group:first-of-type .tpl-group-head { margin-top: 0; }

.tpl-card { display: flex; height: 100%; flex-direction: column; }

.tpl-preview {
  display: flex;
  aspect-ratio: 4 / 5;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-bottom: 1px solid var(--l-hair);
  background: var(--l-surface);
  color: var(--l-muted);
  font-size: 0.8125rem;
}
.tpl-preview img { display: block; width: 100%; height: 100%; object-fit: cover; object-position: top; }

.tpl-desc { display: -webkit-box; overflow: hidden; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }

.tpl-count { margin-left: 0.375rem; font-variant-numeric: tabular-nums; opacity: 0.7; }
```

- [ ] **Step 4: Create `client/src/components/template-picker/TemplateCard.tsx`**

```tsx
import { Loader2 } from 'lucide-react';
import type { Template } from '@/types';
import { TEMPLATE_PREVIEWS } from './template-previews';

interface TemplateCardProps {
  template: Template;
  pending: boolean;
  onSelect: (id: string) => void;
}

export default function TemplateCard({ template, pending, onSelect }: TemplateCardProps) {
  const preview = TEMPLATE_PREVIEWS[template.id];

  return (
    <article className="app-card tpl-card">
      <div className="tpl-preview">
        {preview ? <img src={preview} alt="" width={560} height={700} loading="lazy" /> : 'No preview'}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3.5">
        <h3 className="l-ink m-0 text-[0.9375rem] font-semibold">{template.name}</h3>
        <p className="l-muted m-0 text-xs">{template.category}</p>
        <p className="l-muted tpl-desc m-0 mb-3 text-[0.8125rem] leading-relaxed">{template.description}</p>
        <button
          type="button"
          className="l-btn l-btn--primary mt-auto w-full"
          aria-label={`Use ${template.name}`}
          aria-busy={pending || undefined}
          onClick={() => onSelect(template.id)}
        >
          {pending ? (
            <>
              <Loader2 aria-hidden="true" className="size-4 animate-spin" />
              Opening...
            </>
          ) : (
            'Use this template'
          )}
        </button>
      </div>
    </article>
  );
}
```

- [ ] **Step 5: Create `client/src/components/template-picker/CollectionFilter.tsx`**

```tsx
import { COLLECTIONS } from './collections';
import type { CollectionFilterId } from './collections';

interface CollectionFilterProps {
  selected: CollectionFilterId;
  counts: Record<CollectionFilterId, number>;
  onChange: (id: CollectionFilterId) => void;
}

const OPTIONS: { id: CollectionFilterId; label: string }[] = [
  { id: 'all', label: 'All' },
  ...COLLECTIONS.map((collection) => ({ id: collection.id, label: collection.filterLabel })),
];

export default function CollectionFilter({ selected, counts, onChange }: CollectionFilterProps) {
  return (
    <div className="app-seg" role="group" aria-label="Collection">
      {OPTIONS.map((option) => (
        <button
          key={option.id}
          type="button"
          className="px-4 text-sm"
          aria-pressed={selected === option.id}
          onClick={() => onChange(option.id)}
        >
          {option.label}
          <span className="tpl-count">{counts[option.id]}</span>
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 6: Create `client/src/components/template-picker/TemplatesView.tsx`**

```tsx
import type { Template } from '@/types';
import CollectionFilter from './CollectionFilter';
import TemplateCard from './TemplateCard';
import { filterCounts, groupTemplates } from './collections';
import type { CollectionFilterId } from './collections';

interface TemplatesViewProps {
  templates: Template[];
  selected: CollectionFilterId;
  onSelectedChange: (id: CollectionFilterId) => void;
  pendingId: string | null;
  onSelectTemplate: (id: string) => void;
}

export default function TemplatesView({ templates, selected, onSelectedChange, pendingId, onSelectTemplate }: TemplatesViewProps) {
  const groups = groupTemplates(templates, selected);

  return (
    <div className="w-full px-4 py-8 sm:px-8 lg:px-10 lg:py-12">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="app-title m-0">Choose a template</h1>
          <p className="l-muted m-0 mt-1 text-sm">
            Pick a layout for your resume. You can change the template later from the editor.
          </p>
        </div>
        <CollectionFilter selected={selected} counts={filterCounts(templates)} onChange={onSelectedChange} />
      </div>

      {groups.map((group) => (
        <section key={group.id} aria-labelledby={`collection-${group.id}`} className="tpl-group">
          <div className="tpl-group-head">
            <h2 id={`collection-${group.id}`} className="l-eyebrow l-muted m-0">
              {group.heading}
            </h2>
            <span className="l-muted text-sm">{`${group.templates.length} templates`}</span>
          </div>
          <ul className="tpl-grid">
            {group.templates.map((template) => (
              <li key={template.id}>
                <TemplateCard template={template} pending={pendingId === template.id} onSelect={onSelectTemplate} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
```

- [ ] **Step 7: Run tests, type-check and lint**

Run (from `client/`): `npx vitest run src/components/template-picker && npx tsc -b && npx eslint src/components/template-picker --ignore-pattern "**/*.test.ts" --ignore-pattern "**/*.test.tsx"`
Expected: all tests PASS; tsc exit 0; eslint prints nothing. (If `>10<` style assertions fail because React inserted comment nodes between a label and its count, keep the count in its own `<span>` as written rather than loosening the test.)

- [ ] **Step 8: Commit**

```bash
git add client/src/styles/templates.css client/src/components/template-picker/TemplateCard.tsx client/src/components/template-picker/CollectionFilter.tsx client/src/components/template-picker/TemplatesView.tsx
git commit -m "$(cat <<'EOF'
feat(templates): add template card, collection filter and view

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Container, footer, delete the old card, README, build

**Files:**
- Modify (full replace): `client/src/pages/Templates.tsx`
- Modify: `client/src/routes.tsx` (one added condition)
- Delete: `client/src/components/TemplateCard.tsx`
- Modify: `client/README.md` (one line)
- Test (temporary, never committed): `client/src/components/template-picker/templates-page.test.tsx`

**Interfaces:**
- Consumes: `TemplatesView`, `CollectionFilterId`, `AppShell`, `usePendingNavigation`, `templates` data, `client` (axios), `Cookies`.
- Produces: default export `Templates` (route element for `/templates`, already lazy-imported by `routes.tsx`).

- [ ] **Step 1: Write the failing test**

Create `client/src/components/template-picker/templates-page.test.tsx`:

```tsx
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/components/ThemeToggle', () => ({ default: () => null }));

import Templates from '@/pages/Templates';

const stubStorage = (values: Record<string, string>) =>
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values[key] ?? null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {},
  });

const render = (url: string) =>
  renderToStaticMarkup(
    <MemoryRouter initialEntries={[url]}>
      <Templates />
    </MemoryRouter>,
  );

afterEach(() => vi.unstubAllGlobals());

describe('Templates page (first render)', () => {
  it('renders the picker inside the shell with Resumes current, when there is a resume id', () => {
    stubStorage({ id: 'resume-1' });
    const html = render('/templates');
    expect(html).toContain('app-shell');
    const current = (html.match(/<a [^>]*>/g) ?? []).filter((tag) => tag.includes('aria-current="page"'));
    expect(current).toHaveLength(1);
    expect(current[0]).toContain('href="/dashboard"');
    expect(html.split('<h1').length - 1).toBe(1);
    expect(html).toContain('Choose a template');
    expect(html.split('<article').length - 1).toBe(10);
  });

  it('reads the resume id from the query string when localStorage has none', () => {
    stubStorage({});
    expect(render('/templates?resumeId=abc')).toContain('Choose a template');
  });

  it('renders nothing (and does not crash) while redirecting when there is no resume id', () => {
    stubStorage({});
    expect(render('/templates')).toBe('');
  });

  it('has no coming-soon text, hero, gradients or old claims', () => {
    stubStorage({ id: 'resume-1' });
    const html = render('/templates');
    expect(html).not.toMatch(/coming soon|HR Approved|community|gradient|Two Legendary Collections/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run (from `client/`): `npx vitest run src/components/template-picker/templates-page.test.tsx`
Expected: FAIL (the old page has no `app-shell`, shows gradients, and renders content without a resume id).

- [ ] **Step 3: Replace `client/src/pages/Templates.tsx` entirely**

```tsx
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Cookies from 'js-cookie';
import client from '@/api/axiosInstance';
import AppShell from '@/components/app-shell/AppShell';
import TemplatesView from '@/components/template-picker/TemplatesView';
import type { CollectionFilterId } from '@/components/template-picker/collections';
import { usePendingNavigation } from '@/hooks/usePendingNavigation';
import templates from '@/utils/templates-type';
import '@/styles/templates.css';

const Templates: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { pendingKey, go } = usePendingNavigation();
  const [selected, setSelected] = useState<CollectionFilterId>('all');

  // resumeId from localStorage first, else from the URL
  const resumeId = localStorage.getItem('id') || new URLSearchParams(location.search).get('resumeId') || '';

  const fetchResumeData = async () => {
    if (resumeId) {
      const userId = Cookies.get('user.id');
      const request = await client.get(`/resume/fetch-data/${resumeId}/${userId}`);
      localStorage.setItem('resumeFormData', request.data?.resume_data);
    }
  };

  useEffect(() => {
    if (!resumeId) {
      navigate('/dashboard');
    }
    fetchResumeData();
  }, [resumeId]);

  // Navigates immediately; the clicked card shows "Opening..." and a loading toast until the editor appears
  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    if (!template) return;
    go(`template:${templateId}`, `/preview?template=${templateId}`, `Opening "${template.name}"...`, () => {
      localStorage.setItem('id', resumeId);
      localStorage.setItem('template', templateId);
    });
  };

  const pendingId = pendingKey?.startsWith('template:') ? pendingKey.slice('template:'.length) : null;

  if (!resumeId) return null; // redirecting to the dashboard

  return (
    <AppShell>
      <TemplatesView
        templates={templates}
        selected={selected}
        onSelectedChange={setSelected}
        pendingId={pendingId}
        onSelectTemplate={handleTemplateSelect}
      />
    </AppShell>
  );
};

export default Templates;
```

- [ ] **Step 4: Hide the global footer on `/templates` in `client/src/routes.tsx`**

The condition currently contains `!location.pathname.startsWith('/ats-scanner') && `. Insert `!location.pathname.startsWith('/templates') && ` right after it, so that part reads:

```tsx
!location.pathname.startsWith('/ats-scanner') && !location.pathname.startsWith('/templates') && !location.pathname.startsWith('/preview') && ...
```

(Keep the rest of the line exactly as it is. `startsWith('/templates')` does not match `/cl-templates`, which keeps its footer until that page is redesigned.)

- [ ] **Step 5: Prove nothing else uses the old card, then delete it**

Run (from the repo root):

```bash
grep -rn "TemplateCard" -I . --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.git --exclude-dir=.superpowers | grep -v "CLTemplateCard"
```

Expected: the only hits are the old file itself (`client/src/components/TemplateCard.tsx`), the new `client/src/components/template-picker/TemplateCard.tsx` and its imports in `TemplatesView.tsx`, the line in `client/README.md`, and docs under `docs/superpowers/`. There must be **no** import of `@/components/TemplateCard`, `./TemplateCard` from `components/`, or `../components/TemplateCard` anywhere in `client/src` (`pages/Templates.tsx` no longer imports it after Step 3). If any remaining importer of the old path is found, stop and report it instead of deleting. Then:

```bash
git rm client/src/components/TemplateCard.tsx
```

- [ ] **Step 6: Update the stale README line**

Read `client/README.md` around line 298 (the file tree under `components/`). Replace the line `│   │   ├── TemplateCard.tsx     # Template selection card with background images` with a line that matches the surrounding tree style and the new layout, for example `│   │   ├── templates/           # Template picker pieces (card, collection filter, view)`. Keep the tree's alignment and do not touch other lines.

- [ ] **Step 7: Type-check, lint, run all temporary tests, build**

Run (from `client/`): `npx tsc -b && npx eslint src/pages/Templates.tsx src/routes.tsx src/components/template-picker src/components/app-shell --ignore-pattern "**/*.test.ts" --ignore-pattern "**/*.test.tsx" && npx vitest run && npx vite build --outDir node_modules/.tmp/templates-build --emptyOutDir`
Expected: tsc exit 0; eslint reports at most the one `react-hooks/exhaustive-deps` warning for the `useEffect` in `Templates.tsx` (the same pattern as the old page, which had it too) and no errors; all temporary tests PASS; the build completes and the output no longer contains the ten large snapshot images for this page. Then `rm -rf node_modules/.tmp/templates-build` and run `git status --short` (expect the modified and deleted files only, plus untracked temporary tests).

- [ ] **Step 8: Commit**

```bash
git add client/src/pages/Templates.tsx client/src/routes.tsx client/README.md
git commit -m "$(cat <<'EOF'
feat(templates): redesign templates page with grouped collections and loading feedback

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
EOF
)"
```

(`git rm` in Step 5 already staged the deletion of the old card; it is included in this commit. Confirm with `git status --short` that only the intended paths are staged before committing.)

---

### Task 6: Verification and cleanup

**Files:**
- Delete: every `*.test.ts(x)` created in Tasks 1 to 5 and any build output
- No product code changes unless a check fails (then fix in the owning file, re-run, and commit that fix separately)

- [ ] **Step 1: Contrast**

No new color tokens were added (the page uses the shared tokens already verified at 6.2:1 or better), so no new contrast script is needed. State this in the report.

- [ ] **Step 2: Visual check, only if the user wants it**

The real page needs a signed-in session with a resume, and the user has declined browser automation before. Do not use the browser tools unless the user asks. If the user asks for a visual check, create a temporary harness (as in the dashboard plan) that renders `TemplatesView` inside `AppShell` with the real `templates` data, check light and dark at 375, 768 and 1440px, and delete it afterwards.

- [ ] **Step 3: Delete every temporary file and verify the tree**

```bash
find client/src -name "*.test.ts" -o -name "*.test.tsx" | xargs rm -f
rm -rf client/node_modules/.tmp/templates-build
git status --short
git ls-files | grep -E '\.test\.|harness|__snapshots__' || echo "no test or harness files tracked"
```

Expected: `git status --short` prints nothing (clean) and the second command prints `no test or harness files tracked`. If anything else is listed, resolve it before reporting.

- [ ] **Step 4: Report**

Summarize faithfully: which checks passed, anything skipped (the browser pass), the commits on `page-revamp`, and that nothing was pushed. Report the preview sizes (total and the largest file) and that the old `TemplateCard` was deleted after the repo-wide search showed no other importer. State plainly that the real flow (arrive from a resume with no template, pick a template, land in the preview) was not exercised (it needs a signed-in session) and ask the user to click through it once, watching for the "Opening..." state on the clicked card.
