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
