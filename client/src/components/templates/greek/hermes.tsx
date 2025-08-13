import { parseMonthYear } from "@/utils/helper";
import React from "react";
import type { TemplateProps } from "@/types";
import HermesCss from "@/styles/templates/greek/hermes.css?inline";

const HermesTemplate: React.FC<TemplateProps> = ({ data }) => {
  const headerSection = (
    <div className="resume-header">
      <div className="resume-header-content">
        <h1 className="resume-name">{data?.personal?.name}</h1>
        <p className="resume-title">{data?.personal?.headline}</p>
        <p className="resume-summary">{data?.summary}</p>

        <div className="contact-info">
          <div className="contact-item">
            <i className="fas fa-envelope"></i>
            <a href={`mailto:${data?.personal?.email}`}>{data?.personal?.email}</a>
          </div>
          <div className="contact-item">
            <i className="fas fa-phone"></i>
            <span>{data?.personal?.contact_number}</span>
          </div>
          <div className="contact-item">
            <i className="fas fa-map-marker-alt"></i>
            <span>{data?.personal?.location}</span>
          </div>
          <div className="contact-item">
            <i className="fas fa-globe"></i>
            <a href={data?.personal?.website?.link} target="_blank">{data?.personal?.website?.name}</a>
          </div>
        </div>

        <div className="social-links">
          {data?.socials?.map((social, i) => (
            <a key={i} href={social?.link} target="_blank" className="social-link">
              <i className={`fab fa-${social.slug}`}></i>
            </a>
          ))}
        </div>
      </div>
    </div>
  );

  const workExperienceSection = (
    <div className="resume-section">
      <h2 className="section-title">
        <i className="fas fa-briefcase section-icon"></i>
        WORK EXPERIENCE
      </h2>
      <div className="section-content">
        {data?.experience
          ?.filter(exp => !exp.hidden)
          ?.map((exp, i) => (
            <div className="experience-item" key={i}>
              <div className="experience-header">
                <div className="experience-main">
                  <h3 className="experience-title">{exp?.title}</h3>
                  <p className="experience-company">{exp?.company}</p>
                </div>
                <div className="experience-meta">
                  <span className="experience-date">
                    {parseMonthYear(exp?.startDate)} - {exp?.endDate ? parseMonthYear(exp?.endDate) : 'Present'}
                  </span>
                </div>
              </div>
              <div className="experience-description">
                {exp?.description?.split('\n').map((line, index) => (
                  <p key={index}>{line}</p>
                ))}
              </div>
            </div>
          ))
        }
      </div>
    </div>
  );

  const skillsSection = (
    <div className="resume-section">
      <h2 className="section-title">
        <i className="fas fa-cogs section-icon"></i>
        SKILLS & COMPETENCIES
      </h2>
      <div className="section-content">
        <div className="skills-container">
          {data?.skills
            ?.filter(skill => !skill.hidden)
            ?.map((skillCategory, categoryIndex) => (
              <div key={categoryIndex} className="skills-category">
                {skillCategory?.keywords?.map((skill, i) => (
                  <span key={i} className="skill-item">{skill}</span>
                ))}
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );

  const certificatesSection = (
    <div className="resume-section">
      <h2 className="section-title">
        <i className="fas fa-certificate section-icon"></i>
        CERTIFICATES
      </h2>
      <div className="section-content">
        {data?.certifications
          ?.filter(cert => !cert.hidden)
          ?.map((cert, i) => (
            <div className="certificate-item" key={i}>
              <h3 className="certificate-name">{cert?.name}</h3>
              <div className="certificate-details">
                <p className="certificate-org">{cert?.issuingOrganization}</p>
                <span className="certificate-date">{parseMonthYear(cert?.date)}</span>
              </div>
            </div>
          ))
        }
      </div>
    </div>
  );

  const educationSection = (
    <div className="resume-section">
      <h2 className="section-title">
        <i className="fas fa-graduation-cap section-icon"></i>
        EDUCATION
      </h2>
      <div className="section-content">
        {data?.education
          ?.filter(educ => !educ.hidden)
          ?.map((educ, i) => (
            <div className="education-item" key={i}>
              <h3 className="education-degree">{educ?.degree}</h3>
              <div className="education-details">
                <p className="education-school">{educ?.institution}</p>
                <span className="education-date">
                  {parseMonthYear(educ?.startDate)} - {educ?.endDate ? parseMonthYear(educ?.endDate) : 'Present'}
                </span>
              </div>
            </div>
          ))
        }
      </div>
    </div>
  );

  const projectsSection = (
    <div className="resume-section">
      <h2 className="section-title">
        <i className="fas fa-project-diagram section-icon"></i>
        KEY PROJECTS
      </h2>
      <div className="section-content">
        {data?.projects
          ?.filter(proj => !proj.hidden)
          ?.map((proj, i) => (
            <div className="project-item" key={i}>
              <h3 className="project-title">{proj?.title}</h3>
              <p className="project-description">{proj?.description}</p>
              <div className="project-technologies">
                {proj?.technologies?.map((tech, j) => (
                  <span key={j} className="tech-item">{tech}</span>
                ))}
              </div>
            </div>
          ))
        }
      </div>
    </div>
  );

  const awardsSection = (
    <div className="resume-section">
      <h2 className="section-title">
        <i className="fas fa-award section-icon"></i>
        AWARDS
      </h2>
      <div className="section-content">
        {data?.awards
          ?.filter(award => !award.hidden)
          ?.map((award, i) => (
            <div className="award-item" key={i}>
              <div className="award-header">
                <h3 className="award-title">{award?.title}</h3>
                <span className="award-date">{parseMonthYear(award?.date)}</span>
              </div>
              <p className="award-description">{award?.description}</p>
            </div>
          ))
        }
      </div>
    </div>
  );

  const interestsSection = (
    <div className="resume-section">
      <h2 className="section-title">
        <i className="fas fa-heart section-icon"></i>
        INTERESTS
      </h2>
      <div className="section-content">
        <div className="interests-container">
          {data?.interests?.map((interest, i) => (
            <span key={i} className="interest-item">{interest}</span>
          ))}
        </div>
      </div>
    </div>
  );

  const languagesSection = (
    <div className="resume-section">
      <h2 className="section-title">
        <i className="fas fa-language section-icon"></i>
        LANGUAGES
      </h2>
      <div className="section-content">
        <div className="languages-container">
          {data?.languages?.map((lang, i) => (
            <div key={i} className="language-item">
              <span className="language-name">{lang}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const referencesSection = (
    <div className="resume-section">
      <h2 className="section-title">
        <i className="fas fa-users section-icon"></i>
        REFERENCES
      </h2>
      <div className="section-content">
        {data?.references
          ?.filter(ref => !ref.hidden)
          ?.map((reference, i) => (
            <div className="reference-item" key={i}>
              <h3 className="reference-name">{reference?.name}</h3>
              <p className="reference-title">{reference?.title} at {reference?.company}</p>
              <div className="reference-contact">
                <span>{reference?.email || '-'}</span>
                <span className="contact-separator">•</span>
                <span>{reference?.phone || '-'}</span>
              </div>
            </div>
          ))
        }
      </div>
    </div>
  );

  const leftColumn = (
    <div className="resume-left-column">
      {data?.experience && data?.experience?.filter(section => !section.hidden)?.length >= 1 && workExperienceSection}
      {data?.projects && data?.projects?.filter(section => !section.hidden)?.length >= 1 && projectsSection}
      {data?.experience?.length < 3 && data?.references && data?.references?.filter(section => !section.hidden)?.length >= 1 && referencesSection}
    </div>
  );

  const rightColumn = (
    <div className="resume-right-column">
      {data?.skills && data?.skills?.filter(section => !section.hidden)?.length >= 1 && skillsSection}
      {data?.education && data?.education?.filter(section => !section.hidden)?.length >= 1 && educationSection}
      {data?.certifications && data?.certifications?.filter(section => !section.hidden)?.length >= 1 && certificatesSection}
      {data?.awards && data?.awards?.filter(section => !section.hidden)?.length >= 1 && awardsSection}
      {data?.interests && data?.interests?.length >= 1 && interestsSection}
      {data?.languages && data?.languages?.length >= 1 && languagesSection}
      {data?.experience?.filter(section => !section.hidden)?.length >= 3 && data?.references && data?.references?.filter(section => !section.hidden)?.length >= 1 && referencesSection}
    </div>
  );

  return (
    <>
      <style>
        {HermesCss}
      </style>
      <div className="hermes-resume">
        {headerSection}
        <div className="resume-content">
          {leftColumn}
          {rightColumn}
        </div>
      </div>
    </>
  );
};

export default HermesTemplate;