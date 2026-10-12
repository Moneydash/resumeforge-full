# Resume Editor Form Restyle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (the user chose Native execution) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the resume editor's inputs, labels, cards, buttons, chips and error messages to the warm-neutral look, changing class names only.

**Architecture:** Four slices, one commit each. A temporary guard test strips every `className` value and every `*Classes` constant from each touched file and compares a SHA-256 of what remains against baselines captured from commit `3504105`; it fails if any character outside a class value changes. Per-slice assertions go RED first, then the class edits make them GREEN.

**Tech Stack:** React 19, Tailwind 4 utilities (hex values, no CSS variables), Vitest (node env), TypeScript.

**Spec:** [2026-10-12-editor-form-design.md](../specs/2026-10-12-editor-form-design.md)

## Global Constraints

- Class names only. No markup, prop, handler, text or import changes in any touched file.
- Colours are Tailwind utilities with hex values: ink `#111110` / dark `#f4f4f2`, bg `#ffffff` / `#0b0b0c`, surface `#f6f5f2` / `#151517`, muted `#5c5b56` / `#a3a29c`, placeholder `#6f6e69` / `#8f8e88`, hairline `#e5e3dc` / `white/12`, strong hairline `#cfcdc5` / `white/25`, focus ring `#1f3f8f` / `#8fb0ff`, error `#b3261e` / `#ff8a80`.
- Focus styles use `focus-visible:`; touch targets use `pointer-coarse:min-h-11`.
- Primary buttons (Save, Save & Generate) are black `#111110` with white text, and `#f4f4f2` with `#111110` text in dark mode.
- Error marker is a `before:` pseudo-element in the class string; no markup added.
- `components/ui/*`, the Design panel, Lexical editor files and `CLForm.tsx` are not edited.
- Temporary test files are deleted before the final cleanup commit; commits use explicit paths; nothing is pushed.

## Review Focus

- A touched file loses a character outside a class value (guard test, every slice).
- Shared strings reach the cover letter form: it must still compile and keep its layout (tsc + build; user click-check).
- Dark mode text/ring pairs fall under 4.5:1 / 3:1 (contrast test in Task 0).
- Tailwind `focus-visible:` fails to override shadcn's default ring (user click-check on keyboard focus).
- `before:` marker renders on an error that wraps onto two lines (user click-check).

---

### Task 0: The guard and the contrast check (temporary, never committed)

**Files:**
- Create: `client/src/components/forms/form-restyle.test.ts`

**Interfaces:**
- Produces: `stripClassValues(source: string): string`; a `BASELINE` map of file path to SHA-256; the per-slice `describe` blocks used by Tasks 1-4.

- [ ] **Step 1: Write the test file**

Baselines are the hashes of the stripped files at commit `3504105` (CRLF normalized to LF).

```ts
import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const read = (rel: string) =>
  readFileSync(fileURLToPath(new URL(`../../${rel}`, import.meta.url)), 'utf-8').replace(/\r\n/g, '\n');
const sha = (text: string) => createHash('sha256').update(text, 'utf8').digest('hex');

function skipTemplate(s: string, i: number): number {
  for (i++; i < s.length; i++) {
    const c = s[i];
    if (c === '\\') { i++; continue; }
    if (c === '`') return i;
    if (c === '$' && s[i + 1] === '{') i = skipBraces(s, i + 1) - 1;
  }
  throw new Error('unterminated template literal');
}
function skipBraces(s: string, i: number): number {
  let depth = 0;
  for (; i < s.length; i++) {
    const c = s[i];
    if (c === '`') { i = skipTemplate(s, i); continue; }
    if (c === '"' || c === "'") {
      const end = s.indexOf(c, i + 1);
      if (end === -1) throw new Error('unterminated string');
      i = end;
      continue;
    }
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return i + 1; }
  }
  throw new Error('unbalanced braces');
}
function skipValue(s: string, i: number): number {
  const c = s[i];
  if (c === '"' || c === "'") return s.indexOf(c, i + 1) + 1;
  if (c === '{') return skipBraces(s, i);
  throw new Error(`unexpected className value at ${i}`);
}
export function stripClassValues(source: string): string {
  let out = '';
  let i = 0;
  const marker = 'className=';
  while (i < source.length) {
    const at = source.indexOf(marker, i);
    if (at === -1) { out += source.slice(i); break; }
    out += source.slice(i, at) + 'className=<X>';
    i = skipValue(source, at + marker.length);
  }
  return out.replace(/(\w*Classes)(\s*=\s*)("[^"\n]*"|'[^'\n]*'|`[^`]*`)/g, '$1$2<X>');
}

const BASELINE: Record<string, string> = {
  'components/ResumeForm.tsx': 'c263f173536fbc6af5f2ca900b0fd20286b4b2219d63deaab629d2051f2af635',
  'components/MonthPicker.tsx': '2fdedc2618297d3fed46b9207c20ff68b11565764bfd1e839636c6fff325eb5f',
  'components/forms/Awards.tsx': 'a3db8af942c1ee97be6c355df56b78d7ab1333ef56f0ef764b1400437f2fd2c2',
  'components/forms/Certifications.tsx': 'e72e57aaff8e048bc30f8a315b9e7a0e5edacf0fcd15f60d97cd130b71a812bb',
  'components/forms/ChipInput.tsx': '70ebf9cf43edb4a6c4f330d824d54e350dd580e61126b01e104c085e0a346f43',
  'components/forms/Education.tsx': '79ebf55aae8d077ff736490addf34ac9e5767ccfa5025df42cae97909169c9f3',
  'components/forms/Experience.tsx': '3f45b26ce4c6570ad609a16edcda8008af87cbd77d26421332953a9655a940b9',
  'components/forms/Personal.tsx': 'cfec46df613a69be6e166e4c7f673de02fd9de45575768e79b0e268710e9931c',
  'components/forms/Projects.tsx': '3a50775deb7813598a4e9a901eb1563b75a7c3fbd37cd6272344be2cb73de947',
  'components/forms/References.tsx': '45d67a0f01be9a1e53154286314cc08d9dab28042f2601cf7f101e9799c9bb76',
  'components/forms/SectionHeader.tsx': 'c572aadb7881868e9f439aa672acb5550e3334bf016911e7cbc2a72c8dbf7a10',
  'components/forms/Skills.tsx': 'aa86f76a4c155539d55214436008e0900f2f4df4c7d9c04b324a83ea857bbf2e',
  'components/forms/Socials.tsx': 'afb6be21d0fc054a7b18478859956a404b9a6a69012e9fa74e9138da328e9637',
  'styles/form-classes.ts': '1ebb5994859690b1b5fa126fc178828c62e1ef5108c469576d152a7776d829c0',
};

describe('guard: only class names changed', () => {
  for (const [file, hash] of Object.entries(BASELINE)) {
    it(`${file} is identical outside class values`, () => {
      expect(sha(stripClassValues(read(file)))).toBe(hash);
    });
  }
  it('form-classes still exports the same names', () => {
    const names = [...read('styles/form-classes.ts').matchAll(/export const (\w+)/g)].map((m) => m[1]);
    expect(names).toEqual([
      'inputClasses', 'labelClasses', 'sectionDivClasses', 'sectionHeaderClasses',
      'buttonClasses', 'addButtonClasses', 'removeButtonClasses', 'cardClasses',
    ]);
  });
});

function lum(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const ratio = (a: string, b: string) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

describe('contrast of the chosen pairs', () => {
  const text: Array<[string, string, string]> = [
    ['ink on bg', '#111110', '#ffffff'], ['ink on surface', '#111110', '#f6f5f2'],
    ['muted on bg', '#5c5b56', '#ffffff'], ['muted on surface', '#5c5b56', '#f6f5f2'],
    ['placeholder on bg', '#6f6e69', '#ffffff'], ['error on bg', '#b3261e', '#ffffff'],
    ['error on surface', '#b3261e', '#f6f5f2'], ['white on black button', '#ffffff', '#111110'],
    ['dark ink on dark bg', '#f4f4f2', '#0b0b0c'], ['dark ink on dark surface', '#f4f4f2', '#151517'],
    ['dark muted on dark bg', '#a3a29c', '#0b0b0c'], ['dark muted on dark surface', '#a3a29c', '#151517'],
    ['dark placeholder on dark bg', '#8f8e88', '#0b0b0c'], ['dark error on dark bg', '#ff8a80', '#0b0b0c'],
    ['dark error on dark surface', '#ff8a80', '#151517'], ['dark button text', '#111110', '#f4f4f2'],
  ];
  for (const [name, fg, bg] of text) {
    it(`${name} >= 4.5:1`, () => expect(ratio(fg, bg)).toBeGreaterThanOrEqual(4.5));
  }
  it('focus ring >= 3:1 on bg, both themes', () => {
    expect(ratio('#1f3f8f', '#ffffff')).toBeGreaterThanOrEqual(3);
    expect(ratio('#8fb0ff', '#0b0b0c')).toBeGreaterThanOrEqual(3);
  });
});

// ---- per-slice assertions: add each block with its task, watch it fail, then make it pass ----
```

- [ ] **Step 2: Run it**

Run: `cd client && npx vitest run src/components/forms/form-restyle.test.ts`
Expected: all guard tests PASS (14 hashes + export names) and all contrast tests PASS. If any hash fails on the untouched tree, the baseline is wrong: stop and recompute with the scratchpad `strip_check.mjs`.

---

### Task 1: Shared strings (`form-classes.ts`)

**Files:**
- Modify: `client/src/styles/form-classes.ts`
- Test: `client/src/components/forms/form-restyle.test.ts` (append)

- [ ] **Step 1: Append the RED assertions**

```ts
describe('slice 1: shared strings', () => {
  const src = read('styles/form-classes.ts');
  it('no indigo or grey fills remain', () => {
    expect(src).not.toMatch(/indigo|gray-|red-100|red-700|red-900/);
  });
  it('inputs: 40/44px, hairline, visible ring via focus-visible', () => {
    expect(src).toContain('min-h-10 pointer-coarse:min-h-11');
    expect(src).toContain('border-[#e5e3dc] dark:border-white/12');
    expect(src).toContain('focus-visible:ring-2 focus-visible:ring-[#1f3f8f] dark:focus-visible:ring-[#8fb0ff]');
    expect(src).toContain('placeholder:text-[#6f6e69] dark:placeholder:text-[#8f8e88]');
  });
  it('labels, cards and buttons use the tokens', () => {
    expect(src).toContain('text-[12.5px] font-medium');
    expect(src).toContain('bg-[#f6f5f2] dark:bg-[#151517]');
    expect(src).toContain('text-[#b3261e] dark:text-[#ff8a80]');
    expect(src).toContain('pointer-coarse:min-h-11');
  });
});
```

- [ ] **Step 2: Run, expect FAIL**

Run: `cd client && npx vitest run src/components/forms/form-restyle.test.ts`
Expected: the three slice-1 tests FAIL (strings still indigo/grey); guard and contrast PASS.

- [ ] **Step 3: Replace the eight strings**

Keep the file's shape (template literals, the same export names and order, `${buttonClasses}` interpolation in add/remove). New values:

```ts
// Consistent styling classes
export const inputClasses = `
mt-1 block w-full rounded-md border px-3 py-2 text-sm min-h-10 pointer-coarse:min-h-11
border-[#e5e3dc] dark:border-white/12 hover:border-[#cfcdc5] dark:hover:border-white/25
bg-white dark:bg-[#0b0b0c]
text-[#111110] dark:text-[#f4f4f2]
placeholder:text-[#6f6e69] dark:placeholder:text-[#8f8e88]
focus-visible:outline-none focus-visible:border-[#111110] dark:focus-visible:border-[#f4f4f2]
focus-visible:ring-2 focus-visible:ring-[#1f3f8f] dark:focus-visible:ring-[#8fb0ff]
focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#0b0b0c]
transition-colors duration-150
`;

export const labelClasses = `
block text-[12.5px] font-medium mb-1.5 ml-1
text-[#5c5b56] dark:text-[#a3a29c]
`;

export const sectionDivClasses = `
border-b border-[#e5e3dc] dark:border-white/12
`;

export const sectionHeaderClasses = `
text-lg font-semibold pb-2
text-[#111110] dark:text-[#f4f4f2]
`;

export const buttonClasses = `
inline-flex items-center justify-center px-3 py-2 border text-sm
leading-4 font-medium rounded-md min-h-9 pointer-coarse:min-h-11
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
focus-visible:ring-[#1f3f8f] dark:focus-visible:ring-[#8fb0ff]
focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#0b0b0c]
transition-colors duration-150
`;

export const addButtonClasses = `
${buttonClasses}
bg-white dark:bg-transparent text-[#111110] dark:text-[#f4f4f2]
border-[#cfcdc5] dark:border-white/25
hover:bg-[#f6f5f2] dark:hover:bg-[#151517] mb-1.5
`;

export const removeButtonClasses = `
${buttonClasses}
bg-transparent border-transparent text-[#b3261e] dark:text-[#ff8a80]
hover:bg-[#b3261e]/10 dark:hover:bg-[#ff8a80]/15
`;

export const cardClasses = `
p-4 border rounded-lg space-y-4
border-[#e5e3dc] dark:border-white/12 hover:border-[#cfcdc5] dark:hover:border-white/25
bg-[#f6f5f2] dark:bg-[#151517] transition-colors duration-150
`;
```

- [ ] **Step 4: Verify GREEN**

Run: `cd client && npx vitest run src/components/forms/form-restyle.test.ts && npx tsc -b --noEmit 2>&1 | tail -3`
Expected: all tests PASS; `tsc` prints nothing. (If the tsc invocation differs in this repo, use the same command used for earlier slices.)

- [ ] **Step 5: Build, then commit**

Run: `cd client && npm run build 2>&1 | tail -4`
Expected: build succeeds, no new warnings.

```bash
git add client/src/styles/form-classes.ts
git commit -m "feat(editor): restyle the shared form inputs, labels, cards and buttons"
```

Then ask the user for the slice-1 click-through (type in every section; add/remove/reorder/edit items; collapse/hide; dark mode; narrow window; a quick look at the cover letter form).

---

### Task 2: Save, Cancel and Save & Generate buttons

**Files:**
- Modify: `client/src/components/forms/{Awards,Certifications,Education,Experience,Projects,References,Skills}.tsx` (the two buttons each), `client/src/components/ResumeForm.tsx:499-508`
- Test: append to `form-restyle.test.ts`

- [ ] **Step 1: Append the RED assertions**

```ts
describe('slice 2: buttons', () => {
  const sections = ['Awards', 'Certifications', 'Education', 'Experience', 'Projects', 'References', 'Skills'];
  const SAVE = 'inline-flex items-center justify-center px-3 py-1 text-sm font-medium rounded-md min-h-9 pointer-coarse:min-h-11 bg-[#111110] text-white hover:bg-[#2a2a28] dark:bg-[#f4f4f2] dark:text-[#111110] dark:hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#1f3f8f] dark:focus-visible:ring-[#8fb0ff] focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#0b0b0c] transition-colors duration-150';
  const CANCEL = 'inline-flex items-center justify-center px-3 py-1 text-sm font-medium rounded-md min-h-9 pointer-coarse:min-h-11 border border-[#cfcdc5] dark:border-white/25 bg-white dark:bg-transparent text-[#111110] dark:text-[#f4f4f2] hover:bg-[#f6f5f2] dark:hover:bg-[#151517] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#1f3f8f] dark:focus-visible:ring-[#8fb0ff] focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#0b0b0c] transition-colors duration-150';
  for (const name of sections) {
    it(`${name} Save is black and Cancel is a ghost`, () => {
      const src = read(`components/forms/${name}.tsx`);
      expect(src).not.toMatch(/bg-blue-500|bg-gray-500|hover:bg-gray-600/);
      expect(src).toContain(`className="${SAVE}"`);
      expect(src).toContain(`className="${CANCEL}"`);
    });
  }
  it('Save & Generate is black, full width, with the kept disabled styles', () => {
    const src = read('components/ResumeForm.tsx');
    expect(src).not.toMatch(/indigo/);
    expect(src).toContain('bg-[#111110] hover:bg-[#2a2a28] dark:bg-[#f4f4f2] dark:text-[#111110] dark:hover:bg-white');
    expect(src).toContain('disabled:opacity-50 disabled:cursor-not-allowed');
    expect(src).toContain('w-full flex justify-center items-center gap-2');
  });
});
```

- [ ] **Step 2: Run, expect FAIL** (8 tests; guard and earlier slices PASS)

Run: `cd client && npx vitest run src/components/forms/form-restyle.test.ts`

- [ ] **Step 3: Apply the edits**

Use a CRLF-safe exact replacement per file (the scratchpad `preview_edit.py` helper's `replace_once` pattern, adapted to these paths). In each of the seven section files replace the Save button's `className="px-3 py-1 text-sm text-white rounded bg-blue-500"` with `className="<SAVE>"` and the Cancel button's `className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600"` with `className="<CANCEL>"`, using the exact strings from the test. In `ResumeForm.tsx` replace only these lines inside the submit `Button`'s template literal:

```
            bg-indigo-600 hover:bg-indigo-700 
            focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500
            dark:focus:ring-offset-gray-800
```
with
```
            bg-[#111110] hover:bg-[#2a2a28] dark:bg-[#f4f4f2] dark:text-[#111110] dark:hover:bg-white
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
            focus-visible:ring-[#1f3f8f] dark:focus-visible:ring-[#8fb0ff]
            focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#0b0b0c]
```
The line `text-sm font-medium text-white` stays (dark mode overrides it with `dark:text-[#111110]`).

- [ ] **Step 4: Verify GREEN**

Run: `cd client && npx vitest run src/components/forms/form-restyle.test.ts && npx tsc -b --noEmit 2>&1 | tail -3 && npm run build 2>&1 | tail -4`
Expected: all PASS, tsc clean, build succeeds.

- [ ] **Step 5: Commit, then the user's click-through (Save/Cancel each section, Save & Generate)**

```bash
git add client/src/components/ResumeForm.tsx client/src/components/forms/Awards.tsx client/src/components/forms/Certifications.tsx client/src/components/forms/Education.tsx client/src/components/forms/Experience.tsx client/src/components/forms/Projects.tsx client/src/components/forms/References.tsx client/src/components/forms/Skills.tsx
git commit -m "feat(editor): black Save and Save & Generate, ghost Cancel"
```

---

### Task 3: Error messages

**Files:**
- Modify: `client/src/components/forms/{Awards,Certifications,Education,Experience,Personal,Projects,References,Skills}.tsx` (every `<p className="text-red-500 dark:text-red-400 text-sm mt-1">`)
- Test: append to `form-restyle.test.ts`

- [ ] **Step 1: Append the RED assertions**

```ts
describe('slice 3: errors', () => {
  const files = ['Awards', 'Certifications', 'Education', 'Experience', 'Personal', 'Projects', 'References', 'Skills'];
  const ERR = 'text-[#b3261e] dark:text-[#ff8a80] text-sm mt-1 flex items-start gap-1.5 before:content-[\'\'] before:mt-[0.45em] before:size-1.5 before:shrink-0 before:rounded-full before:bg-current';
  for (const name of files) {
    it(`${name} errors use the darker red and the marker`, () => {
      const src = read(`components/forms/${name}.tsx`);
      expect(src).not.toContain('text-red-500');
      const count = (src.match(/text-\[#b3261e\] dark:text-\[#ff8a80\] text-sm mt-1/g) || []).length;
      expect(count).toBeGreaterThan(0);
      expect(src.split(`className="${ERR}"`).length - 1).toBe(count);
    });
  }
});
```

- [ ] **Step 2: Run, expect FAIL** (8 tests)

- [ ] **Step 3: Replace** every occurrence of `className="text-red-500 dark:text-red-400 text-sm mt-1"` in the eight files with `className="<ERR>"` (replace-all per file; 2+3+3+3+3+1+5+1 = 21 occurrences).

- [ ] **Step 4: Verify GREEN** — same command as Task 2 step 4.

- [ ] **Step 5: Commit, then the user's click-through (trigger a validation error in each section)**

```bash
git add client/src/components/forms/Awards.tsx client/src/components/forms/Certifications.tsx client/src/components/forms/Education.tsx client/src/components/forms/Experience.tsx client/src/components/forms/Personal.tsx client/src/components/forms/Projects.tsx client/src/components/forms/References.tsx client/src/components/forms/Skills.tsx
git commit -m "feat(editor): darker error text with a non-colour marker"
```

---

### Task 4: Chips, badge, tooltips, header icon buttons, month/year pickers

**Files:**
- Modify: `forms/ChipInput.tsx` (container line ~39, chip ~43, remove button ~51), `forms/Skills.tsx:251`, `forms/Socials.tsx:136,145`, `forms/SectionHeader.tsx` (`iconButtonClasses`), `MonthPicker.tsx:63,82`
- Test: append to `form-restyle.test.ts`

- [ ] **Step 1: Append the RED assertions**

```ts
describe('slice 4: the rest', () => {
  it('ChipInput: input-like box, neutral chips, no indigo', () => {
    const src = read('components/forms/ChipInput.tsx');
    expect(src).not.toMatch(/indigo|gray-/);
    expect(src).toContain('focus-within:ring-2 focus-within:ring-[#1f3f8f] dark:focus-within:ring-[#8fb0ff]');
    expect(src).toContain('bg-[#f6f5f2] dark:bg-[#151517]');
    expect(src).toContain('min-h-10 pointer-coarse:min-h-11');
  });
  it('Skills badge is neutral', () => {
    const src = read('components/forms/Skills.tsx');
    expect(src).not.toMatch(/bg-blue-100|text-blue-800|bg-blue-900/);
  });
  it('Socials tooltips are ink', () => {
    const src = read('components/forms/Socials.tsx');
    expect(src).not.toContain('bg-blue-500');
    expect(src.split('bg-[#111110] text-white dark:bg-[#f4f4f2] dark:text-[#111110]').length - 1).toBe(2);
  });
  it('SectionHeader icon buttons are 34px / 44px on touch with a focus ring', () => {
    const src = read('components/forms/SectionHeader.tsx');
    expect(src).toContain('size-[34px] pointer-coarse:size-11');
    expect(src).toContain('focus-visible:ring-2');
  });
  it('MonthPicker triggers match the inputs', () => {
    const src = read('components/MonthPicker.tsx');
    expect(src.split('min-h-10 pointer-coarse:min-h-11').length - 1).toBe(2);
    expect(src).toContain('w-full truncate');
  });
});
```

- [ ] **Step 2: Run, expect FAIL** (5 tests)

- [ ] **Step 3: Apply the class edits**

- ChipInput container: `mt-1 flex min-h-10 pointer-coarse:min-h-11 w-full flex-wrap items-center gap-2 rounded-md border border-[#e5e3dc] bg-white px-3 py-2 transition-colors duration-150 hover:border-[#cfcdc5] focus-within:border-[#111110] focus-within:ring-2 focus-within:ring-[#1f3f8f] focus-within:ring-offset-2 focus-within:ring-offset-white dark:border-white/12 dark:bg-[#0b0b0c] dark:hover:border-white/25 dark:focus-within:border-[#f4f4f2] dark:focus-within:ring-[#8fb0ff] dark:focus-within:ring-offset-[#0b0b0c]`.
- Chip span: `inline-flex items-center gap-1 rounded-full border border-[#e5e3dc] bg-[#f6f5f2] py-0.5 pl-3 pr-1 text-sm text-[#111110] dark:border-white/12 dark:bg-[#151517] dark:text-[#f4f4f2]`.
- Chip remove button: `rounded-full p-0.5 hover:bg-[#e5e3dc] dark:hover:bg-white/12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1f3f8f] dark:focus-visible:ring-[#8fb0ff]`.
- Skills badge: `inline-block border border-[#e5e3dc] bg-[#f6f5f2] text-[#111110] text-xs font-semibold px-2.5 py-0.5 rounded dark:border-white/12 dark:bg-[#151517] dark:text-[#f4f4f2]`.
- Socials both `TooltipContent`: `bg-[#111110] text-white dark:bg-[#f4f4f2] dark:text-[#111110]`.
- SectionHeader `iconButtonClasses` (string constant): `"inline-flex items-center justify-center size-[34px] pointer-coarse:size-11 rounded-md text-[#5c5b56] dark:text-[#a3a29c] hover:bg-[#f6f5f2] dark:hover:bg-[#151517] hover:text-[#111110] dark:hover:text-[#f4f4f2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1f3f8f] dark:focus-visible:ring-[#8fb0ff]"`.
- MonthPicker both triggers: `w-full truncate min-h-10 pointer-coarse:min-h-11 border-[#e5e3dc] dark:border-white/12 bg-white dark:bg-[#0b0b0c] text-[#111110] dark:text-[#f4f4f2] focus-visible:ring-2 focus-visible:ring-[#1f3f8f] dark:focus-visible:ring-[#8fb0ff]`.

- [ ] **Step 4: Verify GREEN** — same command as Task 2 step 4, plus `npm run lint 2>&1 | tail -3` (expect the same pre-existing counts as before the slice).

- [ ] **Step 5: Commit, then the user's click-through (chips with Enter, comma, Backspace; month/year pickers; social link tooltips; section header toggles)**

```bash
git add client/src/components/MonthPicker.tsx client/src/components/forms/ChipInput.tsx client/src/components/forms/Skills.tsx client/src/components/forms/Socials.tsx client/src/components/forms/SectionHeader.tsx
git commit -m "feat(editor): neutral chips, tooltips, header buttons and date pickers"
```

---

### Task 5: Clean up

- [ ] **Step 1:** Run the whole guard once more, then delete the temporary tests: `client/src/components/forms/form-restyle.test.ts` and the three untracked files in `client/src/components/editor-chrome/`. Confirm `git status` is clean and that no `*.test.*` file was ever added by `git log --stat 3504105..HEAD`.
- [ ] **Step 2:** Final `tsc`, `npm run build`, `npm run lint` (counts unchanged from baseline: 1 error, 3 warnings, all pre-existing).
- [ ] **Step 3:** Report to the user; do not push (not authorized).
