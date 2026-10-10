import { describe, expect, it } from "vitest";
import type { ComponentProps } from "react";
import { renderToString } from "react-dom/server";
import TemplatesPanel from "@/components/TemplatesPanel";
import templates from "@/utils/templates-type";
import clTemplates from "@/utils/cl-templates-type";

const noop = () => {};
const render = (over: Partial<ComponentProps<typeof TemplatesPanel>> = {}) =>
  renderToString(<TemplatesPanel kind="resume" current="athena" onSelect={noop} isDarkMode={false} {...over} />);

describe("TemplatesPanel", () => {
  it("lists every resume template under its collection", () => {
    const html = render();
    templates.forEach((t) => expect(html).toContain(t.name));
    expect(html).toContain("Galaxy Collection");
    expect(html).toContain("Greek Gods Collection");
    expect(html.indexOf("Galaxy Collection")).toBeLessThan(html.indexOf("Greek Gods Collection"));
  });

  it("lists every cover letter template", () => {
    const html = render({ kind: "cover-letter", current: "aether" });
    clTemplates.forEach((t) => expect(html).toContain(t.name));
    expect(html).not.toContain("Galaxy Collection");
  });

  it("marks exactly the current template", () => {
    const html = render({ current: "zeus" });
    expect(html.match(/aria-pressed="true"/g)).toHaveLength(1);
    expect(html.match(/aria-label="Zeus Executive"[^>]*aria-pressed="true"/)).not.toBeNull();
  });

  it("uses small lazy-loaded thumbnails, one per template", () => {
    const html = render();
    expect(html.match(/<img/g)).toHaveLength(templates.length);
    expect(html.match(/loading="lazy"/g)).toHaveLength(templates.length);
    expect(html).not.toMatch(/src=""/);
  });

  it("shows nothing marked when the current id is unknown", () => {
    expect(render({ current: "nope" }).match(/aria-pressed="true"/g)).toBeNull();
  });
});
