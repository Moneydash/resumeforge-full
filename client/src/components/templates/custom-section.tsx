import type { ResumeFormData } from "@/types/interface.resume-form-data";
import { customSectionId, formatEntryDate, type CustomSection } from "@/utils/custom-sections";
import type { CustomId } from "@/utils/section-layout";
import type { TemplateTitles } from "@/utils/section-titles";
import type { SectionMap } from "@/components/templates/render-sections";

/** The class names a template already uses for its own sections, so custom sections pick up its styling. */
export interface CustomSectionClasses {
  section: string;
  title: string;
  item: string;
  itemHeader: string;
  itemTitle: string;
  itemDate: string;
  itemDescription: string;
  /** Extra class on each item, e.g. a card style. */
  itemExtra?: string;
  /** Wrap the items in a div with this class (templates that do for their own sections). */
  content?: string;
  /** Font Awesome classes for an icon in the heading (templates that print one). */
  icon?: string;
  sectionTag?: 'section' | 'div';
}

export const visibleEntries = (section: CustomSection) => section.entries.filter((entry) => !entry.hidden);

/** One `custom:<id>` node per custom section, in the shape the template uses for its own sections. */
export const renderCustomSections = (
  data: ResumeFormData,
  t: TemplateTitles,
  classes: CustomSectionClasses,
): SectionMap => {
  const Section = classes.sectionTag ?? 'section';
  const map: SectionMap = {};
  for (const section of data.customSections ?? []) {
    const id: CustomId = customSectionId(section.id);
    const items = visibleEntries(section).map((entry, i) => (
      <div key={i} className={[classes.item, classes.itemExtra].filter(Boolean).join(' ')}>
        <div className={classes.itemHeader}>
          <span className={classes.itemTitle}>{entry.title}</span>
          <span className={classes.itemDate}>{formatEntryDate(entry)}</span>
        </div>
        {entry.description ? <div className={classes.itemDescription}>{entry.description}</div> : null}
      </div>
    ));
    map[id] = (
      <Section className={classes.section}>
        <h2 className={t.cls(classes.title, id)}>
          {classes.icon ? <i className={`${classes.icon} section-icon`} aria-hidden="true"></i> : null}
          {t.text(id)}
        </h2>
        {classes.content ? <div className={classes.content}>{items}</div> : items}
      </Section>
    );
  }
  return map;
};
