import { parseMonthYear } from "@/utils/helper";
import React from "react";
import type { TemplateProps } from "@/types";
import andromedaCSS from "@/styles/templates/galaxy/andromeda.css?inline";

const AndromedaTemplate: React.FC<TemplateProps> = ({ data }) => {
  const expSection = (
    <section className="section">
      <h2 className="section-title">Experience</h2>
      <div className="section-content">
        {data.experience
          .filter(exp => !exp.hidden)
          .map((exp, i) => (
            <div className="item" key={i}>
              <div className="item-header">
                <h3 className="item-title">{exp.title}</h3>
                <p className="item-subtitle" style={{ marginTop: '-10px' }}>{exp.company}</p>
                <div className="item-date">{parseMonthYear(exp.startDate)} - {exp.endDate ? parseMonthYear(exp.endDate) : 'Present'}</div>
              </div>
              <div className="item-description">
                {exp.description}
              </div>
            </div>
          ))
        }
      </div>
    </section>
  );

  const educSection = (
    <section className="section">
      <h2 className="section-title">Education</h2>
      <div className="section-content">
        {data.education
          .filter(educ => !educ.hidden)
          .map((educ, i) => (
            <div key={i} className="item" style={{ marginBottom: '1.5rem' }}>
              <div className="item-header">
                <h3 className="item-title">{educ.degree}</h3>
                <p className="item-subtitle">{educ.institution}</p>
                <div className="item-date">{parseMonthYear(educ.startDate)} - {educ.endDate ? parseMonthYear(educ.endDate) : 'Present'}</div>
              </div>
            </div>
          ))
        }
      </div>
    </section >
  );

  const langSection = (
    <section className="section">
      <h2 className="section-title">Languages</h2>
      <div className="section-content">
        <div className="languages">
          {data.languages?.map((lang, i) => (
            <span className="language" key={i}>{lang}</span>
          ))}
        </div>
      </div>
    </section>
  );

  const interestSection = (
    <section className="section">
      <h2 className="section-title">Interests</h2>
      <div className="section-content">
        <div className="interests">
          {data.interests?.map((interest, i) => (
            <span key={i} className="interest">{interest}</span>
          ))}
        </div>
      </div>
    </section>
  );

  const certSection = (
    <section className="section">
      <h2 className="section-title">Certifications</h2>
      <div className="section-content">
        {data.certifications
          ?.filter(cert => !cert.hidden)
          ?.map((cert, i) => (
            <div className="item" key={i}>
              <div className="item-header">
                <h3 className="item-title">{cert.name}</h3>
                <p className="item-subtitle">{cert.issuingOrganization}</p>
                <div className="item-date">{parseMonthYear(cert.date) || '-'}</div>
              </div>
            </div>
          ))
        }
      </div>
    </section>
  );

  const skillSection = (
    <section className="section">
      <h2 className="section-title">Skills</h2>
      <div className="section-content">
        {data.skills
          ?.filter(s => !s.hidden)
          ?.map((skill, i) => (
            <div key={i} className="skill-group">
              <h3 className="skill-group-title">{skill.name}</h3>
              <div className="skill-keywords">
                {skill.keywords?.map((keyword, i) => (
                  <span key={i} className="keyword">{keyword}</span>
                ))}
              </div>
            </div>
          ))
        }
      </div>
    </section>
  );

  const projSection = (
    <section className="section">
      <h2 className="section-title">Projects</h2>
      <div className="section-content">
        {data.projects
          ?.filter(proj => !proj.hidden)
          ?.map((proj, i) => (
            <div key={i} className="item">
              <div className="item-header">
                <h3 className="item-title">{proj.title}</h3>
              </div>
              <div className="item-description">
                <p>{proj.description}</p>
              </div>
              <div className="project-technologies">
                {proj.technologies?.map((tech, i) => (
                  <span key={i} className="technology">{tech}</span>
                ))}
              </div>
            </div>
          ))
        }
      </div>
    </section>
  );

  const refSection = (
    <section className="section">
      <h2 className="section-title">References</h2>
      <div className="section-content">
        {data.references
          ?.filter(reference => !reference.hidden)
          ?.map((reference, i) => (
            <div key={i} className="reference">
              <h3 className="item-title">{reference.name}</h3>
              <p className="item-subtitle">{reference.title} at {reference.company}</p>
              <div className="reference-contact">
                <p>{reference?.email || '-'}</p>
                <p>{reference?.phone || '-'}</p>
              </div>
            </div>
          ))
        }
      </div>
    </section>
  );

  const awardsSection = (
    <section className="section">
      <h2 className="section-title">Awards</h2>
      <div className="section-content">
        {data.awards
          ?.filter(award => !award.hidden)
          ?.map((award, i) => (
            <div className="item" key={i}>
              <div className="item-header">
                <h3 className="item-title">{award.title}</h3>
                <div className="item-date" style={{ marginTop: '-0.85rem' }}>
                  {parseMonthYear(award.date) || '-'}
                </div>
              </div>
            </div>
          ))
        }
      </div>
    </section>
  );

  return (
    <>
      <style>
        {andromedaCSS}
      </style>
      <div className="resumeContainer">
        <header className="header">
          <h1 className="name">{data.personal.name || ''}</h1>
          <h2 className="headline">{data.personal.headline}</h2>
          <div className="contact-info">
            <p className="email">{data.personal.email}</p>
            <p className="location">{data.personal.location}</p>
            <p className="contact-number">{data.personal.contact_number}</p>
            <p className="website"><a href={`${data.personal.website.link}`}>{data.personal.website.name}</a></p>
          </div>
          <div className="social-links">
            {data.socials.map((social, i) => (
              <a key={i} href={`${social.link}`}><i className={`fab fa-${social.slug} fa-xl`}></i></a>
            ))}
          </div>
        </header>
        <div className="main-content">
          <div className="left-column">
            <section className="section">
              <h3 className="section-title">Summary</h3>
              <div className="summary">
                <p>{data.summary}</p>
              </div>
            </section>
            {data.experience && data.experience.filter(exp => !exp.hidden).length > 0 && expSection}
            {/* if experience is less than 4 then display the education on the left column */}
            {data.experience.filter(exp => !exp.hidden)?.length <= 2 && data.education && data.education?.filter(ed => !ed.hidden)?.length > 0 && educSection}
            {/* if experience is less than 2, display the languages and certifications into left column */}
            {data.experience.filter(exp => !exp.hidden).length <= 2 && (
              <>
                {/* languages */}
                {data.languages && data?.languages?.length >= 1 && langSection}

                {/* certifications */}
                {data.certifications && data?.certifications?.filter(cert => !cert.hidden)?.length >= 1 && certSection}

                {/* interests */}
                {data.interests && data?.interests?.length >= 1 && interestSection}
              </>
            )}
          </div>
          <div className="right-column">
            {data.experience.filter(exp => !exp.hidden)?.length > 2 && data.education && data.education?.filter(ed => !ed.hidden)?.length > 0 && educSection}
            {data.skills && data.skills?.filter(s => !s.hidden).length > 0 && skillSection}
            {data.projects && projSection}
            {data.experience.filter(exp => !exp.hidden)?.length > 2 && (
              <>
                {/* languages */}
                {data.languages && data?.languages?.length >= 1 && langSection}

                {/* certifications */}
                {data.certifications && data?.certifications?.filter(cert => !cert.hidden)?.length >= 1 && certSection}

                {/* interests */}
                {data.interests && data?.interests?.length >= 1 && interestSection}
              </>
            )}
            {data?.awards && data?.awards?.filter(award => !award.hidden)?.length >= 1 && awardsSection}
            {data?.references && data?.references.filter(reference => !reference.hidden)?.length >= 1 && refSection}
          </div>
        </div>
      </div>
    </>
  );
};

export default AndromedaTemplate;