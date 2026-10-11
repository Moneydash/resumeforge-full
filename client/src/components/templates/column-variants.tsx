import React from "react";
import { parseMonthYear } from "@/utils/helper";
import type { ResumeFormData } from "@/types/interface.resume-form-data";
import type { SectionId } from "@/utils/section-layout";
import type { TemplateTitles } from "@/utils/section-titles";
import type { SectionMap } from "@/components/templates/render-sections";

/**
 * artemis, athena and apollo style their sidebar and main columns with two separate
 * class sets (white-on-colour `sidebar-*`, dark-on-white `main-*`). A section dragged
 * to the other column must use that column's classes, otherwise it is invisible.
 * These builders produce the variant a section does not have natively; each template
 * keeps its own markup for the column a section lives in by default.
 */
const dateRange = (start: string, end?: string) =>
  `${parseMonthYear(start)} - ${end ? parseMonthYear(end) : 'Present'}`;

const MainSection: React.FC<{ id: SectionId; t: TemplateTitles; children: React.ReactNode }> = ({ id, t, children }) => (
  <div className="main-section">
    <div className={t.cls("main-section-title", id)}>{t.text(id)}</div>
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

const SidebarSection: React.FC<{ id: SectionId; t: TemplateTitles; children: React.ReactNode }> = ({ id, t, children }) => (
  <div className="sidebar-section">
    <div className={t.cls("sidebar-section-title", id)}>{t.text(id)}</div>
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
export const buildMainVariants = (data: ResumeFormData, t: TemplateTitles): SectionMap => ({
  education: (
    <MainSection id="education" t={t}>
      {data.education?.filter((edu) => !edu.hidden).map((edu, i) => (
        <MainItem key={i} title={edu.degree} date={dateRange(edu.startDate, edu.endDate)} subtitle={edu.institution} />
      ))}
    </MainSection>
  ),
  skills: (
    <MainSection id="skills" t={t}>
      {data.skills?.filter((skill) => !skill.hidden).map((skill, i) => (
        <MainItem key={i} title={skill.name} description={skill.keywords?.join(", ")} />
      ))}
    </MainSection>
  ),
  projects: (
    <MainSection id="projects" t={t}>
      {data.projects?.filter((proj) => !proj.hidden).map((proj, i) => (
        <MainItem key={i} title={proj.title} subtitle={proj.technologies?.join(", ")} description={proj.description} />
      ))}
    </MainSection>
  ),
  certifications: (
    <MainSection id="certifications" t={t}>
      {data.certifications?.filter((cert) => !cert.hidden).map((cert, i) => (
        <MainItem key={i} title={cert.name} subtitle={cert.issuingOrganization} date={parseMonthYear(cert.date)} />
      ))}
    </MainSection>
  ),
  awards: (
    <MainSection id="awards" t={t}>
      {data.awards?.filter((award) => !award.hidden).map((award, i) => (
        <MainItem key={i} title={award.title} date={parseMonthYear(award.date)} description={award.description} />
      ))}
    </MainSection>
  ),
  languages: (
    <MainSection id="languages" t={t}>
      <div className="main-summary">{data.languages?.join(" • ")}</div>
    </MainSection>
  ),
  interests: (
    <MainSection id="interests" t={t}>
      <div className="main-summary">{data.interests?.join(" • ")}</div>
    </MainSection>
  ),
});

/** Sidebar (white on colour) versions of the sections that are native to the main column. */
export const buildSidebarVariants = (data: ResumeFormData, t: TemplateTitles): SectionMap => ({
  references: (
    <SidebarSection id="references" t={t}>
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
    <SidebarSection id="awards" t={t}>
      {data.awards?.filter((award) => !award.hidden).map((award, i) => (
        <SidebarItem key={i} name={award.title} org={award.description} date={parseMonthYear(award.date)} />
      ))}
    </SidebarSection>
  ),
});
