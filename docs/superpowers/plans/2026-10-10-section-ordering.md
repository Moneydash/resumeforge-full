# Section Ordering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users reorder resume sections per resume (single list for single-column templates, column board for column templates) without changing any template's visual design.

**Architecture:** A pure module `client/src/utils/section-layout.ts` owns section ids, per-template layout config (header sections, default columns, pinned sections) and the resolve/convert logic. Every template renders its existing section JSX in the order returned by `getRenderColumns(template, data)`. The layout is stored as `sectionLayout` inside the existing `resume_data` JSON blob (no server change). A `SectionOrderPanel` (dnd-kit) in a new right sidebar on `Preview.tsx` edits it and triggers the existing save + PDF path after a 2.5 s debounce.

**Tech Stack:** React 19, TypeScript 5.8 (strict, `verbatimModuleSyntax`, `erasableSyntaxOnly`), Vite 6, `@dnd-kit/*` (already installed), lucide-react, shadcn `Tooltip`/`Button`, Vitest (new, dev-only). Package manager for `client/` is **npm** (`package-lock.json`).

**Spec:** `docs/superpowers/specs/2026-10-10-section-ordering-design.md` (this plan amends it in one place: `sectionLayout` also stores `template`, see Task 2).

All paths are relative to `client/` unless they start with `docs/`. Run all commands from `client/`.

## Global Constraints

- Header and contact info are fixed and never movable. Whatever a template renders in its header (hermes: Summary) stays there; no column section can enter a header.
- Single-column templates (zeus, hera, cigar, milky_way, comet): one list, every supported section movable.
- Column templates: Summary and Experience are fully fixed (column and exact default slot) in andromeda, artemis (left), athena, apollo (right) and Experience in hermes (left; its Summary is in the header). Free sections can move within and across columns.
- Columns are stored in visual left-to-right order: andromeda `[left,right]`, hermes `[left,right]`, artemis `[main(left), sidebar(right)]`, athena `[sidebar(left), main(right)]`, apollo `[sidebar(left), main(right)]`.
- Template switch: column -> single flattens header sections first, then left column, then right column. Single -> column puts pinned sections at the target template's default slot and keeps the relative saved order of free sections in each one's default column.
- A resume with no `sectionLayout` renders exactly as today. hermes/andromeda keep their experience-count default rules (visible, non-hidden experience entries).
- Template markup, CSS and headings do not change. Form section order in `ResumeForm.tsx` does not change.
- Debounce for layout changes: 2500 ms (same as `LIVE_EDIT_DEBOUNCE_MS` in `ResumeForm.tsx`).
- TS config: `strict`, `noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax` (use `import type`), `erasableSyntaxOnly` (no enums, no constructor parameter properties).

## Review Focus

1. A saved layout whose column count does not match the template (e.g. copied from another template) must not crash; it is re-distributed using defaults (Task 2 test `column-count mismatch`).
2. Saved layout containing unknown ids, duplicate ids, or a pinned id in the wrong column must be normalised, never rendered twice or dropped silently (Task 2 tests `drops unknown and duplicate ids`, `moves a misplaced pinned section back`).
3. Empty sections (no data / all items hidden) stay hidden in every template after reordering (Task 2 test `getRenderColumns hides empty sections`, Task 1 snapshots).
4. Layout changes while a PDF render is in flight must not show an older PDF (Task 7 reuses `requestIdRef`; manual check in Task 8).
5. `sectionLayout: undefined` must be omitted from the saved JSON after "Reset to default" (Task 7 step 5; manual check in Task 8).

Known intentional deviations from today's output (no layout saved), none visible with ordinary data:
- hermes decides References' column with the **visible** experience count on both sides. Today the left test uses the raw count, so a resume with >= 3 experience entries of which some are hidden (< 3 visible) loses References entirely; this fixes it.
- andromeda no longer prints an empty "Projects" or "Summary" heading when those sections have no content (all templates now share `hasContent`).

---

### Task 1: Vitest + baseline render snapshots (before any refactor)

**Files:**
- Modify: `package.json` (scripts, devDependencies via npm)
- Modify: `vite.config.ts`
- Create: `src/test/sample-resume.ts`
- Create: `src/components/templates/templates.snapshot.test.tsx`
- Create (generated): `src/components/templates/__snapshots__/templates.snapshot.test.tsx.snap`

**Interfaces:**
- Produces: `makeSampleResume(experienceCount: number): ResumeFormData` in `src/test/sample-resume.ts` (every section populated, no hidden items). Later tasks import it.

- [ ] **Step 1: Install Vitest**

Run: `npm install -D vitest`
Expected: `vitest` added to `devDependencies`.

- [ ] **Step 2: Add the test script**

In `package.json` `"scripts"`, add after `"preview": "vite preview"` (add a comma):

```json
"test": "vitest run"
```

- [ ] **Step 3: Let `vite.config.ts` carry test config**

Replace the file content with:

```ts
/// <reference types="node" />
/// <reference types="vite/client" />

import path from "path";
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src")
    }
  },
  test: {
    environment: 'node'
  }
});
```

- [ ] **Step 4: Create the sample fixture**

Create `src/test/sample-resume.ts`:

```ts
import type { ResumeFormData } from "@/types/interface.resume-form-data";

/** A resume with every section populated and nothing hidden. */
export const makeSampleResume = (experienceCount: number): ResumeFormData => ({
  personal: {
    name: "Ada Lovelace",
    headline: "Software Engineer",
    contact_number: "09123456789",
    email: "ada@example.com",
    website: { name: "Portfolio", link: "https://example.com" },
    location: "London",
  },
  socials: [
    { name: "GitHub", link: "https://github.com/ada", slug: "github" },
    { name: "LinkedIn", link: "https://linkedin.com/in/ada", slug: "linkedin" },
  ],
  summary: "Engineer who builds analytical engines.",
  experience: Array.from({ length: experienceCount }, (_, i) => ({
    title: `Role ${i + 1}`,
    company: `Company ${i + 1}`,
    startDate: "2020-01",
    endDate: "2021-01",
    description: `Did thing ${i + 1}.`,
  })),
  education: [{ degree: "BSc Mathematics", institution: "University", startDate: "2015-01", endDate: "2019-01" }],
  skills: [{ name: "Languages", keywords: ["TypeScript", "Rust"] }],
  languages: ["English", "French"],
  awards: [{ title: "Award One", date: "2022-01", description: "For work." }],
  certifications: [{ name: "Cert One", issuingOrganization: "Org", date: "2022-02" }],
  interests: ["Chess", "Music"],
  projects: [{ title: "Project One", description: "A project.", technologies: ["React", "Node"] }],
  references: [{ name: "Ref Person", title: "Manager", company: "Company 1", email: "ref@example.com", phone: "0999" }],
});
```

- [ ] **Step 5: Write the snapshot test**

Create `src/components/templates/templates.snapshot.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import TemplateComponent from "@/components/TemplateComponent";
import type { TemplateType } from "@/types";
import { makeSampleResume } from "@/test/sample-resume";

const ALL: TemplateType[] = ['cigar', 'andromeda', 'comet', 'milky_way', 'zeus', 'athena', 'apollo', 'artemis', 'hermes', 'hera'];

describe("template default render (no sectionLayout)", () => {
  ALL.forEach((template) => {
    it(`${template} with 2 experience entries`, () => {
      const html = renderToString(<TemplateComponent data={makeSampleResume(2)} template={template} />);
      expect(html).toMatchSnapshot();
    });
  });

  // hermes and andromeda move sections between columns at 3+ experience entries
  (['hermes', 'andromeda'] as TemplateType[]).forEach((template) => {
    it(`${template} with 3 experience entries`, () => {
      const html = renderToString(<TemplateComponent data={makeSampleResume(3)} template={template} />);
      expect(html).toMatchSnapshot();
    });
  });
});
```

- [ ] **Step 6: Generate baseline snapshots on the UNMODIFIED templates**

Run: `npx vitest run`
Expected: 12 tests pass, `src/components/templates/__snapshots__/templates.snapshot.test.tsx.snap` created ("12 written").
If CSS `?inline` or JSX transform fails, fix the config only (never the templates) until the 12 snapshots are written.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json vite.config.ts src/test src/components/templates/templates.snapshot.test.tsx src/components/templates/__snapshots__
git commit -m "test: add vitest and baseline render snapshots for all templates

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: `section-layout` module (pure logic, TDD)

**Files:**
- Create: `src/utils/section-layout.ts`
- Create: `src/utils/section-layout.test.ts`
- Modify: `src/types/interface.resume-form-data.ts`
- Modify: `docs/superpowers/specs/2026-10-10-section-ordering-design.md` (repo root path)

**Interfaces:**
- Produces (all exported from `src/utils/section-layout.ts`):
  - `type SectionId = 'summary' | 'socials' | 'experience' | 'education' | 'skills' | 'projects' | 'awards' | 'certifications' | 'references' | 'languages' | 'interests'`
  - `const SECTION_LABELS: Record<SectionId, string>`
  - `interface SectionLayout { template: TemplateType; columns: SectionId[][] }`
  - `getDefaultColumns(template: TemplateType, data: ResumeFormData): SectionId[][]`
  - `getPinned(template: TemplateType): SectionId[]`
  - `getColumnLabels(template: TemplateType): string[]`
  - `hasContent(id: SectionId, data: ResumeFormData): boolean`
  - `resolveLayout(template: TemplateType, saved: SectionLayout | undefined, data: ResumeFormData): SectionId[][]`
  - `normalizeLayout(template: TemplateType, columns: SectionId[][], data: ResumeFormData): SectionLayout`
  - `convertLayout(saved: SectionLayout, to: TemplateType, data: ResumeFormData): SectionLayout`
  - `getRenderColumns(template: TemplateType, data: ResumeFormData): SectionId[][]` (resolved + empty sections removed)
- `ResumeFormData.sectionLayout?: SectionLayout`.

- [ ] **Step 1: Add the field to the data type**

In `src/types/interface.resume-form-data.ts`, add at the top of the file:

```ts
import type { SectionLayout } from "@/utils/section-layout";
```

and as the last member of `ResumeFormData` (after `references`):

```ts
  sectionLayout?: SectionLayout;
```

(A type-only circular import with `section-layout.ts` is fine.)

- [ ] **Step 2: Write the failing tests**

Create `src/utils/section-layout.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { makeSampleResume } from "@/test/sample-resume";
import {
  convertLayout,
  getDefaultColumns,
  getRenderColumns,
  normalizeLayout,
  resolveLayout,
  type SectionLayout,
} from "@/utils/section-layout";

const data2 = makeSampleResume(2);
const data3 = makeSampleResume(3);

describe("getDefaultColumns", () => {
  it("single-column templates have one column in today's order", () => {
    expect(getDefaultColumns('zeus', data2)).toEqual([[
      'summary', 'experience', 'education', 'projects', 'skills', 'languages', 'certifications', 'awards', 'references',
    ]]);
    expect(getDefaultColumns('milky_way', data2)[0].slice(-3)).toEqual(['awards', 'interests', 'references']);
    expect(getDefaultColumns('comet', data2)).toEqual([['summary', 'skills', 'projects', 'interests']]);
  });

  it("hermes puts references left under 3 visible experiences and right at 3+", () => {
    expect(getDefaultColumns('hermes', data2)[0]).toEqual(['experience', 'projects', 'references']);
    expect(getDefaultColumns('hermes', data3)[1].at(-1)).toBe('references');
    expect(getDefaultColumns('hermes', data3)[0]).toEqual(['experience', 'projects']);
  });

  it("hermes counts only visible experiences", () => {
    const d = makeSampleResume(3);
    d.experience[2].hidden = true;
    expect(getDefaultColumns('hermes', d)[0]).toContain('references');
  });

  it("andromeda moves education/languages/certifications/interests by visible experience count", () => {
    expect(getDefaultColumns('andromeda', data2)[0]).toEqual(['summary', 'experience', 'education', 'languages', 'certifications', 'interests']);
    expect(getDefaultColumns('andromeda', data3)[0]).toEqual(['summary', 'experience']);
    expect(getDefaultColumns('andromeda', data3)[1]).toEqual(['education', 'skills', 'projects', 'languages', 'certifications', 'interests', 'awards', 'references']);
  });

  it("column templates list columns left to right", () => {
    expect(getDefaultColumns('athena', data2)[1]).toEqual(['socials', 'summary', 'experience', 'references']);
    expect(getDefaultColumns('apollo', data2)[1]).toEqual(['summary', 'experience', 'awards', 'references']);
    expect(getDefaultColumns('artemis', data2)[0]).toEqual(['summary', 'experience', 'references']);
  });
});

describe("resolveLayout", () => {
  it("returns defaults when nothing is saved", () => {
    expect(resolveLayout('apollo', undefined, data2)).toEqual(getDefaultColumns('apollo', data2));
  });

  it("applies a saved single-column order and appends missing sections in default order", () => {
    const saved: SectionLayout = { template: 'cigar', columns: [['education', 'summary']] };
    const out = resolveLayout('cigar', saved, data2)[0];
    expect(out.slice(0, 2)).toEqual(['education', 'summary']);
    expect(out.slice(2)).toEqual(['experience', 'projects', 'skills', 'languages', 'interests', 'certifications', 'awards', 'references']);
  });

  it("drops unknown and duplicate ids", () => {
    const saved = { template: 'cigar', columns: [['education', 'bogus', 'education', 'summary']] } as unknown as SectionLayout;
    const out = resolveLayout('cigar', saved, data2)[0];
    expect(out.filter((id) => id === 'education')).toHaveLength(1);
    expect(out).not.toContain('bogus' as never);
    expect(new Set(out).size).toBe(out.length);
  });

  it("keeps free sections in the user's chosen column (andromeda)", () => {
    const saved: SectionLayout = {
      template: 'andromeda',
      columns: [['summary', 'experience', 'skills'], ['education', 'projects', 'languages', 'certifications', 'interests', 'awards', 'references']],
    };
    const out = resolveLayout('andromeda', saved, data2);
    expect(out[0]).toEqual(['summary', 'experience', 'skills']);
    expect(out[1][0]).toBe('education');
  });

  it("moves a misplaced pinned section back to its pinned column and slot", () => {
    const saved: SectionLayout = {
      template: 'apollo',
      columns: [['summary', 'education', 'skills', 'interests', 'languages', 'projects', 'certifications'], ['awards', 'experience', 'references']],
    };
    const out = resolveLayout('apollo', saved, data2);
    expect(out[0]).not.toContain('summary');
    expect(out[1].slice(0, 2)).toEqual(['summary', 'experience']);
  });

  it("keeps pinned sections at their default slots when free sections are placed around them (athena)", () => {
    const saved: SectionLayout = {
      template: 'athena',
      columns: [['education', 'skills', 'projects', 'certifications', 'awards', 'languages'], ['references', 'socials']],
    };
    const right = resolveLayout('athena', saved, data2)[1];
    expect(right).toEqual(['references', 'summary', 'experience', 'socials']);
  });

  it("falls back to defaults for free sections when the column count does not match", () => {
    const saved: SectionLayout = { template: 'andromeda', columns: [['summary', 'experience', 'education']] };
    const out = resolveLayout('andromeda', saved, data2);
    expect(out).toHaveLength(2);
    expect(out.flat().sort()).toEqual(getDefaultColumns('andromeda', data2).flat().sort());
  });

  it("comet only offers its four sections", () => {
    const saved: SectionLayout = { template: 'comet', columns: [['experience', 'projects', 'summary']] };
    expect(resolveLayout('comet', saved, data2)).toEqual([['projects', 'summary', 'skills', 'interests']]);
  });
});

describe("convertLayout", () => {
  const andromedaSaved: SectionLayout = {
    template: 'andromeda',
    columns: [['summary', 'experience', 'education'], ['projects', 'skills', 'certifications', 'languages', 'interests', 'awards', 'references']],
  };

  it("column -> single flattens left column then right column", () => {
    const out = convertLayout(andromedaSaved, 'cigar', data2);
    expect(out.template).toBe('cigar');
    expect(out.columns[0]).toEqual(['summary', 'experience', 'education', 'projects', 'skills', 'certifications', 'languages', 'interests', 'awards', 'references']);
  });

  it("the documented example flattens to Summary, Experience, Education, Projects, Skills, Certifications", () => {
    const saved: SectionLayout = {
      template: 'andromeda',
      columns: [['summary', 'experience', 'education'], ['projects', 'skills', 'certifications']],
    };
    expect(convertLayout(saved, 'cigar', data2).columns[0].slice(0, 6)).toEqual(
      ['summary', 'experience', 'education', 'projects', 'skills', 'certifications'],
    );
  });

  it("hermes -> single puts the header summary first", () => {
    const saved: SectionLayout = { template: 'hermes', columns: [['experience', 'projects'], ['skills', 'education']] };
    expect(convertLayout(saved, 'cigar', data2).columns[0].slice(0, 5)).toEqual(['summary', 'experience', 'projects', 'skills', 'education']);
  });

  it("anything -> hermes never puts summary in a column", () => {
    const saved: SectionLayout = { template: 'cigar', columns: [['summary', 'experience', 'education']] };
    const out = convertLayout(saved, 'hermes', data2);
    expect(out.columns.flat()).not.toContain('summary');
    expect(out.columns[0][0]).toBe('experience');
  });

  it("andromeda -> cigar -> athena puts summary and experience at athena's pinned right slots", () => {
    const toCigar = convertLayout(andromedaSaved, 'cigar', data2);
    const toAthena = convertLayout(toCigar, 'athena', data2);
    expect(toAthena.template).toBe('athena');
    expect(toAthena.columns[1][1]).toBe('summary');
    expect(toAthena.columns[1][2]).toBe('experience');
    expect(toAthena.columns[0]).not.toContain('summary');
  });

  it("single -> column places free sections in their default columns", () => {
    const saved: SectionLayout = { template: 'cigar', columns: [['education', 'summary', 'experience', 'skills']] };
    const out = convertLayout(saved, 'apollo', data2);
    expect(out.columns[0].slice(0, 2)).toEqual(['education', 'skills']);
  });
});

describe("normalizeLayout", () => {
  it("re-pins a pinned section the user tried to move and tags the template", () => {
    const out = normalizeLayout('apollo', [['education', 'skills', 'interests', 'languages', 'projects', 'certifications', 'summary'], ['awards', 'experience', 'references']], data2);
    expect(out.template).toBe('apollo');
    expect(out.columns[1].slice(0, 2)).toEqual(['summary', 'experience']);
    expect(out.columns[0]).not.toContain('summary');
  });
});

describe("getRenderColumns", () => {
  it("hides empty sections", () => {
    const d = makeSampleResume(2);
    d.interests = [];
    d.awards[0].hidden = true;
    d.summary = '';
    const cols = getRenderColumns('cigar', d)[0];
    expect(cols).not.toContain('interests');
    expect(cols).not.toContain('awards');
    expect(cols).not.toContain('summary');
    expect(cols).toContain('experience');
  });

  it("keeps the saved order for non-empty sections", () => {
    const d = { ...makeSampleResume(2), sectionLayout: { template: 'zeus', columns: [['education', 'experience']] } as SectionLayout };
    expect(getRenderColumns('zeus', d)[0].slice(0, 2)).toEqual(['education', 'experience']);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run src/utils/section-layout.test.ts`
Expected: FAIL (`Failed to resolve import "@/utils/section-layout"`).

- [ ] **Step 4: Implement the module**

Create `src/utils/section-layout.ts`:

```ts
import type { TemplateType } from "@/types";
import type { ResumeFormData } from "@/types/interface.resume-form-data";

export type SectionId =
  | 'summary'
  | 'socials'
  | 'experience'
  | 'education'
  | 'skills'
  | 'projects'
  | 'awards'
  | 'certifications'
  | 'references'
  | 'languages'
  | 'interests';

export const SECTION_LABELS: Record<SectionId, string> = {
  summary: 'Summary',
  socials: 'Social Links',
  experience: 'Experience',
  education: 'Education',
  skills: 'Skills',
  projects: 'Projects',
  awards: 'Awards',
  certifications: 'Certifications',
  references: 'References',
  languages: 'Languages',
  interests: 'Interests',
};

const ALL_SECTION_IDS = Object.keys(SECTION_LABELS) as SectionId[];

/** Saved per resume inside resume_data. `columns` are in visual left-to-right order. */
export interface SectionLayout {
  template: TemplateType;
  columns: SectionId[][];
}

interface TemplateLayoutConfig {
  /** Sections the template renders in a fixed header; never part of the layout. */
  header: SectionId[];
  /** Sections locked to their default column and slot. */
  pinned: SectionId[];
  columnLabels: string[];
  /** Default columns; `visibleExperience` drives hermes/andromeda's automatic placement. */
  defaultColumns: (visibleExperience: number) => SectionId[][];
}

const singleColumn = (sections: SectionId[]): TemplateLayoutConfig => ({
  header: [],
  pinned: [],
  columnLabels: ['Sections'],
  defaultColumns: () => [sections],
});

const LAYOUTS: Record<TemplateType, TemplateLayoutConfig> = {
  zeus: singleColumn(['summary', 'experience', 'education', 'projects', 'skills', 'languages', 'certifications', 'awards', 'references']),
  cigar: singleColumn(['summary', 'experience', 'education', 'projects', 'skills', 'languages', 'interests', 'certifications', 'awards', 'references']),
  hera: singleColumn(['summary', 'experience', 'education', 'projects', 'skills', 'languages', 'interests', 'certifications', 'awards', 'references']),
  milky_way: singleColumn(['summary', 'experience', 'education', 'projects', 'skills', 'languages', 'certifications', 'awards', 'interests', 'references']),
  comet: singleColumn(['summary', 'skills', 'projects', 'interests']),
  andromeda: {
    header: [],
    pinned: ['summary', 'experience'],
    columnLabels: ['Left column', 'Right column'],
    defaultColumns: (exp) => exp <= 2
      ? [
        ['summary', 'experience', 'education', 'languages', 'certifications', 'interests'],
        ['skills', 'projects', 'awards', 'references'],
      ]
      : [
        ['summary', 'experience'],
        ['education', 'skills', 'projects', 'languages', 'certifications', 'interests', 'awards', 'references'],
      ],
  },
  hermes: {
    header: ['summary'],
    pinned: ['experience'],
    columnLabels: ['Left column', 'Right column'],
    defaultColumns: (exp) => exp < 3
      ? [
        ['experience', 'projects', 'references'],
        ['skills', 'education', 'certifications', 'awards', 'interests', 'languages'],
      ]
      : [
        ['experience', 'projects'],
        ['skills', 'education', 'certifications', 'awards', 'interests', 'languages', 'references'],
      ],
  },
  artemis: {
    header: [],
    pinned: ['summary', 'experience'],
    columnLabels: ['Main (left)', 'Sidebar (right)'],
    defaultColumns: () => [
      ['summary', 'experience', 'references'],
      ['education', 'skills', 'projects', 'certifications', 'awards', 'languages'],
    ],
  },
  athena: {
    header: [],
    pinned: ['summary', 'experience'],
    columnLabels: ['Sidebar (left)', 'Main (right)'],
    defaultColumns: () => [
      ['education', 'skills', 'projects', 'certifications', 'awards', 'languages'],
      ['socials', 'summary', 'experience', 'references'],
    ],
  },
  apollo: {
    header: [],
    pinned: ['summary', 'experience'],
    columnLabels: ['Sidebar (left)', 'Main (right)'],
    defaultColumns: () => [
      ['education', 'skills', 'interests', 'languages', 'projects', 'certifications'],
      ['summary', 'experience', 'awards', 'references'],
    ],
  },
};

const countVisible = (items: Array<{ hidden?: boolean }> | undefined): number =>
  (items ?? []).filter((item) => !item.hidden).length;

export const getDefaultColumns = (template: TemplateType, data: ResumeFormData): SectionId[][] =>
  LAYOUTS[template].defaultColumns(countVisible(data.experience)).map((column) => [...column]);

export const getPinned = (template: TemplateType): SectionId[] => LAYOUTS[template].pinned;

export const getColumnLabels = (template: TemplateType): string[] => LAYOUTS[template].columnLabels;

export const hasContent = (id: SectionId, data: ResumeFormData): boolean => {
  switch (id) {
    case 'summary':
      return !!data.summary;
    case 'socials':
      return (data.socials?.length ?? 0) >= 1;
    case 'languages':
      return (data.languages?.length ?? 0) >= 1;
    case 'interests':
      return (data.interests?.length ?? 0) >= 1;
    case 'experience':
    case 'education':
    case 'skills':
    case 'projects':
    case 'awards':
    case 'certifications':
    case 'references':
      return countVisible(data[id]) >= 1;
  }
};

const isSectionId = (value: unknown): value is SectionId =>
  typeof value === 'string' && (ALL_SECTION_IDS as string[]).includes(value);

/** Spread free sections (in `ordered` order) over the template's columns. */
const distributeFree = (
  template: TemplateType,
  data: ResumeFormData,
  ordered: unknown[],
  columnOf: Map<SectionId, number>,
): SectionId[][] => {
  const defaults = getDefaultColumns(template, data);
  const { pinned } = LAYOUTS[template];
  const defaultColumnOf = new Map<SectionId, number>();
  defaults.forEach((column, c) => column.forEach((id) => {
    if (!pinned.includes(id)) defaultColumnOf.set(id, c);
  }));

  const free = defaults.map(() => [] as SectionId[]);
  const seen = new Set<SectionId>();
  for (const id of ordered) {
    if (!isSectionId(id) || seen.has(id) || !defaultColumnOf.has(id)) continue;
    seen.add(id);
    const preferred = columnOf.get(id);
    free[preferred !== undefined && preferred < free.length ? preferred : defaultColumnOf.get(id)!].push(id);
  }
  defaults.forEach((column, c) => column.forEach((id) => {
    if (defaultColumnOf.has(id) && !seen.has(id)) free[c].push(id);
  }));
  return free;
};

/** Insert pinned sections at their default slots around the free sections. */
const pinInto = (template: TemplateType, data: ResumeFormData, free: SectionId[][]): SectionId[][] => {
  const { pinned } = LAYOUTS[template];
  return getDefaultColumns(template, data).map((defaultColumn, c) => {
    const out = [...free[c]];
    defaultColumn.forEach((id, slot) => {
      if (pinned.includes(id)) out.splice(Math.min(slot, out.length), 0, id);
    });
    return out;
  });
};

export const resolveLayout = (
  template: TemplateType,
  saved: SectionLayout | undefined,
  data: ResumeFormData,
): SectionId[][] => {
  if (!saved || !Array.isArray(saved.columns)) return getDefaultColumns(template, data);
  const columnCount = LAYOUTS[template].defaultColumns(0).length;
  const sameShape = saved.template === template && saved.columns.length === columnCount;

  const columnOf = new Map<SectionId, number>();
  if (sameShape) {
    saved.columns.forEach((column, c) => (Array.isArray(column) ? column : []).forEach((id) => {
      if (isSectionId(id) && !columnOf.has(id)) columnOf.set(id, c);
    }));
  }
  const ordered = saved.columns.flatMap((column) => (Array.isArray(column) ? column : []));
  return pinInto(template, data, distributeFree(template, data, ordered, columnOf));
};

/** Turn the board state after a drag into a saved layout (re-pinning fixed sections). */
export const normalizeLayout = (
  template: TemplateType,
  columns: SectionId[][],
  data: ResumeFormData,
): SectionLayout => ({
  template,
  columns: resolveLayout(template, { template, columns }, data),
});

/** Carry a saved layout over to another template (header first, then columns left to right). */
export const convertLayout = (
  saved: SectionLayout,
  to: TemplateType,
  data: ResumeFormData,
): SectionLayout => {
  const headerOfSource = LAYOUTS[saved.template]?.header ?? [];
  const ordered = [...headerOfSource, ...saved.columns.flatMap((column) => (Array.isArray(column) ? column : []))];
  return {
    template: to,
    columns: pinInto(to, data, distributeFree(to, data, ordered, new Map())),
  };
};

/** Final columns for rendering: resolved layout with empty sections removed. */
export const getRenderColumns = (template: TemplateType, data: ResumeFormData): SectionId[][] =>
  resolveLayout(template, data.sectionLayout, data).map((column) => column.filter((id) => hasContent(id, data)));
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/utils/section-layout.test.ts`
Expected: all tests PASS. If one fails, fix the module (not the test) unless the test contradicts the Global Constraints.

- [ ] **Step 6: Amend the spec**

In `docs/superpowers/specs/2026-10-10-section-ordering-design.md` change the Data section's first sentence to: `ResumeFormData` gains optional `sectionLayout: { template: TemplateType; columns: SectionId[][] }`; `template` records which template the columns were arranged for so a template switch can be detected on load.

- [ ] **Step 7: Type check and commit**

Run: `npx tsc -b`
Expected: no errors.

```bash
git add src/utils/section-layout.ts src/utils/section-layout.test.ts src/types/interface.resume-form-data.ts ../docs/superpowers/specs/2026-10-10-section-ordering-design.md
git commit -m "feat: add section layout resolve/convert logic

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Shared renderer + the five single-column templates

**Files:**
- Create: `src/components/templates/render-sections.tsx`
- Modify: `src/components/templates/greek/zeus.tsx`, `src/components/templates/galaxy/cigar.tsx`, `src/components/templates/greek/hera.tsx`, `src/components/templates/galaxy/milky_way.tsx`, `src/components/templates/galaxy/comet.tsx`

**Interfaces:**
- Consumes: `getRenderColumns`, `SectionId` from Task 2.
- Produces: `type SectionMap = Partial<Record<SectionId, React.ReactNode>>` and `renderSections(ids: SectionId[], sections: SectionMap): React.ReactNode[]`.

- [ ] **Step 1: Create the renderer**

Create `src/components/templates/render-sections.tsx`:

```tsx
import React from "react";
import type { SectionId } from "@/utils/section-layout";

export type SectionMap = Partial<Record<SectionId, React.ReactNode>>;

export const renderSections = (ids: SectionId[], sections: SectionMap): React.ReactNode[] =>
  ids.map((id) => <React.Fragment key={id}>{sections[id]}</React.Fragment>);
```

- [ ] **Step 2: Refactor zeus**

In `zeus.tsx` add imports after the existing ones:

```tsx
import { getRenderColumns } from "@/utils/section-layout";
import { renderSections, type SectionMap } from "@/components/templates/render-sections";
```

Immediately before `  return (\n    <>\n      <style>` add:

```tsx
  const columns = getRenderColumns('zeus', data);
  const sections: SectionMap = {
    summary: aboutSection,
    experience: expSection,
    education: educSection,
    projects: projSection,
    skills: skillSection,
    languages: langSection,
    certifications: certSection,
    awards: awardsSection,
    references: refSection,
  };

```

Replace the whole `<main className="greek-main"> ... </main>` block (lines 184-194) with:

```tsx
        <main className="greek-main">
          {renderSections(columns[0], sections)}
        </main>
```

- [ ] **Step 3: Refactor cigar and hera (identical structure)**

In both files add the same two imports. Before `  return (` add:

```tsx
  const columns = getRenderColumns('cigar', data);   // use 'hera' in hera.tsx
  const sections: SectionMap = {
    summary: aboutSection,
    experience: expSection,
    education: educSection,
    projects: projSection,
    skills: skillSection,
    languages: langSection,
    interests: interestsSection,
    certifications: certSection,
    awards: awardsSection,
    references: refSection,
  };

```

Replace the `<main className="classic-main"> ... </main>` block with:

```tsx
        <main className="classic-main">
          {renderSections(columns[0], sections)}
        </main>
```

- [ ] **Step 4: Refactor milky_way**

Add the imports. Before `  return (` add:

```tsx
  const columns = getRenderColumns('milky_way', data);
  const sections: SectionMap = {
    summary: aboutSection,
    experience: expSection,
    education: educSection,
    projects: projSection,
    skills: skillSection,
    languages: langSection,
    certifications: certSection,
    awards: awardsSection,
    interests: interestSection,
    references: refSection,
  };

```

Replace the `<main className="mw-main"> ... </main>` block with:

```tsx
        <main className="mw-main">
          {renderSections(columns[0], sections)}
        </main>
```

- [ ] **Step 5: Refactor comet**

Add the imports. Before `  return (` add:

```tsx
  const columns = getRenderColumns('comet', data);
  const sections: SectionMap = {
    summary: aboutSection,
    skills: skillSection,
    projects: projSection,
    interests: interestSection,
  };

```

Replace the `<main className="comet-main"> ... </main>` block with:

```tsx
        <main className="comet-main">
          {renderSections(columns[0], sections)}
        </main>
```

- [ ] **Step 6: Verify output is unchanged**

Run: `npx vitest run && npx tsc -b`
Expected: all 12 snapshot tests PASS unmodified (a snapshot diff means the refactor changed output: fix the template, never update the snapshot), no type errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/templates
git commit -m "refactor: render single-column template sections from the layout order

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: The five column templates

**Files:**
- Modify: `src/components/templates/galaxy/andromeda.tsx`, `src/components/templates/greek/hermes.tsx`, `src/components/templates/greek/athena.tsx`, `src/components/templates/greek/apollo.tsx`, `src/components/templates/greek/artemis.tsx`

**Interfaces:**
- Consumes: `getRenderColumns`, `renderSections`, `SectionMap` (Tasks 2-3). Column index 0/1 follow the left-to-right order in Global Constraints.

Add these two imports to each file:

```tsx
import { getRenderColumns } from "@/utils/section-layout";
import { renderSections, type SectionMap } from "@/components/templates/render-sections";
```

- [ ] **Step 1: andromeda**

Before `  return (` add:

```tsx
  const columns = getRenderColumns('andromeda', data);
  const sections: SectionMap = {
    summary: (
      <section className="section">
        <h3 className="section-title">Summary</h3>
        <div className="summary">
          <p>{data.summary}</p>
        </div>
      </section>
    ),
    experience: expSection,
    education: educSection,
    languages: langSection,
    certifications: certSection,
    interests: interestSection,
    skills: skillSection,
    projects: projSection,
    awards: awardsSection,
    references: refSection,
  };

```

Replace the whole `<div className="main-content"> ... </div>` block (from `<div className="main-content">` through its matching close just before `</div>\n    </>`; originally lines 206-250) with:

```tsx
        <div className="main-content">
          <div className="left-column">
            {renderSections(columns[0], sections)}
          </div>
          <div className="right-column">
            {renderSections(columns[1], sections)}
          </div>
        </div>
```

- [ ] **Step 2: hermes**

Replace the `const leftColumn = (...)` and `const rightColumn = (...)` definitions (originally lines 256-274) with:

```tsx
  const columns = getRenderColumns('hermes', data);
  const sections: SectionMap = {
    experience: workExperienceSection,
    projects: projectsSection,
    references: referencesSection,
    skills: skillsSection,
    education: educationSection,
    certifications: certificatesSection,
    awards: awardsSection,
    interests: interestsSection,
    languages: languagesSection,
  };

  const leftColumn = (
    <div className="resume-left-column">
      {renderSections(columns[0], sections)}
    </div>
  );

  const rightColumn = (
    <div className="resume-right-column">
      {renderSections(columns[1], sections)}
    </div>
  );
```

`headerSection` (with the Summary) is left untouched.

- [ ] **Step 3: athena**

Delete the `const sidebarSection = (...)` block (lines 121-131) and the `const mainSection = (...)` block (lines 190-197). Immediately before `  return (` add:

```tsx
  const columns = getRenderColumns('athena', data);
  const sections: SectionMap = {
    education: educSection,
    skills: skillSection,
    projects: projSection,
    certifications: certSection,
    awards: awardsSection,
    languages: langSection,
    socials: socialSection,
    summary: aboutSection,
    experience: expSection,
    references: refSection,
  };

  const sidebarSection = (
    <aside className="resume-sidebar">
      {personalSection}
      {renderSections(columns[0], sections)}
    </aside>
  );

  const mainSection = (
    <main className="resume-main-content">
      {renderSections(columns[1], sections)}
    </main>
  );

```

- [ ] **Step 4: apollo**

Delete the `const sidebarSection = (...)` block (lines 117-127) and the `const mainSection = (...)` block (lines 189-196). Immediately before `  return (` add:

```tsx
  const columns = getRenderColumns('apollo', data);
  const sections: SectionMap = {
    education: educSection,
    skills: skillSection,
    interests: interestSection,
    languages: langSection,
    projects: projSection,
    certifications: certSection,
    summary: summarySection,
    experience: expSection,
    awards: awardsSection,
    references: refSection,
  };

  const sidebarSection = (
    <aside className="resume-sidebar">
      {aboutSection}
      {renderSections(columns[0], sections)}
    </aside>
  );

  const mainSection = (
    <main className="resume-main-content">
      {renderSections(columns[1], sections)}
    </main>
  );

```

- [ ] **Step 5: artemis**

Delete the `const mainSection = (...)` block (lines 59-65) and the `const sidebarSection = (...)` block (lines 170-180). Immediately before `  return (` add:

```tsx
  const columns = getRenderColumns('artemis', data);
  const sections: SectionMap = {
    summary: summarySection,
    experience: expSection,
    references: refSection,
    education: educSection,
    skills: skillSection,
    projects: projSection,
    certifications: certSection,
    awards: awardsSection,
    languages: langSection,
  };

  const mainSection = (
    <main className="resume-main-content">
      {renderSections(columns[0], sections)}
    </main>
  );

  const sidebarSection = (
    <aside className="resume-sidebar">
      {contactSection}
      {renderSections(columns[1], sections)}
    </aside>
  );

```

- [ ] **Step 6: Verify output is unchanged**

Run: `npx vitest run && npx tsc -b && npm run lint`
Expected: all 12 snapshots PASS unmodified, no type errors, lint has no new errors compared with `git stash`-ed baseline (existing warnings are acceptable).

- [ ] **Step 7: Add a layout-applied render test**

Append to `src/components/templates/templates.snapshot.test.tsx`:

```tsx
describe("template render honours sectionLayout", () => {
  it("cigar renders education before experience", () => {
    const data = { ...makeSampleResume(2), sectionLayout: { template: 'cigar' as const, columns: [['education', 'experience']] as never } };
    const html = renderToString(<TemplateComponent data={data} template="cigar" />);
    expect(html.indexOf('Education')).toBeLessThan(html.indexOf('Work Experience'));
  });

  it("apollo renders a moved free section in the other column", () => {
    const data = {
      ...makeSampleResume(2),
      sectionLayout: {
        template: 'apollo' as const,
        columns: [['skills', 'interests', 'languages', 'projects', 'certifications'], ['summary', 'experience', 'education', 'awards', 'references']] as never,
      },
    };
    const html = renderToString(<TemplateComponent data={data} template="apollo" />);
    expect(html.indexOf('WORK EXPERIENCE')).toBeLessThan(html.indexOf('EDUCATION'));
  });

  it("hermes keeps its summary in the header whatever the layout says", () => {
    const data = { ...makeSampleResume(2), sectionLayout: { template: 'hermes' as const, columns: [['summary', 'experience'], ['skills']] as never } };
    const html = renderToString(<TemplateComponent data={data} template="hermes" />);
    expect(html.match(/Engineer who builds analytical engines\./g)).toHaveLength(1);
    expect(html.indexOf('Engineer who builds analytical engines.')).toBeLessThan(html.indexOf('resume-content'));
  });
});
```

Run: `npx vitest run`
Expected: PASS (15 tests + section-layout tests).

- [ ] **Step 8: Commit**

```bash
git add src/components/templates
git commit -m "refactor: render column template sections from the layout columns

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 5: `SectionOrderPanel` component

**Files:**
- Create: `src/components/SectionOrderPanel.tsx`

**Interfaces:**
- Consumes: `resolveLayout`, `normalizeLayout`, `getPinned`, `getColumnLabels`, `hasContent`, `SECTION_LABELS`, `SectionId`, `SectionLayout` (Task 2).
- Produces: `default export SectionOrderPanel: React.FC<{ template: TemplateType; data: ResumeFormData; layout: SectionLayout | undefined; isDarkMode: boolean; onChange: (layout: SectionLayout | undefined) => void; onClose: () => void }>`. `onChange(undefined)` means "reset to default".

- [ ] **Step 1: Write the component**

Create `src/components/SectionOrderPanel.tsx`:

```tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Lock, RotateCcw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { TemplateType } from '@/types';
import type { ResumeFormData } from '@/types/interface.resume-form-data';
import {
  SECTION_LABELS,
  getColumnLabels,
  getPinned,
  hasContent,
  normalizeLayout,
  resolveLayout,
  type SectionId,
  type SectionLayout,
} from '@/utils/section-layout';

interface SectionOrderPanelProps {
  template: TemplateType;
  data: ResumeFormData;
  layout: SectionLayout | undefined;
  isDarkMode: boolean;
  onChange: (layout: SectionLayout | undefined) => void;
  onClose: () => void;
}

const columnDroppableId = (index: number) => `column-${index}`;

const SortableRow: React.FC<{ id: SectionId; pinned: boolean; empty: boolean }> = ({ id, pinned, empty }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled: pinned });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      className={`flex items-center gap-2 rounded-md border px-2 py-2 text-sm bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 ${empty ? 'opacity-60' : ''}`}
    >
      {pinned ? (
        <Lock size={14} className="text-gray-400" aria-label="Fixed section" />
      ) : (
        <button type="button" className="cursor-grab touch-none text-gray-500" aria-label={`Move ${SECTION_LABELS[id]}`} {...attributes} {...listeners}>
          <GripVertical size={16} />
        </button>
      )}
      <span className="flex-1">{SECTION_LABELS[id]}</span>
      {empty && <span className="text-xs text-gray-400">empty</span>}
    </div>
  );
};

const Column: React.FC<{ index: number; label: string; ids: SectionId[]; pinned: SectionId[]; data: ResumeFormData; showLabel: boolean }> = ({
  index, label, ids, pinned, data, showLabel,
}) => {
  const { setNodeRef } = useDroppable({ id: columnDroppableId(index) });
  return (
    <div className="flex-1 min-w-0">
      {showLabel && <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</div>}
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} className="flex min-h-16 flex-col gap-2 rounded-md border border-dashed border-gray-300 p-2 dark:border-gray-600">
          {ids.map((id) => (
            <SortableRow key={id} id={id} pinned={pinned.includes(id)} empty={!hasContent(id, data)} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
};

const SectionOrderPanel: React.FC<SectionOrderPanelProps> = ({ template, data, layout, isDarkMode, onChange, onClose }) => {
  const resolved = useMemo(() => resolveLayout(template, layout, data), [template, layout, data]);
  const resolvedKey = JSON.stringify(resolved);
  const [items, setItems] = useState<SectionId[][]>(resolved);
  const pinned = getPinned(template);
  const labels = getColumnLabels(template);

  // pick up outside changes (template switch, reset, data load)
  useEffect(() => { setItems(resolved); }, [resolvedKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const findColumn = (id: string): number => {
    if (id.startsWith('column-')) return Number(id.slice('column-'.length));
    return items.findIndex((column) => column.includes(id as SectionId));
  };

  const handleDragOver = ({ active, over }: DragOverEvent) => {
    if (!over) return;
    const from = findColumn(String(active.id));
    const to = findColumn(String(over.id));
    if (from === -1 || to === -1 || from === to) return;
    setItems((prev) => {
      const moving = active.id as SectionId;
      const target = prev[to];
      const overIndex = target.indexOf(over.id as SectionId);
      const insertAt = overIndex === -1 ? target.length : overIndex;
      return prev.map((column, c) => {
        if (c === from) return column.filter((id) => id !== moving);
        if (c === to) return [...target.slice(0, insertAt), moving, ...target.slice(insertAt)];
        return column;
      });
    });
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    let next = items;
    if (over) {
      const column = findColumn(String(active.id));
      if (column !== -1 && column === findColumn(String(over.id)) && active.id !== over.id) {
        const from = items[column].indexOf(active.id as SectionId);
        const to = items[column].indexOf(over.id as SectionId);
        if (to !== -1) {
          next = items.map((ids, c) => (c === column ? arrayMove(ids, from, to) : ids));
        }
      }
    }
    const normalized = normalizeLayout(template, next, data);
    setItems(normalized.columns);
    if (JSON.stringify(normalized.columns) !== resolvedKey) onChange(normalized);
  };

  return (
    <aside
      className={`flex h-full w-80 shrink-0 flex-col border-l shadow-xl ${isDarkMode ? 'bg-gray-800/95 border-gray-700/50' : 'bg-white/95 border-gray-200/50'}`}
      aria-label="Section order"
    >
      <div className="flex items-center justify-between border-b border-gray-200/50 p-4 dark:border-gray-700/50">
        <h2 className="text-lg font-semibold">Section order</h2>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close section order">
          <X size={16} />
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 no-scrollbar">
        <p className="mb-4 text-xs text-gray-500">
          Drag sections to reorder them. Locked sections and the header stay where the template puts them.
        </p>
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
          <div className="flex gap-3">
            {items.map((ids, index) => (
              <Column key={index} index={index} label={labels[index]} ids={ids} pinned={pinned} data={data} showLabel={items.length > 1} />
            ))}
          </div>
        </DndContext>
      </div>
      <div className="border-t border-gray-200/50 p-4 dark:border-gray-700/50">
        <Button variant="outline" className="w-full" onClick={() => onChange(undefined)} disabled={!layout}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Reset to default
        </Button>
      </div>
    </aside>
  );
};

export default SectionOrderPanel;
```

- [ ] **Step 2: Type check and lint**

Run: `npx tsc -b && npx eslint src/components/SectionOrderPanel.tsx`
Expected: no errors. If `@dnd-kit` exports differ in the installed version, check against `src/components/forms/Awards.tsx` imports and adjust.

- [ ] **Step 3: Commit**

```bash
git add src/components/SectionOrderPanel.tsx
git commit -m "feat: add section order panel with column board

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Wire the panel into `Preview.tsx`

**Files:**
- Modify: `src/pages/Preview.tsx`

**Interfaces:**
- Consumes: `SectionOrderPanel` (Task 5), `convertLayout`, `SectionLayout` (Task 2).

- [ ] **Step 1: Imports**

Add `ArrowUpDown` to the `lucide-react` import list. Add after the `useMainStore` import:

```tsx
import SectionOrderPanel from '@/components/SectionOrderPanel';
import { convertLayout, type SectionLayout } from '@/utils/section-layout';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
```

- [ ] **Step 2: State, refs and constants**

After `const requestIdRef = useRef(0); // ignore out-of-order responses` add:

```tsx
  const LAYOUT_DEBOUNCE_MS = 2500; // each regeneration is a server-side PDF render, wait for the user to stop dragging
  const activeTemplate: TemplateType = template ?? 'andromeda';
  const [sectionLayout, setSectionLayout] = useState<SectionLayout | undefined>(undefined);
  const [orderPanelOpen, setOrderPanelOpen] = useState(false);
  const sectionLayoutRef = useRef<SectionLayout | undefined>(undefined);
  const resumeDataRef = useRef<ResumeFormData | null>(null);
  const layoutTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const handleFormSubmitRef = useRef<(data: ResumeFormData) => Promise<void>>(async () => { });
```

- [ ] **Step 3: Load and convert the layout when the resume is fetched**

In `fetchResumeData`, replace the inner `try { ... }` body

```tsx
          setIsUpdateMode(true);
          const parsedData = JSON.parse(request.data.resume_data);
          setResumeData(parsedData);
          handleFormSubmit(parsedData); // Use parsedData directly!
```

with

```tsx
          setIsUpdateMode(true);
          const parsedData: ResumeFormData = JSON.parse(request.data.resume_data);
          // the layout was arranged for another template: carry it over (column <-> single-column rules)
          const initialLayout = parsedData.sectionLayout && parsedData.sectionLayout.template !== activeTemplate
            ? convertLayout(parsedData.sectionLayout, activeTemplate, parsedData)
            : parsedData.sectionLayout;
          sectionLayoutRef.current = initialLayout;
          setSectionLayout(initialLayout);
          setResumeData(parsedData);
          handleFormSubmit(parsedData); // Use parsedData directly!
```

- [ ] **Step 4: Inject the layout on every submit**

Replace the start of `handleFormSubmit`:

```tsx
  const handleFormSubmit = async (data: ResumeFormData) => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    if (liveEdit) setLiveStatus('updating');
    try {
      setResumeData(data);
      await saveResumeData(data);
```

with

```tsx
  const handleFormSubmit = async (formData: ResumeFormData) => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    if (liveEdit) setLiveStatus('updating');
    // the layout lives outside the form; always attach the current one (undefined is dropped from the JSON)
    const data: ResumeFormData = { ...formData, sectionLayout: sectionLayoutRef.current };
    try {
      resumeDataRef.current = data;
      setResumeData(data);
      await saveResumeData(data);
```

Directly below the closing `}` of `handleFormSubmit` add:

```tsx
  handleFormSubmitRef.current = handleFormSubmit; // always-fresh handle for the debounced layout callback

  const handleLayoutChange = (next: SectionLayout | undefined) => {
    sectionLayoutRef.current = next;
    setSectionLayout(next);
    clearTimeout(layoutTimerRef.current);
    layoutTimerRef.current = setTimeout(() => {
      if (resumeDataRef.current) void handleFormSubmitRef.current(resumeDataRef.current);
    }, LAYOUT_DEBOUNCE_MS);
  };

  useEffect(() => () => clearTimeout(layoutTimerRef.current), []);
```

- [ ] **Step 5: Header button before "Templates"**

Immediately before the `<Button variant="outline" onClick={redirectTemplates} ...>` element add:

```tsx
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          aria-label="Section order"
                          aria-pressed={orderPanelOpen}
                          disabled={!pdfUrl}
                          onClick={() => setOrderPanelOpen((open) => !open)}
                          className={`
                            ${isDarkMode
                              ? 'border-gray-600 hover:bg-gray-700 text-gray-300 hover:text-white'
                              : 'border-gray-300 hover:bg-gray-50 text-gray-700 hover:text-gray-900'
                            }
                            ${orderPanelOpen ? 'ring-2 ring-indigo-500' : ''}
                            transition-all duration-200 hover:scale-105
                          `}
                        >
                          <ArrowUpDown className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Section order</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
```

- [ ] **Step 6: Right sidebar**

The preview area is currently the last child of `<div className="flex-1 pl-12 flex flex-col lg:flex-row overflow-hidden">`. Its width is `calc(100% - ${sidebarWidth}px)`; make room for the panel by changing that style to

```tsx
              width: window.innerWidth >= 1024 ? `calc(100% - ${sidebarWidth}px - ${orderPanelOpen ? 320 : 0}px)` : '100%',
```

and add, as the next sibling after the preview-area `</div>` (the one that closes `className="h-1/2 lg:h-full flex flex-col overflow-hidden"`):

```tsx
          {orderPanelOpen && (
            <SectionOrderPanel
              template={activeTemplate}
              data={resumeData}
              layout={sectionLayout}
              isDarkMode={isDarkMode}
              onChange={handleLayoutChange}
              onClose={() => setOrderPanelOpen(false)}
            />
          )}
```

- [ ] **Step 7: Verify**

Run: `npx tsc -b && npm run lint && npx vitest run`
Expected: no type errors, no new lint errors, all tests PASS.

- [ ] **Step 8: Commit**

```bash
git add src/pages/Preview.tsx
git commit -m "feat: add section order sidebar to the preview page

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Manual end-to-end verification

**Files:** none (fixes go in the file concerned, with a new commit).

- [ ] **Step 1: Run the app**

Run: `npm run dev` (client) and start the server as the project README describes (`server/`), log in and open an existing resume's preview.

- [ ] **Step 2: Single-column check (e.g. cigar)**

Open the "Section order" button (it is disabled until the first PDF exists). Expected: a right sidebar with one list. Drag Education above Experience. Expected: ~2.5 s later the status line shows "Saving & updating preview..." and the PDF shows Education first. Reload the page: order persists.

- [ ] **Step 3: Column checks, one per template**

For andromeda, hermes, artemis, athena, apollo: the panel shows two columns labelled as in `getColumnLabels`. Drag a free section (e.g. Skills) to the other column and reorder within a column; PDF updates to match. Summary/Experience (andromeda, artemis, athena, apollo) and Experience (hermes) show a lock and cannot be dragged. In hermes confirm Summary is not in the panel and stays in the header.

- [ ] **Step 4: Switching rules**

1. andromeda: arrange Summary, Experience, Education | Projects, Skills, Certifications. Switch to cigar via Templates: the single list starts Summary, Experience, Education, Projects, Skills, Certifications.
2. Switch that resume to athena: Summary and Experience sit at athena's right-column pinned slots; they are locked.
3. andromeda -> cigar -> hermes: Summary is in the hermes header; Experience first in the left column.
4. hermes -> cigar: Summary is first.

- [ ] **Step 5: Reset, in-flight and export**

Click "Reset to default": the PDF returns to the template's default and the saved JSON has no `sectionLayout` key (check the `/resume/save-data` request payload in the browser network tab). Drag twice quickly with a slow network: the final PDF reflects the last arrangement, never an older one. "Export PDF" downloads a PDF with the same order as the preview.

- [ ] **Step 6: Final automated check and commit any fixes**

Run: `npx tsc -b && npm run lint && npx vitest run && npm run build`
Expected: all pass. Commit any fixes made during manual verification.

---

## Self-review notes

- **Spec coverage:** single-column list (Tasks 3, 5); column board and cross-column drag (Tasks 4, 5); pinned sections fully fixed (Task 2 `pinInto`, Task 5 lock); header fixed incl. hermes Summary (Task 2 `header`, Task 4 hermes, tests); switching rules and the documented example (Task 2 tests, Task 6 step 3, Task 7); defaults unchanged with hermes/andromeda dynamic rules (Task 1 snapshots, Task 2 tests); icon button before Templates, right sidebar, 2.5 s debounce reusing the PDF path (Task 6); Vitest for the pure module (Tasks 1-2); form order untouched (not modified anywhere).
- **Type consistency:** `SectionLayout`, `SectionId`, `getRenderColumns`, `renderSections`, `SectionMap`, `normalizeLayout`, `convertLayout`, `resolveLayout` are used with identical names and signatures across tasks.
- **Placeholders:** none; every code step contains the code.
