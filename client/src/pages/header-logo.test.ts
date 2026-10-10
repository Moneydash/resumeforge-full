/// <reference types="node" />
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (file: string) => fs.readFileSync(path.join(here, file), "utf8");

describe("preview page header shows the project logo", () => {
  it.each([
    ["Preview.tsx", "ResumeForge"],
    ["CLPreview.tsx", "CoverCraft"],
  ])("%s uses the logo image instead of the document icon", (file, brand) => {
    const tsx = read(file);
    const heading = tsx.lastIndexOf(brand); // the <h1>; the brand also appears in the logo's alt text
    const header = tsx.slice(heading - 1500, heading);
    expect(header).toContain('src="/icon.png"');
    expect(header).toMatch(/alt="[^"]*logo[^"]*"/i);
    expect(header).not.toContain("<FileText");
    // the logo's letters are transparent cut-outs: without a white backing they turn dark on a dark page
    expect(header).toMatch(/<img[^>]*bg-white/);
  });

  it("the logo file exists in public/", () => {
    expect(fs.existsSync(path.resolve(here, "../../public/icon.png"))).toBe(true);
  });
});
