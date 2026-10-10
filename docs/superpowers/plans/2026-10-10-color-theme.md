# Resume Color Theme Customization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users recolor Andromeda, Athena, Zeus and Artemis from a new Color tab in the Design panel (curated swatches, a free color picker, the template default, and a primary-only gradient), saved with the resume and honoured by the exported PDF.

**Architecture:** The four templates' theme colors become `var(--doc-<role>, <current color>)`, so a document with no choice renders exactly as today. The client computes the shade variables from the user's picks (pure, tested math) and sends them as `themeVars`; the PDF server strictly sanitizes them (fixed name allow-list, strict value patterns) and writes them to `:root`. The picks are stored in the resume JSON as `colorTheme` and attached on save, render and export like `fontFamily`.

**Tech Stack:** React 19 + Vite + Vitest (client), Express + Puppeteer + Vitest (server), `react-colorful` (new, color picker), lucide-react, Tailwind.

**Spec:** `docs/superpowers/specs/2026-10-10-color-theme-design.md`

**Branch:** work on the current branch `text-and-color-theme-customization`. Do not create another branch or a worktree.

## Global Constraints

- Resumes only; templates in scope: `andromeda` (primary "Header"), `athena` (primary "Sidebar"), `zeus` (primary "Header", secondary "Accents"), `artemis` (primary "Header", secondary "Sidebar"). No Color tab for other templates or any cover letter.
- Palette (8, exactly): Navy `#1e3a8a`, Blue `#2563eb`, Teal `#0f766e`, Green `#15803d`, Purple `#6d28d9`, Crimson `#be123c`, Amber `#b45309`, Slate `#334155`.
- Saved shape: `colorTheme: { template: 'andromeda'|'athena'|'zeus'|'artemis'; primary?: { type: 'solid'; color: '#rrggbb' } | { type: 'gradient'; from: '#rrggbb'; to: '#rrggbb'; direction: 'horizontal'|'diagonal'|'vertical' }; secondary?: '#rrggbb' }`. Directions map to `90deg`, `135deg`, `180deg`. Picks are saved exactly (never pre-adjusted). A theme whose `template` differs from the active template, or malformed values, count as no choice. Secondary exists only for zeus and artemis.
- Readability: any fill under white text (every primary fill, and Artemis's secondary sidebar) is darkened until white-on-it contrast is at least 4.5:1 (lightness lowered 2 points at a time, floor 4). Zeus's gold secondary is never darkened. Colored text on white uses the same adjusted ("ink") color; decorative uses (borders, bars, bullets, underlines) use the exact pick.
- Exactly 16 variable names: `--doc-primary-bg`, `--doc-primary`, `--doc-primary-ink`, `--doc-primary-dark`, `--doc-primary-darker`, `--doc-primary-light`, `--doc-primary-lighter`, `--doc-primary-tint`, `--doc-primary-strip`, `--doc-primary-fade`, `--doc-secondary`, `--doc-secondary-ink`, `--doc-secondary-dark`, `--doc-secondary-light`, `--doc-secondary-bg`, `--doc-secondary-strip`.
- When primary is a gradient, accents that follow primary use the gradient's first stop.
- A resume with no color choice must render exactly as it does today. The neutral colors (body text, whites, greys, Zeus's brown text, translucent white overlays, Artemis's pale blue social links and decorative circles) are never touched.
- `client/src/utils/color-theme.ts` must not import anything (it is also imported by a server-side verification script and a cross-package test).
- No DB migration. The server never interpolates request data into HTML except through the sanitizer.
- Commit trailer on every commit: `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Never `git add` `client/src/components/templates/__snapshots__/templates.snapshot.test.tsx.snap` (the test runner rewrites it with different line endings; restore it with `git checkout -- <path>` after test runs).

## Review Focus

- Extreme picks (white, black, bright yellow, cyan) must still yield readable output: adjusted fills reach 4.5:1 against white and no variable is empty or `NaN` (Task 1 tests).
- A theme saved for another template, a malformed theme, or a secondary set on a template without a secondary slot must produce no variables for that slot (Task 1 tests).
- Hostile or malformed `themeVars` in a PDF request (unknown names, `url(...)`, 3-digit hex, a value containing `</style>`) must never reach the page HTML (Task 2 tests).
- No color choice means no `<style>` color head and an unchanged render; the font head and color head must coexist in the same `<head>` (Task 2 tests and Task 7 browser check).
- Switching between Solid and Gradient must keep the first color, and clearing the last set slot must remove the whole `colorTheme` key so reset really restores the default (Task 1 tests).
- Rapid color drags in the picker emit many changes; they must collapse into one regeneration through the shared debounce (Task 6; manual check noted in Task 7).

---

## File Structure

| File | Responsibility |
|---|---|
| `client/src/utils/color-theme.ts` (create) | Types, palette, per-template config, color math, `readTheme`, `buildThemeVars`, `withPrimary`/`withSecondary` |
| `client/src/utils/color-theme.test.ts`, `color-theme.server.test.ts` (create) | Math/validation tests; client output accepted by the server sanitizer |
| `server/src/utils/theme-vars.ts`, `theme-vars.test.ts` (create) | Strict sanitizer and `<style>` head builder |
| `server/src/controllers/pdf.ts` (modify) | Emit the color head for resume PDFs |
| `client/src/styles/templates/galaxy/andromeda.css`, `greek/{athena,zeus,artemis}.css` (modify) | Theme colors become variables with fallbacks |
| `client/src/styles/template-colors.test.ts` (create) | Guard: no raw theme literals outside `var(--doc-…, …)` |
| `client/src/types/interface.resume-form-data.ts`, `client/src/utils/helper.ts` (modify) | `colorTheme` field; `themeVars` in the PDF payload |
| `client/src/components/ColorPanel.tsx`, `ColorPanel.test.tsx` (create) | The Color tab UI |
| `client/src/components/DesignPanel.tsx`, `DesignPanel.test.tsx` (modify) | Third tab |
| `client/src/pages/Preview.tsx` (modify) | State, debounce, save/export wiring |

---

### Task 1: Client color module

**Files:**
- Create: `client/src/utils/color-theme.ts`
- Create: `client/src/utils/color-theme.test.ts`

**Interfaces:**
- Produces (used by every later task): `Direction`, `ColorTemplate`, `PrimaryFill`, `ColorTheme`, `DIRECTION_ANGLE`, `PALETTE`, `COLOR_TEMPLATES`, `isColorTemplate(t: unknown): t is ColorTemplate`, `isHex(v: unknown): v is string`, `normalizeHex(v: string): string`, `mix(a: string, b: string, t: number): string`, `contrast(a: string, b: string): number`, `ensureWhiteContrast(hex: string): string`, `rawFillPreview(fill: PrimaryFill): string`, `fillPreview(fill: PrimaryFill): string`, `previewSecondary(template: ColorTemplate, hex: string): string`, `readTheme(template: string, theme: unknown): ColorTheme | undefined`, `buildThemeVars(template: string, theme?: unknown): Record<string, string>`, `withPrimary(template: ColorTemplate, theme: unknown, fill: PrimaryFill | undefined): ColorTheme | undefined`, `withSecondary(template: ColorTemplate, theme: unknown, hex: string | undefined): ColorTheme | undefined`.

- [ ] **Step 1: Write the failing tests**

Create `client/src/utils/color-theme.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  COLOR_TEMPLATES,
  PALETTE,
  buildThemeVars,
  contrast,
  ensureWhiteContrast,
  fillPreview,
  isColorTemplate,
  isHex,
  mix,
  previewSecondary,
  rawFillPreview,
  readTheme,
  withPrimary,
  withSecondary,
  type ColorTheme,
} from "./color-theme";

const WHITE = "#ffffff";
const EXTREMES = ["#ffffff", "#ffff00", "#00ffff", "#f0f0f0", "#000000", "#808080", "#ffd700", "#d4af37"];

describe("registry", () => {
  it("has the 8 confirmed palette colors", () => {
    expect(PALETTE.map((c) => c.hex)).toEqual(["#1e3a8a", "#2563eb", "#0f766e", "#15803d", "#6d28d9", "#be123c", "#b45309", "#334155"]);
  });

  it("covers exactly the four themeable templates", () => {
    expect(Object.keys(COLOR_TEMPLATES).sort()).toEqual(["andromeda", "artemis", "athena", "zeus"]);
    expect(isColorTemplate("zeus")).toBe(true);
    expect(isColorTemplate("hermes")).toBe(false);
    expect(isColorTemplate("constructor")).toBe(false);
  });

  it("only zeus and artemis have a secondary slot", () => {
    expect(COLOR_TEMPLATES.andromeda.secondaryLabel).toBeUndefined();
    expect(COLOR_TEMPLATES.athena.secondaryLabel).toBeUndefined();
    expect(COLOR_TEMPLATES.zeus.secondaryLabel).toBe("Accents");
    expect(COLOR_TEMPLATES.artemis.secondaryLabel).toBe("Sidebar");
  });
});

describe("color math", () => {
  it("validates #rrggbb only", () => {
    expect(isHex("#a1B2c3")).toBe(true);
    expect(isHex("#abc")).toBe(false);
    expect(isHex("red")).toBe(false);
    expect(isHex(null)).toBe(false);
  });

  it("mixes linearly", () => {
    expect(mix("#000000", "#ffffff", 0.5)).toBe("#808080");
    expect(mix("#102030", "#102030", 0.7)).toBe("#102030");
  });

  it("computes WCAG contrast", () => {
    expect(contrast("#000000", WHITE)).toBeCloseTo(21, 0);
    expect(contrast(WHITE, WHITE)).toBeCloseTo(1, 5);
  });

  it("ensureWhiteContrast always reaches 4.5:1", () => {
    for (const c of EXTREMES) expect(contrast(ensureWhiteContrast(c), WHITE), c).toBeGreaterThanOrEqual(4.5);
  });

  it("ensureWhiteContrast leaves every palette color unchanged", () => {
    for (const c of PALETTE) expect(ensureWhiteContrast(c.hex), c.name).toBe(c.hex);
  });

  it("ensureWhiteContrast is idempotent and keeps the hue family (darker, not recolored)", () => {
    const once = ensureWhiteContrast("#ffff00");
    expect(ensureWhiteContrast(once)).toBe(once);
    expect(once).toMatch(/^#[0-9a-f]{6}$/);
  });
});

describe("readTheme", () => {
  it("returns undefined for a different template, junk, or no valid slot", () => {
    expect(readTheme("zeus", undefined)).toBeUndefined();
    expect(readTheme("zeus", null)).toBeUndefined();
    expect(readTheme("zeus", "x")).toBeUndefined();
    expect(readTheme("zeus", { template: "athena", primary: { type: "solid", color: "#2563eb" } })).toBeUndefined();
    expect(readTheme("zeus", { template: "zeus", primary: { type: "solid", color: "red" } })).toBeUndefined();
    expect(readTheme("hermes", { template: "hermes", primary: { type: "solid", color: "#2563eb" } })).toBeUndefined();
  });

  it("normalizes valid slots to lowercase and drops invalid ones", () => {
    const t = readTheme("zeus", { template: "zeus", primary: { type: "solid", color: "#2563EB" }, secondary: "nope" });
    expect(t).toEqual({ template: "zeus", primary: { type: "solid", color: "#2563eb" } });
  });

  it("ignores a secondary on a template without a secondary slot", () => {
    expect(readTheme("athena", { template: "athena", secondary: "#be123c" })).toBeUndefined();
  });

  it("rejects a gradient with a bad direction or bad stop", () => {
    expect(readTheme("zeus", { template: "zeus", primary: { type: "gradient", from: "#2563eb", to: "#be123c", direction: "sideways" } })).toBeUndefined();
    expect(readTheme("zeus", { template: "zeus", primary: { type: "gradient", from: "#2563eb", to: "blue", direction: "vertical" } })).toBeUndefined();
  });
});

describe("buildThemeVars", () => {
  const solid = (template: "andromeda" | "athena" | "zeus" | "artemis", color: string): ColorTheme => ({ template, primary: { type: "solid", color } });

  it("returns nothing when there is no usable choice", () => {
    expect(buildThemeVars("athena")).toEqual({});
    expect(buildThemeVars("athena", { template: "zeus", primary: { type: "solid", color: "#2563eb" } })).toEqual({});
    expect(buildThemeVars("cigar", { template: "cigar", primary: { type: "solid", color: "#2563eb" } })).toEqual({});
  });

  it("builds the ten primary variables for a solid pick, keeping the exact pick for decoration", () => {
    const vars = buildThemeVars("athena", solid("athena", "#be123c"));
    expect(Object.keys(vars).sort()).toEqual([
      "--doc-primary", "--doc-primary-bg", "--doc-primary-dark", "--doc-primary-darker", "--doc-primary-fade",
      "--doc-primary-ink", "--doc-primary-light", "--doc-primary-lighter", "--doc-primary-strip", "--doc-primary-tint",
    ]);
    expect(vars["--doc-primary"]).toBe("#be123c");
    expect(vars["--doc-primary-bg"]).toBe("#be123c");
    expect(vars["--doc-primary-fade"]).toBe("linear-gradient(90deg, #be123c, rgba(190, 18, 60, 0.2))");
  });

  it("darkens a pale primary for the fill but keeps the exact color for decoration", () => {
    const vars = buildThemeVars("andromeda", solid("andromeda", "#ffff00"));
    expect(vars["--doc-primary"]).toBe("#ffff00");
    expect(vars["--doc-primary-bg"]).toBe(ensureWhiteContrast("#ffff00"));
    expect(contrast(vars["--doc-primary-bg"], WHITE)).toBeGreaterThanOrEqual(4.5);
    expect(vars["--doc-primary-ink"]).toBe(vars["--doc-primary-bg"]);
  });

  it("orders the shades: darker <= dark <= base, light/lighter lighter than base", () => {
    const vars = buildThemeVars("athena", solid("athena", "#2563eb"));
    const lum = (hex: string) => 1 - contrast(hex, WHITE) / 21; // monotonic with luminance, enough for ordering
    expect(lum(vars["--doc-primary-darker"])).toBeLessThanOrEqual(lum(vars["--doc-primary-dark"]));
    expect(lum(vars["--doc-primary-dark"])).toBeLessThanOrEqual(lum(vars["--doc-primary-bg"]));
    expect(lum(vars["--doc-primary-light"])).toBeGreaterThan(lum(vars["--doc-primary-bg"]));
    expect(lum(vars["--doc-primary-lighter"])).toBeGreaterThan(lum(vars["--doc-primary-light"]));
    expect(lum(vars["--doc-primary-tint"])).toBeGreaterThan(lum(vars["--doc-primary-light"]));
  });

  it("builds a gradient fill from the adjusted stops and uses the first stop for accents", () => {
    const theme: ColorTheme = { template: "zeus", primary: { type: "gradient", from: "#2563eb", to: "#ffff00", direction: "diagonal" } };
    const vars = buildThemeVars("zeus", theme);
    expect(vars["--doc-primary-bg"]).toBe(`linear-gradient(135deg, #2563eb, ${ensureWhiteContrast("#ffff00")})`);
    expect(vars["--doc-primary"]).toBe("#2563eb");
  });

  it("maps directions to angles", () => {
    const bg = (direction: "horizontal" | "diagonal" | "vertical") =>
      buildThemeVars("zeus", { template: "zeus", primary: { type: "gradient", from: "#2563eb", to: "#be123c", direction } })["--doc-primary-bg"];
    expect(bg("horizontal")).toMatch(/^linear-gradient\(90deg,/);
    expect(bg("diagonal")).toMatch(/^linear-gradient\(135deg,/);
    expect(bg("vertical")).toMatch(/^linear-gradient\(180deg,/);
  });

  it("builds the six secondary variables for zeus, never darkening the gold", () => {
    const vars = buildThemeVars("zeus", { template: "zeus", secondary: "#d4af37" });
    expect(Object.keys(vars).sort()).toEqual([
      "--doc-secondary", "--doc-secondary-bg", "--doc-secondary-dark", "--doc-secondary-ink", "--doc-secondary-light", "--doc-secondary-strip",
    ]);
    expect(vars["--doc-secondary"]).toBe("#d4af37");
    expect(contrast(vars["--doc-secondary-ink"], WHITE)).toBeGreaterThanOrEqual(4.5);
    expect(vars["--doc-secondary-strip"]).toMatch(/^linear-gradient\(90deg, #d4af37, #[0-9a-f]{6}, #[0-9a-f]{6}, #[0-9a-f]{6}, #d4af37\)$/);
  });

  it("sets primary and secondary independently", () => {
    const onlySecondary = buildThemeVars("artemis", { template: "artemis", secondary: "#6d28d9" });
    expect(Object.keys(onlySecondary).every((k) => k.startsWith("--doc-secondary"))).toBe(true);
    const onlyPrimary = buildThemeVars("artemis", solid("artemis", "#334155"));
    expect(Object.keys(onlyPrimary).every((k) => k.startsWith("--doc-primary"))).toBe(true);
  });

  it("never emits an empty or NaN value, even for extreme picks", () => {
    for (const c of EXTREMES) {
      const vars = buildThemeVars("zeus", { template: "zeus", primary: { type: "solid", color: c }, secondary: c });
      expect(Object.keys(vars)).toHaveLength(16);
      for (const [name, value] of Object.entries(vars)) {
        expect(value, `${name} for ${c}`).toMatch(/^(#[0-9a-f]{6}|linear-gradient\(.+\))$/);
        expect(value).not.toMatch(/NaN|undefined/);
      }
    }
  });
});

describe("previews", () => {
  it("rawFillPreview shows the default fill exactly, fillPreview adjusts it for white text", () => {
    const def = COLOR_TEMPLATES.andromeda.defaultPrimary;
    expect(rawFillPreview(def)).toContain("#00d4ff");
    expect(fillPreview(def)).not.toContain("#00d4ff");
  });

  it("previewSecondary adjusts only where the secondary sits under white text", () => {
    expect(previewSecondary("zeus", "#d4af37")).toBe("#d4af37");
    expect(contrast(previewSecondary("artemis", "#d4af37"), WHITE)).toBeGreaterThanOrEqual(4.5);
  });
});

describe("withPrimary / withSecondary", () => {
  it("sets a slot and keeps the other", () => {
    const a = withPrimary("zeus", undefined, { type: "solid", color: "#2563EB" });
    expect(a).toEqual({ template: "zeus", primary: { type: "solid", color: "#2563eb" } });
    const b = withSecondary("zeus", a, "#BE123C");
    expect(b).toEqual({ template: "zeus", primary: { type: "solid", color: "#2563eb" }, secondary: "#be123c" });
  });

  it("clearing one slot keeps the other; clearing the last returns undefined so the key can be dropped", () => {
    const both: ColorTheme = { template: "zeus", primary: { type: "solid", color: "#2563eb" }, secondary: "#be123c" };
    expect(withPrimary("zeus", both, undefined)).toEqual({ template: "zeus", secondary: "#be123c" });
    expect(withSecondary("zeus", withPrimary("zeus", both, undefined), undefined)).toBeUndefined();
  });

  it("ignores a stored theme for another template", () => {
    const other: ColorTheme = { template: "athena", primary: { type: "solid", color: "#2563eb" } };
    expect(withSecondary("zeus", other, "#be123c")).toEqual({ template: "zeus", secondary: "#be123c" });
  });

  it("drops an invalid fill instead of storing it", () => {
    expect(withPrimary("zeus", undefined, { type: "solid", color: "red" })).toBeUndefined();
  });

  it("keeps the first color when switching solid to gradient and back", () => {
    const solid = withPrimary("zeus", undefined, { type: "solid", color: "#2563eb" });
    const grad = withPrimary("zeus", solid, { type: "gradient", from: "#2563eb", to: "#be123c", direction: "diagonal" });
    expect(grad?.primary).toEqual({ type: "gradient", from: "#2563eb", to: "#be123c", direction: "diagonal" });
    const back = withPrimary("zeus", grad, { type: "solid", color: "#2563eb" });
    expect(back?.primary).toEqual({ type: "solid", color: "#2563eb" });
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run in `client/`: `npx vitest run src/utils/color-theme.test.ts`
Expected: FAIL, `Failed to resolve import "./color-theme"`.

- [ ] **Step 3: Write the implementation**

Create `client/src/utils/color-theme.ts` (no imports; see Global Constraints):

```ts
// Resume color themes: types, palette, color math and the CSS variables the four themeable templates read.
// Pure and import-free on purpose: the PDF server only sanitizes the variables this module computes.

export type Direction = 'horizontal' | 'diagonal' | 'vertical';
export type ColorTemplate = 'andromeda' | 'athena' | 'zeus' | 'artemis';

export type PrimaryFill =
  | { type: 'solid'; color: string }
  | { type: 'gradient'; from: string; to: string; direction: Direction };

/** What is stored in the resume JSON as `colorTheme`. Picks are saved exactly; adjustment happens when building variables. */
export interface ColorTheme {
  template: ColorTemplate;
  primary?: PrimaryFill;
  secondary?: string;
}

export const DIRECTION_ANGLE: Record<Direction, number> = { horizontal: 90, diagonal: 135, vertical: 180 };

export const PALETTE = [
  { id: 'navy', name: 'Navy', hex: '#1e3a8a' },
  { id: 'blue', name: 'Blue', hex: '#2563eb' },
  { id: 'teal', name: 'Teal', hex: '#0f766e' },
  { id: 'green', name: 'Green', hex: '#15803d' },
  { id: 'purple', name: 'Purple', hex: '#6d28d9' },
  { id: 'crimson', name: 'Crimson', hex: '#be123c' },
  { id: 'amber', name: 'Amber', hex: '#b45309' },
  { id: 'slate', name: 'Slate', hex: '#334155' },
] as const;

export interface ColorTemplateConfig {
  primaryLabel: string;
  secondaryLabel?: string;
  /** The template's current look, shown by the Default swatch. */
  defaultPrimary: PrimaryFill;
  defaultSecondary?: string;
  /** True when the secondary color is a fill under white text (so it is darkened for readability). */
  secondaryUnderWhiteText: boolean;
}

export const COLOR_TEMPLATES: Record<ColorTemplate, ColorTemplateConfig> = {
  andromeda: {
    primaryLabel: 'Header',
    defaultPrimary: { type: 'gradient', from: '#4940f5', to: '#00d4ff', direction: 'horizontal' },
    secondaryUnderWhiteText: false,
  },
  athena: {
    primaryLabel: 'Sidebar',
    defaultPrimary: { type: 'gradient', from: '#1e3a8a', to: '#2563eb', direction: 'vertical' },
    secondaryUnderWhiteText: false,
  },
  zeus: {
    primaryLabel: 'Header',
    secondaryLabel: 'Accents',
    defaultPrimary: { type: 'gradient', from: '#1a2855', to: '#2d4a9a', direction: 'diagonal' },
    defaultSecondary: '#d4af37',
    secondaryUnderWhiteText: false,
  },
  artemis: {
    primaryLabel: 'Header',
    secondaryLabel: 'Sidebar',
    defaultPrimary: { type: 'gradient', from: '#1a202c', to: '#4a5568', direction: 'diagonal' },
    defaultSecondary: '#667eea',
    secondaryUnderWhiteText: true,
  },
};

export const isColorTemplate = (t: unknown): t is ColorTemplate =>
  typeof t === 'string' && Object.prototype.hasOwnProperty.call(COLOR_TEMPLATES, t);

// ---- color math (sRGB, HSL, WCAG) ----------------------------------------------------------------

const HEX = /^#[0-9a-fA-F]{6}$/;
const WHITE = '#ffffff';

export const isHex = (v: unknown): v is string => typeof v === 'string' && HEX.test(v);
export const normalizeHex = (v: string): string => v.toLowerCase();

type RGB = [number, number, number];

const hexToRgb = (hex: string): RGB => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as RGB;
const clamp255 = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
const rgbToHex = ([r, g, b]: RGB): string => '#' + [r, g, b].map((n) => clamp255(n).toString(16).padStart(2, '0')).join('');

export const mix = (a: string, b: string, t: number): string => {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  return rgbToHex(A.map((v, i) => v * (1 - t) + B[i] * t) as RGB);
};

const linear = (c: number) => {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const luminance = (hex: string): number => {
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
};
export const contrast = (a: string, b: string): number => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (hi + 0.05) / (lo + 0.05);
};

const hexToHsl = (hex: string): [number, number, number] => {
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const l = (max + min) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  return [h, s * 100, l * 100];
};

const hslToHex = (h: number, s: number, l: number): string => {
  const S = s / 100;
  const L = l / 100;
  const c = (1 - Math.abs(2 * L - 1)) * S;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = L - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return rgbToHex([(r + m) * 255, (g + m) * 255, (b + m) * 255]);
};

const withLightness = (hex: string, l: number): string => {
  const [h, s] = hexToHsl(hex);
  return hslToHex(h, s, Math.max(0, Math.min(100, l)));
};
/** Lightness limited to at most `max` (and at least `floor`), same hue and saturation. */
const lightnessBetween = (hex: string, floor: number, max: number): string => {
  const [, , l] = hexToHsl(hex);
  return withLightness(hex, Math.max(floor, Math.min(l, max)));
};
const shiftLightness = (hex: string, delta: number): string => {
  const [, , l] = hexToHsl(hex);
  return withLightness(hex, Math.max(4, l + delta));
};

/**
 * Darken until the contrast against white reaches 4.5:1 (lightness lowered 2 points at a time, floor 4).
 * White text on the result and the result as text on white are the same ratio, so this one function
 * serves both the "clamp for white text" fills and the "ink" text colors.
 */
export const ensureWhiteContrast = (hex: string): string => {
  let c = normalizeHex(hex);
  for (let i = 0; i < 100 && contrast(c, WHITE) < 4.5; i++) {
    const [, , l] = hexToHsl(c);
    if (l <= 4) break;
    c = withLightness(c, l - 2);
  }
  return c;
};

// ---- validation and slot updates -------------------------------------------------------------------

const isDirection = (d: unknown): d is Direction =>
  typeof d === 'string' && Object.prototype.hasOwnProperty.call(DIRECTION_ANGLE, d);

const readPrimary = (v: unknown): PrimaryFill | undefined => {
  if (!v || typeof v !== 'object') return undefined;
  const f = v as Record<string, unknown>;
  if (f.type === 'solid' && isHex(f.color)) return { type: 'solid', color: normalizeHex(f.color) };
  if (f.type === 'gradient' && isHex(f.from) && isHex(f.to) && isDirection(f.direction)) {
    return { type: 'gradient', from: normalizeHex(f.from), to: normalizeHex(f.to), direction: f.direction };
  }
  return undefined;
};

/** A normalized theme with only the valid slots, or undefined when the template differs, the value is junk, or no slot is valid. */
export function readTheme(template: string, theme: unknown): ColorTheme | undefined {
  if (!isColorTemplate(template) || !theme || typeof theme !== 'object') return undefined;
  const t = theme as Record<string, unknown>;
  if (t.template !== template) return undefined;
  const primary = readPrimary(t.primary);
  const secondary = COLOR_TEMPLATES[template].secondaryLabel && isHex(t.secondary) ? normalizeHex(t.secondary) : undefined;
  return compact(template, primary, secondary);
}

function compact(template: ColorTemplate, primary?: PrimaryFill, secondary?: string): ColorTheme | undefined {
  if (!primary && !secondary) return undefined;
  return { template, ...(primary ? { primary } : {}), ...(secondary ? { secondary } : {}) };
}

export function withPrimary(template: ColorTemplate, theme: unknown, fill: PrimaryFill | undefined): ColorTheme | undefined {
  return compact(template, readPrimary(fill), readTheme(template, theme)?.secondary);
}

export function withSecondary(template: ColorTemplate, theme: unknown, hex: string | undefined): ColorTheme | undefined {
  return compact(template, readTheme(template, theme)?.primary, hex !== undefined && isHex(hex) ? normalizeHex(hex) : undefined);
}

// ---- previews for the UI -----------------------------------------------------------------------------

/** CSS background for a fill exactly as stored (used for the template's own default). */
export const rawFillPreview = (fill: PrimaryFill): string =>
  fill.type === 'solid' ? fill.color : `linear-gradient(${DIRECTION_ANGLE[fill.direction]}deg, ${fill.from}, ${fill.to})`;

/** CSS background for a fill as it will render under white text. */
export const fillPreview = (fill: PrimaryFill): string =>
  fill.type === 'solid'
    ? ensureWhiteContrast(fill.color)
    : `linear-gradient(${DIRECTION_ANGLE[fill.direction]}deg, ${ensureWhiteContrast(fill.from)}, ${ensureWhiteContrast(fill.to)})`;

export const previewSecondary = (template: ColorTemplate, hex: string): string =>
  COLOR_TEMPLATES[template].secondaryUnderWhiteText ? ensureWhiteContrast(hex) : hex;

// ---- CSS variables ---------------------------------------------------------------------------------

const rgbaFrom = (hex: string, alpha: number): string => {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

function primaryVars(fill: PrimaryFill): Record<string, string> {
  const P = fill.type === 'solid' ? fill.color : fill.from; // exact first stop, used for decoration
  const B = ensureWhiteContrast(P); // readable under white text, also the ink color for text on white
  const dark = lightnessBetween(B, 8, 38);
  const darker = lightnessBetween(B, 6, 26);
  const bg =
    fill.type === 'solid'
      ? B
      : `linear-gradient(${DIRECTION_ANGLE[fill.direction]}deg, ${ensureWhiteContrast(fill.from)}, ${ensureWhiteContrast(fill.to)})`;
  return {
    '--doc-primary-bg': bg,
    '--doc-primary': P,
    '--doc-primary-ink': B,
    '--doc-primary-dark': dark,
    '--doc-primary-darker': darker,
    '--doc-primary-light': mix(B, WHITE, 0.75),
    '--doc-primary-lighter': mix(B, WHITE, 0.88),
    '--doc-primary-tint': mix(P, WHITE, 0.88),
    '--doc-primary-strip': `linear-gradient(90deg, ${darker}, ${dark}, ${B}, ${mix(B, WHITE, 0.4)}, ${mix(B, WHITE, 0.6)})`,
    '--doc-primary-fade': `linear-gradient(90deg, ${P}, ${rgbaFrom(P, 0.2)})`,
  };
}

function secondaryVars(S: string): Record<string, string> {
  const SB = ensureWhiteContrast(S);
  const dark = lightnessBetween(S, 8, 40);
  const light = mix(S, WHITE, 0.35);
  return {
    '--doc-secondary': S,
    '--doc-secondary-ink': SB,
    '--doc-secondary-dark': dark,
    '--doc-secondary-light': light,
    '--doc-secondary-bg': `linear-gradient(135deg, ${SB}, ${shiftLightness(SB, -10)})`,
    '--doc-secondary-strip': `linear-gradient(90deg, ${S}, ${light}, ${dark}, ${light}, ${S})`,
  };
}

/** Only the variables for slots with a valid choice for this template; an empty object means "render the default". */
export function buildThemeVars(template: string, theme?: unknown): Record<string, string> {
  const t = readTheme(template, theme);
  if (!t) return {};
  return { ...(t.primary ? primaryVars(t.primary) : {}), ...(t.secondary ? secondaryVars(t.secondary) : {}) };
}
```

- [ ] **Step 4: Run to verify pass**

Run in `client/`: `npx vitest run src/utils/color-theme.test.ts`
Expected: PASS, all tests.

- [ ] **Step 5: Type-check and lint**

Run in `client/`: `npx tsc -b && npx eslint src/utils/color-theme.ts src/utils/color-theme.test.ts`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add client/src/utils/color-theme.ts client/src/utils/color-theme.test.ts
git commit -m "feat(client): add resume color theme module with shade and contrast math

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Server sanitizer and color head

**Files:**
- Create: `server/src/utils/theme-vars.ts`
- Create: `server/src/utils/theme-vars.test.ts`
- Create: `client/src/utils/color-theme.server.test.ts`
- Modify: `server/src/controllers/pdf.ts`

**Interfaces:**
- Consumes: `buildThemeVars` from `client/src/utils/color-theme.ts` (Task 1; the cross-package test only).
- Produces: `sanitizeThemeVars(vars: unknown): Record<string, string>` and `buildThemeHead(vars: unknown): string` in `server/src/utils/theme-vars.ts`.

- [ ] **Step 1: Write the failing server tests**

Create `server/src/utils/theme-vars.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildThemeHead, sanitizeThemeVars } from "./theme-vars";

const GOOD = {
  "--doc-primary-bg": "linear-gradient(135deg, #1e3a8a, #2563eb)",
  "--doc-primary": "#2563eb",
  "--doc-primary-fade": "linear-gradient(90deg, #2563eb, rgba(37, 99, 235, 0.2))",
  "--doc-secondary-strip": "linear-gradient(90deg, #d4af37, #e3cb7d, #a88924, #e3cb7d, #d4af37)",
};

describe("sanitizeThemeVars", () => {
  it("keeps allow-listed names with valid hex and gradient values", () => {
    expect(sanitizeThemeVars(GOOD)).toEqual(GOOD);
  });

  it("lowercases hex values", () => {
    expect(sanitizeThemeVars({ "--doc-primary": "#2563EB" })).toEqual({ "--doc-primary": "#2563eb" });
  });

  it("drops unknown names, including the font variables", () => {
    expect(sanitizeThemeVars({ "--evil": "#ffffff", "--doc-font": "#ffffff", "--doc-primary": "#2563eb" })).toEqual({ "--doc-primary": "#2563eb" });
  });

  it.each([
    "red",
    "#abc",
    "#12345g",
    "url(http://x.test/a.png)",
    "#2563eb; background: url(x)",
    "#2563eb}</style><script>alert(1)</script>",
    "linear-gradient(90deg, #fff, #000)",
    "linear-gradient(90deg, #2563eb)",
    "linear-gradient(90deg, #2563eb, url(x))",
    "linear-gradient(90deg, #2563eb, #000000);color:red",
    "expression(alert(1))",
  ])("drops the bad value %s", (bad) => {
    expect(sanitizeThemeVars({ "--doc-primary": bad })).toEqual({});
  });

  it("drops non-string values", () => {
    expect(sanitizeThemeVars({ "--doc-primary": 5, "--doc-primary-ink": null, "--doc-primary-dark": {} })).toEqual({});
  });

  it.each([null, undefined, "x", 3, []])("returns an empty object for the non-object input %j", (bad) => {
    expect(sanitizeThemeVars(bad)).toEqual({});
  });
});

describe("buildThemeHead", () => {
  it("returns an empty string when there is nothing valid", () => {
    expect(buildThemeHead(undefined)).toBe("");
    expect(buildThemeHead({})).toBe("");
    expect(buildThemeHead({ "--evil": "#ffffff" })).toBe("");
  });

  it("writes a single :root rule with the sanitized variables", () => {
    const head = buildThemeHead({ "--doc-primary": "#2563eb", "--doc-primary-bg": "#2563eb" });
    expect(head).toBe("<style>:root{--doc-primary-bg:#2563eb;--doc-primary:#2563eb;}</style>");
  });

  it("never lets request data break out of the style element", () => {
    const head = buildThemeHead({ "--doc-primary": "#2563eb</style><script>alert(1)</script>", "--doc-primary-ink": "#be123c" });
    expect(head).not.toContain("<script");
    expect(head.match(/<\/style>/g)).toHaveLength(1);
    expect(head).toContain("--doc-primary-ink:#be123c");
  });
});
```

Create `client/src/utils/color-theme.server.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildThemeVars, type ColorTheme } from "./color-theme";
import { sanitizeThemeVars } from "../../../server/src/utils/theme-vars";

// Whatever the client computes must pass the server's strict sanitizer unchanged, or colors silently vanish in the PDF.
const THEMES: Array<[string, ColorTheme]> = [
  ["athena solid", { template: "athena", primary: { type: "solid", color: "#be123c" } }],
  ["andromeda gradient", { template: "andromeda", primary: { type: "gradient", from: "#4940f5", to: "#00d4ff", direction: "horizontal" } }],
  ["zeus both", { template: "zeus", primary: { type: "gradient", from: "#1a2855", to: "#ffff00", direction: "diagonal" }, secondary: "#D4AF37" }],
  ["artemis extremes", { template: "artemis", primary: { type: "solid", color: "#ffffff" }, secondary: "#000000" }],
];

describe("client theme variables vs the server sanitizer", () => {
  it.each(THEMES)("%s passes through unchanged", (_label, theme) => {
    const vars = buildThemeVars(theme.template, theme);
    expect(Object.keys(vars).length).toBeGreaterThan(0);
    expect(sanitizeThemeVars(vars)).toEqual(vars);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run in `server/`: `npx vitest run src/utils/theme-vars.test.ts`
Expected: FAIL, `Failed to resolve import "./theme-vars"`.

- [ ] **Step 3: Write the implementation**

Create `server/src/utils/theme-vars.ts`:

```ts
// Strict sanitizer for the resume color variables the client computes (client/src/utils/color-theme.ts).
// Only fixed variable names and strictly shaped values ever reach the PDF page HTML.

const NAMES = [
  '--doc-primary-bg', '--doc-primary', '--doc-primary-ink', '--doc-primary-dark', '--doc-primary-darker',
  '--doc-primary-light', '--doc-primary-lighter', '--doc-primary-tint', '--doc-primary-strip', '--doc-primary-fade',
  '--doc-secondary', '--doc-secondary-ink', '--doc-secondary-dark', '--doc-secondary-light', '--doc-secondary-bg',
  '--doc-secondary-strip',
] as const;

const HEX = /^#[0-9a-fA-F]{6}$/;
const STOP = '(?:#[0-9a-fA-F]{6}|rgba\\(\\d{1,3}, \\d{1,3}, \\d{1,3}, (?:0|1|0?\\.\\d{1,3})\\))(?: \\d{1,3}%)?';
const GRADIENT = new RegExp(`^linear-gradient\\(\\d{1,3}deg(?:, ${STOP}){2,6}\\)$`);

export function sanitizeThemeVars(vars: unknown): Record<string, string> {
  if (!vars || typeof vars !== 'object' || Array.isArray(vars)) return {};
  const input = vars as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const name of NAMES) {
    const value = Object.prototype.hasOwnProperty.call(input, name) ? input[name] : undefined;
    if (typeof value === 'string' && (HEX.test(value) || GRADIENT.test(value))) out[name] = value.toLowerCase();
  }
  return out;
}

export function buildThemeHead(vars: unknown): string {
  const clean = sanitizeThemeVars(vars);
  const entries = Object.entries(clean);
  if (entries.length === 0) return '';
  return `<style>:root{${entries.map(([k, v]) => `${k}:${v};`).join('')}}</style>`;
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm --prefix server test` then `npm --prefix client test`
Expected: server and client suites pass (including the new cross-package test).

- [ ] **Step 5: Wire it into the resume PDF controller**

In `server/src/controllers/pdf.ts`, add the import after the fonts import:

```ts
import { buildThemeHead } from "../utils/theme-vars";
```

Change the request destructuring to:

```ts
    const { html, template, data, themeVars } = req.body;
```

Add the color head on the line after the font head in the `<head>`:

```ts
          ${buildFontHead(String(template), data?.fontFamily)}
          ${buildThemeHead(themeVars)}
```

- [ ] **Step 6: Type-check and test**

Run in `server/`: `npx tsc --noEmit && npx vitest run`
Expected: no type errors, all tests pass.

- [ ] **Step 7: Commit**

```bash
git add server/src/utils/theme-vars.ts server/src/utils/theme-vars.test.ts server/src/controllers/pdf.ts client/src/utils/color-theme.server.test.ts
git commit -m "feat(server): sanitize and emit resume color variables in the PDF head

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Template CSS reads the color variables

**Files:**
- Create (temporary, deleted before the commit): `client/scripts/migrate-theme-colors.mjs`, `client/scripts/verify-theme-colors.mjs`
- Create: `client/src/styles/template-colors.test.ts`
- Modify: `client/src/styles/templates/galaxy/andromeda.css`, `client/src/styles/templates/greek/athena.css`, `client/src/styles/templates/greek/zeus.css`, `client/src/styles/templates/greek/artemis.css`

**Interfaces:**
- Produces: the four stylesheets read the 16 `--doc-primary*` / `--doc-secondary*` variables from Task 1/2, each with the current color as the fallback.

- [ ] **Step 1: Write the failing guard test**

Create `client/src/styles/template-colors.test.ts`:

```ts
/// <reference types="node" />
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = path.dirname(fileURLToPath(import.meta.url));

// Theme-bearing literals per stylesheet. Each must now appear only inside a var(--doc-primary|secondary..., fallback).
const THEME_LITERALS: Record<string, string[]> = {
  "templates/galaxy/andromeda.css": ["#2563eb", "#dbeafe", "#0496c7", "rgba(73, 64, 245", "rgba(67, 67, 222", "rgba(0, 212, 255"],
  "templates/greek/athena.css": ["#2563eb", "#1e40af", "#1e3a8a", "#bfdbfe", "#e0e7ff", "#93c5fd", "#059669", "#2b6cb5", "#3b82f6", "#60a5fa", "rgba(147, 197, 253", "rgba(37, 99, 235"],
  "templates/greek/zeus.css": ["#d4af37", "#ffd700", "#b8860b", "#1a2855", "#2d4a9a", "rgba(255, 215, 0"],
  "templates/greek/artemis.css": ["#667eea", "#764ba2", "linear-gradient(135deg, #1a202c"],
};

/** Removes every var(--doc-primary*|secondary*, ...) construct, including its fallback, with balanced parentheses. */
function stripColorVars(css: string): string {
  let out = "";
  let i = 0;
  while (i < css.length) {
    const found = css.slice(i).search(/var\(--doc-(primary|secondary)/);
    if (found === -1) {
      out += css.slice(i);
      break;
    }
    const start = i + found;
    out += css.slice(i, start);
    let depth = 1;
    let j = start + 4;
    while (j < css.length && depth > 0) {
      if (css[j] === "(") depth++;
      else if (css[j] === ")") depth--;
      j++;
    }
    i = j;
  }
  return out;
}

describe("themeable template CSS reads the color variables", () => {
  Object.entries(THEME_LITERALS).forEach(([file, literals]) => {
    const css = fs.readFileSync(path.join(here, file), "utf8");

    it(`${file}: no raw theme literal remains outside a var() fallback`, () => {
      const stripped = stripColorVars(css).toLowerCase();
      literals.forEach((lit) => expect(stripped, `${lit} in ${file}`).not.toContain(lit.toLowerCase()));
    });

    it(`${file}: uses the primary color variables`, () => {
      expect(css).toMatch(/var\(--doc-primary/);
    });
  });

  it("zeus and artemis also use the secondary color variables", () => {
    ["templates/greek/zeus.css", "templates/greek/artemis.css"].forEach((file) => {
      expect(fs.readFileSync(path.join(here, file), "utf8"), file).toMatch(/var\(--doc-secondary/);
    });
  });

  it("andromeda and athena have no secondary variables", () => {
    ["templates/galaxy/andromeda.css", "templates/greek/athena.css"].forEach((file) => {
      expect(fs.readFileSync(path.join(here, file), "utf8"), file).not.toMatch(/--doc-secondary/);
    });
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run in `client/`: `npx vitest run src/styles/template-colors.test.ts`
Expected: FAIL (raw literals still present, no `--doc-primary` references).

- [ ] **Step 3: Create the migration script**

Run `mkdir -p client/scripts`, then create `client/scripts/migrate-theme-colors.mjs`:

```js
import fs from 'node:fs';
import path from 'node:path';

// Usage (from client/): node scripts/migrate-theme-colors.mjs src/styles/templates
// Each entry replaces one color literal inside one rule with var(--doc-<role>, <literal>), so a document
// with no color choice renders exactly as before. Every entry must match exactly one rule and one occurrence.
const root = process.argv[2];
const v = (role, lit) => `var(--doc-${role}, ${lit})`;
const mixv = (role, lit, pct) => `color-mix(in srgb, var(--doc-${role}, ${lit}) ${pct}%, transparent)`;
const E = (file, sel, from, to, all = false) => ({ file, sel, from, to, all });

const ANDROMEDA_HEADER = 'linear-gradient(90deg, rgba(73, 64, 245, 1) 0%, rgba(67, 67, 222, 1) 21%, rgba(0, 212, 255, 1) 100%)';
const ATHENA_STRIP = 'linear-gradient(90deg, #2b6cb5 0%, #1e40af 25%, #3b82f6 50%, #60a5fa 75%, #93c5fd 100%)';
const ATHENA_SIDEBAR = 'linear-gradient(180deg, #1e3a8a 0%, #1e40af 30%, #2563eb 100%)';
const ATHENA_FADE = 'linear-gradient(90deg, #2563eb 0%, rgba(37, 99, 235, 0.2) 100%)';
const ZEUS_STRIP = 'linear-gradient(90deg, #d4af37 0%, #ffd700 25%, #b8860b 50%, #ffd700 75%, #d4af37 100%)';
const ZEUS_HEADER = 'linear-gradient(135deg, #1a2855 0%, #2d4a9a 50%, #1a2855 100%)';
const ARTEMIS_PURPLE = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
const ARTEMIS_HEADER = 'linear-gradient(135deg, #1a202c 0%, #2d3748 50%, #4a5568 100%)';

const A = 'galaxy/andromeda.css', T = 'greek/athena.css', Z = 'greek/zeus.css', R = 'greek/artemis.css';

const ENTRIES = [
  // Andromeda (primary: header)
  E(A, '.header', ANDROMEDA_HEADER, v('primary-bg', ANDROMEDA_HEADER)),
  E(A, '.section-title', '#2563eb', v('primary-ink', '#2563eb')),
  E(A, '.keyword, .language, .interest', '#0496C7', v('primary-dark', '#0496C7')),
  E(A, '.technology', '#dbeafe', v('primary-tint', '#dbeafe')),
  E(A, '.technology', '#2563eb', v('primary-ink', '#2563eb')),
  E(A, '.reference', '#dbeafe', v('primary-tint', '#dbeafe')),
  // Athena (primary: sidebar)
  E(T, '.resume-main-container', ATHENA_STRIP, v('primary-strip', ATHENA_STRIP)),
  E(T, '.resume-sidebar', ATHENA_SIDEBAR, v('primary-bg', ATHENA_SIDEBAR)),
  E(T, '.sidebar-title', '#bfdbfe', v('primary-light', '#bfdbfe')),
  E(T, '.sidebar-contact-item', '#e0e7ff', v('primary-lighter', '#e0e7ff')),
  E(T, '.sidebar-contact-item a', '#bfdbfe', v('primary-light', '#bfdbfe')),
  E(T, '.sidebar-section-title', 'linear-gradient(#93c5fd, #93c5fd)', `linear-gradient(${v('primary-light', '#93c5fd')}, ${v('primary-light', '#93c5fd')})`),
  E(T, '.sidebar-edu-school', '#bfdbfe', v('primary-light', '#bfdbfe')),
  E(T, '.sidebar-edu-date', '#e0e7ff', v('primary-lighter', '#e0e7ff')),
  E(T, '.sidebar-project-desc', '#bfdbfe', v('primary-light', '#bfdbfe')),
  E(T, '.sidebar-tech-tag', 'rgba(147, 197, 253, 0.2)', mixv('primary-light', '#93c5fd', 20)),
  E(T, '.sidebar-tech-tag', 'rgba(147, 197, 253, 0.3)', mixv('primary-light', '#93c5fd', 30)),
  E(T, '.sidebar-tech-tag', 'color: #93c5fd', 'color: ' + v('primary-light', '#93c5fd')),
  E(T, '.sidebar-cert-org', '#bfdbfe', v('primary-light', '#bfdbfe')),
  E(T, '.sidebar-cert-date, .sidebar-award-date', '#e0e7ff', v('primary-lighter', '#e0e7ff')),
  E(T, '.main-section-title', '#1e40af', v('primary-darker', '#1e40af')),
  E(T, '.main-section-title', ATHENA_FADE, v('primary-fade', ATHENA_FADE)),
  E(T, '.main-social-link', '#2563eb', v('primary-ink', '#2563eb')),
  E(T, '.main-social-link:hover', '#2563eb', v('primary-dark', '#2563eb'), true),
  E(T, '.main-summary', '#2563eb', v('primary', '#2563eb')),
  E(T, '.main-exp-company', '#2563eb', v('primary-ink', '#2563eb')),
  E(T, '.tech-tag, .sidebar-language-tag', '#2563eb', v('primary-dark', '#2563eb')),
  E(T, '.sidebar-language-tag', '#059669', v('primary-darker', '#059669')),
  // Zeus (primary: header, secondary: gold accents)
  E(Z, '.greek-border-top', ZEUS_STRIP, v('secondary-strip', ZEUS_STRIP)),
  E(Z, '.greek-header', ZEUS_HEADER, v('primary-bg', ZEUS_HEADER)),
  E(Z, '.greek-header', '#ffd700', v('secondary-light', '#ffd700')),
  E(Z, '.greek-header', '#d4af37', v('secondary', '#d4af37')),
  E(Z, '.greek-laurel-left, .greek-laurel-right', '#ffd700', v('secondary-light', '#ffd700')),
  E(Z, '.greek-name', '#ffd700', v('secondary-light', '#ffd700')),
  E(Z, '.greek-contact a', '#ffd700', v('secondary-light', '#ffd700')),
  E(Z, '.greek-contact a:hover', 'rgba(255, 215, 0, 0.6)', mixv('secondary-light', '#ffd700', 60)),
  E(Z, '.greek-socials a', '#ffd700', v('secondary-light', '#ffd700')),
  E(Z, '.greek-socials a:hover', 'rgba(255, 215, 0, 0.8)', mixv('secondary-light', '#ffd700', 80)),
  E(Z, '.greek-section', '#d4af37', v('secondary', '#d4af37')),
  E(Z, '.greek-section-title', '#1a2855', v('primary-darker', '#1a2855')),
  E(Z, '.greek-section-title', '#d4af37', v('secondary', '#d4af37')),
  E(Z, '.greek-icon', '#d4af37', v('secondary', '#d4af37')),
  E(Z, '.greek-item', '#b8860b', v('secondary-dark', '#b8860b')),
  E(Z, '.greek-item-header', '#1a2855', v('primary-darker', '#1a2855')),
  E(Z, '.greek-item-title', '#2d4a9a', v('primary-ink', '#2d4a9a')),
  E(Z, '.greek-item-date', '#b8860b', v('secondary-ink', '#b8860b')),
  E(Z, 'ul.list-disc li::marker', '#d4af37', v('secondary', '#d4af37')),
  // Artemis (primary: header, secondary: sidebar and main-column accents)
  E(R, '.resume-sidebar', ARTEMIS_PURPLE, v('secondary-bg', ARTEMIS_PURPLE)),
  E(R, '.resume-header', ARTEMIS_HEADER, v('primary-bg', ARTEMIS_HEADER)),
  E(R, '.main-section-title', ARTEMIS_PURPLE, v('secondary-bg', ARTEMIS_PURPLE)),
  E(R, '.main-summary', '#667eea', v('secondary', '#667eea')),
  E(R, '.main-exp-company', '#667eea', v('secondary-ink', '#667eea')),
  E(R, '.main-exp-desc li::marker', '#667eea', v('secondary', '#667eea')),
];

const BLOCK = /([^{}]+)\{([^{}]*)\}/g;
const normSel = (raw) => raw.replace(/\/\*[\s\S]*?\*\//g, '').trim().replace(/\s+/g, ' ');

let problems = 0;
for (const rel of [...new Set(ENTRIES.map((e) => e.file))]) {
  const file = path.join(root, rel);
  let css = fs.readFileSync(file, 'utf8');
  for (const e of ENTRIES.filter((x) => x.file === rel)) {
    const hits = [...css.matchAll(BLOCK)].filter((m) => normSel(m[1]) === e.sel && m[2].includes(e.from));
    if (hits.length !== 1) {
      console.error(`${rel}: selector "${e.sel}" with ${e.from.slice(0, 40)} matched ${hits.length} rules`);
      problems++;
      continue;
    }
    const m = hits[0];
    const count = m[2].split(e.from).length - 1;
    if (count === 0 || (count > 1 && !e.all)) {
      console.error(`${rel}: "${e.sel}" has ${count} occurrences of ${e.from.slice(0, 50)}`);
      problems++;
      continue;
    }
    const body = e.all ? m[2].split(e.from).join(e.to) : m[2].replace(e.from, () => e.to);
    css = css.slice(0, m.index) + m[1] + '{' + body + '}' + css.slice(m.index + m[0].length);
  }
  fs.writeFileSync(file, css);
}
if (problems) process.exit(1);
console.log('ok');
```

Create `client/scripts/verify-theme-colors.mjs`:

```js
import fs from 'node:fs';
import path from 'node:path';

// Usage: node scripts/verify-theme-colors.mjs <migratedDir> <originalDir>
// Unwraps every color var(--doc-primary*|secondary*, fallback) (font variables are left alone) and
// color-mix(...) back to the original literal and checks the result equals the original CSS,
// i.e. the migration changed nothing else.
const [migrated, original] = process.argv.slice(2);
const FILES = ['galaxy/andromeda.css', 'greek/athena.css', 'greek/zeus.css', 'greek/artemis.css'];

function unwrapVars(css) {
  let out = '';
  let i = 0;
  while (i < css.length) {
    const found = css.slice(i).search(/var\(--doc-(primary|secondary)/);
    const start = found === -1 ? -1 : i + found;
    if (start === -1) {
      out += css.slice(i);
      break;
    }
    out += css.slice(i, start);
    let depth = 1;
    let j = start + 4;
    while (j < css.length && depth > 0) {
      if (css[j] === '(') depth++;
      else if (css[j] === ')') depth--;
      j++;
    }
    const inner = css.slice(start + 4, j - 1); // --doc-x, fallback
    const comma = inner.indexOf(',');
    out += unwrapVars(inner.slice(comma + 1).trim());
    i = j;
  }
  return out;
}

const unmix = (css) =>
  css.replace(/color-mix\(in srgb, #([0-9a-fA-F]{6}) (\d+)%, transparent\)/g, (_, hex, pct) => {
    const [r, g, b] = [0, 2, 4].map((k) => parseInt(hex.slice(k, k + 2), 16));
    return `rgba(${r}, ${g}, ${b}, ${Number(pct) / 100})`;
  });

const norm = (s) => s.replace(/\r\n/g, '\n').replace(/[ \t]+$/gm, '').replace(/\n+$/g, '');

let bad = 0;
for (const rel of FILES) {
  const a = norm(unmix(unwrapVars(fs.readFileSync(path.join(migrated, rel), 'utf8'))));
  const b = norm(fs.readFileSync(path.join(original, rel), 'utf8'));
  if (a !== b) {
    bad++;
    console.error('NOT LOSSLESS:', rel);
  }
}
console.log(bad ? `${bad} file(s) differ` : 'lossless');
process.exit(bad ? 1 : 0);
```

- [ ] **Step 4: Snapshot the originals, migrate, verify**

Run in `client/`:

```bash
rm -rf ../.theme-orig && cp -r src/styles/templates ../.theme-orig
node scripts/migrate-theme-colors.mjs src/styles/templates
node scripts/verify-theme-colors.mjs src/styles/templates ../.theme-orig
```

Expected: `ok` from the migration and `lossless` from the verifier. If the migration prints `matched 0 rules` or `occurrences`, a stylesheet changed since this plan was written: open that rule, adjust that one entry's `sel`/`from` in the `ENTRIES` table to the current text, restore with `rm -rf src/styles/templates && cp -r ../.theme-orig src/styles/templates`, and re-run from the start of this step. Record any such change in the ledger as a ruling.

- [ ] **Step 5: Clean up the helpers**

```bash
rm -rf ../.theme-orig scripts/migrate-theme-colors.mjs scripts/verify-theme-colors.mjs
rmdir scripts 2>/dev/null || true
```

- [ ] **Step 6: Run the guard test and the whole client suite**

Run in `client/`: `npx vitest run`
Expected: everything passes, including `template-colors.test.ts` and the existing font guard test. Restore the snapshot file afterwards: `git checkout -- src/components/templates/__snapshots__`.

- [ ] **Step 7: Commit**

```bash
git add client/src/styles
git commit -m "feat(client): drive Andromeda, Athena, Zeus and Artemis colors from theme variables

Each theme color keeps its current value as the var() fallback, so documents
without a color choice render exactly as before.

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Data field and PDF payload

**Files:**
- Modify: `client/src/types/interface.resume-form-data.ts`
- Modify: `client/src/utils/helper.ts`
- Create: `client/src/utils/helper.test.ts`

**Interfaces:**
- Consumes: `ColorTheme`, `buildThemeVars` from `@/utils/color-theme` (Task 1).
- Produces: `ResumeFormData.colorTheme?: ColorTheme`; `pdfPayload(...)` returns `{ html, data, template, themeVars }`.

- [ ] **Step 1: Write the failing test**

Create `client/src/utils/helper.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { pdfPayload } from "./helper";
import { buildThemeVars, type ColorTheme } from "./color-theme";

describe("pdfPayload themeVars", () => {
  it("is empty when the resume has no color choice", () => {
    const payload = pdfPayload({ personal: {} }, "<div/>", "athena");
    expect(payload.themeVars).toEqual({});
  });

  it("carries the computed variables for the active template", () => {
    const theme: ColorTheme = { template: "athena", primary: { type: "solid", color: "#be123c" } };
    const payload = pdfPayload({ colorTheme: theme }, "<div/>", "athena");
    expect(payload.themeVars).toEqual(buildThemeVars("athena", theme));
    expect(payload.themeVars["--doc-primary"]).toBe("#be123c");
  });

  it("ignores a theme saved for another template", () => {
    const theme: ColorTheme = { template: "zeus", primary: { type: "solid", color: "#be123c" } };
    expect(pdfPayload({ colorTheme: theme }, "<div/>", "athena").themeVars).toEqual({});
  });

  it("keeps the existing payload fields", () => {
    const payload = pdfPayload({ a: 1 }, "<p>x</p>", "zeus");
    expect(payload.template).toBe("zeus");
    expect(payload.data).toEqual({ a: 1 });
    expect(payload.html).toContain("<p>x</p>");
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run in `client/`: `npx vitest run src/utils/helper.test.ts`
Expected: FAIL (`themeVars` is undefined). If instead the test file fails to import `./helper` (for example an environment variable or browser global is needed at import time), set up the minimum in the test (`vi.stubGlobal` / `import.meta.env`) and record the change as a ledger ruling.

- [ ] **Step 3: Implement**

In `client/src/types/interface.resume-form-data.ts`, add the import next to the others and the field:

```ts
import type { ColorTheme } from "@/utils/color-theme";
```

```ts
  colorTheme?: ColorTheme;
```

(place the field right after `fontFamily?: SavedFont;`).

In `client/src/utils/helper.ts`, add the import with the other imports at the top:

```ts
import { buildThemeVars } from "@/utils/color-theme";
```

and change `pdfPayload`'s payload to include the variables:

```ts
  const payload = {
    html: fullHtml,
    data: data,
    template: template,
    themeVars: buildThemeVars(template, (data as { colorTheme?: unknown }).colorTheme),
  }
```

Leave `pdfPayloadv2` (cover letters) unchanged.

- [ ] **Step 4: Run to verify pass, type-check**

Run in `client/`: `npx vitest run src/utils/helper.test.ts && npx tsc -b`
Expected: PASS and no type errors.

- [ ] **Step 5: Commit**

```bash
git add client/src/types/interface.resume-form-data.ts client/src/utils/helper.ts client/src/utils/helper.test.ts
git commit -m "feat(client): add colorTheme to resume data and send themeVars with the PDF request

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Color tab UI

**Files:**
- Modify: `client/package.json`, `client/package-lock.json` (dependency)
- Create: `client/src/components/ColorPanel.tsx`
- Create: `client/src/components/ColorPanel.test.tsx`
- Modify: `client/src/components/DesignPanel.tsx`
- Modify: `client/src/components/DesignPanel.test.tsx`

**Interfaces:**
- Consumes: everything exported by `client/src/utils/color-theme.ts` (Task 1).
- Produces: `<ColorPanel template theme onChange isDarkMode />` (renders a fragment: scrolling body plus footer, like `SectionOrderPanel`); `DesignPanel` gains `color?: { template: ColorTemplate; theme?: ColorTheme; onChange: (next: ColorTheme | undefined) => void }` and `DesignTab` becomes `'sections' | 'font' | 'color'`.

- [ ] **Step 1: Add the color picker dependency**

Run in `client/`: `npm install react-colorful@^5.6.1`
Expected: `react-colorful` appears in `client/package.json` dependencies.

- [ ] **Step 2: Write the failing ColorPanel tests**

Create `client/src/components/ColorPanel.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import type { ComponentProps } from "react";
import { renderToString } from "react-dom/server";
import ColorPanel from "@/components/ColorPanel";
import { PALETTE, type ColorTheme } from "@/utils/color-theme";

const noop = () => {};
const render = (over: Partial<ComponentProps<typeof ColorPanel>> = {}) =>
  renderToString(<ColorPanel template="andromeda" theme={undefined} onChange={noop} isDarkMode={false} {...over} />);

describe("ColorPanel", () => {
  it("andromeda: only a Primary section labelled Header", () => {
    const html = render({ template: "andromeda" });
    expect(html).toContain("Primary");
    expect(html).toContain("Header");
    expect(html).not.toContain("Secondary");
  });

  it("athena: Primary section labelled Sidebar, no secondary", () => {
    const html = render({ template: "athena" });
    expect(html).toContain("Sidebar");
    expect(html).not.toContain("Secondary");
  });

  it("zeus: Primary (Header) and Secondary (Accents)", () => {
    const html = render({ template: "zeus" });
    expect(html).toContain("Primary");
    expect(html).toContain("Secondary");
    expect(html).toContain("Accents");
  });

  it("artemis: Secondary is the Sidebar", () => {
    const html = render({ template: "artemis" });
    expect(html).toContain("Secondary");
    expect(html).toContain("Sidebar");
  });

  it("offers Default, all 8 palette swatches and Custom for the primary", () => {
    const html = render({ template: "andromeda" });
    expect(html).toContain('aria-label="Default"');
    PALETTE.forEach((c) => expect(html).toContain(`aria-label="${c.name}"`));
    expect(html).toContain('aria-label="Custom"');
  });

  it("marks Default active when nothing is set, and exactly the picked swatch when one is", () => {
    expect(render().match(/aria-label="Default"[^>]*aria-pressed="true"/)).not.toBeNull();
    const theme: ColorTheme = { template: "andromeda", primary: { type: "solid", color: "#2563eb" } };
    const html = render({ theme });
    expect(html.match(/aria-label="Blue"[^>]*aria-pressed="true"/)).not.toBeNull();
    expect(html.match(/aria-label="Navy"[^>]*aria-pressed="true"/)).toBeNull();
    expect(html.match(/aria-label="Default"[^>]*aria-pressed="true"/)).toBeNull();
  });

  it("shows Solid and Gradient modes; direction and stop controls only for a gradient", () => {
    const solid = render();
    expect(solid).toContain("Solid");
    expect(solid).toContain("Gradient");
    expect(solid).not.toContain('aria-label="Horizontal"');
    const theme: ColorTheme = { template: "andromeda", primary: { type: "gradient", from: "#1e3a8a", to: "#be123c", direction: "diagonal" } };
    const grad = render({ theme });
    ["Horizontal", "Diagonal", "Vertical"].forEach((d) => expect(grad).toContain(`aria-label="${d}"`));
    expect(grad).toContain("Start");
    expect(grad).toContain("End");
    expect(grad.match(/aria-label="Diagonal"[^>]*aria-pressed="true"/)).not.toBeNull();
  });

  it("enables Reset all colors only when a choice is saved for this template", () => {
    // shadcn buttons always carry a "disabled:" utility class, so match the attribute itself
    const resetDisabled = (html: string) => /<button[^>]*sdisabled=""[^>]*>(?:<[^>]*>)*Reset all colors/.test(html);
    expect(render()).toContain("Reset all colors");
    expect(resetDisabled(render())).toBe(true);
    const theme: ColorTheme = { template: "andromeda", primary: { type: "solid", color: "#2563eb" } };
    expect(resetDisabled(render({ theme }))).toBe(false);
    const other: ColorTheme = { template: "zeus", primary: { type: "solid", color: "#2563eb" } };
    expect(resetDisabled(render({ theme: other }))).toBe(true); // a theme saved for another template does not count
  });
});
```

Add three tests to `client/src/components/DesignPanel.test.tsx` (inside the existing `describe("DesignPanel", …)` block, and add the import `import type { ColorTheme } from "@/utils/color-theme";` is not needed):

```tsx
  it("adds a Color tab for a themeable template", () => {
    const html = render({ tab: "color", template: "zeus", color: { template: "zeus", theme: undefined, onChange: noop } });
    expect(html.match(/role="tab"/g)).toHaveLength(3);
    expect(html).toContain(">Color<");
    expect(html).toContain("Reset all colors");
    expect(html).not.toContain("Drag sections to reorder");
    expect(html).not.toContain("Cinzel headings");
  });

  it("has no Color tab when the template is not themeable", () => {
    const html = render({ tab: "color" });
    expect(html.match(/role="tab"/g)).toHaveLength(2);
    expect(html).not.toContain(">Color<");
    expect(html).toContain("Inter"); // falls back to the Font view
  });

  it("cover letters (no sections, no color) still have no tabs", () => {
    const html = render({ sections: undefined, color: undefined, tab: "color", template: "ventus" });
    expect(html).not.toContain('role="tab"');
    expect(html).toContain("IBM Plex Sans");
  });
```

- [ ] **Step 3: Run to verify failure**

Run in `client/`: `npx vitest run src/components/ColorPanel.test.tsx src/components/DesignPanel.test.tsx`
Expected: FAIL (`@/components/ColorPanel` missing; the new DesignPanel tests fail).

- [ ] **Step 4: Write the ColorPanel**

Create `client/src/components/ColorPanel.tsx`:

```tsx
import React, { useState } from "react";
import { ArrowDown, ArrowDownRight, ArrowRight, RotateCcw } from "lucide-react";
import { HexColorInput, HexColorPicker } from "react-colorful";
import { Button } from "@/components/ui/button";
import {
  COLOR_TEMPLATES,
  PALETTE,
  fillPreview,
  mix,
  previewSecondary,
  rawFillPreview,
  readTheme,
  withPrimary,
  withSecondary,
  type ColorTemplate,
  type ColorTheme,
  type Direction,
  type PrimaryFill,
} from "@/utils/color-theme";

const CUSTOM_BG = "conic-gradient(red, yellow, lime, aqua, blue, magenta, red)";

const DIRECTIONS: Array<{ id: Direction; label: string; Icon: React.ComponentType<{ className?: string }> }> = [
  { id: "horizontal", label: "Horizontal", Icon: ArrowRight },
  { id: "diagonal", label: "Diagonal", Icon: ArrowDownRight },
  { id: "vertical", label: "Vertical", Icon: ArrowDown },
];

const defaultFirst = (fill: PrimaryFill): string => (fill.type === "solid" ? fill.color : fill.from);

interface SwatchProps {
  label: string;
  background: string;
  active: boolean;
  onClick: () => void;
  isDarkMode: boolean;
}

const Swatch: React.FC<SwatchProps> = ({ label, background, active, onClick, isDarkMode }) => (
  <button
    type="button"
    aria-label={label}
    aria-pressed={active}
    title={label}
    onClick={onClick}
    className={`h-8 w-8 rounded-full border-2 transition-transform hover:scale-110 ${
      active ? "border-indigo-500 ring-2 ring-indigo-300" : isDarkMode ? "border-gray-600" : "border-gray-300"
    }`}
    style={{ background }}
  />
);

interface SwatchGridProps {
  isDarkMode: boolean;
  defaultBackground: string;
  isDefaultActive: boolean;
  /** The color currently being edited (the solid color, the active gradient stop, or the secondary). */
  activeColor?: string;
  /** How a palette color is shown, e.g. darkened when it sits under white text. */
  adjust: (hex: string) => string;
  onDefault: () => void;
  onPick: (hex: string) => void;
  customOpen: boolean;
  onCustomToggle: () => void;
  customColor: string;
}

const SwatchGrid: React.FC<SwatchGridProps> = ({
  isDarkMode, defaultBackground, isDefaultActive, activeColor, adjust, onDefault, onPick, customOpen, onCustomToggle, customColor,
}) => {
  const inPalette = PALETTE.some((c) => c.hex === activeColor);
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <Swatch label="Default" background={defaultBackground} active={isDefaultActive} onClick={onDefault} isDarkMode={isDarkMode} />
        {PALETTE.map((c) => (
          <Swatch key={c.id} label={c.name} background={adjust(c.hex)} active={!isDefaultActive && activeColor === c.hex} onClick={() => onPick(c.hex)} isDarkMode={isDarkMode} />
        ))}
        <Swatch label="Custom" background={CUSTOM_BG} active={!isDefaultActive && !!activeColor && !inPalette} onClick={onCustomToggle} isDarkMode={isDarkMode} />
      </div>
      {customOpen && (
        <div className="mt-3 space-y-2">
          <HexColorPicker color={customColor} onChange={onPick} style={{ width: "100%" }} />
          <HexColorInput
            color={customColor}
            onChange={onPick}
            prefixed
            aria-label="Hex color"
            className={`w-full rounded-md border px-2 py-1 text-sm ${isDarkMode ? "border-gray-600 bg-gray-700 text-gray-100" : "border-gray-300 bg-white text-gray-900"}`}
          />
        </div>
      )}
    </div>
  );
};

interface SectionProps {
  template: ColorTemplate;
  theme: ColorTheme | undefined;
  onChange: (next: ColorTheme | undefined) => void;
  isDarkMode: boolean;
}

const segmentClass = (active: boolean, isDarkMode: boolean) =>
  `px-3 py-1 text-xs font-medium ${active ? "bg-indigo-500 text-white" : isDarkMode ? "bg-gray-700 text-gray-300" : "bg-white text-gray-700"}`;

const PrimarySection: React.FC<SectionProps> = ({ template, theme, onChange, isDarkMode }) => {
  const cfg = COLOR_TEMPLATES[template];
  const fill = theme?.primary;
  const [customOpen, setCustomOpen] = useState(false);
  const [activeStop, setActiveStop] = useState<"from" | "to">("from");
  const firstColor = fill ? defaultFirst(fill) : defaultFirst(cfg.defaultPrimary);
  const set = (next: PrimaryFill | undefined) => onChange(withPrimary(template, theme, next));
  const gradient = fill && fill.type === "gradient" ? fill : undefined;
  const editedColor = !fill ? undefined : gradient ? gradient[activeStop] : fill.type === "solid" ? fill.color : undefined;

  const applyColor = (hex: string) => {
    if (gradient) set(activeStop === "from" ? { ...gradient, from: hex } : { ...gradient, to: hex });
    else set({ type: "solid", color: hex });
  };

  return (
    <section aria-label={`Primary ${cfg.primaryLabel}`}>
      <h3 className="text-sm font-semibold">
        Primary <span className="font-normal text-gray-500">· {cfg.primaryLabel}</span>
      </h3>
      <div role="group" aria-label="Fill type" className="my-3 inline-flex overflow-hidden rounded-md border border-gray-300 dark:border-gray-600">
        <button type="button" aria-pressed={!gradient} className={segmentClass(!gradient, isDarkMode)} onClick={() => gradient && set({ type: "solid", color: firstColor })}>
          Solid
        </button>
        <button
          type="button"
          aria-pressed={!!gradient}
          className={segmentClass(!!gradient, isDarkMode)}
          onClick={() => !gradient && set({ type: "gradient", from: firstColor, to: mix(firstColor, "#000000", 0.35), direction: "diagonal" })}
        >
          Gradient
        </button>
      </div>

      {gradient && (
        <div className="mb-3 space-y-3">
          <div className="h-8 rounded-md border border-gray-300 dark:border-gray-600" style={{ background: fillPreview(gradient) }} aria-label="Gradient preview" />
          <div className="flex items-center gap-2">
            {(["from", "to"] as const).map((stop) => (
              <button
                key={stop}
                type="button"
                aria-pressed={activeStop === stop}
                onClick={() => setActiveStop(stop)}
                className={`flex items-center gap-1 rounded-md border px-2 py-1 text-xs ${
                  activeStop === stop ? "border-indigo-500 ring-1 ring-indigo-300" : isDarkMode ? "border-gray-600" : "border-gray-300"
                }`}
              >
                <span className="inline-block h-4 w-4 rounded-full border border-gray-300" style={{ background: fillPreview({ type: "solid", color: gradient[stop] }) }} />
                {stop === "from" ? "Start" : "End"}
              </button>
            ))}
            <div role="group" aria-label="Direction" className="ml-auto flex gap-1">
              {DIRECTIONS.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  type="button"
                  aria-label={label}
                  aria-pressed={gradient.direction === id}
                  title={label}
                  onClick={() => set({ ...gradient, direction: id })}
                  className={`rounded-md border p-1 ${
                    gradient.direction === id ? "border-indigo-500 bg-indigo-50 text-indigo-600 dark:bg-gray-700" : isDarkMode ? "border-gray-600" : "border-gray-300"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <SwatchGrid
        isDarkMode={isDarkMode}
        defaultBackground={rawFillPreview(cfg.defaultPrimary)}
        isDefaultActive={!fill}
        activeColor={editedColor}
        adjust={(hex) => fillPreview({ type: "solid", color: hex })}
        onDefault={() => set(undefined)}
        onPick={applyColor}
        customOpen={customOpen}
        onCustomToggle={() => setCustomOpen((open) => !open)}
        customColor={editedColor ?? firstColor}
      />
    </section>
  );
};

const SecondarySection: React.FC<SectionProps> = ({ template, theme, onChange, isDarkMode }) => {
  const cfg = COLOR_TEMPLATES[template];
  const secondary = theme?.secondary;
  const [customOpen, setCustomOpen] = useState(false);
  return (
    <section aria-label={`Secondary ${cfg.secondaryLabel}`}>
      <h3 className="mb-3 text-sm font-semibold">
        Secondary <span className="font-normal text-gray-500">· {cfg.secondaryLabel}</span>
      </h3>
      <SwatchGrid
        isDarkMode={isDarkMode}
        defaultBackground={cfg.defaultSecondary ?? "#cccccc"}
        isDefaultActive={!secondary}
        activeColor={secondary}
        adjust={(hex) => previewSecondary(template, hex)}
        onDefault={() => onChange(withSecondary(template, theme, undefined))}
        onPick={(hex) => onChange(withSecondary(template, theme, hex))}
        customOpen={customOpen}
        onCustomToggle={() => setCustomOpen((open) => !open)}
        customColor={secondary ?? cfg.defaultSecondary ?? "#cccccc"}
      />
    </section>
  );
};

interface ColorPanelProps {
  template: ColorTemplate;
  theme: ColorTheme | undefined;
  onChange: (next: ColorTheme | undefined) => void;
  isDarkMode: boolean;
}

// content only: DesignPanel supplies the side panel, its header and the tabs
const ColorPanel: React.FC<ColorPanelProps> = ({ template, theme, onChange, isDarkMode }) => {
  const current = readTheme(template, theme);
  return (
    <>
      <div className="flex-1 space-y-6 overflow-y-auto p-4 no-scrollbar">
        <PrimarySection template={template} theme={current} onChange={onChange} isDarkMode={isDarkMode} />
        {COLOR_TEMPLATES[template].secondaryLabel && (
          <SecondarySection template={template} theme={current} onChange={onChange} isDarkMode={isDarkMode} />
        )}
      </div>
      <div className="border-t border-gray-200/50 p-4 dark:border-gray-700/50">
        <Button variant="outline" className="w-full" onClick={() => onChange(undefined)} disabled={!current}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Reset all colors
        </Button>
      </div>
    </>
  );
};

export default ColorPanel;
```

- [ ] **Step 5: Add the third tab to DesignPanel**

Replace the whole of `client/src/components/DesignPanel.tsx` with:

```tsx
import React, { useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import SectionOrderPanel from "@/components/SectionOrderPanel";
import ColorPanel from "@/components/ColorPanel";
import { FontList } from "@/components/FontList";
import { ensurePickerFontsLoaded } from "@/utils/load-picker-fonts";
import type { TemplateType } from "@/types";
import type { ResumeFormData } from "@/types/interface.resume-form-data";
import type { SectionLayout } from "@/utils/section-layout";
import type { ColorTemplate, ColorTheme } from "@/utils/color-theme";
import {
  TEMPLATE_DEFAULT_FONT,
  chooseFont,
  isUsableSavedFont,
  resolveFontId,
  type DocTemplate,
  type SavedFont,
} from "@/utils/fonts";

export type DesignTab = "sections" | "font" | "color";

interface DesignPanelProps {
  tab: DesignTab;
  onTabChange: (tab: DesignTab) => void;
  onClose: () => void;
  isDarkMode: boolean;
  template: DocTemplate;
  fontSaved?: SavedFont;
  onFontChange: (next: SavedFont | undefined) => void;
  /** Resumes only. Cover letters have no sections to order, so they get just the Font content with no tabs. */
  sections?: {
    template: TemplateType;
    data: ResumeFormData;
    layout: SectionLayout | undefined;
    onChange: (layout: SectionLayout | undefined) => void;
  };
  /** Themeable resume templates only (Andromeda, Athena, Zeus, Artemis). */
  color?: {
    template: ColorTemplate;
    theme: ColorTheme | undefined;
    onChange: (next: ColorTheme | undefined) => void;
  };
}

const TAB_LABELS: Record<DesignTab, string> = { sections: "Sections", font: "Font", color: "Color" };

const DesignPanel: React.FC<DesignPanelProps> = ({ tab, onTabChange, onClose, isDarkMode, template, fontSaved, onFontChange, sections, color }) => {
  const available: DesignTab[] = [...(sections ? (["sections"] as const) : []), "font", ...(color ? (["color"] as const) : [])];
  const active: DesignTab = available.includes(tab) ? tab : "font";

  useEffect(() => {
    if (active === "font") ensurePickerFontsLoaded();
  }, [active]);

  return (
    <aside
      className={`flex h-full w-80 shrink-0 flex-col border-l shadow-xl ${isDarkMode ? "bg-gray-800/95 border-gray-700/50" : "bg-white/95 border-gray-200/50"}`}
      aria-label="Design"
    >
      <div className="flex items-center justify-between border-b border-gray-200/50 p-4 dark:border-gray-700/50">
        <h2 className="text-lg font-semibold">Design</h2>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close design">
          <X size={16} />
        </Button>
      </div>

      {available.length > 1 && (
        <div role="tablist" aria-label="Design options" className="flex border-b border-gray-200/50 dark:border-gray-700/50">
          {available.map((id) => {
            const selected = id === active;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => onTabChange(id)}
                className={`flex-1 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                  selected
                    ? "border-indigo-500 text-indigo-600 dark:text-indigo-400"
                    : `border-transparent ${isDarkMode ? "text-gray-400 hover:text-gray-200" : "text-gray-500 hover:text-gray-800"}`
                }`}
              >
                {TAB_LABELS[id]}
              </button>
            );
          })}
        </div>
      )}

      {active === "sections" && sections ? (
        <SectionOrderPanel template={sections.template} data={sections.data} layout={sections.layout} onChange={sections.onChange} />
      ) : active === "color" && color ? (
        <ColorPanel template={color.template} theme={color.theme} onChange={color.onChange} isDarkMode={isDarkMode} />
      ) : (
        <div className="flex-1 overflow-y-auto py-2 no-scrollbar">
          <FontList
            activeId={resolveFontId(template, fontSaved)}
            defaultId={TEMPLATE_DEFAULT_FONT[template]}
            canReset={isUsableSavedFont(template, fontSaved)}
            isDarkMode={isDarkMode}
            onPick={(id) => onFontChange(chooseFont(template, id))}
            onReset={() => onFontChange(undefined)}
          />
        </div>
      )}
    </aside>
  );
};

export default DesignPanel;
```

- [ ] **Step 6: Run to verify pass, type-check, lint**

Run in `client/`:

```bash
npx vitest run src/components/ColorPanel.test.tsx src/components/DesignPanel.test.tsx
npx tsc -b
npx eslint src/components/ColorPanel.tsx src/components/DesignPanel.tsx
```

Expected: all tests pass; no type errors; no new lint problems. (If the active-swatch regexes in the tests do not match because React renders attributes in a different order, adjust the regex to the rendered order; the assertions' intent, not their exact pattern, is what matters.)

- [ ] **Step 7: Commit**

```bash
git add client/package.json client/package-lock.json client/src/components/ColorPanel.tsx client/src/components/ColorPanel.test.tsx client/src/components/DesignPanel.tsx client/src/components/DesignPanel.test.tsx
git commit -m "feat(client): add the Color tab to the Design panel

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Wire the Color tab into the resume Preview page

**Files:**
- Modify: `client/src/pages/Preview.tsx`

**Interfaces:**
- Consumes: `DesignPanel`'s `color` prop (Task 5), `ColorTheme`, `isColorTemplate` (Task 1), `ResumeFormData.colorTheme` (Task 4), the existing `queueRegenerate`, `handleFormSubmit`, `fontFamilyRef` patterns.
- Produces: `colorTheme` loaded from saved data, attached on every save/regenerate/export, changeable from the Color tab through the shared debounce.

`Preview.tsx` uses CRLF line endings. Apply every edit below with a script that normalizes `\r\n` to `\n`, performs exact-match replaces that throw if an anchor does not match exactly once, and writes the file back with `\r\n` (do not write backticks through a shell `-e` string; use a quoted heredoc file).

- [ ] **Step 1: Apply the edits**

1. Import (after the existing `import type { SavedFont } from '@/utils/fonts';`):

```tsx
import { isColorTemplate, type ColorTheme } from '@/utils/color-theme';
```

2. State and ref (after the `fontFamilyRef` declaration):

```tsx
  const [colorTheme, setColorTheme] = useState<ColorTheme | undefined>(undefined);
  const colorThemeRef = useRef<ColorTheme | undefined>(undefined);
```

3. Load the saved choice (after `setFontFamily(parsedData.fontFamily);` in `fetchResumeData`):

```tsx
          colorThemeRef.current = parsedData.colorTheme;
          setColorTheme(parsedData.colorTheme);
```

4. Attach it on every save and render. Change

```tsx
    const data: ResumeFormData = { ...formData, sectionLayout: sectionLayoutRef.current, fontFamily: fontFamilyRef.current };
```

to

```tsx
    const data: ResumeFormData = { ...formData, sectionLayout: sectionLayoutRef.current, fontFamily: fontFamilyRef.current, colorTheme: colorThemeRef.current };
```

and update the comment above it to `// the layout, font and color theme live outside the form; always attach the current ones (undefined is dropped from the JSON)`.

5. Add the change handler directly after `handleFontChange`:

```tsx
  const handleColorChange = (next: ColorTheme | undefined) => {
    colorThemeRef.current = next;
    setColorTheme(next);
    queueRegenerate();
  };
```

6. Export with the current color theme. Change

```tsx
handleExportPDF({ ...resumeData, sectionLayout: sectionLayoutRef.current, fontFamily: fontFamilyRef.current })
```

to

```tsx
handleExportPDF({ ...resumeData, sectionLayout: sectionLayoutRef.current, fontFamily: fontFamilyRef.current, colorTheme: colorThemeRef.current })
```

7. Pass the Color tab to the panel. In the `<DesignPanel …>` element add, after the `sections={{ … }}` prop:

```tsx
              color={isColorTemplate(activeTemplate) ? { template: activeTemplate, theme: colorTheme, onChange: handleColorChange } : undefined}
```

- [ ] **Step 2: Type-check, lint, test**

Run in `client/`:

```bash
npx tsc -b
npx eslint src/pages/Preview.tsx
npx vitest run
```

Expected: `tsc` clean; ESLint shows only the findings that already existed before this plan on `Preview.tsx` (one `'e' is defined but never used` error and the existing `exhaustive-deps` warnings; compare with `git stash; npx eslint src/pages/Preview.tsx; git stash pop` if unsure); all tests pass. Restore the snapshot file afterwards.

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/Preview.tsx
git commit -m "feat(client): wire the Color tab into the resume preview page

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Full verification

**Files:** none modified unless a check fails. The verification script below is temporary and deleted afterwards.

- [ ] **Step 1: Automated checks**

Run:

```bash
cd client && npx tsc -b && npx vitest run && npx eslint src/utils/color-theme.ts src/components/ColorPanel.tsx src/components/DesignPanel.tsx
cd ../server && npx tsc --noEmit && npx vitest run && npm run build
```

Expected: everything passes; no new lint problems. Restore the snapshot file: `git checkout -- client/src/components/templates/__snapshots__`.

- [ ] **Step 2: Browser check of computed colors**

Create `server/tmp-verify-colors.ts` (temporary), run it, then delete it. It renders the real stylesheets with the head the server now builds from the client's variables and asserts the computed colors:

```ts
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer';
import { buildThemeVars, ensureWhiteContrast, mix, type ColorTheme } from '../client/src/utils/color-theme';
import { buildThemeHead } from './src/utils/theme-vars';

const styles = path.resolve(__dirname, '../client/src/styles/templates');
const css = (rel: string) => fs.readFileSync(path.join(styles, rel), 'utf8');
const rgb = (hex: string) => `rgb(${[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(', ')})`;

type Check = { sel: string; prop: 'color' | 'backgroundColor' | 'backgroundImage'; expect: (v: string) => boolean; note: string };
type Case = { label: string; template: string; file: string; markup: string; theme?: ColorTheme; checks: Check[] };

const eq = (hex: string) => (v: string) => v === rgb(hex);
const has = (s: string) => (v: string) => v.includes(s);

const ANDRO = '<div class="header">H</div><h2 class="section-title">S</h2><span class="technology">T</span><span class="keyword">K</span>';
const ATHENA = '<div class="resume-sidebar"><div class="sidebar-title">T</div></div><span class="main-exp-company">C</span>';
const ZEUS = '<div class="greek-header"><h1 class="greek-name">Ada</h1></div><h2 class="greek-section-title">S</h2><i class="greek-icon">i</i>';
const ARTEMIS = '<div class="resume-sidebar">S</div><div class="resume-header">H</div><span class="main-exp-company">C</span>';

const cases: Case[] = [
  { label: 'andromeda default', template: 'andromeda', file: 'galaxy/andromeda.css', markup: ANDRO,
    checks: [{ sel: '.header', prop: 'backgroundImage', expect: has('linear-gradient'), note: 'default gradient header' }, { sel: '.section-title', prop: 'color', expect: eq('#2563eb'), note: 'default blue title' }] },
  { label: 'andromeda solid crimson', template: 'andromeda', file: 'galaxy/andromeda.css', markup: ANDRO,
    theme: { template: 'andromeda', primary: { type: 'solid', color: '#be123c' } },
    checks: [{ sel: '.header', prop: 'backgroundColor', expect: eq('#be123c'), note: 'header is crimson' }, { sel: '.section-title', prop: 'color', expect: eq('#be123c'), note: 'title follows' }] },
  { label: 'andromeda pale yellow gets darkened', template: 'andromeda', file: 'galaxy/andromeda.css', markup: ANDRO,
    theme: { template: 'andromeda', primary: { type: 'solid', color: '#ffff00' } },
    checks: [{ sel: '.header', prop: 'backgroundColor', expect: eq(ensureWhiteContrast('#ffff00')), note: 'header darkened for white text' }] },
  { label: 'andromeda gradient', template: 'andromeda', file: 'galaxy/andromeda.css', markup: ANDRO,
    theme: { template: 'andromeda', primary: { type: 'gradient', from: '#1e3a8a', to: '#be123c', direction: 'diagonal' } },
    checks: [{ sel: '.header', prop: 'backgroundImage', expect: (v) => v.includes('135deg') && v.includes(rgb('#1e3a8a')) && v.includes(rgb('#be123c')), note: 'diagonal navy-to-crimson' }] },
  { label: 'athena solid teal', template: 'athena', file: 'greek/athena.css', markup: ATHENA,
    theme: { template: 'athena', primary: { type: 'solid', color: '#0f766e' } },
    checks: [{ sel: '.resume-sidebar', prop: 'backgroundColor', expect: eq('#0f766e'), note: 'sidebar is teal' }, { sel: '.main-exp-company', prop: 'color', expect: eq('#0f766e'), note: 'company follows' }] },
  { label: 'athena theme saved for zeus is ignored', template: 'athena', file: 'greek/athena.css', markup: ATHENA,
    theme: { template: 'zeus', primary: { type: 'solid', color: '#0f766e' } },
    checks: [{ sel: '.main-exp-company', prop: 'color', expect: eq('#2563eb'), note: 'still default blue' }] },
  { label: 'zeus default', template: 'zeus', file: 'greek/zeus.css', markup: ZEUS,
    checks: [{ sel: '.greek-name', prop: 'color', expect: eq('#ffd700'), note: 'gold name' }, { sel: '.greek-section-title', prop: 'color', expect: eq('#1a2855'), note: 'navy title' }] },
  { label: 'zeus navy + crimson', template: 'zeus', file: 'greek/zeus.css', markup: ZEUS,
    theme: { template: 'zeus', primary: { type: 'solid', color: '#1e3a8a' }, secondary: '#be123c' },
    checks: [
      { sel: '.greek-header', prop: 'backgroundColor', expect: eq('#1e3a8a'), note: 'header navy' },
      { sel: '.greek-icon', prop: 'color', expect: eq('#be123c'), note: 'icons use the exact secondary' },
      { sel: '.greek-name', prop: 'color', expect: eq(mix('#be123c', '#ffffff', 0.35)), note: 'name uses the light secondary' },
    ] },
  { label: 'artemis default', template: 'artemis', file: 'greek/artemis.css', markup: ARTEMIS,
    checks: [{ sel: '.main-exp-company', prop: 'color', expect: eq('#667eea'), note: 'default purple company' }] },
  { label: 'artemis purple sidebar', template: 'artemis', file: 'greek/artemis.css', markup: ARTEMIS,
    theme: { template: 'artemis', secondary: '#6d28d9' },
    checks: [{ sel: '.resume-sidebar', prop: 'backgroundImage', expect: has(rgb('#6d28d9')), note: 'sidebar gradient starts at the pick' }, { sel: '.main-exp-company', prop: 'color', expect: eq('#6d28d9'), note: 'company follows' }] },
];

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  let failed = 0;
  for (const c of cases) {
    const page = await browser.newPage();
    const vars = buildThemeVars(c.template, c.theme);
    await page.setContent(`<html><head>${buildThemeHead(vars)}<style>${css(c.file)}</style></head><body>${c.markup}</body></html>`, { waitUntil: 'load' });
    for (const k of c.checks) {
      const value = await page.evaluate(([sel, prop]) => getComputedStyle(document.querySelector(sel as string)!)[prop as 'color'], [k.sel, k.prop]);
      const ok = k.expect(value);
      if (!ok) failed++;
      console.log(`${ok ? 'PASS' : 'FAIL'}  ${c.label.padEnd(40)} ${k.note.padEnd(36)} ${value.slice(0, 70)}`);
    }
    await page.close();
  }
  await browser.close();
  process.exit(failed ? 1 : 0);
})();
```

Run in `server/`: `npx ts-node --transpile-only tmp-verify-colors.ts` then `rm -f tmp-verify-colors.ts`.
Expected: every line `PASS`. A `FAIL` means a variable name or a role in the CSS does not match what the client computes: fix the CSS rule (Task 3) or the variable (Task 1) and re-run, adding a regression test for the cause.

- [ ] **Step 3: Confirm nothing is left over**

Run from the repo root: `git status --short` (expect empty), and `ls client/scripts 2>/dev/null` (expect no such directory).

- [ ] **Step 4: Hand-off notes**

Manual checks left for the user (sign-in prevents them here): open the Design panel on each of the four templates and confirm the Color tab appears (and does not on Hera or on any cover letter); pick swatches, a custom color and a gradient and watch the preview regenerate once after the debounce; drag the color picker quickly and confirm a single regeneration; export and confirm the PDF matches the preview; reload to confirm persistence; use Default and Reset all colors; clone a themed resume.
