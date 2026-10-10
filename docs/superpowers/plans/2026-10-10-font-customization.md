# Font Customization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users pick any font from a curated list of 18 entries (17 fonts plus the "DM Serif Text + Cinzel" pairing) for any resume or cover letter template, saved with the document and honoured by the exported PDF.

**Architecture:** Template CSS reads two CSS variables, `--doc-font` (body) and `--doc-heading-font` (document name and section titles), each with the template's old font as the fallback, so documents with no choice render as before. The PDF servers set both variables on `:root` plus the matching Google Fonts `<link>`s from a server-side allow-list registry. The choice is stored in the document JSON as `fontFamily: { template, id }`; the client attaches it on save and render, like `sectionLayout`.

**Tech Stack:** React 19 + Vite + Vitest (client), Express + Puppeteer (server, Vitest added here), Tailwind, shadcn/Radix Popover, lucide-react.

**Spec:** `docs/superpowers/specs/2026-10-10-font-customization-design.md`

**Branch:** work on the current branch `text-and-color-theme-customization`. Do not create another branch or a worktree.

## Global Constraints

- 18 registry entries, ids exactly: `geist`, `ibm-plex-sans`, `ibm-plex-serif`, `poppins`, `lato`, `montserrat`, `lexend-deca`, `dm-serif-text`, `roboto-slab`, `mozilla-headline`, `inter`, `source-sans-3`, `roboto`, `open-sans`, `merriweather`, `lora`, `libre-baskerville`, `dm-serif-text-cinzel`.
- Ubuntu is removed everywhere (CSS, PDF servers, registry). Cinzel is never offered on its own.
- Template defaults: cigar `dm-serif-text`; zeus `dm-serif-text-cinzel`; andromeda `ibm-plex-serif`; comet and apollo `poppins`; milky_way `lato`; athena `lexend-deca`; hera `geist`; hermes `roboto-slab`; artemis `source-sans-3`; aether `montserrat`; aqua `mozilla-headline`; ignis `geist`; terra `poppins`; ventus `ibm-plex-sans`.
- Saved shape: `fontFamily: { template: <template id>; id: <font id> }`. A saved value is only used when `template` equals the active template and `id` is in the registry; otherwise the template default applies. Resetting removes the key (JSON drops `undefined`).
- Variable names are exactly `--doc-font` and `--doc-heading-font`. Heading role = document name and section titles (cover letters: the sender name). Zeus keeps its existing four Cinzel rules (name, headline, section title, item header) as heading role.
- A document with no saved choice must render exactly as it does today (apart from the intended Hermes, Artemis, Ventus-PDF and Zeus-PDF default changes).
- No DB migration. The font id sent to the server is never interpolated into HTML except through the allow-listed registry.
- Server and client registries hold identical data; a client test enforces this.
- Commit trailer on every commit: `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

## Review Focus

- A saved choice made for another template, or one whose font id was later removed, falls back to the template default (resolver tests in Tasks 1 and 3).
- A malformed `fontFamily` in stored JSON (`null`, a string, an array, an object missing `template`) must not crash PDF generation and must fall back to the default (server tests, Task 1).
- An unknown template id reaching the server must not throw; it produces no font head (Task 1).
- Font Awesome icons must keep working: the server head emits only `:root` variables and `<link>`s, never a `font-family` declaration or a `*` selector (Task 1); template CSS never gets a catch-all font rule (Task 4 guard test).
- Rapid font changes must collapse into one regeneration and a slow older PDF must not overwrite a newer one (shared debounce and `requestIdRef`, Tasks 6 and 7, manual check in Task 8).
- Cigar's default is actually Georgia body plus DM Serif Text headings; selecting the list entry "DM Serif Text" on Cigar therefore changes its body font from Georgia. Known and accepted (note in Task 8 hand-off).

---

## File Structure

| File | Responsibility |
|---|---|
| `server/src/utils/fonts.ts` (create) | Server registry, defaults, `resolveFontId`, `buildFontHead` |
| `server/src/utils/fonts.test.ts` (create) | Registry and head-builder tests |
| `server/vitest.config.ts` (create), `server/package.json`, `server/tsconfig.json` | Vitest for the server; tests excluded from the build |
| `server/src/controllers/pdf.ts`, `cl-pdf.ts` (modify) | Use `buildFontHead` instead of per-template font ladders |
| `server/src/utils/pdfGenerator.ts` (delete) | Unused duplicate of `pdf.ts` |
| `client/src/utils/fonts.ts` (create) | Client registry, same data, plus `chooseFont` |
| `client/src/utils/fonts.test.ts`, `fonts.parity.test.ts` (create) | Client registry tests; client/server data parity |
| `client/src/styles/templates/**/*.css`, `client/src/styles/cover-letter/templates/elements/*.css` (modify) | Variables with old fonts as fallbacks |
| `client/src/styles/template-fonts.test.ts` (create) | Guard: no raw `font-family`, no Ubuntu, no remote `@import` |
| `client/src/types/interface.resume-form-data.ts`, `interface.cl-form-data.ts` (modify) | `fontFamily?: SavedFont` |
| `client/src/components/FontPicker.tsx` (create), `FontPicker.test.tsx` (create) | Popover UI and its pure list |
| `client/src/pages/Preview.tsx`, `CLPreview.tsx` (modify) | State, debounce, header button |

---

### Task 1: Server font registry, head builder, and server test setup

**Files:**
- Create: `server/src/utils/fonts.ts`
- Create: `server/src/utils/fonts.test.ts`
- Create: `server/vitest.config.ts`
- Modify: `server/package.json` (test script, `vitest` dev dependency)
- Modify: `server/tsconfig.json` (exclude tests from the build)

**Interfaces:**
- Produces (used by Task 2 and mirrored by Task 3): `FontId`, `FontEntry`, `SavedFont`, `FONTS`, `TEMPLATE_DEFAULT_FONT`, `getFont(id: unknown): FontEntry | undefined`, `isUsableSavedFont(template: string, saved: unknown): saved is SavedFont`, `resolveFontId(template: string, saved?: unknown): FontId | undefined`, `buildFontHead(template: string, saved?: unknown): string`.

- [ ] **Step 1: Add Vitest to the server**

Run in `server/`:

```bash
npm install -D vitest@^5.0.3
```

In `server/package.json` change the test script:

```json
    "test": "vitest run",
```

Create `server/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
```

In `server/tsconfig.json` add an `exclude` next to `include` so `tsc` does not compile tests:

```json
    "include": [
        "src"
    ],
    "exclude": [
        "src/**/*.test.ts"
    ]
```

- [ ] **Step 2: Write the failing tests**

Create `server/src/utils/fonts.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { FONTS, TEMPLATE_DEFAULT_FONT, buildFontHead, getFont, resolveFontId } from "./fonts";

const RESUME_TEMPLATES = ['cigar', 'andromeda', 'comet', 'milky_way', 'zeus', 'athena', 'apollo', 'artemis', 'hermes', 'hera'];
const CL_TEMPLATES = ['aether', 'terra', 'aqua', 'ignis', 'ventus'];

describe("registry", () => {
  it("has 18 entries with unique ids", () => {
    expect(FONTS).toHaveLength(18);
    expect(new Set(FONTS.map((f) => f.id)).size).toBe(18);
  });

  it("every entry has a name, stacks and at least one Google Fonts href", () => {
    for (const f of FONTS) {
      expect(f.name.length).toBeGreaterThan(0);
      expect(f.bodyStack.length).toBeGreaterThan(0);
      expect(f.headingStack.length).toBeGreaterThan(0);
      expect(f.googleHrefs.length).toBeGreaterThan(0);
      f.googleHrefs.forEach((h) => expect(h).toMatch(/^https:\/\/fonts\.googleapis\.com\/css2\?family=/));
    }
  });

  it("single fonts use one stack for both roles; only the pairing differs", () => {
    for (const f of FONTS) {
      if (f.kind === 'pairing') {
        expect(f.id).toBe('dm-serif-text-cinzel');
        expect(f.headingStack).toContain('Cinzel');
        expect(f.bodyStack).toContain('DM Serif Text');
        expect(f.googleHrefs).toHaveLength(2);
      } else {
        expect(f.headingStack).toBe(f.bodyStack);
      }
    }
  });

  it("does not contain Ubuntu or a standalone Cinzel", () => {
    expect(FONTS.some((f) => /ubuntu/i.test(f.id + f.name + f.bodyStack))).toBe(false);
    expect(FONTS.some((f) => f.id === 'cinzel')).toBe(false);
  });

  it("every template has a default that exists in the registry", () => {
    for (const t of [...RESUME_TEMPLATES, ...CL_TEMPLATES]) {
      expect(getFont(TEMPLATE_DEFAULT_FONT[t]), t).toBeDefined();
    }
  });

  it("matches the confirmed defaults", () => {
    expect(TEMPLATE_DEFAULT_FONT).toMatchObject({
      cigar: 'dm-serif-text', zeus: 'dm-serif-text-cinzel', andromeda: 'ibm-plex-serif',
      comet: 'poppins', apollo: 'poppins', milky_way: 'lato', athena: 'lexend-deca', hera: 'geist',
      hermes: 'roboto-slab', artemis: 'source-sans-3',
      aether: 'montserrat', aqua: 'mozilla-headline', ignis: 'geist', terra: 'poppins', ventus: 'ibm-plex-sans',
    });
  });
});

describe("resolveFontId", () => {
  it("returns the template default when nothing is saved", () => {
    expect(resolveFontId('hermes')).toBe('roboto-slab');
    expect(resolveFontId('hermes', undefined)).toBe('roboto-slab');
  });

  it("returns the saved id when it was saved for this template", () => {
    expect(resolveFontId('athena', { template: 'athena', id: 'inter' })).toBe('inter');
  });

  it("ignores a choice saved for a different template", () => {
    expect(resolveFontId('athena', { template: 'zeus', id: 'inter' })).toBe('lexend-deca');
  });

  it("ignores an id that is not in the registry", () => {
    expect(resolveFontId('athena', { template: 'athena', id: 'ubuntu' })).toBe('lexend-deca');
  });

  it.each([null, 'inter', 42, [], {}, { id: 'inter' }, { template: 'athena' }, { template: 'athena', id: 7 }])(
    "falls back to the default for malformed value %j",
    (bad) => {
      expect(resolveFontId('athena', bad)).toBe('lexend-deca');
    },
  );

  it("returns undefined for an unknown template", () => {
    expect(resolveFontId('nope')).toBeUndefined();
    expect(resolveFontId('constructor')).toBeUndefined();
  });
});

describe("buildFontHead", () => {
  it("default hermes loads Roboto Slab and sets no variables", () => {
    const head = buildFontHead('hermes');
    expect(head).toContain('family=Roboto+Slab');
    expect(head).not.toContain('--doc-font');
    expect(head).not.toContain('Ubuntu');
  });

  it("default zeus loads both halves of the pairing and sets no variables", () => {
    const head = buildFontHead('zeus');
    expect(head).toContain('family=DM+Serif+Text');
    expect(head).toContain('family=Cinzel');
    expect(head).not.toContain('--doc-font');
  });

  it("a saved single font loads only that font and sets both variables to its stack", () => {
    const head = buildFontHead('athena', { template: 'athena', id: 'inter' });
    expect(head).toContain('family=Inter');
    expect(head).not.toContain('Lexend');
    expect(head).toContain("--doc-font:'Inter', sans-serif");
    expect(head).toContain("--doc-heading-font:'Inter', sans-serif");
  });

  it("the pairing on another template loads both fonts and splits the roles", () => {
    const head = buildFontHead('athena', { template: 'athena', id: 'dm-serif-text-cinzel' });
    expect(head).toContain('family=DM+Serif+Text');
    expect(head).toContain('family=Cinzel');
    expect(head).toContain("--doc-font:'DM Serif Text', Georgia, serif");
    expect(head).toContain("--doc-heading-font:'Cinzel', serif");
  });

  it("a choice saved for another template yields the default font and no variables", () => {
    const head = buildFontHead('hera', { template: 'zeus', id: 'inter' });
    expect(head).toContain('family=Geist');
    expect(head).not.toContain('--doc-font');
  });

  it("returns an empty string for an unknown template", () => {
    expect(buildFontHead('nope', { template: 'nope', id: 'inter' })).toBe('');
  });

  it("never emits a font-family declaration or a universal selector (icon fonts stay intact)", () => {
    for (const f of FONTS) {
      const head = buildFontHead('hera', { template: 'hera', id: f.id });
      expect(head).not.toMatch(/font-family/);
      expect(head).not.toMatch(/\*/);
    }
  });

  it("only contains allow-listed hrefs, even for hostile input", () => {
    const head = buildFontHead('hera', { template: 'hera', id: '"><script>alert(1)</script>' });
    expect(head).not.toContain('<script');
    expect(head).toContain('family=Geist');
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run in `server/`: `npx vitest run src/utils/fonts.test.ts`
Expected: FAIL, `Failed to resolve import "./fonts"`.

- [ ] **Step 4: Write the implementation**

Create `server/src/utils/fonts.ts`:

```ts
// Font registry for the PDF servers. The client has an identical copy in client/src/utils/fonts.ts
// (a client test fails if the two drift apart). Only ids from this list are ever turned into HTML.

export type FontId =
  | 'geist' | 'ibm-plex-sans' | 'ibm-plex-serif' | 'poppins' | 'lato' | 'montserrat'
  | 'lexend-deca' | 'dm-serif-text' | 'roboto-slab' | 'mozilla-headline'
  | 'inter' | 'source-sans-3' | 'roboto' | 'open-sans' | 'merriweather' | 'lora' | 'libre-baskerville'
  | 'dm-serif-text-cinzel';

export interface FontEntry {
  id: FontId;
  name: string;
  kind: 'sans' | 'serif' | 'pairing';
  /** CSS font-family value for document content. */
  bodyStack: string;
  /** CSS font-family value for the document name and section titles. Equals bodyStack for single fonts. */
  headingStack: string;
  googleHrefs: string[];
}

export interface SavedFont {
  template: string;
  id: FontId;
}

const GEIST = "'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const DM_SERIF_HREF = 'https://fonts.googleapis.com/css2?family=DM+Serif+Text:ital@0;1&display=swap';

export const FONTS: FontEntry[] = [
  { id: 'geist', name: 'Geist', kind: 'sans', bodyStack: GEIST, headingStack: GEIST, googleHrefs: ['https://fonts.googleapis.com/css2?family=Geist:wght@100..900&display=swap'] },
  { id: 'ibm-plex-sans', name: 'IBM Plex Sans', kind: 'sans', bodyStack: "'IBM Plex Sans', sans-serif", headingStack: "'IBM Plex Sans', sans-serif", googleHrefs: ['https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;1,100;1,200;1,300;1,400;1,500;1,600;1,700&display=swap'] },
  { id: 'ibm-plex-serif', name: 'IBM Plex Serif', kind: 'serif', bodyStack: "'IBM Plex Serif', serif", headingStack: "'IBM Plex Serif', serif", googleHrefs: ['https://fonts.googleapis.com/css2?family=IBM+Plex+Serif:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;1,100;1,200;1,300;1,400;1,500;1,600;1,700&display=swap'] },
  { id: 'poppins', name: 'Poppins', kind: 'sans', bodyStack: "'Poppins', Arial, sans-serif", headingStack: "'Poppins', Arial, sans-serif", googleHrefs: ['https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap'] },
  { id: 'lato', name: 'Lato', kind: 'sans', bodyStack: "'Lato', Arial, Helvetica, sans-serif", headingStack: "'Lato', Arial, Helvetica, sans-serif", googleHrefs: ['https://fonts.googleapis.com/css2?family=Lato:ital,wght@0,100;0,300;0,400;0,700;0,900;1,100;1,300;1,400;1,700;1,900&display=swap'] },
  { id: 'montserrat', name: 'Montserrat', kind: 'sans', bodyStack: "'Montserrat', sans-serif", headingStack: "'Montserrat', sans-serif", googleHrefs: ['https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,100..900;1,100..900&display=swap'] },
  { id: 'lexend-deca', name: 'Lexend Deca', kind: 'sans', bodyStack: "'Lexend Deca', Roboto, sans-serif", headingStack: "'Lexend Deca', Roboto, sans-serif", googleHrefs: ['https://fonts.googleapis.com/css2?family=Lexend+Deca:wght@100..900&display=swap'] },
  { id: 'dm-serif-text', name: 'DM Serif Text', kind: 'serif', bodyStack: "'DM Serif Text', Georgia, serif", headingStack: "'DM Serif Text', Georgia, serif", googleHrefs: [DM_SERIF_HREF] },
  { id: 'roboto-slab', name: 'Roboto Slab', kind: 'serif', bodyStack: "'Roboto Slab', serif", headingStack: "'Roboto Slab', serif", googleHrefs: ['https://fonts.googleapis.com/css2?family=Roboto+Slab:wght@100..900&display=swap'] },
  { id: 'mozilla-headline', name: 'Mozilla Headline', kind: 'sans', bodyStack: "'Mozilla Headline', sans-serif", headingStack: "'Mozilla Headline', sans-serif", googleHrefs: ['https://fonts.googleapis.com/css2?family=Mozilla+Headline:wght@200..700&display=swap'] },
  { id: 'inter', name: 'Inter', kind: 'sans', bodyStack: "'Inter', sans-serif", headingStack: "'Inter', sans-serif", googleHrefs: ['https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,100..900;1,100..900&display=swap'] },
  { id: 'source-sans-3', name: 'Source Sans 3', kind: 'sans', bodyStack: "'Source Sans 3', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", headingStack: "'Source Sans 3', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", googleHrefs: ['https://fonts.googleapis.com/css2?family=Source+Sans+3:ital,wght@0,200..900;1,200..900&display=swap'] },
  { id: 'roboto', name: 'Roboto', kind: 'sans', bodyStack: "'Roboto', sans-serif", headingStack: "'Roboto', sans-serif", googleHrefs: ['https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,100..900;1,100..900&display=swap'] },
  { id: 'open-sans', name: 'Open Sans', kind: 'sans', bodyStack: "'Open Sans', sans-serif", headingStack: "'Open Sans', sans-serif", googleHrefs: ['https://fonts.googleapis.com/css2?family=Open+Sans:ital,wght@0,300..800;1,300..800&display=swap'] },
  { id: 'merriweather', name: 'Merriweather', kind: 'serif', bodyStack: "'Merriweather', serif", headingStack: "'Merriweather', serif", googleHrefs: ['https://fonts.googleapis.com/css2?family=Merriweather:ital,wght@0,300..900;1,300..900&display=swap'] },
  { id: 'lora', name: 'Lora', kind: 'serif', bodyStack: "'Lora', serif", headingStack: "'Lora', serif", googleHrefs: ['https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400..700;1,400..700&display=swap'] },
  { id: 'libre-baskerville', name: 'Libre Baskerville', kind: 'serif', bodyStack: "'Libre Baskerville', serif", headingStack: "'Libre Baskerville', serif", googleHrefs: ['https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400..700;1,400..700&display=swap'] },
  { id: 'dm-serif-text-cinzel', name: 'DM Serif Text + Cinzel', kind: 'pairing', bodyStack: "'DM Serif Text', Georgia, serif", headingStack: "'Cinzel', serif", googleHrefs: [DM_SERIF_HREF, 'https://fonts.googleapis.com/css2?family=Cinzel:wght@400..900&display=swap'] },
];

export const TEMPLATE_DEFAULT_FONT: Record<string, FontId> = {
  // resume templates
  cigar: 'dm-serif-text',
  andromeda: 'ibm-plex-serif',
  comet: 'poppins',
  milky_way: 'lato',
  zeus: 'dm-serif-text-cinzel',
  athena: 'lexend-deca',
  apollo: 'poppins',
  artemis: 'source-sans-3',
  hermes: 'roboto-slab',
  hera: 'geist',
  // cover letter templates
  aether: 'montserrat',
  terra: 'poppins',
  aqua: 'mozilla-headline',
  ignis: 'geist',
  ventus: 'ibm-plex-sans',
};

export const getFont = (id: unknown): FontEntry | undefined => FONTS.find((f) => f.id === id);

/** True only for a well-formed choice that was made for this template and names a font in the registry. */
export function isUsableSavedFont(template: string, saved: unknown): saved is SavedFont {
  if (!saved || typeof saved !== 'object') return false;
  const s = saved as Record<string, unknown>;
  return s.template === template && getFont(s.id) !== undefined;
}

export function resolveFontId(template: string, saved?: unknown): FontId | undefined {
  if (isUsableSavedFont(template, saved)) return saved.id;
  return Object.prototype.hasOwnProperty.call(TEMPLATE_DEFAULT_FONT, template) ? TEMPLATE_DEFAULT_FONT[template] : undefined;
}

/**
 * HTML for the PDF page <head>: the Google Fonts <link>s for the resolved font and, only when the user has
 * a valid saved choice, a :root rule setting the two variables the template CSS reads. With no choice the
 * templates fall back to their built-in fonts, which the default font's links provide.
 */
export function buildFontHead(template: string, saved?: unknown): string {
  const font = getFont(resolveFontId(template, saved));
  if (!font) return '';
  const links = font.googleHrefs.map((href) => `<link href="${href}" rel="stylesheet">`).join('\n');
  if (!isUsableSavedFont(template, saved)) return links;
  return `${links}\n<style>:root{--doc-font:${font.bodyStack};--doc-heading-font:${font.headingStack};}</style>`;
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run in `server/`: `npx vitest run src/utils/fonts.test.ts`
Expected: PASS, all tests.

- [ ] **Step 6: Verify every Google Fonts href is valid**

Run from the repo root (needs internet):

```bash
grep -oE "https://fonts\.googleapis\.com/css2\?[^'\"]+" server/src/utils/fonts.ts | sort -u | while read -r u; do printf "%s  %s\n" "$(curl -s -o /dev/null -w '%{http_code}' "$u")" "$u"; done
```

Expected: every line starts with `200`. If any line shows `400`, that family's weight or italic axis is not available: open that family on fonts.google.com, copy the exact CSS2 URL it offers for the weights/italics listed there, and use it in the registry (here and, in Task 3, in the client copy). Re-run until every line is `200`.

- [ ] **Step 7: Type-check the server build**

Run in `server/`: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add server/package.json server/package-lock.json server/tsconfig.json server/vitest.config.ts server/src/utils/fonts.ts server/src/utils/fonts.test.ts
git commit -m "feat(server): add font registry and PDF head builder

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: PDF controllers use the font head

**Files:**
- Modify: `server/src/controllers/pdf.ts` (imports; the `const { html, template } = req.body;` line; the font `<link>` block)
- Modify: `server/src/controllers/cl-pdf.ts` (remove `FONT_CONFIGS`; destructuring; head; the forced `body, *` rule)
- Delete: `server/src/utils/pdfGenerator.ts`

**Interfaces:**
- Consumes: `buildFontHead(template: string, saved?: unknown): string` from `server/src/utils/fonts.ts` (Task 1).
- Produces: PDF HTML whose `<head>` carries the font links and, with a valid saved choice, the `:root` variables.

- [ ] **Step 1: Delete the unused duplicate**

Confirm nothing imports it, then delete it:

```bash
grep -rn "pdfGenerator" server/src client/src
git rm server/src/utils/pdfGenerator.ts
```

Expected: the grep prints nothing before the delete.

- [ ] **Step 2: Update `pdf.ts`**

Add the import after the existing imports:

```ts
import { buildFontHead } from "../utils/fonts";
```

Change the request destructuring (line 11) from `const { html, template } = req.body;` to:

```ts
    const { html, template, data } = req.body;
```

Replace the nine template-specific `<link>` lines (from `${template === 'andromeda' ? …` through `${template === 'hera' ? …`) with the single line:

```ts
          ${buildFontHead(String(template), data?.fontFamily)}
```

Leave the `preconnect` links, the Tailwind and Font Awesome links, and the reset `<style>` untouched. `template` is still used later for `min_buffer`.

- [ ] **Step 3: Update `cl-pdf.ts`**

Add the import after the existing imports:

```ts
import { buildFontHead } from "../utils/fonts";
```

Delete the whole block from the comment `// Centralized font configuration per template for clean extensibility` through the closing `};` of `FONT_CONFIGS` (lines 6 to 32), including `type FontConfig`.

Change the request destructuring and remove the now-unused `fontConfig` line. Replace:

```ts
    const { html, template } = req.body;
    const fontConfig = FONT_CONFIGS[String(template)];
```

with:

```ts
    const { html, template, data } = req.body;
```

Replace `${fontConfig ? fontConfig.link : ''}` with:

```ts
          ${buildFontHead(String(template), data?.fontFamily)}
```

Delete the forced-font rule from the `<style>` block, i.e. remove these lines (the template CSS and `:root` variables now do this job, and a `body, *` rule would also override icon fonts):

```ts
            
            /* Apply template-specific fonts */
            ${fontConfig ? `
            body, * {
              font-family: ${fontConfig.family} !important;
            }
            ` : ''}
```

The `<style>` block keeps only the margin/padding/box-sizing reset.

- [ ] **Step 4: Type-check and test**

Run in `server/`:

```bash
npx tsc --noEmit
npx vitest run
```

Expected: no type errors; all tests pass.

- [ ] **Step 5: Smoke-test the generated HTML head**

Run in `server/` (prints the head the controllers will now emit):

```bash
npx ts-node -e "import { buildFontHead } from './src/utils/fonts'; console.log(buildFontHead('ventus')); console.log('---'); console.log(buildFontHead('zeus', { template: 'zeus', id: 'inter' }));"
```

Expected: first block is one `<link>` for IBM Plex Sans; second block is one Inter `<link>` plus a `<style>:root{--doc-font:'Inter', sans-serif;--doc-heading-font:'Inter', sans-serif;}</style>`.

- [ ] **Step 6: Commit**

```bash
git add server/src/controllers/pdf.ts server/src/controllers/cl-pdf.ts
git commit -m "feat(server): load fonts from the registry in resume and cover letter PDFs

Replaces the per-template font link ladders and the forced cover letter
font rule. Removes the unused utils/pdfGenerator.ts duplicate.

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Client font registry and parity test

**Files:**
- Create: `client/src/utils/fonts.ts`
- Create: `client/src/utils/fonts.test.ts`
- Create: `client/src/utils/fonts.parity.test.ts`

**Interfaces:**
- Consumes: `TemplateType`, `CLTemplateType` from `@/types`; `server/src/utils/fonts.ts` (parity test only).
- Produces (used by Tasks 5 to 7): `FontId`, `DocTemplate`, `FontEntry`, `SavedFont`, `FONTS`, `TEMPLATE_DEFAULT_FONT`, `getFont(id: unknown): FontEntry | undefined`, `isUsableSavedFont(template: DocTemplate, saved: unknown): saved is SavedFont`, `resolveFontId(template: DocTemplate, saved?: unknown): FontId`, `chooseFont(template: DocTemplate, id: FontId): SavedFont`.

- [ ] **Step 1: Write the failing tests**

Create `client/src/utils/fonts.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { FONTS, TEMPLATE_DEFAULT_FONT, chooseFont, getFont, isUsableSavedFont, resolveFontId } from "./fonts";

describe("client font registry", () => {
  it("has 18 entries with unique ids, including exactly one pairing", () => {
    expect(FONTS).toHaveLength(18);
    expect(new Set(FONTS.map((f) => f.id)).size).toBe(18);
    expect(FONTS.filter((f) => f.kind === 'pairing').map((f) => f.id)).toEqual(['dm-serif-text-cinzel']);
  });

  it("every template default exists in the registry", () => {
    Object.entries(TEMPLATE_DEFAULT_FONT).forEach(([template, id]) => {
      expect(getFont(id), template).toBeDefined();
    });
    expect(Object.keys(TEMPLATE_DEFAULT_FONT)).toHaveLength(15);
  });

  it("matches the confirmed defaults", () => {
    expect(TEMPLATE_DEFAULT_FONT.hermes).toBe('roboto-slab');
    expect(TEMPLATE_DEFAULT_FONT.artemis).toBe('source-sans-3');
    expect(TEMPLATE_DEFAULT_FONT.zeus).toBe('dm-serif-text-cinzel');
    expect(TEMPLATE_DEFAULT_FONT.ventus).toBe('ibm-plex-sans');
  });

  it("resolveFontId follows the saved choice only for the same template and a known id", () => {
    expect(resolveFontId('athena')).toBe('lexend-deca');
    expect(resolveFontId('athena', { template: 'athena', id: 'lora' })).toBe('lora');
    expect(resolveFontId('athena', { template: 'zeus', id: 'lora' })).toBe('lexend-deca');
    expect(resolveFontId('athena', { template: 'athena', id: 'ubuntu' })).toBe('lexend-deca');
    expect(resolveFontId('athena', 'lora')).toBe('lexend-deca');
    expect(resolveFontId('athena', null)).toBe('lexend-deca');
  });

  it("isUsableSavedFont rejects malformed values", () => {
    expect(isUsableSavedFont('athena', { template: 'athena', id: 'lora' })).toBe(true);
    expect(isUsableSavedFont('athena', {})).toBe(false);
    expect(isUsableSavedFont('athena', [])).toBe(false);
    expect(isUsableSavedFont('athena', undefined)).toBe(false);
  });

  it("chooseFont records the template the choice was made for", () => {
    expect(chooseFont('zeus', 'inter')).toEqual({ template: 'zeus', id: 'inter' });
  });
});
```

Create `client/src/utils/fonts.parity.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import * as client from "./fonts";
import * as server from "../../../server/src/utils/fonts";

// The PDF server and the client each carry the registry (separate packages). They must stay identical.
describe("client/server font registry parity", () => {
  it("has identical fonts", () => {
    expect(client.FONTS).toEqual(server.FONTS);
  });

  it("has identical template defaults", () => {
    expect(client.TEMPLATE_DEFAULT_FONT).toEqual(server.TEMPLATE_DEFAULT_FONT);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run in `client/`: `npx vitest run src/utils/fonts`
Expected: FAIL, `Failed to resolve import "./fonts"`.

- [ ] **Step 3: Write the implementation**

Create `client/src/utils/fonts.ts`:

```ts
import type { CLTemplateType, TemplateType } from "@/types";

// Font registry. The PDF server has an identical copy in server/src/utils/fonts.ts
// (fonts.parity.test.ts fails if the two drift apart).

export type FontId =
  | 'geist' | 'ibm-plex-sans' | 'ibm-plex-serif' | 'poppins' | 'lato' | 'montserrat'
  | 'lexend-deca' | 'dm-serif-text' | 'roboto-slab' | 'mozilla-headline'
  | 'inter' | 'source-sans-3' | 'roboto' | 'open-sans' | 'merriweather' | 'lora' | 'libre-baskerville'
  | 'dm-serif-text-cinzel';

export type DocTemplate = TemplateType | CLTemplateType;

export interface FontEntry {
  id: FontId;
  name: string;
  kind: 'sans' | 'serif' | 'pairing';
  /** CSS font-family value for document content. */
  bodyStack: string;
  /** CSS font-family value for the document name and section titles. Equals bodyStack for single fonts. */
  headingStack: string;
  googleHrefs: string[];
}

/** What is stored in the document JSON as `fontFamily`. */
export interface SavedFont {
  template: DocTemplate;
  id: FontId;
}

const GEIST = "'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const DM_SERIF_HREF = 'https://fonts.googleapis.com/css2?family=DM+Serif+Text:ital@0;1&display=swap';

export const FONTS: FontEntry[] = [
  { id: 'geist', name: 'Geist', kind: 'sans', bodyStack: GEIST, headingStack: GEIST, googleHrefs: ['https://fonts.googleapis.com/css2?family=Geist:wght@100..900&display=swap'] },
  { id: 'ibm-plex-sans', name: 'IBM Plex Sans', kind: 'sans', bodyStack: "'IBM Plex Sans', sans-serif", headingStack: "'IBM Plex Sans', sans-serif", googleHrefs: ['https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;1,100;1,200;1,300;1,400;1,500;1,600;1,700&display=swap'] },
  { id: 'ibm-plex-serif', name: 'IBM Plex Serif', kind: 'serif', bodyStack: "'IBM Plex Serif', serif", headingStack: "'IBM Plex Serif', serif", googleHrefs: ['https://fonts.googleapis.com/css2?family=IBM+Plex+Serif:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;1,100;1,200;1,300;1,400;1,500;1,600;1,700&display=swap'] },
  { id: 'poppins', name: 'Poppins', kind: 'sans', bodyStack: "'Poppins', Arial, sans-serif", headingStack: "'Poppins', Arial, sans-serif", googleHrefs: ['https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap'] },
  { id: 'lato', name: 'Lato', kind: 'sans', bodyStack: "'Lato', Arial, Helvetica, sans-serif", headingStack: "'Lato', Arial, Helvetica, sans-serif", googleHrefs: ['https://fonts.googleapis.com/css2?family=Lato:ital,wght@0,100;0,300;0,400;0,700;0,900;1,100;1,300;1,400;1,700;1,900&display=swap'] },
  { id: 'montserrat', name: 'Montserrat', kind: 'sans', bodyStack: "'Montserrat', sans-serif", headingStack: "'Montserrat', sans-serif", googleHrefs: ['https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,100..900;1,100..900&display=swap'] },
  { id: 'lexend-deca', name: 'Lexend Deca', kind: 'sans', bodyStack: "'Lexend Deca', Roboto, sans-serif", headingStack: "'Lexend Deca', Roboto, sans-serif", googleHrefs: ['https://fonts.googleapis.com/css2?family=Lexend+Deca:wght@100..900&display=swap'] },
  { id: 'dm-serif-text', name: 'DM Serif Text', kind: 'serif', bodyStack: "'DM Serif Text', Georgia, serif", headingStack: "'DM Serif Text', Georgia, serif", googleHrefs: [DM_SERIF_HREF] },
  { id: 'roboto-slab', name: 'Roboto Slab', kind: 'serif', bodyStack: "'Roboto Slab', serif", headingStack: "'Roboto Slab', serif", googleHrefs: ['https://fonts.googleapis.com/css2?family=Roboto+Slab:wght@100..900&display=swap'] },
  { id: 'mozilla-headline', name: 'Mozilla Headline', kind: 'sans', bodyStack: "'Mozilla Headline', sans-serif", headingStack: "'Mozilla Headline', sans-serif", googleHrefs: ['https://fonts.googleapis.com/css2?family=Mozilla+Headline:wght@200..700&display=swap'] },
  { id: 'inter', name: 'Inter', kind: 'sans', bodyStack: "'Inter', sans-serif", headingStack: "'Inter', sans-serif", googleHrefs: ['https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,100..900;1,100..900&display=swap'] },
  { id: 'source-sans-3', name: 'Source Sans 3', kind: 'sans', bodyStack: "'Source Sans 3', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", headingStack: "'Source Sans 3', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", googleHrefs: ['https://fonts.googleapis.com/css2?family=Source+Sans+3:ital,wght@0,200..900;1,200..900&display=swap'] },
  { id: 'roboto', name: 'Roboto', kind: 'sans', bodyStack: "'Roboto', sans-serif", headingStack: "'Roboto', sans-serif", googleHrefs: ['https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,100..900;1,100..900&display=swap'] },
  { id: 'open-sans', name: 'Open Sans', kind: 'sans', bodyStack: "'Open Sans', sans-serif", headingStack: "'Open Sans', sans-serif", googleHrefs: ['https://fonts.googleapis.com/css2?family=Open+Sans:ital,wght@0,300..800;1,300..800&display=swap'] },
  { id: 'merriweather', name: 'Merriweather', kind: 'serif', bodyStack: "'Merriweather', serif", headingStack: "'Merriweather', serif", googleHrefs: ['https://fonts.googleapis.com/css2?family=Merriweather:ital,wght@0,300..900;1,300..900&display=swap'] },
  { id: 'lora', name: 'Lora', kind: 'serif', bodyStack: "'Lora', serif", headingStack: "'Lora', serif", googleHrefs: ['https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400..700;1,400..700&display=swap'] },
  { id: 'libre-baskerville', name: 'Libre Baskerville', kind: 'serif', bodyStack: "'Libre Baskerville', serif", headingStack: "'Libre Baskerville', serif", googleHrefs: ['https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400..700;1,400..700&display=swap'] },
  { id: 'dm-serif-text-cinzel', name: 'DM Serif Text + Cinzel', kind: 'pairing', bodyStack: "'DM Serif Text', Georgia, serif", headingStack: "'Cinzel', serif", googleHrefs: [DM_SERIF_HREF, 'https://fonts.googleapis.com/css2?family=Cinzel:wght@400..900&display=swap'] },
];

export const TEMPLATE_DEFAULT_FONT: Record<DocTemplate, FontId> = {
  // resume templates
  cigar: 'dm-serif-text',
  andromeda: 'ibm-plex-serif',
  comet: 'poppins',
  milky_way: 'lato',
  zeus: 'dm-serif-text-cinzel',
  athena: 'lexend-deca',
  apollo: 'poppins',
  artemis: 'source-sans-3',
  hermes: 'roboto-slab',
  hera: 'geist',
  // cover letter templates
  aether: 'montserrat',
  terra: 'poppins',
  aqua: 'mozilla-headline',
  ignis: 'geist',
  ventus: 'ibm-plex-sans',
};

export const getFont = (id: unknown): FontEntry | undefined => FONTS.find((f) => f.id === id);

/** True only for a well-formed choice that was made for this template and names a font in the registry. */
export function isUsableSavedFont(template: DocTemplate, saved: unknown): saved is SavedFont {
  if (!saved || typeof saved !== 'object') return false;
  const s = saved as Record<string, unknown>;
  return s.template === template && getFont(s.id) !== undefined;
}

export function resolveFontId(template: DocTemplate, saved?: unknown): FontId {
  return isUsableSavedFont(template, saved) ? saved.id : TEMPLATE_DEFAULT_FONT[template];
}

export const chooseFont = (template: DocTemplate, id: FontId): SavedFont => ({ template, id });
```

If the server hrefs were corrected in Task 1 step 6, make the same corrections here so the parity test passes.

- [ ] **Step 4: Run to verify pass**

Run in `client/`: `npx vitest run src/utils/fonts`
Expected: PASS for both files (the parity test proves both registries are identical).

If `npx tsc -b` later rejects the parity test's import of a file outside `client/src`, change the parity test's server import to `const server = await import("../../../server/src/utils/fonts");` inside each `it` (made `async`) and keep the assertions.

- [ ] **Step 5: Commit**

```bash
git add client/src/utils/fonts.ts client/src/utils/fonts.test.ts client/src/utils/fonts.parity.test.ts
git commit -m "feat(client): add font registry with client/server parity test

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Template CSS reads the font variables

**Files:**
- Create (temporary, deleted before the commit): `client/scripts/migrate-font-vars.mjs`, `client/scripts/verify-font-vars.mjs`
- Create: `client/src/styles/template-fonts.test.ts`
- Modify: the 15 CSS files under `client/src/styles/templates/{galaxy,greek}/` and `client/src/styles/cover-letter/templates/elements/`
- Modify: `client/src/styles/templates/galaxy/andromeda.css` (remove its `@import`)
- Modify: `client/src/components/templates/__snapshots__/templates.snapshot.test.tsx.snap` (regenerated)

**Interfaces:**
- Produces: every template CSS reads `--doc-font` (body) and `--doc-heading-font` (name and section titles) with the old font as the fallback. Consumed by the PDF head from Task 1.

- [ ] **Step 1: Write the failing guard test**

Create `client/src/styles/template-fonts.test.ts`:

```ts
/// <reference types="node" />
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = path.dirname(fileURLToPath(import.meta.url));

const cssFiles = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? cssFiles(path.join(dir, e.name)) : e.name.endsWith(".css") ? [path.join(dir, e.name)] : [],
  );

const files = [...cssFiles(path.join(here, "templates")), ...cssFiles(path.join(here, "cover-letter", "templates"))];

describe("template CSS font variables", () => {
  it("finds the 15 resume and cover letter template stylesheets", () => {
    expect(files).toHaveLength(15);
  });

  files.forEach((file) => {
    const name = path.relative(here, file).split(path.sep).join("/");
    const css = fs.readFileSync(file, "utf8");

    it(`${name}: every font-family goes through a document font variable`, () => {
      const decls = css.match(/font-family\s*:[^;{}]+;/g) ?? [];
      expect(decls.length).toBeGreaterThan(0);
      decls.forEach((d) => expect(d).toMatch(/var\(--doc-(heading-)?font/));
    });

    it(`${name}: styles a heading role`, () => {
      expect(css).toContain("--doc-heading-font");
    });

    it(`${name}: does not mention Ubuntu or import remote CSS`, () => {
      expect(css).not.toMatch(/ubuntu/i);
      expect(css).not.toMatch(/@import/);
    });
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run in `client/`: `npx vitest run src/styles/template-fonts.test.ts`
Expected: FAIL (raw `font-family` declarations, Ubuntu in hermes and artemis, the `@import` in andromeda).

- [ ] **Step 3: Create the migration script**

Create `client/scripts/migrate-font-vars.mjs`:

```js
import fs from 'node:fs';
import path from 'node:path';

// Usage (from client/): node scripts/migrate-font-vars.mjs src/styles
// Rewrites each template stylesheet so fonts come from --doc-font / --doc-heading-font,
// keeping the old font as the fallback. Heading rules (document name, section titles) get the heading variable.
const root = process.argv[2];
const CONFIG = {
  'templates/galaxy/cigar.css': ['.classic-name', '.classic-section-title'],
  'templates/galaxy/andromeda.css': ['.name', '.section-title'],
  'templates/galaxy/comet.css': ['.comet-name', '.comet-section-title'],
  'templates/galaxy/milky_way.css': ['.mw-name', '.mw-section-title'],
  'templates/greek/zeus.css': ['.greek-name', '.greek-headline', '.greek-section-title', '.greek-item-header'],
  'templates/greek/athena.css': ['.sidebar-name', '.sidebar-section-title', '.main-section-title'],
  'templates/greek/apollo.css': ['.resume-header-name', '.sidebar-section-title', '.main-section-title'],
  'templates/greek/artemis.css': ['.resume-header-name', '.main-section-title', '.sidebar-section-title'],
  'templates/greek/hermes.css': ['.resume-name', '.section-title'],
  'templates/greek/hera.css': ['.classic-name', '.classic-section-title'],
  'cover-letter/templates/elements/aether.css': ['.sender-name'],
  'cover-letter/templates/elements/aqua.css': ['.sender-name'],
  'cover-letter/templates/elements/ignis.css': ['.sender-name'],
  'cover-letter/templates/elements/terra.css': ['.sender-name'],
  'cover-letter/templates/elements/ventus.css': ['.sender-name'],
};
// Ubuntu is removed from the product: these two files get their new default as the fallback stack.
const STACK_OVERRIDE = {
  'templates/greek/hermes.css': "'Roboto Slab', serif",
  'templates/greek/artemis.css': "'Source Sans 3', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

const FF = /font-family\s*:\s*([^;{}]+?)(\s*!important)?\s*;/;

function mediaRanges(css) {
  const ranges = [];
  const re = /@media[^{]*\{/g;
  let m;
  while ((m = re.exec(css))) {
    let depth = 1, i = re.lastIndex;
    while (i < css.length && depth > 0) { if (css[i] === '{') depth++; else if (css[i] === '}') depth--; i++; }
    ranges.push([m.index, i]);
  }
  return ranges;
}

let problems = 0;
for (const [rel, headings] of Object.entries(CONFIG)) {
  const file = path.join(root, rel);
  const css = fs.readFileSync(file, 'utf8');
  const media = mediaRanges(css);
  const seen = new Set();
  const out = css.replace(/([^{}]+)\{([^{}]*)\}/g, (all, rawSel, body, offset) => {
    if (rawSel.trim().startsWith('@')) return all;
    const sels = rawSel.replace(/\/\*[\s\S]*?\*\//g, '').split(',').map((s) => s.trim());
    const hit = sels.find((s) => headings.includes(s));
    const inMedia = media.some(([a, b]) => offset > a && offset < b);
    let nb = body;
    if (hit) {
      seen.add(hit);
      if (FF.test(nb)) {
        nb = nb.replace(FF, (_, stack, imp = '') => `font-family: var(--doc-heading-font, var(--doc-font, ${STACK_OVERRIDE[rel] ?? stack.trim()}))${imp};`);
      } else if (!inMedia) {
        const imp = nb.includes('!important') ? ' !important' : '';
        nb = nb.replace(/\s*$/, '') + `\n  font-family: var(--doc-heading-font, inherit)${imp};\n`;
      }
    } else if (FF.test(nb) && !nb.includes('--doc-')) {
      nb = nb.replace(FF, (_, stack, imp = '') => `font-family: var(--doc-font, ${STACK_OVERRIDE[rel] && /ubuntu/i.test(stack) ? STACK_OVERRIDE[rel] : stack.trim()})${imp};`);
    }
    return `${rawSel}{${nb}}`;
  });
  for (const h of headings) if (!seen.has(h)) { console.error(`MISSING heading selector ${h} in ${rel}`); problems++; }
  fs.writeFileSync(file, out);
}
if (problems) process.exit(1);
console.log('ok');
```

Create `client/scripts/verify-font-vars.mjs`:

```js
import fs from 'node:fs';
import path from 'node:path';

// Usage: node scripts/verify-font-vars.mjs <migratedStylesDir> <originalStylesDir>
// Undoes the variable wrappers and checks the result equals the original CSS
// (Hermes and Artemis excepted for the stack itself, which intentionally changes).
const [migratedRoot, originalRoot] = process.argv.slice(2);
const NEW_STACK_FILES = new Set(['templates/greek/hermes.css', 'templates/greek/artemis.css']);
let bad = 0;

const walk = (d) =>
  fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
const norm = (s) => s.replace(/\r\n/g, '\n').replace(/[ \t]+$/gm, '').replace(/\n+$/g, '');

for (const f of walk(migratedRoot).filter((p) => p.endsWith('.css'))) {
  const rel = path.relative(migratedRoot, f).split(path.sep).join('/');
  if (!/^(templates|cover-letter\/templates)\//.test(rel)) continue;
  const orig = path.join(originalRoot, rel);
  if (!fs.existsSync(orig)) continue;
  let a = fs.readFileSync(f, 'utf8');
  a = a.replace(/\n  font-family: var\(--doc-heading-font, inherit\)( !important)?;\n/g, '\n');
  a = a.replace(/var\(--doc-heading-font, var\(--doc-font, ([^()]*)\)\)/g, '$1').replace(/var\(--doc-font, ([^()]*)\)/g, '$1');
  let b = fs.readFileSync(orig, 'utf8');
  if (NEW_STACK_FILES.has(rel)) {
    a = a.replace(/('Roboto Slab'|'Source Sans 3')[^;!]*?(?=\s*(!important|;))/g, 'STACK');
    b = b.replace(/'Ubuntu'[^;!]*?(?=\s*(!important|;))/g, 'STACK');
  }
  if (norm(a) !== norm(b)) {
    bad++;
    console.error('NOT LOSSLESS:', rel);
  }
}
console.log(bad ? `${bad} file(s) differ` : 'lossless');
process.exit(bad ? 1 : 0);
```

- [ ] **Step 4: Snapshot the originals, run the migration, verify it is lossless**

Run in `client/`:

```bash
rm -rf ../.font-orig && cp -r src/styles ../.font-orig
node scripts/migrate-font-vars.mjs src/styles
node scripts/verify-font-vars.mjs src/styles ../.font-orig
```

Expected: `ok` from the migration and `lossless` from the verifier. If the migration prints `MISSING heading selector …`, open that CSS file, find the rule for the document name or section title (compare with the template's `.tsx`), correct the selector in `CONFIG`, restore with `rm -rf src/styles && cp -r ../.font-orig src/styles`, and re-run from the start of this step.

- [ ] **Step 5: Remove Andromeda's remote `@import` and clean up**

Open `client/src/styles/templates/galaxy/andromeda.css` and delete its first line (the `@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Serif…');` line); the PDF server now loads the font. Then remove the helpers:

```bash
rm -rf ../.font-orig scripts/migrate-font-vars.mjs scripts/verify-font-vars.mjs
rmdir scripts 2>/dev/null || true
```

- [ ] **Step 6: Run the guard test**

Run in `client/`: `npx vitest run src/styles/template-fonts.test.ts`
Expected: PASS for all 15 files (45 tests plus the count test).

- [ ] **Step 7: Regenerate the template snapshots and run the whole client suite**

The snapshots embed each template's CSS, so they change by design (only `font-family` lines, as the lossless check just proved).

```bash
npx vitest run -u src/components/templates
npx vitest run
```

Expected: the second command passes everything. Run `git diff --stat` and confirm the only changed non-CSS file is `templates.snapshot.test.tsx.snap`.

- [ ] **Step 8: Commit**

```bash
git add client/src/styles client/src/components/templates/__snapshots__
git commit -m "feat(client): drive template fonts from --doc-font and --doc-heading-font

Every template keeps its old font as the fallback. Hermes now defaults to
Roboto Slab and Artemis to Source Sans 3 (Ubuntu removed).

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Saved-font types and the FontPicker component

**Files:**
- Modify: `client/src/types/interface.resume-form-data.ts` (add `fontFamily`)
- Modify: `client/src/types/interface.cl-form-data.ts` (add `fontFamily`)
- Create: `client/src/components/FontPicker.tsx`
- Create: `client/src/components/FontPicker.test.tsx`

**Interfaces:**
- Consumes: `FONTS`, `TEMPLATE_DEFAULT_FONT`, `resolveFontId`, `isUsableSavedFont`, `chooseFont`, `DocTemplate`, `FontId`, `SavedFont` from `@/utils/fonts` (Task 3).
- Produces: `<FontPicker template saved onChange isDarkMode disabled />` where `saved?: SavedFont` and `onChange(next: SavedFont | undefined)`; and the pure `<FontList activeId defaultId canReset isDarkMode onPick onReset />`.

- [ ] **Step 1: Add the data fields**

In `client/src/types/interface.resume-form-data.ts`, add the import at the top next to the existing `SectionLayout` import:

```ts
import type { SavedFont } from "@/utils/fonts";
```

and add after `sectionLayout?: SectionLayout;`:

```ts
  fontFamily?: SavedFont;
```

In `client/src/types/interface.cl-form-data.ts`, add at the very top:

```ts
import type { SavedFont } from "@/utils/fonts";

```

and add to the end of the `CLFormData` interface, after the `content` block:

```ts
  fontFamily?: SavedFont;
```

- [ ] **Step 2: Write the failing test**

Create `client/src/components/FontPicker.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import type { ComponentProps } from "react";
import { renderToString } from "react-dom/server";
import { FontList } from "@/components/FontPicker";
import { FONTS } from "@/utils/fonts";

const render = (over: Partial<ComponentProps<typeof FontList>> = {}) =>
  renderToString(
    <FontList activeId="lexend-deca" defaultId="lexend-deca" canReset={false} isDarkMode={false} onPick={() => {}} onReset={() => {}} {...over} />,
  );

describe("FontList", () => {
  it("lists every registry entry", () => {
    const html = render();
    FONTS.forEach((f) => expect(html).toContain(f.name));
  });

  it("groups the entries as Sans, Serif and Pairings", () => {
    const html = render();
    expect(html.indexOf('Sans')).toBeLessThan(html.indexOf('Serif'));
    expect(html).toContain('Pairings');
  });

  it("marks exactly one entry active", () => {
    const html = render({ activeId: 'inter' });
    expect(html.match(/aria-selected="true"/g)).toHaveLength(1);
  });

  it("badges only the template default", () => {
    const html = render({ defaultId: 'geist' });
    expect(html.match(/Template default/g)).toHaveLength(1);
  });

  it("shows the pairing's heading and body fonts", () => {
    const html = render();
    expect(html).toContain('Cinzel');
    expect(html).toContain('DM Serif Text');
  });

  it("offers reset only when there is a saved choice", () => {
    expect(render({ canReset: false })).not.toContain('Reset to template default');
    expect(render({ canReset: true })).toContain('Reset to template default');
  });
});
```

- [ ] **Step 3: Run to verify failure**

Run in `client/`: `npx vitest run src/components/FontPicker.test.tsx`
Expected: FAIL, `Failed to resolve import "@/components/FontPicker"`.

- [ ] **Step 4: Write the component**

Create `client/src/components/FontPicker.tsx`:

```tsx
import React, { useEffect, useState } from "react";
import { Check, RotateCcw, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  FONTS,
  TEMPLATE_DEFAULT_FONT,
  chooseFont,
  isUsableSavedFont,
  resolveFontId,
  type DocTemplate,
  type FontEntry,
  type FontId,
  type SavedFont,
} from "@/utils/fonts";

// The picker previews every font in its own typeface; load them only once the popover is first opened.
let pickerFontsRequested = false;
const ensurePickerFontsLoaded = () => {
  if (pickerFontsRequested || typeof document === "undefined") return;
  pickerFontsRequested = true;
  new Set(FONTS.flatMap((f) => f.googleHrefs)).forEach((href) => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
  });
};

const GROUPS: Array<{ label: string; kind: FontEntry["kind"] }> = [
  { label: "Sans", kind: "sans" },
  { label: "Serif", kind: "serif" },
  { label: "Pairings", kind: "pairing" },
];

interface FontListProps {
  activeId: FontId;
  defaultId: FontId;
  canReset: boolean;
  isDarkMode: boolean;
  onPick: (id: FontId) => void;
  onReset: () => void;
}

export const FontList: React.FC<FontListProps> = ({ activeId, defaultId, canReset, isDarkMode, onPick, onReset }) => (
  <div className="max-h-80 overflow-y-auto" role="listbox" aria-label="Fonts">
    {GROUPS.map((group) => (
      <div key={group.kind}>
        <p className={`px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
          {group.label}
        </p>
        {FONTS.filter((f) => f.kind === group.kind).map((font) => {
          const active = font.id === activeId;
          return (
            <button
              key={font.id}
              type="button"
              role="option"
              aria-selected={active}
              onClick={() => onPick(font.id)}
              className={`flex w-full items-start gap-2 px-3 py-2 text-left transition-colors ${
                isDarkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"
              } ${active ? (isDarkMode ? "bg-gray-700" : "bg-indigo-50") : ""}`}
            >
              <span className="mt-1 h-4 w-4 shrink-0">{active && <Check className="h-4 w-4 text-indigo-500" />}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-base" style={{ fontFamily: font.headingStack }}>
                  {font.name}
                </span>
                {font.kind === "pairing" && (
                  <span className="block truncate text-xs opacity-70" style={{ fontFamily: font.bodyStack }}>
                    Cinzel headings · DM Serif Text body
                  </span>
                )}
              </span>
              {font.id === defaultId && (
                <span className={`mt-1 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${isDarkMode ? "bg-gray-600 text-gray-200" : "bg-gray-200 text-gray-700"}`}>
                  Template default
                </span>
              )}
            </button>
          );
        })}
      </div>
    ))}
    {canReset && (
      <button
        type="button"
        onClick={onReset}
        className={`mt-1 flex w-full items-center gap-2 border-t px-3 py-2 text-sm ${
          isDarkMode ? "border-gray-600 hover:bg-gray-700" : "border-gray-200 hover:bg-gray-100"
        }`}
      >
        <RotateCcw className="h-4 w-4" />
        Reset to template default
      </button>
    )}
  </div>
);

interface FontPickerProps {
  template: DocTemplate;
  saved?: SavedFont;
  onChange: (next: SavedFont | undefined) => void;
  isDarkMode: boolean;
  disabled?: boolean;
}

const FontPicker: React.FC<FontPickerProps> = ({ template, saved, onChange, isDarkMode, disabled }) => {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (open) ensurePickerFontsLoaded();
  }, [open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                aria-label="Font"
                disabled={disabled}
                className={`
                  ${isDarkMode
                    ? "border-gray-600 hover:bg-gray-700 text-gray-300 hover:text-white"
                    : "border-gray-300 hover:bg-gray-50 text-gray-700 hover:text-gray-900"}
                  ${open ? "ring-2 ring-indigo-500" : ""}
                  transition-all duration-200 hover:scale-105
                `}
              >
                <Type className="w-4 h-4" />
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>Font</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <PopoverContent align="end" className={`w-72 p-0 ${isDarkMode ? "bg-gray-800 text-gray-100 border-gray-600" : ""}`}>
        <FontList
          activeId={resolveFontId(template, saved)}
          defaultId={TEMPLATE_DEFAULT_FONT[template]}
          canReset={isUsableSavedFont(template, saved)}
          isDarkMode={isDarkMode}
          onPick={(id) => onChange(chooseFont(template, id))}
          onReset={() => onChange(undefined)}
        />
      </PopoverContent>
    </Popover>
  );
};

export default FontPicker;
```

- [ ] **Step 5: Run to verify pass**

Run in `client/`: `npx vitest run src/components/FontPicker.test.tsx`
Expected: PASS. (If the "Sans before Serif" assertion trips on the word "Sans" appearing inside a font name such as "IBM Plex Sans", change the test to compare `html.indexOf('>Sans<')` with `html.indexOf('>Serif<')`.)

- [ ] **Step 6: Type-check**

Run in `client/`: `npx tsc -b`
Expected: no errors (this also confirms the parity test's cross-package import compiles; see Task 3 step 4 for the fallback if it does not).

- [ ] **Step 7: Commit**

```bash
git add client/src/types client/src/components/FontPicker.tsx client/src/components/FontPicker.test.tsx
git commit -m "feat(client): add FontPicker and fontFamily on resume and cover letter data

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Wire the picker into the resume Preview page

**Files:**
- Modify: `client/src/pages/Preview.tsx`

**Interfaces:**
- Consumes: `FontPicker` (Task 5), `SavedFont` (Task 3), `ResumeFormData.fontFamily` (Task 5).
- Produces: the resume `fontFamily` is loaded from saved data, attached on every save/regenerate/export, and changeable from the header.

All line numbers below refer to the file before this task's edits.

- [ ] **Step 1: Imports**

Next to the existing `import SectionOrderPanel from '@/components/SectionOrderPanel';` (line 43) add:

```tsx
import FontPicker from '@/components/FontPicker';
import type { SavedFont } from '@/utils/fonts';
```

- [ ] **Step 2: State and ref**

After the `sectionLayoutRef` declaration (line 84) add:

```tsx
  const [fontFamily, setFontFamily] = useState<SavedFont | undefined>(undefined);
  const fontFamilyRef = useRef<SavedFont | undefined>(undefined);
```

- [ ] **Step 3: Load the saved choice**

In `fetchResumeData`, directly after `setSectionLayout(initialLayout);` (line 168) add:

```tsx
          fontFamilyRef.current = parsedData.fontFamily;
          setFontFamily(parsedData.fontFamily);
```

- [ ] **Step 4: Attach it on every save and render**

In `handleFormSubmit` change line 288:

```tsx
    const data: ResumeFormData = { ...formData, sectionLayout: sectionLayoutRef.current };
```

to:

```tsx
    const data: ResumeFormData = { ...formData, sectionLayout: sectionLayoutRef.current, fontFamily: fontFamilyRef.current };
```

(also update the comment above it to read `// the layout and font live outside the form; always attach the current ones (undefined is dropped from the JSON)`).

- [ ] **Step 5: Share the debounce between layout and font changes**

Replace `handleLayoutChange` (lines 317 to 325) with:

```tsx
  // each change is a server-side PDF render: wait for the user to stop before saving and regenerating
  const queueRegenerate = () => {
    clearTimeout(layoutTimerRef.current);
    layoutTimerRef.current = setTimeout(() => {
      layoutTimerRef.current = undefined;
      if (resumeDataRef.current) void handleFormSubmitRef.current(resumeDataRef.current);
    }, LAYOUT_DEBOUNCE_MS);
  };

  const handleLayoutChange = (next: SectionLayout | undefined) => {
    sectionLayoutRef.current = next;
    setSectionLayout(next);
    queueRegenerate();
  };

  const handleFontChange = (next: SavedFont | undefined) => {
    fontFamilyRef.current = next;
    setFontFamily(next);
    queueRegenerate();
  };
```

`flushPendingLayout` and the unmount effect stay as they are; they already flush whatever the shared timer is waiting on.

- [ ] **Step 6: Export with the font**

Change the export button handler (line 637) from:

```tsx
onClick={() => handleExportPDF({ ...resumeData, sectionLayout: sectionLayoutRef.current })}
```

to:

```tsx
onClick={() => handleExportPDF({ ...resumeData, sectionLayout: sectionLayoutRef.current, fontFamily: fontFamilyRef.current })}
```

- [ ] **Step 7: Add the header button**

Immediately before the `<TooltipProvider>` that wraps the "Section order" button (line 579), insert:

```tsx
                  <FontPicker
                    template={activeTemplate}
                    saved={fontFamily}
                    onChange={handleFontChange}
                    isDarkMode={isDarkMode}
                    disabled={!pdfUrl}
                  />
```

- [ ] **Step 8: Type-check, lint, test**

Run in `client/`:

```bash
npx tsc -b
npm run lint
npx vitest run
```

Expected: `tsc` clean; no new lint errors versus before this task (`git stash; npm run lint; git stash pop` to compare if the repo already had warnings); all tests pass.

- [ ] **Step 9: Commit**

```bash
git add client/src/pages/Preview.tsx
git commit -m "feat(client): font picker on the resume preview page

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Wire the picker into the cover letter CLPreview page

**Files:**
- Modify: `client/src/pages/CLPreview.tsx`

**Interfaces:**
- Consumes: `FontPicker` (Task 5), `SavedFont` (Task 3), `CLFormData.fontFamily` (Task 5).
- Produces: cover letter `fontFamily` loaded, attached on every save/regenerate/export, and changeable from the header with a debounce.

All line numbers refer to the file before this task's edits. CLPreview has no layout debounce today, so this task adds the same pattern Preview uses.

- [ ] **Step 1: Imports**

After `import { useMainStore } from '@/store/useMainStore';` (line 31) add:

```tsx
import FontPicker from '@/components/FontPicker';
import type { SavedFont } from '@/utils/fonts';
```

- [ ] **Step 2: State, refs and the shared submit handle**

After `const requestIdRef = useRef(0); // ignore out-of-order responses` (line 64) add:

```tsx
  const FONT_DEBOUNCE_MS = 2500; // each regeneration is a server-side PDF render, wait for the user to stop changing fonts
  const [fontFamily, setFontFamily] = useState<SavedFont | undefined>(undefined);
  const fontFamilyRef = useRef<SavedFont | undefined>(undefined);
  const clDataRef = useRef<CLFormData | null>(null);
  const fontTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const handleFormSubmitRef = useRef<(data: CLFormData) => Promise<void>>(async () => { });
```

- [ ] **Step 3: Load the saved choice**

In `fetchCLData`, inside the `try` after `const parsedData = JSON.parse(request.data?.cover_letter_data);` (line 123) add:

```tsx
          fontFamilyRef.current = parsedData.fontFamily;
          setFontFamily(parsedData.fontFamily);
```

- [ ] **Step 4: Attach the font on every save and render**

Replace the start of `handleFormSubmit` (lines 246 to 255):

```tsx
  const handleFormSubmit = async (data: CLFormData) => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    if (liveEdit) setLiveStatus('updating');
    try {
      setCLData(data);
      const saved = await saveCLData(data, liveEdit);

      const htmlContent = renderToString(<CLTemplateComponent data={data} template={template} />);
      const payload = pdfPayloadv2(data, htmlContent, template || 'aether');
```

with:

```tsx
  const handleFormSubmit = async (formData: CLFormData) => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    if (liveEdit) setLiveStatus('updating');
    // the font lives outside the form; always attach the current one (undefined is dropped from the JSON)
    const data: CLFormData = { ...formData, fontFamily: fontFamilyRef.current };
    clDataRef.current = data;
    try {
      setCLData(data);
      const saved = await saveCLData(data, liveEdit);

      const htmlContent = renderToString(<CLTemplateComponent data={data} template={template} />);
      const payload = pdfPayloadv2(data, htmlContent, template || 'aether');
```

The rest of `handleFormSubmit` is unchanged. Directly after the function's closing `};` add:

```tsx
  handleFormSubmitRef.current = handleFormSubmit; // always-fresh handle for the debounced font callback

  const handleFontChange = (next: SavedFont | undefined) => {
    fontFamilyRef.current = next;
    setFontFamily(next);
    clearTimeout(fontTimerRef.current);
    fontTimerRef.current = setTimeout(() => {
      fontTimerRef.current = undefined;
      if (clDataRef.current) void handleFormSubmitRef.current(clDataRef.current);
    }, FONT_DEBOUNCE_MS);
  };

  // save a font change that is still waiting on the debounce (leaving the page)
  const flushPendingFont = () => {
    if (fontTimerRef.current === undefined) return;
    clearTimeout(fontTimerRef.current);
    fontTimerRef.current = undefined;
    if (clDataRef.current) void handleFormSubmitRef.current(clDataRef.current);
  };

  useEffect(() => () => flushPendingFont(), []); // eslint-disable-line react-hooks/exhaustive-deps
```

- [ ] **Step 5: Flush before leaving the page and export with the font**

In both `redirectTemplates` and `redirectDashboard` (the functions around line 305 and below it), add `flushPendingFont();` as the first statement. The export button (`onClick={() => handleExportPDF(clData)}`) already passes `clData`, which is set from the font-carrying `data` in `handleFormSubmit`, but the font may have changed since; change it to:

```tsx
onClick={() => handleExportPDF({ ...clData, fontFamily: fontFamilyRef.current })}
```

- [ ] **Step 6: Add the header button**

Immediately before the "Templates" `<Button` in the header (the first `<Button variant="outline" onClick={redirectTemplates}`, around line 512), insert:

```tsx
                  <FontPicker
                    template={template ?? 'aether'}
                    saved={fontFamily}
                    onChange={handleFontChange}
                    isDarkMode={isDarkMode}
                    disabled={!pdfUrl}
                  />
```

- [ ] **Step 7: Type-check, lint, test**

Run in `client/`:

```bash
npx tsc -b
npm run lint
npx vitest run
```

Expected: `tsc` clean; no new lint errors; all tests pass.

- [ ] **Step 8: Commit**

```bash
git add client/src/pages/CLPreview.tsx
git commit -m "feat(client): font picker on the cover letter preview page

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Full verification

**Files:** none modified unless a check fails.

- [ ] **Step 1: Automated checks**

Run:

```bash
cd client && npx tsc -b && npm run lint && npx vitest run
cd ../server && npx tsc --noEmit && npx vitest run && npm run build
```

Expected: everything passes; `server/dist` builds without test files in it (`ls server/dist/utils` shows `fonts.js` and no `fonts.test.js`).

- [ ] **Step 2: Start the app**

Start the server and client the way the repo does (`npm run dev` in `server/` and in `client/`) and sign in.

- [ ] **Step 3: Manual resume checks**

For one resume on each of **zeus**, **athena**, **hermes** and **artemis**:

1. The default PDF preview shows the template's default font: Zeus with Cinzel headings over DM Serif Text body; Hermes in Roboto Slab; Artemis in Source Sans 3.
2. Open the Font button; the template's default carries the "Template default" badge and a check; the pairing row shows "Cinzel headings · DM Serif Text body".
3. Pick **Inter**: after about 2.5 s the PDF regenerates and all text, including the name and section titles, is Inter; Font Awesome icons (envelope, phone, section icons) still render as icons, not boxes.
4. Pick **DM Serif Text + Cinzel** on **athena**: the name and the section titles (Experience, Projects and so on) are Cinzel, the entries under them are DM Serif Text.
5. Pick several fonts quickly: only the last one is shown after the PDF settles.
6. Click Export PDF: the downloaded PDF has the same font as the preview.
7. Reload the page: the chosen font persists. Switch to another template and open the picker: the new template shows its own default, not the other template's choice; switch back and the choice returns.
8. "Reset to template default" restores the default and the saved data no longer contains `fontFamily` (check the `/resume/save-data` request payload in the browser network tab).
9. Clone the resume from the dashboard and open it: the clone has the same font choice.

- [ ] **Step 4: Manual cover letter checks**

For one cover letter on each of **ventus**, **aqua** and **aether**: repeat steps 1 to 4 and 6 to 9 above (the default for Ventus must now be IBM Plex Sans in the PDF; the pairing puts Cinzel on the sender name only, since cover letters have no section titles).

- [ ] **Step 5: Check no Ubuntu remains**

Run from the repo root:

```bash
grep -rni "ubuntu" client/src server/src
```

Expected: no matches.

- [ ] **Step 6: Final commit if anything needed fixing**

If any check above required a code change, commit it:

```bash
git add -A
git commit -m "fix: address font customization verification findings

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

Hand-off notes for the reviewer: Cigar's default is Georgia body with DM Serif Text headings (not DM Serif Text throughout), so choosing "DM Serif Text" on Cigar changes its body font; Mozilla Headline stays in the list only because every existing font was kept.
