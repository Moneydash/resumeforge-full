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
