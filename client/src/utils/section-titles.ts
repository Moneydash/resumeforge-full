import type { TemplateType } from "@/types";
import type { ResumeFormData } from "@/types/interface.resume-form-data";
import type { SectionId } from "@/utils/section-layout";

export type SectionTitles = Partial<Record<SectionId, string>>;

export const MAX_TITLE_LENGTH = 40;

type TitleSource = Pick<ResumeFormData, 'sectionTitles'>;

const classic: SectionTitles = {
  summary: 'Summary',
  experience: 'Work Experience',
  education: 'Education',
  projects: 'Projects',
  skills: 'Skills',
  languages: 'Languages',
  interests: 'Interests',
  certifications: 'Certifications',
  awards: 'Awards',
  references: 'References',
};

/** The heading each template prints today. A section missing here has no heading in that template. */
const TEMPLATE_TITLES: Record<TemplateType, SectionTitles> = {
  cigar: classic,
  hera: classic,
  milky_way: { ...classic, summary: 'About Me' },
  comet: { summary: 'About Me', skills: 'Skills', projects: 'Projects', interests: 'Interests' },
  andromeda: { ...classic, experience: 'Experience' },
  zeus: {
    summary: 'Professional Summary',
    experience: 'Work Experience',
    education: 'Academic Background',
    projects: 'Notable Projects',
    skills: 'Professional Skills',
    languages: 'Spoken Languages',
    certifications: 'Certifications & Licenses',
    awards: 'Awards & Achievements',
    references: 'Professional References',
  },
  hermes: {
    experience: 'WORK EXPERIENCE',
    skills: 'SKILLS & COMPETENCIES',
    certifications: 'CERTIFICATES',
    education: 'EDUCATION',
    projects: 'KEY PROJECTS',
    awards: 'AWARDS',
    interests: 'INTERESTS',
    languages: 'LANGUAGES',
    references: 'REFERENCES',
  },
  athena: {
    socials: 'Professional Links',
    summary: 'Professional Summary',
    experience: 'Professional Experience',
    education: 'Education',
    skills: 'Skills',
    projects: 'Key Projects',
    certifications: 'Certifications',
    awards: 'Awards',
    languages: 'Languages',
    references: 'References',
  },
  artemis: {
    summary: 'Summary',
    experience: 'Experience',
    education: 'Education',
    skills: 'Skills',
    projects: 'Projects',
    certifications: 'Certifications',
    awards: 'Awards',
    languages: 'Languages',
    references: 'References',
  },
  apollo: {
    summary: 'PROFILE',
    experience: 'WORK EXPERIENCE',
    education: 'EDUCATION',
    skills: 'SKILLS',
    projects: 'PROJECTS',
    certifications: 'CERTIFICATIONS',
    interests: 'INTERESTS',
    languages: 'LANGUAGES',
    awards: 'AWARDS',
    references: 'REFERENCES',
  },
};

/** Several templates force upper case in CSS; a name the user typed must show exactly as typed. */
export const CUSTOM_TITLE_CLASS = 'custom-title';
export const CUSTOM_TITLE_CSS = `.${CUSTOM_TITLE_CLASS}.${CUSTOM_TITLE_CLASS}{text-transform:none !important;}`;

/** Empty string when the saved name is missing or blank, so callers can fall back to the default. */
const customTitle = (id: SectionId, data: TitleSource): string => data.sectionTitles?.[id]?.trim() ?? '';

export const getDefaultTitle = (template: TemplateType, id: SectionId): string | undefined =>
  TEMPLATE_TITLES[template][id];

export const hasTitle = (template: TemplateType, id: SectionId): boolean =>
  getDefaultTitle(template, id) !== undefined;

export const isCustomTitle = (id: SectionId, data: TitleSource): boolean => customTitle(id, data) !== '';

export const hasCustomTitles = (data: TitleSource): boolean =>
  (Object.keys(data.sectionTitles ?? {}) as SectionId[]).some((id) => isCustomTitle(id, data));

/** The user's name for the section if they set one (it follows them across templates), else the template's own. */
export const getSectionTitle = (template: TemplateType, id: SectionId, data: TitleSource): string =>
  customTitle(id, data) || getDefaultTitle(template, id) || '';

export const titleClassName = (base: string, id: SectionId, data: TitleSource): string =>
  isCustomTitle(id, data) ? `${base} ${CUSTOM_TITLE_CLASS}` : base;

/** Set one section's name; blank or undefined resets it. Returns undefined when no names remain. */
export const setSectionTitle = (
  current: SectionTitles | undefined,
  id: SectionId,
  raw: string | undefined,
): SectionTitles | undefined => {
  const value = (raw ?? '').trim().slice(0, MAX_TITLE_LENGTH).trim();
  const next: SectionTitles = { ...current };
  if (value) next[id] = value;
  else delete next[id];
  return Object.keys(next).length ? next : undefined;
};

/** What a template needs to print its headings: the text, and the class that keeps a typed name as typed. */
export interface TemplateTitles {
  text: (id: SectionId) => string;
  cls: (base: string, id: SectionId) => string;
}

export const titlesFor = (template: TemplateType, data: TitleSource): TemplateTitles => ({
  text: (id) => getSectionTitle(template, id, data),
  cls: (base, id) => titleClassName(base, id, data),
});
