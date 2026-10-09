import { parseMonthYear } from "@/utils/helper";
import React from "react";
import type { TemplateProps } from "@/types";
import cigarCss from "@/styles/templates/greek/hera.css?inline";
import { getRenderColumns } from "@/utils/section-layout";
import { renderSections, type SectionMap } from "@/components/templates/render-sections";

const HeraTemplate: React.FC<TemplateProps> = ({ data }) => {
  const aboutSection = (
    <section className="classic-section">
      <h2 className="classic-section-title">Summary</h2>
      <div className="classic-summary">
        {data?.summary || '-'}
      </div>
    </section>
  );

  const expSection = (
    <section className="classic-section">
      <h2 className="classic-section-title">Work Experience</h2>
      {data?.experience
        ?.filter(exp => !exp.hidden)
        ?.map((exp, i) => (
          <div className="classic-item" key={i}>
            <div className="classic-item-header">
              <span className="classic-item-title">{exp.title}</span>
              <span className="classic-item-date">{parseMonthYear(exp?.startDate)} - {exp?.endDate ? parseMonthYear(exp?.endDate) : 'Present'}</span>
            </div>
            <span className="classic-item-subtitle">{exp?.company}</span>
            <div className="classic-item-description">{exp?.description}</div>
          </div>
        ))
      }
    </section>
  );

  const educSection = (
    <section className="classic-section">
      <h2 className="classic-section-title">Education</h2>
      {data?.education
        ?.filter(ed => !ed.hidden)
        ?.map((educ, i) => (
          <div className="classic-item" key={i}>
            <div className="classic-item-header">
              <span className="classic-item-title">{educ?.degree}</span>
              <span className="classic-item-date">{parseMonthYear(educ?.startDate)} - {educ?.endDate ? parseMonthYear(educ?.endDate) : 'Present'}</span>
            </div>
            <span className="classic-item-subtitle">{educ.institution}</span>
          </div>
        ))
      }
    </section>
  );

  const projSection = (
    <section className="classic-section">
      <h2 className="classic-section-title">Projects</h2>
      {data?.projects
        ?.filter(proj => !proj.hidden)
        ?.map((proj, i) => (
          <div className="classic-item" key={i}>
            <div className="classic-item-header">
              <span className="classic-item-title">{proj?.title}</span>
              <span className="classic-item-date">{proj?.technologies.join(", ")}</span>
            </div>
            <div className="classic-item-description">{proj?.description}</div>
          </div>
        ))
      }
    </section>
  );

  const skillSection = (
    <section className="classic-section">
      <h2 className="classic-section-title">Skills</h2>
      <div className="classic-skills-grid">
        {data?.skills?.filter(skill => !skill.hidden)?.map((skill) =>
          skill?.keywords?.map((keyword, j) => (
            <div key={j} className="classic-skill-item">• {keyword}</div>
          ))
        )}
      </div>
    </section>
  );

  const langSection = (
    <section className="classic-section">
      <h2 className="classic-section-title">Languages</h2>
      <div className="classic-languages">{data?.languages?.join(" • ")}</div>
    </section>
  );

  const interestsSection = (
    <section className="classic-section">
      <h2 className="classic-section-title">Interests</h2>
      <div className="classic-interests-grid">
        {data?.interests?.map((interest, i) => (
          <div key={i} className="classic-interest-item">• {interest}</div>
        ))}
      </div>
    </section>
  );

  const certSection = (
    <section className="classic-section">
      <h2 className="classic-section-title">Certifications</h2>
      {data?.certifications
        ?.filter(cert => !cert.hidden)
        ?.map((cert, i) => (
          <div className="classic-item" key={i}>
            <div className="classic-item-header">
              <span className="classic-item-title">{cert?.name}</span> | <span className="classic-item-subtitle">{cert?.issuingOrganization}</span>
              <span className="classic-item-date">{parseMonthYear(cert?.date) || '-'}</span>
            </div>
          </div>
        ))
      }
    </section>
  );

  const awardsSection = (
    <section className="classic-section">
      <h2 className="classic-section-title">Awards</h2>
      {data?.awards
        ?.filter(award => !award.hidden)
        ?.map((award, i) => (
          <div className="classic-item" key={i}>
            <div className="classic-item-header">
              <span className="classic-item-title">{award?.title}</span>
              <span className="classic-item-date">{parseMonthYear(award?.date) || '-'}</span>
            </div>
            <div className="classic-item-description">{award?.description}</div>
          </div>
        ))
      }
    </section>
  );

  const refSection = (
    <section className="classic-section">
      <h2 className="classic-section-title">References</h2>
      {data?.references
        ?.filter(reference => !reference.hidden)
        ?.map((reference, i) => (
          <div className="classic-item" key={i}>
            <div className="classic-item-header">
              <span className="classic-item-title">{reference?.name}</span> | <span className="classic-item-subtitle">{reference?.title}</span>
            </div>
            <div className="classic-item-description">{reference?.company}</div>
          </div>
        ))
      }
    </section>
  );

  const columns = getRenderColumns('hera', data);
  const sections: SectionMap = {
    summary: aboutSection,
    experience: expSection,
    education: educSection,
    projects: projSection,
    skills: skillSection,
    languages: langSection,
    interests: interestsSection,
    certifications: certSection,
    awards: awardsSection,
    references: refSection,
  };

  return (
    <>
      <style>
        {cigarCss}
      </style>
      <div className="classic-container">
        <header className="classic-header">
          <h1 className="classic-name">{data.personal.name}</h1>
          <h2 className="classic-headline">{data.personal.headline}</h2>
          <div className="classic-contact">
            <span>{data.personal?.email}</span>
            <span>{data.personal?.location}</span>
            <span>{data.personal?.contact_number}</span>
            <span><a href={data.personal?.website?.link}>{data.personal?.website?.name}</a></span>
          </div>
          <div className="classic-socials">
            {data.socials?.map((social, i) => (
              <a key={i} href={social.link}><i className={`fab fa-${social.slug} fa-lg`}></i></a>
            ))}
          </div>
        </header>
        <main className="classic-main">
          {renderSections(columns[0], sections)}
        </main>
      </div>
    </>
  );
};

export default HeraTemplate;