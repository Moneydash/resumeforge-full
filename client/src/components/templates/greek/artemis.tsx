import { parseMonthYear } from "@/utils/helper";
import React from "react";
import type { TemplateProps } from "@/types";
import ArtemisCss from "@/styles/templates/greek/artemis.css?inline";
import { getRenderColumns } from "@/utils/section-layout";
import { renderSections, type SectionMap } from "@/components/templates/render-sections";

const ArtemisTemplate: React.FC<TemplateProps> = ({ data }) => {
  const socialSection = (
    <div className="social-links">
      {data?.socials?.map((soc, i) => (
        <a href={soc?.link} target="_blank" key={i}><i className={`fab fa-${soc?.slug}`}></i></a>
      ))}
    </div>
  );

  const summarySection = (
    <div className="main-section">
      <div className="main-section-title">Summary</div>
      <div className="main-summary">{data?.summary}</div>
    </div>
  );

  const expSection = (
    <div className="main-section">
      <div className="main-section-title">Experience</div>
      {data?.experience
        ?.filter(i => !i.hidden)
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

  const contactSection = (
    <div className="sidebar-section">
      <div className="sidebar-section-title">Contact</div>
      <div className="sidebar-contact">
        {data?.personal?.location && <div className="sidebar-contact-item"><i className="fas fa-location-dot" aria-hidden="true"></i><span className="contact-text">{data.personal.location}</span></div>}
        {data?.personal?.email && <div className="sidebar-contact-item"><i className="fas fa-envelope" aria-hidden="true"></i><a href={`mailto:${data.personal.email}`} className="contact-text">{data.personal.email}</a></div>}
        {data?.personal?.contact_number && <div className="sidebar-contact-item"><i className="fas fa-phone" aria-hidden="true"></i><span className="contact-text">{data.personal.contact_number}</span></div>}
        {data?.personal?.website?.name && <div className="sidebar-contact-item"><i className="fas fa-globe" aria-hidden="true"></i><span className="contact-text"><a href={data.personal.website.link} target="_blank">{data.personal.website.name}</a></span></div>}
      </div>
    </div>
  );

  const educSection = (
    <div className="sidebar-section">
      <div className="sidebar-section-title">Education</div>
      {data?.education
        ?.filter(i => !i.hidden)
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
          ?.filter(i => !i.hidden)
          ?.map((skill) => (
            skill?.keywords?.map((key, i) => (
              <span className="skill-tag" key={i}>{key}</span>
            ))
          ))
        }
      </div>
    </div>
  );

  const projSection = (
    <div className="sidebar-section">
      <div className="sidebar-section-title">Projects</div>
      {data?.projects
        ?.filter(i => !i.hidden)
        ?.map((proj, i) => (
          <div className="sidebar-project-item" key={i}>
            <div className="sidebar-project-title">{proj?.title}</div>
            <div className="sidebar-project-desc">{proj?.description}</div>
            <div className="sidebar-project-tech">{proj?.technologies?.join(", ")}</div>
          </div>
        ))
      }
    </div>
  );

  const certSection = (
    <div className="sidebar-section">
      <div className="sidebar-section-title">Certifications</div>
      {data?.certifications
        ?.filter(i => !i.hidden)
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
        ?.filter(i => !i.hidden)
        ?.map((award, i) => (
          <div className="sidebar-cert-item" key={i}>
            <div className="sidebar-cert-name">{award?.title}</div>
            <div className="sidebar-cert-org">{award?.description}</div>
            <div className="sidebar-cert-date">{parseMonthYear(award?.date)}</div>
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
          <span className="language-tag" key={i}>{lang}</span>
        ))}
      </div>
    </div>
  );

  const columns = getRenderColumns('artemis', data);
  const sections: SectionMap = {
    summary: summarySection,
    experience: expSection,
    references: refSection,
    education: educSection,
    skills: skillSection,
    projects: projSection,
    certifications: certSection,
    awards: awardsSection,
    languages: langSection,
  };

  const mainSection = (
    <main className="resume-main-content">
      {renderSections(columns[0], sections)}
    </main>
  );

  const sidebarSection = (
    <aside className="resume-sidebar">
      {contactSection}
      {renderSections(columns[1], sections)}
    </aside>
  );

  return (
    <>
      <style>
        {ArtemisCss}
      </style>
      <div className="resume-container">
        <div className="resume-body">
          <div className="resume-left-section">
            <div className="resume-header">
              <div className="resume-header-content">
                <div className="resume-header-name">{data?.personal?.name}</div>
                <div className="resume-header-title">{data?.personal?.headline}</div>
                {data?.socials && data?.socials?.length >= 1 && socialSection}
              </div>
            </div>
            {mainSection}
          </div>
          {sidebarSection}
        </div>
      </div>
    </>
  );
};

export default ArtemisTemplate;