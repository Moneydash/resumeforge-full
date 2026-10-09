import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import TemplateComponent from "@/components/TemplateComponent";
import type { TemplateType } from "@/types";
import { makeSampleResume } from "@/test/sample-resume";

const ALL: TemplateType[] = ['cigar', 'andromeda', 'comet', 'milky_way', 'zeus', 'athena', 'apollo', 'artemis', 'hermes', 'hera'];

describe("template default render (no sectionLayout)", () => {
  ALL.forEach((template) => {
    it(`${template} with 2 experience entries`, () => {
      const html = renderToString(<TemplateComponent data={makeSampleResume(2)} template={template} />);
      expect(html).toMatchSnapshot();
    });
  });

  // hermes and andromeda move sections between columns at 3+ experience entries
  (['hermes', 'andromeda'] as TemplateType[]).forEach((template) => {
    it(`${template} with 3 experience entries`, () => {
      const html = renderToString(<TemplateComponent data={makeSampleResume(3)} template={template} />);
      expect(html).toMatchSnapshot();
    });
  });
});

describe("template render honours sectionLayout", () => {
  it("cigar renders education before experience", () => {
    const data = { ...makeSampleResume(2), sectionLayout: { template: 'cigar' as const, columns: [['education', 'experience']] as never } };
    const html = renderToString(<TemplateComponent data={data} template="cigar" />);
    expect(html.indexOf('Education')).toBeLessThan(html.indexOf('Work Experience'));
  });
  it("apollo renders a moved free section in the other column", () => {
    const data = {
      ...makeSampleResume(2),
      sectionLayout: {
        template: 'apollo' as const,
        columns: [['skills', 'interests', 'languages', 'projects', 'certifications'], ['summary', 'experience', 'education', 'awards', 'references']] as never,
      },
    };
    const html = renderToString(<TemplateComponent data={data} template="apollo" />);
    expect(html.indexOf('WORK EXPERIENCE')).toBeLessThan(html.indexOf('EDUCATION'));
  });

  it("hermes keeps its summary in the header whatever the layout says", () => {
    const data = { ...makeSampleResume(2), sectionLayout: { template: 'hermes' as const, columns: [['summary', 'experience'], ['skills']] as never } };
    const html = renderToString(<TemplateComponent data={data} template="hermes" />);
    expect(html.match(/Engineer who builds analytical engines\./g)).toHaveLength(1);
    expect(html.indexOf('Engineer who builds analytical engines.')).toBeLessThan(html.indexOf('resume-content'));
  });
});
