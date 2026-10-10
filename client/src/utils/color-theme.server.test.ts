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
