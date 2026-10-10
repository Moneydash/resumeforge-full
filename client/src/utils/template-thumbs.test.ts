import { describe, expect, it } from "vitest";
import templates from "@/utils/templates-type";
import clTemplates from "@/utils/cl-templates-type";
import { TEMPLATE_THUMBS } from "./template-thumbs";

describe("template thumbnails", () => {
  it("has a thumbnail for every resume and cover letter template", () => {
    [...templates, ...clTemplates].forEach((t) => expect(TEMPLATE_THUMBS[t.id], t.id).toBeTruthy());
  });

  it("covers exactly the 15 templates (no stale entries)", () => {
    expect(Object.keys(TEMPLATE_THUMBS).sort()).toEqual([...templates, ...clTemplates].map((t) => t.id).sort());
  });
});
