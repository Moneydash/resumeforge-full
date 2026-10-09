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
