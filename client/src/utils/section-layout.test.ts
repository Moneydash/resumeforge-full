import { describe, expect, it } from "vitest";
import { makeSampleResume } from "@/test/sample-resume";
import {
  convertLayout,
  getDefaultColumns,
  getRenderColumns,
  normalizeLayout,
  resolveLayout,
  type SectionLayout,
} from "@/utils/section-layout";

const data2 = makeSampleResume(2);
const data3 = makeSampleResume(3);

describe("getDefaultColumns", () => {
  it("single-column templates have one column in today's order", () => {
    expect(getDefaultColumns('zeus', data2)).toEqual([[
      'summary', 'experience', 'education', 'projects', 'skills', 'languages', 'certifications', 'awards', 'references',
    ]]);
    expect(getDefaultColumns('milky_way', data2)[0].slice(-3)).toEqual(['awards', 'interests', 'references']);
    expect(getDefaultColumns('comet', data2)).toEqual([['summary', 'skills', 'projects', 'interests']]);
  });

  it("hermes puts references left under 3 visible experiences and right at 3+", () => {
    expect(getDefaultColumns('hermes', data2)[0]).toEqual(['experience', 'projects', 'references']);
    expect(getDefaultColumns('hermes', data3)[1].at(-1)).toBe('references');
    expect(getDefaultColumns('hermes', data3)[0]).toEqual(['experience', 'projects']);
  });

  it("hermes counts only visible experiences", () => {
    const d = makeSampleResume(3);
    d.experience[2].hidden = true;
    expect(getDefaultColumns('hermes', d)[0]).toContain('references');
  });

  it("andromeda moves education/languages/certifications/interests by visible experience count", () => {
    expect(getDefaultColumns('andromeda', data2)[0]).toEqual(['summary', 'experience', 'education', 'languages', 'certifications', 'interests']);
    expect(getDefaultColumns('andromeda', data3)[0]).toEqual(['summary', 'experience']);
    expect(getDefaultColumns('andromeda', data3)[1]).toEqual(['education', 'skills', 'projects', 'languages', 'certifications', 'interests', 'awards', 'references']);
  });

  it("column templates list columns left to right", () => {
    expect(getDefaultColumns('athena', data2)[1]).toEqual(['socials', 'summary', 'experience', 'references']);
    expect(getDefaultColumns('apollo', data2)[1]).toEqual(['summary', 'experience', 'awards', 'references']);
    expect(getDefaultColumns('artemis', data2)[0]).toEqual(['summary', 'experience', 'references']);
  });
});

describe("resolveLayout", () => {
  it("returns defaults when nothing is saved", () => {
    expect(resolveLayout('apollo', undefined, data2)).toEqual(getDefaultColumns('apollo', data2));
  });

  it("applies a saved single-column order and appends missing sections in default order", () => {
    const saved: SectionLayout = { template: 'cigar', columns: [['education', 'summary']] };
    const out = resolveLayout('cigar', saved, data2)[0];
    expect(out.slice(0, 2)).toEqual(['education', 'summary']);
    expect(out.slice(2)).toEqual(['experience', 'projects', 'skills', 'languages', 'interests', 'certifications', 'awards', 'references']);
  });

  it("drops unknown and duplicate ids", () => {
    const saved = { template: 'cigar', columns: [['education', 'bogus', 'education', 'summary']] } as unknown as SectionLayout;
    const out = resolveLayout('cigar', saved, data2)[0];
    expect(out.filter((id) => id === 'education')).toHaveLength(1);
    expect(out).not.toContain('bogus' as never);
    expect(new Set(out).size).toBe(out.length);
  });

  it("keeps free sections in the user's chosen column (andromeda)", () => {
    const saved: SectionLayout = {
      template: 'andromeda',
      columns: [['summary', 'experience', 'skills'], ['education', 'projects', 'languages', 'certifications', 'interests', 'awards', 'references']],
    };
    const out = resolveLayout('andromeda', saved, data2);
    expect(out[0]).toEqual(['summary', 'experience', 'skills']);
    expect(out[1][0]).toBe('education');
  });

  it("moves a misplaced pinned section back to its pinned column and slot", () => {
    const saved: SectionLayout = {
      template: 'apollo',
      columns: [['summary', 'education', 'skills', 'interests', 'languages', 'projects', 'certifications'], ['awards', 'experience', 'references']],
    };
    const out = resolveLayout('apollo', saved, data2);
    expect(out[0]).not.toContain('summary');
    expect(out[1].slice(0, 2)).toEqual(['summary', 'experience']);
  });

  it("keeps pinned sections at their default slots when free sections are placed around them (athena)", () => {
    const saved: SectionLayout = {
      template: 'athena',
      columns: [['education', 'skills', 'projects', 'certifications', 'awards', 'languages'], ['references', 'socials']],
    };
    const right = resolveLayout('athena', saved, data2)[1];
    expect(right).toEqual(['references', 'summary', 'experience', 'socials']);
  });

  it("falls back to defaults for free sections when the column count does not match", () => {
    const saved: SectionLayout = { template: 'andromeda', columns: [['summary', 'experience', 'education']] };
    const out = resolveLayout('andromeda', saved, data2);
    expect(out).toHaveLength(2);
    expect(out.flat().sort()).toEqual(getDefaultColumns('andromeda', data2).flat().sort());
  });

  it("comet only offers its four sections", () => {
    const saved: SectionLayout = { template: 'comet', columns: [['experience', 'projects', 'summary']] };
    expect(resolveLayout('comet', saved, data2)).toEqual([['projects', 'summary', 'skills', 'interests']]);
  });
});

describe("convertLayout", () => {
  const andromedaSaved: SectionLayout = {
    template: 'andromeda',
    columns: [['summary', 'experience', 'education'], ['projects', 'skills', 'certifications', 'languages', 'interests', 'awards', 'references']],
  };

  it("column -> single flattens left column then right column", () => {
    const out = convertLayout(andromedaSaved, 'cigar', data2);
    expect(out.template).toBe('cigar');
    expect(out.columns[0]).toEqual(['summary', 'experience', 'education', 'projects', 'skills', 'certifications', 'languages', 'interests', 'awards', 'references']);
  });

  it("the documented example flattens to Summary, Experience, Education, Projects, Skills, Certifications", () => {
    const saved: SectionLayout = {
      template: 'andromeda',
      columns: [['summary', 'experience', 'education'], ['projects', 'skills', 'certifications']],
    };
    expect(convertLayout(saved, 'cigar', data2).columns[0].slice(0, 6)).toEqual(
      ['summary', 'experience', 'education', 'projects', 'skills', 'certifications'],
    );
  });

  it("hermes -> single puts the header summary first", () => {
    const saved: SectionLayout = { template: 'hermes', columns: [['experience', 'projects'], ['skills', 'education']] };
    expect(convertLayout(saved, 'cigar', data2).columns[0].slice(0, 5)).toEqual(['summary', 'experience', 'projects', 'skills', 'education']);
  });

  it("anything -> hermes never puts summary in a column", () => {
    const saved: SectionLayout = { template: 'cigar', columns: [['summary', 'experience', 'education']] };
    const out = convertLayout(saved, 'hermes', data2);
    expect(out.columns.flat()).not.toContain('summary');
    expect(out.columns[0][0]).toBe('experience');
  });

  it("andromeda -> cigar -> athena puts summary and experience at athena's pinned right slots", () => {
    const toCigar = convertLayout(andromedaSaved, 'cigar', data2);
    const toAthena = convertLayout(toCigar, 'athena', data2);
    expect(toAthena.template).toBe('athena');
    expect(toAthena.columns[1][1]).toBe('summary');
    expect(toAthena.columns[1][2]).toBe('experience');
    expect(toAthena.columns[0]).not.toContain('summary');
  });

  it("single -> column places free sections in their default columns", () => {
    const saved: SectionLayout = { template: 'cigar', columns: [['education', 'summary', 'experience', 'skills']] };
    const out = convertLayout(saved, 'apollo', data2);
    expect(out.columns[0].slice(0, 2)).toEqual(['education', 'skills']);
  });
});

describe("normalizeLayout", () => {
  it("re-pins a pinned section the user tried to move and tags the template", () => {
    const out = normalizeLayout('apollo', [['education', 'skills', 'interests', 'languages', 'projects', 'certifications', 'summary'], ['awards', 'experience', 'references']], data2);
    expect(out.template).toBe('apollo');
    expect(out.columns[1].slice(0, 2)).toEqual(['summary', 'experience']);
    expect(out.columns[0]).not.toContain('summary');
  });
});

describe("getRenderColumns", () => {
  it("hides empty sections", () => {
    const d = makeSampleResume(2);
    d.interests = [];
    d.awards[0].hidden = true;
    d.summary = '';
    const cols = getRenderColumns('cigar', d)[0];
    expect(cols).not.toContain('interests');
    expect(cols).not.toContain('awards');
    expect(cols).not.toContain('summary');
    expect(cols).toContain('experience');
  });

  it("keeps the saved order for non-empty sections", () => {
    const d = { ...makeSampleResume(2), sectionLayout: { template: 'zeus', columns: [['education', 'experience']] } as SectionLayout };
    expect(getRenderColumns('zeus', d)[0].slice(0, 2)).toEqual(['education', 'experience']);
  });
});
