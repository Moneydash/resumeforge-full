import React from "react";
import type { TemplateProps } from "@/types";
import CometCss from "@/styles/templates/galaxy/comet.css?inline";

const CometTemplate: React.FC<TemplateProps> = ({ data }) => {
  const aboutSection = (
    <section className="comet-section">
      <h2 className="comet-section-title">
        About Me
      </h2>
      <div className="comet-summary">{data?.summary}</div>
    </section>
  );

  const skillSection = (
    <section className="comet-section">
      <h2 className="comet-section-title">Skills</h2>
      {data?.skills
        ?.filter(skill => !skill.hidden)
        ?.map(skill => skill?.keywords?.join(", "))
        .join(", ")
      }
    </section>
  );

  const projSection = (
    <section className="comet-section">
      <h2 className="comet-section-title">Projects</h2>
      {data?.projects
        ?.filter(proj => !proj.hidden)
        ?.map((proj, i) => (
          <div key={i} className="comet-item">
            <div className="comet-item-header">
              <span className="comet-item-title">{proj?.title}</span>
              <span className="comet-item-tech">{proj?.technologies?.join(", ")}</span>
            </div>
            <div className="comet-item-description">{proj?.description}</div>
          </div>
        ))
      }
    </section>
  );

  const interestSection = (
    <section className="comet-section">
      <h2 className="comet-section-title">Interests</h2>
      <div className="comet-interests">{data?.interests?.join(", ")}</div>
    </section>
  );

  return (
    <>
      <style>
        {CometCss}
      </style>
      <div className="comet-container">
        <header className="comet-header">
          <h1 className="comet-name">{data?.personal?.name}</h1>
          <h2 className="comet-headline">{data?.personal?.headline}</h2>
          <div className="comet-contact">
            <span>{data?.personal?.email}</span>
            <span>{data?.personal?.location}</span>
            <span>{data?.personal?.contact_number}</span>
            <span><a href={data?.personal?.website?.link}>{data?.personal?.website?.name}</a></span>
          </div>
        </header>
        <main className="comet-main">
          {data?.summary && aboutSection}
          {data?.skills && data?.skills?.filter(skill => !skill.hidden)?.length >= 1 && skillSection}
          {data?.projects && data?.projects?.filter(proj => !proj.hidden)?.length >= 1 && projSection}
          {data?.interests && data?.interests?.length >= 1 && interestSection}
        </main>
      </div>
    </>
  );
};

export default CometTemplate;