import { parseMonthYear } from "@/utils/helper";
import React from "react";
import type { TemplateProps } from "@/types";
import ZeusCss from "@/styles/templates/greek/zeus.css?inline";
import { getRenderColumns } from "@/utils/section-layout";
import { renderSections, type SectionMap } from "@/components/templates/render-sections";

const ZeusTemplate: React.FC<TemplateProps> = ({ data }) => {
  const socialSection = (
    <div className="greek-socials">
      {data?.socials?.map((social, i) => (
        <a href={social?.link} key={i} target="_blank">
          <i className={`fab fa-${social?.slug} fa-lg`}></i>
        </a>
      ))}
    </div>
  );

  const aboutSection = (
    <section className="greek-section">
      <h2 className="greek-section-title"><span className="greek-icon">⚡</span>Professional Summary</h2>
      <div className="greek-summary">{data?.summary}</div>
    </section>
  );

  const expSection = (
    <section className="greek-section">
      <h2 className="greek-section-title"><span className="greek-icon">🏛️</span>Work Experience</h2>
      {data?.experience
        ?.filter(exp => !exp.hidden)
        ?.map((exp, i) => (
          <div key={i} className="greek-item">
            <div className="greek-item-header">
              <span className="greek-item-title">{exp?.title}</span>
              <span className="greek-item-date">{parseMonthYear(exp?.startDate)} - {exp?.endDate ? parseMonthYear(exp?.endDate) : 'Present'}</span>
            </div>
            <span className="greek-item-subtitle">{exp?.company}</span>
            <div className="greek-item-description">{exp?.description}</div>
          </div>
        ))
      }
    </section>
  );

  const educSection = (
    <section className="greek-section">
      <h2 className="greek-section-title"><span className="greek-icon">🎓</span>Academic Background</h2>
      {data?.education
        ?.filter(ed => !ed.hidden)
        ?.map((edu, i) => (
          <div key={i} className="greek-item">
            <div className="greek-item-header">
              <span className="greek-item-title">{edu?.degree}</span>
              <span className="greek-item-date">{parseMonthYear(edu?.startDate)} - {edu?.endDate ? parseMonthYear(edu?.endDate) : 'Present'}</span>
            </div>
            <span className="greek-item-subtitle">{edu?.institution}</span>
          </div>
        ))
      }
    </section>
  );

  const projSection = (
    <section className="greek-section">
      <h2 className="greek-section-title"><span className="greek-icon">⚔️</span>Notable Projects</h2>
      {data?.projects
        ?.filter(proj => !proj.hidden)
        ?.map((proj, i) => (
          <div key={i} className="greek-item">
            <div className="greek-item-header">
              <span className="greek-item-title">{proj?.title}</span>
              <span className="greek-item-date">{proj?.technologies?.join(", ")}</span>
            </div>
            <div className="greek-item-description">{proj?.description}</div>
          </div>
        ))
      }
    </section>
  );

  const skillSection = (
    <section className="greek-section">
      <h2 className="greek-section-title"><span className="greek-icon">🔱</span>Professional Skills</h2>
      <div className="greek-skills">
        {data?.skills
          ?.filter(s => !s.hidden)
          ?.map((skill, i) => (
            <div key={i} className="greek-item">
              <div className="greek-item-header">
                <span className="greek-item-title">{skill.name}</span>
              </div>
              <div className="greek-item-description">
                {skill?.keywords?.join(" • ")}
              </div>
            </div>
          ))
        }
      </div>
    </section>
  );

  const langSection = (
    <section className="greek-section">
      <h2 className="greek-section-title"><span className="greek-icon">🗣️</span>Spoken Languages</h2>
      <div className="greek-languages">
        {data?.languages?.join(" • ")}
      </div>
    </section>
  );

  const certSection = (
    <section className="greek-section">
      <h2 className="greek-section-title"><span className="greek-icon">🏆</span>Certifications & Licenses</h2>
      {data?.certifications
        ?.filter(cert => !cert.hidden)
        ?.map((cert, i) => (
          <div className="greek-item" key={i}>
            <div className="greek-item-header">
              <span className="greek-item-title">{cert?.name}</span> | <span className="greek-item-subtitle">{cert?.issuingOrganization}</span>
              <span className="greek-item-date">{parseMonthYear(cert?.date)}</span>
            </div>
            <div className="greek-item-description"></div>
          </div>
        ))
      }
    </section>
  );

  const awardsSection = (
    <section className="greek-section">
      <h2 className="greek-section-title"><span className="greek-icon">👑</span>Awards & Achievements</h2>
      {data?.awards
        ?.filter(award => !award.hidden)
        ?.map((award) => (
          <div className="greek-item">
            <div className="greek-item-header">
              <span className="greek-item-title">{award?.title}</span>
              <span className="greek-item-date">{parseMonthYear(award?.date)}</span>
              <div className="greek-item-description">{award?.description}</div>
            </div>
          </div>
        ))
      }
    </section>
  );

  const refSection = (
    <section className="greek-section">
      <h2 className="greek-section-title"><span className="greek-icon">🤝</span>Professional References</h2>
      {data?.references
        ?.filter(reference => !reference.hidden)
        ?.map((reference, i) => (
          <div className="greek-item" key={i}>
            <div className="greek-item-header">
              <span className="greek-item-title">{reference?.name}</span> | <span className="greek-item-subtitle">{[reference?.title, reference?.company].filter(Boolean).join(' at ')}</span>
              <div className="greek-item-description">{[reference?.email, reference?.phone].filter(Boolean).join(' | ')}</div>
            </div>
          </div>
        ))
      }
    </section>
  );

  const columns = getRenderColumns('zeus', data);
  const sections: SectionMap = {
    summary: aboutSection,
    experience: expSection,
    education: educSection,
    projects: projSection,
    skills: skillSection,
    languages: langSection,
    certifications: certSection,
    awards: awardsSection,
    references: refSection,
  };

  return (
    <>
      <style>
        {ZeusCss}
      </style>
      <div className="resume-greek-container">
        <div className="greek-border-top"></div>
        <header className="greek-header">
          <div className="greek-laurel-left">🏛️</div>
          <div className="greek-header-content">
            <h1 className="greek-name">{data?.personal?.name}</h1>
            <h2 className="greek-headline">{data?.personal?.headline}</h2>
            <div className="greek-contact">
              {data?.personal?.email && <span>📧 {data.personal.email}</span>}
              {data?.personal?.location && <span>📍 {data.personal.location}</span>}
              {data?.personal?.contact_number && <span>📞 {data.personal.contact_number}</span>}
              {data?.personal?.website?.name && <span>🌐 <a href={data.personal.website.link}>{data.personal.website.name}</a></span>}
            </div>
            {data?.socials && data?.socials?.length >= 1 && socialSection}
          </div>
          <div className="greek-laurel-right">⚡</div>
        </header>
        <main className="greek-main">
          {renderSections(columns[0], sections)}
        </main>
      </div>
    </>
  );
};

export default ZeusTemplate;