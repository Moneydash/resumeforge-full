/// <reference types="node" />
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const src = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel: string) => fs.readFileSync(path.join(src, rel), "utf8");

describe("preview pages use the app UI font", () => {
  it("defines .font-app with Geist and a system sans-serif fallback", () => {
    const css = read("index.css");
    const rule = css.match(/\.font-app\s*\{[^}]*\}/);
    expect(rule, ".font-app rule").not.toBeNull();
    expect(rule![0]).toMatch(/Geist/);
    expect(rule![0]).toMatch(/sans-serif/);
    expect(rule![0]).not.toMatch(/Cambria|Garamond/);
  });

  it.each(["pages/Preview.tsx", "pages/CLPreview.tsx"])("%s uses font-app, not Cambria", (file) => {
    const tsx = read(file);
    expect(tsx).toContain("font-app");
    expect(tsx).not.toContain("font-cambria");
  });

  it("the font is actually loaded by the page", () => {
    const html = fs.readFileSync(path.resolve(src, "..", "index.html"), "utf8");
    expect(html).toContain("family=Geist");
  });
});
