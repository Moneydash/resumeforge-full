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

describe("the Artemis header link variable", () => {
  it("is allow-listed", () => {
    expect(sanitizeThemeVars({ "--doc-primary-link": "#63b3ed" })).toEqual({ "--doc-primary-link": "#63b3ed" });
  });
});
