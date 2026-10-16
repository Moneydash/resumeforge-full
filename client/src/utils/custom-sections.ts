import type { ResumeFormData } from "@/types/interface.resume-form-data";
import type { CustomId, SectionId } from "@/utils/section-layout";
import { parseMonthYear } from "@/utils/helper";

export interface CustomSectionEntry {
  title: string;
  description?: string;
  /** "YYYY-MM", always required. */
  startDate: string;
  hasEndDate: boolean;
  /** Only meaningful when `hasEndDate`; means the end is "Present" and `endDate` is empty. */
  stillOngoing: boolean;
  endDate?: string;
  hidden?: boolean;
}

export interface CustomSection {
  /** Stable id; the section's layout id is `custom:<id>`. */
  id: string;
  /** The name the user gave the section, printed as its heading. */
  title: string;
  entries: CustomSectionEntry[];
}

export const CUSTOM_ID_PREFIX = 'custom:';

export const customSectionId = (id: string): CustomId => `${CUSTOM_ID_PREFIX}${id}`;

export const isCustomId = (value: unknown): value is CustomId =>
  typeof value === 'string' && value.startsWith(CUSTOM_ID_PREFIX);

export const findCustomSection = (
  data: Pick<ResumeFormData, 'customSections'>,
  sectionId: SectionId,
): CustomSection | undefined =>
  isCustomId(sectionId) ? data.customSections?.find((section) => customSectionId(section.id) === sectionId) : undefined;

export const newCustomSection = (): CustomSection => ({
  id: Math.random().toString(36).slice(2, 10) + Date.now().toString(36),
  title: '',
  entries: [],
});

export const formatEntryDate = (entry: CustomSectionEntry): string => {
  const start = parseMonthYear(entry.startDate);
  if (!entry.hasEndDate) return start;
  return `${start} – ${entry.stillOngoing ? 'Present' : parseMonthYear(entry.endDate ?? '')}`;
};
