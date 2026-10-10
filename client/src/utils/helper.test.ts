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
