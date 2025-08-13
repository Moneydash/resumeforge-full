import { parseMonthYear } from "@/utils/helper";
import React from "react";
import type { TemplateProps } from "@/types";
import milkyWayCss from "@/styles/templates/galaxy/milky_way.css?inline";

const MilkyWayTemplate: React.FC<TemplateProps> = ({ data }) => {
  const aboutSection = (
    <section className="mw-section">
      <h2 className="mw-section-title">About Me</h2>
      <div className="mw-summary">{data?.summary}</div>
    </section>
  );

  const expSection = (
    <section className="mw-section">
      <h2 className="mw-section-title">Work Experience</h2>
      {data?.experience
        ?.filter(exp => !exp.hidden)
        ?.map((exp, i) => (
          <div key={i} className="mw-item mw-card">
            <div className="mw-item-header">
              <span className="mw-item-title">{exp?.title}</span> <span className="mw-item-company">@ {exp?.company}</span>
              <span className="mw-item-date">{parseMonthYear(exp?.startDate)} - {exp?.endDate ? parseMonthYear(exp?.endDate) : 'Present'}</span>
            </div>
            <div className="mw-item-description">{exp?.description}</div>
          </div>
        ))
      }
    </section>
  );

  const educSection = (
    <section className="mw-section">
      <h2 className="mw-section-title">Education</h2>
      {data?.education
        ?.filter(edu => !edu.hidden)
        ?.map((edu, i) => (
          <div key={i} className="mw-item mw-card">
            <span className="mw-item-title">{edu?.degree}</span>
            <div className="mw-item-header" style={{ marginTop: '0.5rem' }}>
              <span className="mw-item-company">{edu?.institution}</span>
              <span className="mw-item-date">{parseMonthYear(edu?.startDate)} - {edu?.endDate ? parseMonthYear(edu?.endDate) : 'Present'}</span>
            </div>
          </div>
        ))
      }
    </section>
  );

  const projSection = (
    <section className="mw-section">
      <h2 className="mw-section-title">Projects</h2>
      {data?.projects
        ?.filter(proj => !proj.hidden)
        ?.map((proj, i) => (
          <div className="mw-item mw-card" key={i}>
            <div className="mw-item-header">
              <span className="mw-item-title">{proj?.title}</span>
              <span className="mw-item-tech">{proj?.technologies?.join(", ")}</span>
            </div>
            <div className="mw-item-description">{proj?.description}</div>
          </div>
        ))
      }
    </section>
  );

  const skillSection = (
    <section className="mw-section">
      <h2 className="mw-section-title">Skills</h2>
      <div className="mw-skills">
        {data?.skills
          ?.filter(s => !s.hidden)
          ?.map((skill) => (
            skill?.keywords
              ?.map((key, i) => (
                <span className="mw-skill-pill" key={i}>{key}</span>
              ))
          ))
        }
      </div>
    </section>
  );

  const langSection = (
    <section className="mw-section">
      <h2 className="mw-section-title">Languages</h2>
      <div className="mw-languages">
        {data?.languages?.map((lang, i) => (
          <span key={i} className="mw-skill-pill">{lang}</span>
        ))}
      </div>
    </section>
  );

  const certSection = (
    <section className="mw-section">
      <h2 className="mw-section-title">Certifications</h2>
      {data?.certifications
        ?.filter(cert => !cert.hidden)
        ?.map((cert, i) => (
          <div key={i} className="mw-item mw-card">
            <div className="mw-item-header">
              <span className="mw-item-title">{cert?.name}</span> <span className="mw-item-company">@ {cert?.issuingOrganization}</span>
              <span className="mw-item-date">{parseMonthYear(cert?.date)}</span>
            </div>
          </div>
        ))
      }
    </section>
  );

  const awardsSection = (
    <section className="mw-section">
      <h2 className="mw-section-title">Awards</h2>
      {data?.awards
        ?.filter(award => !award.hidden)
        ?.map((award, i) => (
          <div className="mw-item mw-card" key={i}>
            <div className="mw-item-header">
              <span className="mw-item-title">{award?.title}</span>
              <span className="mw-item-date">{parseMonthYear(award?.date)}</span>
            </div>
            <div className="mw-item-description">{award?.description}</div>
          </div>
        ))
      }
    </section>
  );

  const interestSection = (
    <section className="mw-section">
      <h2 className="mw-section-title">Interests</h2>
      <div className="mw-interests">
        {data?.interests?.map((interest, i) => (
          <span key={i} className="mw-skill-pill">{interest}</span>
        ))}
      </div>
    </section>
  );

  const refSection = (
    <section className="mw-section">
      <h2 className="mw-section-title">References</h2>
      {data?.references
        ?.filter(reference => !reference.hidden)
        ?.map((reference, i) => (
          <div className="mw-item mw-card" key={i}>
            <div className="mw-item-header">
              <span className="mw-item-title">{reference?.name}</span> <span className="mw-item-company">{reference?.title} @ {reference?.company}</span>
            </div>
            <span className="mw-item-description">{reference?.email || '-'} | {reference?.phone || '-'}</span>
          </div>
        ))
      }
    </section>
  );

  return (
    <>
      <style>
        {milkyWayCss}
      </style>
      <div className="mw-container">
        <header className="mw-header">
          <h1 className="mw-name">{data?.personal?.name}</h1>
          <h2 className="mw-headline">{data?.personal?.headline}</h2>
          <div className="mw-contact">
            <span>{data?.personal?.email}</span>
            <span>{data?.personal?.location}</span>
            <span>{data?.personal?.contact_number}</span>
            <span><a href={data?.personal?.website?.link}>{data?.personal?.website?.name}</a></span>
          </div>
        </header>
        <main className="mw-main">
          {data?.summary && aboutSection}
          {data?.experience && data?.experience?.filter(exp => !exp.hidden)?.length >= 1 && expSection}
          {data?.education && data?.education?.filter(ed => !ed.hidden)?.length >= 1 && educSection}
          {data?.projects && data?.projects?.filter(proj => !proj.hidden)?.length >= 1 && projSection}
          {data?.skills && data?.skills?.filter(s => !s.hidden)?.length >= 1 && skillSection}
          {data?.languages && data?.languages?.length >= 1 && langSection}
          {data?.certifications && data?.certifications?.filter(cert => !cert.hidden)?.length >= 1 && certSection}
          {data?.awards && data?.awards?.filter(award => !award.hidden)?.length >= 1 && awardsSection}
          {data?.interests && data?.interests?.length >= 1 && interestSection}
          {data?.references && data?.references?.filter(reference => !reference.hidden)?.length >= 1 && refSection}
        </main>
      </div>
    </>
  );
};

export default MilkyWayTemplate;