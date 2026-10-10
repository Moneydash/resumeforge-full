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
});
