import { parseMonthYear } from "@/utils/helper";
import React from "react";
import type { TemplateProps } from "@/types";
import AthenaCss from "@/styles/templates/greek/athena.css?inline";
import { getRenderColumns } from "@/utils/section-layout";
import { renderSections, type SectionMap } from "@/components/templates/render-sections";
import { buildMainVariants, buildSidebarVariants } from "@/components/templates/column-variants";

const AthenaTemplate: React.FC<TemplateProps> = ({ data }) => {
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
      <div className="sidebar-section-title">Education</div>
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
      <div className="sidebar-section-title">Skills</div>
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
      <div className="sidebar-section-title">Key Projects</div>
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
      <div className="sidebar-section-title">Certifications</div>
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
      <div className="sidebar-section-title">Awards</div>
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
      <div className="sidebar-section-title">Languages</div>
      <div className="sidebar-languages">
        {data?.languages?.map((lang, i) => (
          <span className="sidebar-language-tag" key={i}>{lang}</span>
        ))}
      </div>
    </div>
  );

  const socialSection = (
    <div className="main-section">
      <div className="main-section-title">Professional Links</div>
      <div className="main-socials">
        {data?.socials?.map((social, i) => (
          <a href={social?.link} className="main-social-link" key={i}><i className={`fab fa-${social?.slug} fa-lg`}></i></a>
        ))}
      </div>
    </div>
  );

  const aboutSection = (
    <div className="main-section">
      <div className="main-section-title">Professional Summary</div>
      <div className="main-summary">{data?.summary}</div>
    </div>
  );

  const expSection = (
    <div className="main-section">
      <div className="main-section-title">Professional Experience</div>
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
      <div className="main-section-title">References</div>
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
  const titles = {
    education: 'Education',
    skills: 'Skills',
    projects: 'Key Projects',
    certifications: 'Certifications',
    awards: 'Awards',
    languages: 'Languages',
    references: 'References',
  };
  const mainSections: SectionMap = {
    ...buildMainVariants(data, titles),
    socials: socialSection,
    summary: aboutSection,
    experience: expSection,
    references: refSection,
  };
  const sidebarSections: SectionMap = {
    ...buildSidebarVariants(data, titles),
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