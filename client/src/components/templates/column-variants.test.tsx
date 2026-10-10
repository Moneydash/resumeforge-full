import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import TemplateComponent from "@/components/TemplateComponent";
import type { TemplateType } from "@/types";
import type { SectionLayout } from "@/utils/section-layout";
import { makeSampleResume } from "@/test/sample-resume";

const render = (template: TemplateType, layout: SectionLayout) =>
  renderToString(<TemplateComponent data={{ ...makeSampleResume(2), sectionLayout: layout }} template={template} />);

// artemis: columns are [main (left), sidebar (right)]
describe("artemis cross-column rendering", () => {
  const layout: SectionLayout = {
    template: 'artemis',
    columns: [['summary', 'experience', 'education'], ['references', 'skills', 'projects', 'certifications', 'awards', 'languages']],
  };
  const html = render('artemis', layout);

  it("a sidebar section moved to the main column uses the main styles", () => {
    expect(html).toContain('main-section-title">Education</div>');
    expect(html).not.toContain('sidebar-section-title">Education</div>');
    expect(html).toContain('BSc Mathematics');
  });

  it("a main section moved to the sidebar uses the sidebar styles", () => {
    expect(html).toContain('sidebar-section-title">References</div>');
    expect(html).not.toContain('main-section-title">References</div>');
    expect(html).toContain('Ref Person');
  });
});

// athena: columns are [sidebar (left), main (right)]
describe("athena cross-column rendering", () => {
  const layout: SectionLayout = {
    template: 'athena',
    columns: [['references', 'skills', 'projects', 'certifications', 'awards', 'languages'], ['socials', 'summary', 'experience', 'education']],
  };
  const html = render('athena', layout);

  it("a sidebar section moved to the main column uses the main styles", () => {
    expect(html).toContain('main-section-title">Education</div>');
    expect(html).not.toContain('sidebar-section-title">Education</div>');
  });

  it("a main section moved to the sidebar uses the sidebar styles", () => {
    expect(html).toContain('sidebar-section-title">References</div>');
    expect(html).not.toContain('main-section-title">References</div>');
  });
});

// apollo: columns are [sidebar (left), main (right)]
describe("apollo cross-column rendering", () => {
  const layout: SectionLayout = {
    template: 'apollo',
    columns: [['references', 'awards', 'skills', 'interests', 'languages', 'projects', 'certifications'], ['summary', 'experience', 'education']],
  };
  const html = render('apollo', layout);

  it("a sidebar section moved to the main column uses the main styles", () => {
    expect(html).toContain('main-section-title">EDUCATION</div>');
    expect(html).not.toContain('sidebar-section-title">EDUCATION</div>');
  });

  it("main sections moved to the sidebar use the sidebar styles", () => {
    expect(html).toContain('sidebar-section-title">REFERENCES</div>');
    expect(html).toContain('sidebar-section-title">AWARDS</div>');
    expect(html).not.toContain('main-section-title">REFERENCES</div>');
    expect(html).not.toContain('main-section-title">AWARDS</div>');
  });
});
