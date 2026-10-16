import type { SectionId, SectionLayout } from "@/utils/section-layout";
import type { SavedFont } from "@/utils/fonts";
import type { ColorTheme } from "@/utils/color-theme";
import type { CustomSection } from "@/utils/custom-sections";

export interface ResumeFormData {
  personal: {
    name: string;
    headline?: string;
    contact_number: string;
    email: string;
    website: {
      name: string;
      link: string;
    };
    location?: string;
  };
  socials: Array<{
    name: string;
    link: string;
    slug: string;
    hidden?: boolean;
  }>;
  summary?: string;
  experience: Array<{
    title: string;
    company: string;
    startDate: string;
    endDate?: string;
    description?: string;
    hidden?: boolean;
  }>;
  education: Array<{
    degree: string;
    institution: string;
    startDate: string;
    endDate?: string;
    hidden?: boolean;
  }>;
  skills: Array<{
    name: string;
    keywords: string[];
    hidden?: boolean;
  }>;
  languages?: string[];
  awards: Array<{
    title: string;
    date: string;
    description?: string;
    hidden?: boolean;
  }>;
  certifications: Array<{
    name: string;
    issuingOrganization: string;
    date: string;
    hidden?: boolean;
  }>;
  interests?: string[];
  projects: Array<{
    title: string;
    description?: string;
    technologies: string[];
    hidden?: boolean;
  }>;
  references: Array<{
    name: string;
    title: string;
    company: string;
    email: string;
    phone: string;
    hidden?: boolean;
  }>;
  /** User-named sections; each is laid out and hidden by its `custom:<id>` section id. */
  customSections?: CustomSection[];
  /** Sections switched off at the parent level; their items keep their own `hidden` state. */
  hiddenSections?: SectionId[];
  /** Section names the user typed; a section not listed shows its template's default heading. */
  sectionTitles?: Partial<Record<SectionId, string>>;
  sectionLayout?: SectionLayout;
  fontFamily?: SavedFont;
  colorTheme?: ColorTheme;
}