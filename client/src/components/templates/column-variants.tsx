import React from "react";
import { parseMonthYear } from "@/utils/helper";
import type { ResumeFormData } from "@/types/interface.resume-form-data";
import type { SectionId } from "@/utils/section-layout";
import type { SectionMap } from "@/components/templates/render-sections";

/**
 * artemis, athena and apollo style their sidebar and main columns with two separate
 * class sets (white-on-colour `sidebar-*`, dark-on-white `main-*`). A section dragged
 * to the other column must use that column's classes, otherwise it is invisible.
 * These builders produce the variant a section does not have natively; each template
 * keeps its own markup for the column a section lives in by default.
 */
export type SectionTitles = Partial<Record<SectionId, string>>;

const dateRange = (start: string, end?: string) =>
  `${parseMonthYear(start)} - ${end ? parseMonthYear(end) : 'Present'}`;

const MainSection: React.FC<{ title?: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="main-section">
    <div className="main-section-title">{title}</div>
    {children}
  </div>
);

const MainItem: React.FC<{ title?: string; date?: string; subtitle?: string; description?: string }> = ({ title, date, subtitle, description }) => (
  <div className="main-exp-item">
    <div className="main-exp-header">
      <div className="main-exp-title">{title}</div>
      {date ? <div className="main-exp-date">{date}</div> : null}
    </div>
    {subtitle ? <div className="main-exp-company">{subtitle}</div> : null}
    {description ? <div className="main-exp-desc">{description}</div> : null}
  </div>
);

const SidebarSection: React.FC<{ title?: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="sidebar-section">
    <div className="sidebar-section-title">{title}</div>
    {children}
  </div>
);

const SidebarItem: React.FC<{ name?: string; org?: string; date?: string }> = ({ name, org, date }) => (
  <div className="sidebar-cert-item">
    <div className="sidebar-cert-name">{name}</div>
    {org ? <div className="sidebar-cert-org">{org}</div> : null}
    {date ? <div className="sidebar-cert-date">{date}</div> : null}
  </div>
);

/** Main-column (dark on white) versions of the sections that are native to the sidebar. */
export const buildMainVariants = (data: ResumeFormData, titles: SectionTitles): SectionMap => ({
  education: (
    <MainSection title={titles.education}>
      {data.education?.filter((edu) => !edu.hidden).map((edu, i) => (
        <MainItem key={i} title={edu.degree} date={dateRange(edu.startDate, edu.endDate)} subtitle={edu.institution} />
      ))}
    </MainSection>
  ),
  skills: (
    <MainSection title={titles.skills}>
      {data.skills?.filter((skill) => !skill.hidden).map((skill, i) => (
        <MainItem key={i} title={skill.name} description={skill.keywords?.join(", ")} />
      ))}
    </MainSection>
  ),
  projects: (
    <MainSection title={titles.projects}>
      {data.projects?.filter((proj) => !proj.hidden).map((proj, i) => (
        <MainItem key={i} title={proj.title} subtitle={proj.technologies?.join(", ")} description={proj.description} />
      ))}
    </MainSection>
  ),
  certifications: (
    <MainSection title={titles.certifications}>
      {data.certifications?.filter((cert) => !cert.hidden).map((cert, i) => (
        <MainItem key={i} title={cert.name} subtitle={cert.issuingOrganization} date={parseMonthYear(cert.date)} />
      ))}
    </MainSection>
  ),
  awards: (
    <MainSection title={titles.awards}>
      {data.awards?.filter((award) => !award.hidden).map((award, i) => (
        <MainItem key={i} title={award.title} date={parseMonthYear(award.date)} description={award.description} />
      ))}
    </MainSection>
  ),
  languages: (
    <MainSection title={titles.languages}>
      <div className="main-summary">{data.languages?.join(" • ")}</div>
    </MainSection>
  ),
  interests: (
    <MainSection title={titles.interests}>
      <div className="main-summary">{data.interests?.join(" • ")}</div>
    </MainSection>
  ),
});

/** Sidebar (white on colour) versions of the sections that are native to the main column. */
export const buildSidebarVariants = (data: ResumeFormData, titles: SectionTitles): SectionMap => ({
  references: (
    <SidebarSection title={titles.references}>
      {data.references?.filter((ref) => !ref.hidden).map((ref, i) => (
        <SidebarItem
          key={i}
          name={ref.name}
          org={[ref.title, ref.company].filter(Boolean).join(' at ')}
          date={[ref.email, ref.phone].filter(Boolean).join(' | ')}
        />
      ))}
    </SidebarSection>
  ),
  awards: (
    <SidebarSection title={titles.awards}>
      {data.awards?.filter((award) => !award.hidden).map((award, i) => (
        <SidebarItem key={i} name={award.title} org={award.description} date={parseMonthYear(award.date)} />
      ))}
    </SidebarSection>
  ),
  socials: (
    <SidebarSection title={titles.socials}>
      {data.socials?.map((social, i) => (
        <SidebarItem key={i} name={social.name} org={social.link} />
      ))}
    </SidebarSection>
  ),
});
