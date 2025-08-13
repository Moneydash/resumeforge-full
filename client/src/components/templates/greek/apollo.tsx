import { parseMonthYear } from "@/utils/helper";
import React from "react";
import type { TemplateProps } from "@/types";
import ApolloCss from "@/styles/templates/greek/apollo.css?inline";

const ApolloTemplate: React.FC<TemplateProps> = ({ data }) => {
  const aboutSection = (
    <div className="sidebar-contact">
      <div className="sidebar-contact-item"><i className="icon-globe fas fa-globe"></i><span className="contact-text"><a href={data?.personal?.website?.link} target="_blank">{data?.personal?.website?.name}</a></span></div>
      <div className="sidebar-contact-item"><i className="icon-email fas fa-envelope"></i><a href={`mailto:${data?.personal?.email}`} className="contact-text">{data?.personal?.email}</a></div>
      <div className="sidebar-contact-item"><i className="icon-phone fas fa-phone"></i><span className="contact-text">{data?.personal?.contact_number}</span></div>
      <div className="sidebar-contact-item"><i className="icon-location fas fa-map-marker-alt"></i><span className="contact-text">{data?.personal?.location}</span></div>

      {/* social links */}
      {data?.socials && data?.socials?.length >= 1 && (
        data?.socials?.map((social, i) => (
          <div className="sidebar-contact-item" key={i}>
            <i className={`icon-social fab fa-${social.slug}`}></i><a href={social?.link} target="_blank" className="contact-text">{social?.name}</a>
          </div>
        ))
      )}
    </div>
  );

  const educSection = (
    <div className="sidebar-section">
      <div className="sidebar-section-title">EDUCATION</div>
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
      <div className="sidebar-section-title">SKILLS</div>
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
      <div className="sidebar-section-title">PROJECTS</div>
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
      <div className="sidebar-section-title">CERTIFICATIONS</div>
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
      <div className="sidebar-section-title">INTERESTS</div>
      <ul className="sidebar-languages">
        {data?.interests?.map((interest, i) => (
          <li key={i}>{interest}</li>
        ))}
      </ul>
    </div>
  );

  const langSection = (
    <div className="sidebar-section">
      <div className="sidebar-section-title">LANGUAGES</div>
      <ul className="sidebar-languages">
        {data?.languages?.map((lang, i) => (
          <li key={i}>{lang}</li>
        ))}
      </ul>
    </div>
  );

  const sidebarSection = (
    <aside className="resume-sidebar">
      {aboutSection}
      {data?.education && data?.education?.filter(i => !i.hidden)?.length >= 1 && educSection}
      {data?.skills && data?.skills?.filter(i => !i.hidden)?.length >= 1 && skillSection}
      {data?.interests && data?.interests?.length >= 1 && interestSection}
      {data?.languages && data?.languages?.length >= 1 && langSection}
      {data?.projects && data?.projects?.filter(i => !i.hidden)?.length >= 1 && projSection}
      {data?.certifications && data?.certifications?.filter(i => !i.hidden)?.length >= 1 && certSection}
    </aside>
  );

  const summarySection = (
    <div className="main-section">
      <div className="main-section-title">PROFILE</div>
      <div className="main-summary">{data?.summary}</div>
    </div>
  );

  const expSection = (
    <div className="main-section">
      <div className="main-section-title">WORK EXPERIENCE</div>
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
      <div className="main-section-title">AWARDS</div>
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
      <div className="main-section-title">REFERENCES</div>
      {data?.references
        ?.filter(i => !i.hidden)
        ?.map((reference, i) => (
          <div className="main-exp-item" key={i}>
            <div className="main-exp-title">{reference?.name}</div>
            <div className="main-exp-company">{reference?.title} at {reference?.company}</div>
            <div className="main-exp-desc">{reference?.email || '-'} | {reference?.phone || '-'}</div>
          </div>
        ))
      }
    </div>
  );

  const mainSection = (
    <main className="resume-main-content">
      {data?.summary && summarySection}
      {data?.experience && data?.experience?.filter(i => !i.hidden)?.length >= 1 && expSection}
      {data?.awards && data?.awards?.filter(i => !i.hidden)?.length >= 1 && awardsSection}
      {data?.references && data?.references?.filter(i => !i.hidden)?.length >= 1 && refSection}
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