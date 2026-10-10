import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import DesignPanel from "@/components/DesignPanel";
import { makeSampleResume } from "@/test/sample-resume";

const noop = () => {};
const resumeSections = { template: 'athena' as const, data: makeSampleResume(2), layout: undefined, onChange: noop };

const render = (props: Partial<React.ComponentProps<typeof DesignPanel>> = {}) =>
  renderToString(
    <DesignPanel tab="font" onTabChange={noop} onClose={noop} isDarkMode={false} template="athena" onFontChange={noop} sections={resumeSections} {...props} />,
  );

describe("DesignPanel", () => {
  it("is labelled Design", () => {
    expect(render()).toContain('aria-label="Design"');
  });

  it("shows Sections and Font tabs for a resume, with the active tab selected", () => {
    const html = render({ tab: 'font' });
    expect(html.match(/role="tab"/g)).toHaveLength(2);
    expect(html).toContain('>Sections<');
    expect(html).toContain('>Font<');
    expect(html.match(/role="tab"[^>]*aria-selected="true"[^>]*>(?:<[^>]*>)*Font/)).not.toBeNull();
  });

  it("shows the font list on the Font tab", () => {
    const html = render({ tab: 'font' });
    expect(html).toContain('Inter');
    expect(html).toContain('DM Serif Text + Cinzel');
    expect(html).not.toContain('Drag sections to reorder');
  });

  it("shows the section order board on the Sections tab", () => {
    const html = render({ tab: 'sections' });
    expect(html).toContain('Drag sections to reorder');
    expect(html).not.toContain('Cinzel headings');
  });

  it("without sections (cover letters) there are no tabs and the Font content shows even if 'sections' is requested", () => {
    const html = render({ sections: undefined, tab: 'sections', template: 'ventus' });
    expect(html).not.toContain('role="tab"');
    expect(html).toContain('IBM Plex Sans');
    expect(html).not.toContain('Drag sections to reorder');
  });

  it("adds a Color tab for a themeable template", () => {
    const html = render({ tab: "color", template: "zeus", color: { template: "zeus", theme: undefined, onChange: noop } });
    expect(html.match(/role="tab"/g)).toHaveLength(3);
    expect(html).toContain(">Color<");
    expect(html).toContain("Reset all colors");
    expect(html).not.toContain("Drag sections to reorder");
    expect(html).not.toContain("Cinzel headings");
  });

  it("has no Color tab when the template is not themeable", () => {
    const html = render({ tab: "color" });
    expect(html.match(/role="tab"/g)).toHaveLength(2);
    expect(html).not.toContain(">Color<");
    expect(html).toContain("Inter"); // falls back to the Font view
  });

  it("cover letters (no sections, no color) still have no tabs", () => {
    const html = render({ sections: undefined, color: undefined, tab: "color", template: "ventus" });
    expect(html).not.toContain('role="tab"');
    expect(html).toContain("IBM Plex Sans");
  });

  it("adds a Templates tab; the Color tab only exists for themeable templates", () => {
    const templates = { kind: "resume" as const, current: "athena", onSelect: noop };
    const themeable = render({ tab: "templates", template: "athena", templates, color: { template: "athena", theme: undefined, onChange: noop } });
    expect(themeable.match(/role="tab"/g)).toHaveLength(4);
    expect(themeable).toContain(">Templates<");
    expect(themeable).toContain("Galaxy Collection");
    expect(themeable).not.toContain("Drag sections to reorder");
    const plain = render({ tab: "templates", template: "hermes", templates: { ...templates, current: "hermes" } });
    expect(plain.match(/role="tab"/g)).toHaveLength(3); // Sections, Font, Templates
    expect(plain).not.toContain(">Color<");
  });

  it("falls back to the Font view when the active tab disappears after a template switch", () => {
    // user was on Color, then switched to a template without a color theme
    const html = render({ tab: "color", template: "hermes", templates: { kind: "resume", current: "hermes", onSelect: noop } });
    expect(html).not.toContain(">Color<");
    expect(html).toContain("Inter");
  });

  it("cover letters get Font and Templates tabs", () => {
    const html = render({ sections: undefined, color: undefined, tab: "templates", template: "ventus", templates: { kind: "cover-letter", current: "ventus", onSelect: noop } });
    expect(html.match(/role="tab"/g)).toHaveLength(2);
    expect(html).toContain("Ventus");
    expect(html).not.toContain("Galaxy Collection");
  });
});
