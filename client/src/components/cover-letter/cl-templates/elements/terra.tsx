import React from "react";
import type { CLTemplateProps } from "@/types";
import TerraCss from "@/styles/cover-letter/templates/elements/terra.css?inline";
import { formatText } from "@/utils/helper";

const Terra: React.FC<CLTemplateProps> = ({ data }) => {
  return (
    <>
      <style>
        {TerraCss}
      </style>
      <div className="cover-letter-template">
        <header className="letter-header">
          <div className="sender-info">
            <h1 className="sender-name">{data.sender.name.trim()}</h1>
            <p className="sender-title">{data.sender.job_title}</p>
            <div className="contact-info">
              <div className="contact-row">
                <span className="contact-item">{data.sender.email}</span>
                <span className="contact-item">{data.sender.phone}</span>
              </div>
              <div className="contact-row">
                <span className="contact-item">{data.sender.address}</span>
                <span className="contact-item">{data.sender.location}</span>
              </div>
              {data.sender.linkedin && (
                <div className="contact-row">
                  <a
                    href={data.sender.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="linkedin-link"
                  >
                    {data.sender.linkedin}
                  </a>
                </div>
              )}
            </div>
          </div>
        </header>

        <section className="recipient-section">
          <div className="recipient-info">
            <div className="recipient-name">{data.recipient.name}</div>
            <div className="recipient-title">{data.recipient.title}</div>
            <div className="recipient-company">{data.recipient.company}</div>
            <div className="recipient-address">{data.recipient.address}</div>
          </div>
        </section>

        <main className="letter-content">
          <section className="content-section introduction">
            <p>{formatText(data.content.introduction)}</p>
          </section>

          <section className="content-section body">
            <p>{formatText(data.content.body)}</p>
          </section>

          <section className="content-section closing">
            <p>{formatText(data.content.closing || '')}</p>
            <div className="signature-space"></div>
            <div className="sender-signature">{data.sender.name}</div>
          </section>
        </main>
      </div>
    </>
  );
};

export default Terra;