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
