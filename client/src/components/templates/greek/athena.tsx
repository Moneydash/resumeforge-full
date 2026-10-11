import { parseMonthYear } from "@/utils/helper";
import React from "react";
import type { TemplateProps } from "@/types";
import AthenaCss from "@/styles/templates/greek/athena.css?inline";
import { getRenderColumns, getVisibleSocials } from "@/utils/section-layout";
import { titlesFor } from "@/utils/section-titles";
import { renderSections, type SectionMap } from "@/components/templates/render-sections";
import { buildMainVariants, buildSidebarVariants } from "@/components/templates/column-variants";

const AthenaTemplate: React.FC<TemplateProps> = ({ data }) => {
  const t = titlesFor('athena', data);
  const personalSection = (
    <>
      <div className="sidebar-header">
        <div className="sidebar-name">{data?.personal?.name}</div>
        <div className="sidebar-title">{data?.personal?.headline}</div>
      </div>
      <div className="sidebar-contact">
        {data?.personal?.location && <div className="sidebar-contact-item"><i className="icon-location" aria-hidden="true"></i>{data.personal.location}</div>}
        {data?.personal?.email && <div className="sidebar-contact-item"><i className="icon-email" aria-hidden="true"></i>{data.personal.email}</div>}
        {data?.personal?.contact_number && <div className="sidebar-contact-item"><i className="icon-phone" aria-hidden="true"></i>{data.personal.contact_number}</div>}
        {data?.personal?.website?.name && <div className="sidebar-contact-item"><i className="icon-website" aria-hidden="true"></i><a href={data.personal.website.link}>{data.personal.website.name}</a></div>}
      </div>
    </>
  );

  const educSection = (
    <div className="sidebar-section">
      <div className={t.cls("sidebar-section-title", "education")}>{t.text("education")}</div>
      {data?.education
        ?.filter(ed => !ed.hidden)
        ?.map((edu, i) => (
          <div className="sidebar-edu-item" key={i}>
            <div className="sidebar-edu-degree">{edu?.degree}</div>
            <div className="sidebar-edu-school">{edu?.institution}</div>
            <div className="sidebar-edu-date">{parseMonthYear(edu?.startDate)} - {edu?.endDate ? parseMonthYear(edu?.endDate) : 'Present'}</div>
          </div>
        ))
      }
    </div>
  );

  const skillSection = (
    <div className="sidebar-section">
      <div className={t.cls("sidebar-section-title", "skills")}>{t.text("skills")}</div>
      <div className="sidebar-skills">
        {data?.skills
          ?.filter(s => !s.hidden)
          ?.map((skill, i) => (
            <div className="sidebar-project-item" key={i}>
              <div className="sidebar-project-title">{skill.name}</div>
              <div className="sidebar-tech-tags">
                {skill?.keywords.map((key, i) => (
                  <span className="skill-tag" key={i}>{key}</span>
                ))}
              </div>
            </div>
          ))
        }
      </div>
    </div>
  );

  const projSection = (
    <div className="sidebar-section">
      <div className={t.cls("sidebar-section-title", "projects")}>{t.text("projects")}</div>
      {data?.projects
        ?.filter(proj => !proj.hidden)
        ?.map((proj, i) => (
          <div className="sidebar-project-item" key={i}>
            <div className="sidebar-project-title">{proj?.title}</div>
            <div className="sidebar-project-desc">{proj?.description}</div>
            <div className="sidebar-tech-tags">
              {proj?.technologies.map((tech, i) => (
                <span className="sidebar-tech-tag" key={i}>{tech}</span>
              ))}
            </div>
          </div>
        ))
      }
    </div>
  );

  const certSection = (
    <div className="sidebar-section">
      <div className={t.cls("sidebar-section-title", "certifications")}>{t.text("certifications")}</div>
      {data?.certifications
        ?.filter(cert => !cert.hidden)
        ?.map((cert, i) => (
          <div className="sidebar-cert-item" key={i}>
            <div className="sidebar-cert-name">{cert?.name}</div>
            <div className="sidebar-cert-org">{cert?.issuingOrganization}</div>
            <div className="sidebar-cert-date">{parseMonthYear(cert?.date)}</div>
          </div>
        ))
      }
    </div>
  );

  const awardsSection = (
    <div className="sidebar-section">
      <div className={t.cls("sidebar-section-title", "awards")}>{t.text("awards")}</div>
      {data?.awards
        ?.filter(award => !award.hidden)
        ?.map((award, i) => (
          <div className="sidebar-award-item" key={i}>
            <div className="sidebar-award-title">{award?.title}</div>
            <div className="sidebar-award-date">{parseMonthYear(award?.date)}</div>
          </div>
        ))
      }
    </div>
  );

  const langSection = (
    <div className="sidebar-section">
      <div className={t.cls("sidebar-section-title", "languages")}>{t.text("languages")}</div>
      <div className="sidebar-languages">
        {data?.languages?.map((lang, i) => (
          <span className="sidebar-language-tag" key={i}>{lang}</span>
        ))}
      </div>
    </div>
  );

  const socialSection = (
    <div className="main-section">
      <div className={t.cls("main-section-title", "socials")}>{t.text("socials")}</div>
      <div className="main-socials">
        {getVisibleSocials(data).map((social, i) => (
          <a href={social?.link} className="main-social-link" key={i}><i className={`fab fa-${social?.slug} fa-lg`}></i></a>
        ))}
      </div>
    </div>
  );

  const aboutSection = (
    <div className="main-section">
      <div className={t.cls("main-section-title", "summary")}>{t.text("summary")}</div>
      <div className="main-summary">{data?.summary}</div>
    </div>
  );

  const expSection = (
    <div className="main-section">
      <div className={t.cls("main-section-title", "experience")}>{t.text("experience")}</div>
      {data?.experience
        ?.filter(exp => !exp.hidden)
        ?.map((exp, i) => (
          <div className="main-exp-item" key={i}>
            <div className="main-exp-header">
              <div className="main-exp-left">
                <div className="main-exp-title">{exp?.title}</div>
                <div className="main-exp-company">{exp?.company}</div>
              </div>
              <div className="main-exp-date">{parseMonthYear(exp?.startDate)} - {exp?.endDate ? parseMonthYear(exp?.endDate) : 'Present'}</div>
            </div>
            <div className="main-exp-desc">{exp?.description}</div>
          </div>
        ))
      }
    </div>
  );

  const refSection = (
    <div className="main-section">
      <div className={t.cls("main-section-title", "references")}>{t.text("references")}</div>
      {data?.references
        ?.filter(r => !r.hidden)
        ?.map((reference, i) => (
          <div className="main-exp-item" key={i}>
            <div className="main-exp-header">
              <div className="main-exp-title">{reference?.name}</div>
              <div className="main-exp-company">{[reference?.title, reference?.company].filter(Boolean).join(' at ')}</div>
            </div>
            <div className="main-exp-desc">{[reference?.email, reference?.phone].filter(Boolean).join(' | ')}</div>
          </div>
        ))
      }
    </div>
  );

  const columns = getRenderColumns('athena', data);
  // a section dragged to the other column needs that column's markup/classes, see column-variants.tsx
  const mainSections: SectionMap = {
    ...buildMainVariants(data, t),
    socials: socialSection,
    summary: aboutSection,
    experience: expSection,
    references: refSection,
  };
  const sidebarSections: SectionMap = {
    ...buildSidebarVariants(data, t),
    education: educSection,
    skills: skillSection,
    projects: projSection,
    certifications: certSection,
    awards: awardsSection,
    languages: langSection,
  };

  const sidebarSection = (
    <aside className="resume-sidebar">
      {personalSection}
      {renderSections(columns[0], sidebarSections)}
    </aside>
  );

  const mainSection = (
    <main className="resume-main-content">
      {renderSections(columns[1], mainSections)}
    </main>
  );

  return (
    <>
      <style>
        {AthenaCss}
      </style>
      <div className="resume-container">
        <div className="resume-main-container">
          {sidebarSection}
          {mainSection}
        </div>
      </div>
    </>
  );
};

export default AthenaTemplate;