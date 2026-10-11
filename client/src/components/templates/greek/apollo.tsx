import { parseMonthYear } from "@/utils/helper";
import React from "react";
import type { TemplateProps } from "@/types";
import ApolloCss from "@/styles/templates/greek/apollo.css?inline";
import { getRenderColumns, getVisibleSocials } from "@/utils/section-layout";
import { titlesFor } from "@/utils/section-titles";
import { renderSections, type SectionMap } from "@/components/templates/render-sections";
import { buildMainVariants, buildSidebarVariants } from "@/components/templates/column-variants";

const ApolloTemplate: React.FC<TemplateProps> = ({ data }) => {
  const t = titlesFor('apollo', data);
  const aboutSection = (
    <div className="sidebar-contact">
      {data?.personal?.website?.name && <div className="sidebar-contact-item"><i className="icon-globe fas fa-globe"></i><span className="contact-text"><a href={data.personal.website.link} target="_blank">{data.personal.website.name}</a></span></div>}
      {data?.personal?.email && <div className="sidebar-contact-item"><i className="icon-email fas fa-envelope"></i><a href={`mailto:${data.personal.email}`} className="contact-text">{data.personal.email}</a></div>}
      {data?.personal?.contact_number && <div className="sidebar-contact-item"><i className="icon-phone fas fa-phone"></i><span className="contact-text">{data.personal.contact_number}</span></div>}
      {data?.personal?.location && <div className="sidebar-contact-item"><i className="icon-location fas fa-map-marker-alt"></i><span className="contact-text">{data.personal.location}</span></div>}

      {/* social links */}
      {getVisibleSocials(data).map((social, i) => (
        <div className="sidebar-contact-item" key={i}>
          <i className={`icon-social fab fa-${social.slug}`}></i><a href={social?.link} target="_blank" className="contact-text">{social?.name}</a>
        </div>
      ))}
    </div>
  );

  const educSection = (
    <div className="sidebar-section">
      <div className={t.cls("sidebar-section-title", "education")}>{t.text("education")}</div>
      {data?.education
        ?.filter(edu => !edu.hidden)
        ?.map((educ, i) => (
          <div className="sidebar-edu-item" key={i}>
            <div className="sidebar-edu-degree">{educ?.degree}</div>
            <div className="sidebar-edu-school">{educ?.institution}</div>
            <div className="sidebar-edu-date">{parseMonthYear(educ?.startDate)} - {educ?.endDate ? parseMonthYear(educ?.endDate) : 'Present'}</div>
          </div>
        ))
      }
    </div>
  );

  const skillSection = (
    <div className="sidebar-section">
      <div className={t.cls("sidebar-section-title", "skills")}>{t.text("skills")}</div>
      <ul className="sidebar-skills">
        {data?.skills
          ?.filter(s => !s.hidden)
          ?.map((skill) => (
            skill?.keywords.map((key, i) => (
              <li key={i}>{key}</li>
            ))
          ))
        }
      </ul>
    </div>
  );

  const projSection = (
    <div className="sidebar-section">
      <div className={t.cls("sidebar-section-title", "projects")}>{t.text("projects")}</div>
      {data?.projects
        ?.filter(proj => !proj.hidden)
        ?.map((proj, i) => (
          <div className="sidebar-project-item" key={i}>
            <div className="header">
              <div className="sidebar-project-title">{proj?.title}</div>
              <div className="sidebar-project-tech">{proj?.technologies?.join(", ")}</div>
              <div className="sidebar-project-desc">{proj?.description}</div>
            </div>
            <div className="bottom"></div>
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
            <div>
              <div className="sidebar-cert-name">{cert?.name}</div>
              <div className="sidebar-cert-org">{cert?.issuingOrganization}</div>
              <div className="sidebar-cert-date">{parseMonthYear(cert?.date)}</div>
            </div>
            <div className="bottom">&nbsp;</div>
          </div>
        ))
      }
    </div>
  );

  const interestSection = (
    <div className="sidebar-section">
      <div className={t.cls("sidebar-section-title", "interests")}>{t.text("interests")}</div>
      <ul className="sidebar-languages">
        {data?.interests?.map((interest, i) => (
          <li key={i}>{interest}</li>
        ))}
      </ul>
    </div>
  );

  const langSection = (
    <div className="sidebar-section">
      <div className={t.cls("sidebar-section-title", "languages")}>{t.text("languages")}</div>
      <ul className="sidebar-languages">
        {data?.languages?.map((lang, i) => (
          <li key={i}>{lang}</li>
        ))}
      </ul>
    </div>
  );

  const summarySection = (
    <div className="main-section">
      <div className={t.cls("main-section-title", "summary")}>{t.text("summary")}</div>
      <div className="main-summary">{data?.summary}</div>
    </div>
  );

  const expSection = (
    <div className="main-section">
      <div className={t.cls("main-section-title", "experience")}>{t.text("experience")}</div>
      {data?.experience
        ?.filter(i => !i.hidden)
        ?.map((exp, i) => (
          <div className="main-exp-item" key={i}>
            <div className="main-exp-header">
              <div className="main-exp-title">{exp?.title}</div>
              <div className="main-exp-date">{parseMonthYear(exp?.startDate)} - {exp?.endDate ? parseMonthYear(exp?.endDate) : 'Present'}</div>
            </div>
            <div className="main-exp-company">{exp?.company}</div>
            <div className="main-exp-desc">{exp?.description}</div>
          </div>
        ))
      }
    </div>
  );

  const awardsSection = (
    <div className="main-section">
      <div className={t.cls("main-section-title", "awards")}>{t.text("awards")}</div>
      {data?.awards
        ?.filter(i => !i.hidden)
        ?.map((award, i) => (
          <div className="main-exp-item" key={i}>
            <div className="main-exp-header">
              <div className="main-exp-title">{award?.title}</div>
              <div className="main-exp-date">{parseMonthYear(award?.date)}</div>
            </div>
            <div className="main-exp-desc">{award?.description}</div>
          </div>
        ))
      }
    </div>
  );

  const refSection = (
    <div className="main-section">
      <div className={t.cls("main-section-title", "references")}>{t.text("references")}</div>
      {data?.references
        ?.filter(i => !i.hidden)
        ?.map((reference, i) => (
          <div className="main-exp-item" key={i}>
            <div className="main-exp-title">{reference?.name}</div>
            <div className="main-exp-company">{[reference?.title, reference?.company].filter(Boolean).join(' at ')}</div>
            <div className="main-exp-desc">{[reference?.email, reference?.phone].filter(Boolean).join(' | ')}</div>
          </div>
        ))
      }
    </div>
  );

  const columns = getRenderColumns('apollo', data);
  // a section dragged to the other column needs that column's markup/classes, see column-variants.tsx
  const mainSections: SectionMap = {
    ...buildMainVariants(data, t),
    summary: summarySection,
    experience: expSection,
    awards: awardsSection,
    references: refSection,
  };
  const sidebarSections: SectionMap = {
    ...buildSidebarVariants(data, t),
    education: educSection,
    skills: skillSection,
    interests: interestSection,
    languages: langSection,
    projects: projSection,
    certifications: certSection,
  };

  const sidebarSection = (
    <aside className="resume-sidebar">
      {aboutSection}
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
        {ApolloCss}
      </style>
      <div className="resume-header">
        <div className="resume-header-content">
          <div className="resume-header-name">{data?.personal?.name}</div>
          <div className="resume-header-title">{data?.personal?.headline}</div>
        </div>
      </div>
      <div className="resume-main-container">
        {sidebarSection}
        {mainSection}
      </div>
    </>
  );
};

export default ApolloTemplate;