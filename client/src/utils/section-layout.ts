import type { TemplateType } from "@/types";
import type { ResumeFormData } from "@/types/interface.resume-form-data";

export type SectionId =
  | 'summary'
  | 'socials'
  | 'experience'
  | 'education'
  | 'skills'
  | 'projects'
  | 'awards'
  | 'certifications'
  | 'references'
  | 'languages'
  | 'interests';

export const SECTION_LABELS: Record<SectionId, string> = {
  summary: 'Summary',
  socials: 'Social Links',
  experience: 'Experience',
  education: 'Education',
  skills: 'Skills',
  projects: 'Projects',
  awards: 'Awards',
  certifications: 'Certifications',
  references: 'References',
  languages: 'Languages',
  interests: 'Interests',
};

const ALL_SECTION_IDS = Object.keys(SECTION_LABELS) as SectionId[];

/** Saved per resume inside resume_data. `columns` are in visual left-to-right order. */
export interface SectionLayout {
  template: TemplateType;
  columns: SectionId[][];
}

interface TemplateLayoutConfig {
  /** Sections the template renders in a fixed header; never part of the layout. */
  header: SectionId[];
  /** Sections locked to their default column and slot. */
  pinned: SectionId[];
  columnLabels: string[];
  /** Default columns; `visibleExperience` drives hermes/andromeda's automatic placement. */
  defaultColumns: (visibleExperience: number) => SectionId[][];
}

const singleColumn = (sections: SectionId[]): TemplateLayoutConfig => ({
  header: [],
  pinned: [],
  columnLabels: ['Sections'],
  defaultColumns: () => [sections],
});

const LAYOUTS: Record<TemplateType, TemplateLayoutConfig> = {
  zeus: singleColumn(['summary', 'experience', 'education', 'projects', 'skills', 'languages', 'certifications', 'awards', 'references']),
  cigar: singleColumn(['summary', 'experience', 'education', 'projects', 'skills', 'languages', 'interests', 'certifications', 'awards', 'references']),
  hera: singleColumn(['summary', 'experience', 'education', 'projects', 'skills', 'languages', 'interests', 'certifications', 'awards', 'references']),
  milky_way: singleColumn(['summary', 'experience', 'education', 'projects', 'skills', 'languages', 'certifications', 'awards', 'interests', 'references']),
  comet: singleColumn(['summary', 'skills', 'projects', 'interests']),
  andromeda: {
    header: [],
    pinned: ['summary', 'experience'],
    columnLabels: ['Left column', 'Right column'],
    defaultColumns: (exp) => exp <= 2
      ? [
        ['summary', 'experience', 'education', 'languages', 'certifications', 'interests'],
        ['skills', 'projects', 'awards', 'references'],
      ]
      : [
        ['summary', 'experience'],
        ['education', 'skills', 'projects', 'languages', 'certifications', 'interests', 'awards', 'references'],
      ],
  },
  hermes: {
    header: ['summary'],
    pinned: ['experience'],
    columnLabels: ['Left column', 'Right column'],
    defaultColumns: (exp) => exp < 3
      ? [
        ['experience', 'projects', 'references'],
        ['skills', 'education', 'certifications', 'awards', 'interests', 'languages'],
      ]
      : [
        ['experience', 'projects'],
        ['skills', 'education', 'certifications', 'awards', 'interests', 'languages', 'references'],
      ],
  },
  artemis: {
    header: [],
    pinned: ['summary', 'experience'],
    columnLabels: ['Main (left)', 'Sidebar (right)'],
    defaultColumns: () => [
      ['summary', 'experience', 'references'],
      ['education', 'skills', 'projects', 'certifications', 'awards', 'languages'],
    ],
  },
  athena: {
    header: [],
    pinned: ['summary', 'experience'],
    columnLabels: ['Sidebar (left)', 'Main (right)'],
    defaultColumns: () => [
      ['education', 'skills', 'projects', 'certifications', 'awards', 'languages'],
      ['socials', 'summary', 'experience', 'references'],
    ],
  },
  apollo: {
    header: [],
    pinned: ['summary', 'experience'],
    columnLabels: ['Sidebar (left)', 'Main (right)'],
    defaultColumns: () => [
      ['education', 'skills', 'interests', 'languages', 'projects', 'certifications'],
      ['summary', 'experience', 'awards', 'references'],
    ],
  },
};

const countVisible = (items: Array<{ hidden?: boolean }> | undefined): number =>
  (items ?? []).filter((item) => !item.hidden).length;

export const getDefaultColumns = (template: TemplateType, data: ResumeFormData): SectionId[][] =>
  LAYOUTS[template].defaultColumns(countVisible(data.experience)).map((column) => [...column]);

export const getPinned = (template: TemplateType): SectionId[] => LAYOUTS[template].pinned;

export const getColumnLabels = (template: TemplateType): string[] => LAYOUTS[template].columnLabels;

export const hasContent = (id: SectionId, data: ResumeFormData): boolean => {
  switch (id) {
    case 'summary':
      return !!data.summary;
    case 'socials':
      return (data.socials?.length ?? 0) >= 1;
    case 'languages':
      return (data.languages?.length ?? 0) >= 1;
    case 'interests':
      return (data.interests?.length ?? 0) >= 1;
    case 'experience':
    case 'education':
    case 'skills':
    case 'projects':
    case 'awards':
    case 'certifications':
    case 'references':
      return countVisible(data[id]) >= 1;
  }
};

const isSectionId = (value: unknown): value is SectionId =>
  typeof value === 'string' && (ALL_SECTION_IDS as string[]).includes(value);

/** Spread free sections (in `ordered` order) over the template's columns. */
const distributeFree = (
  template: TemplateType,
  data: ResumeFormData,
  ordered: unknown[],
  columnOf: Map<SectionId, number>,
): SectionId[][] => {
  const defaults = getDefaultColumns(template, data);
  const { pinned } = LAYOUTS[template];
  const defaultColumnOf = new Map<SectionId, number>();
  defaults.forEach((column, c) => column.forEach((id) => {
    if (!pinned.includes(id)) defaultColumnOf.set(id, c);
  }));

  const free = defaults.map(() => [] as SectionId[]);
  const seen = new Set<SectionId>();
  for (const id of ordered) {
    if (!isSectionId(id) || seen.has(id) || !defaultColumnOf.has(id)) continue;
    seen.add(id);
    const preferred = columnOf.get(id);
    free[preferred !== undefined && preferred < free.length ? preferred : defaultColumnOf.get(id)!].push(id);
  }
  defaults.forEach((column, c) => column.forEach((id) => {
    if (defaultColumnOf.has(id) && !seen.has(id)) free[c].push(id);
  }));
  return free;
};

/** Insert pinned sections at their default slots around the free sections. */
const pinInto = (template: TemplateType, data: ResumeFormData, free: SectionId[][]): SectionId[][] => {
  const { pinned } = LAYOUTS[template];
  return getDefaultColumns(template, data).map((defaultColumn, c) => {
    const out = [...free[c]];
    defaultColumn.forEach((id, slot) => {
      if (pinned.includes(id)) out.splice(Math.min(slot, out.length), 0, id);
    });
    return out;
  });
};

export const resolveLayout = (
  template: TemplateType,
  saved: SectionLayout | undefined,
  data: ResumeFormData,
): SectionId[][] => {
  if (!saved || !Array.isArray(saved.columns)) return getDefaultColumns(template, data);
  const columnCount = LAYOUTS[template].defaultColumns(0).length;
  const sameShape = saved.template === template && saved.columns.length === columnCount;

  const columnOf = new Map<SectionId, number>();
  if (sameShape) {
    saved.columns.forEach((column, c) => (Array.isArray(column) ? column : []).forEach((id) => {
      if (isSectionId(id) && !columnOf.has(id)) columnOf.set(id, c);
    }));
  }
  const ordered = saved.columns.flatMap((column) => (Array.isArray(column) ? column : []));
  return pinInto(template, data, distributeFree(template, data, ordered, columnOf));
};

/** Turn the board state after a drag into a saved layout (re-pinning fixed sections). */
export const normalizeLayout = (
  template: TemplateType,
  columns: SectionId[][],
  data: ResumeFormData,
): SectionLayout => ({
  template,
  columns: resolveLayout(template, { template, columns }, data),
});

/** Carry a saved layout over to another template (header first, then columns left to right). */
export const convertLayout = (
  saved: SectionLayout,
  to: TemplateType,
  data: ResumeFormData,
): SectionLayout => {
  const headerOfSource = LAYOUTS[saved.template]?.header ?? [];
  const savedColumns = Array.isArray(saved.columns) ? saved.columns : [];
  const ordered = [...headerOfSource, ...savedColumns.flatMap((column) => (Array.isArray(column) ? column : []))];
  return {
    template: to,
    columns: pinInto(to, data, distributeFree(to, data, ordered, new Map())),
  };
};

/** Final columns for rendering: resolved layout with empty sections removed. */
export const getRenderColumns = (template: TemplateType, data: ResumeFormData): SectionId[][] =>
  resolveLayout(template, data.sectionLayout, data).map((column) => column.filter((id) => hasContent(id, data)));
