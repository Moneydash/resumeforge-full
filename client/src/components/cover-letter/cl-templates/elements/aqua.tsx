import React from "react";
import type { CLTemplateProps } from "@/types";
import AquaCss from "@/styles/cover-letter/templates/elements/aqua.css?inline";
import { formatText } from "@/utils/helper";

const Aqua: React.FC<CLTemplateProps> = ({ data }) => {
  return (
    <>
      <style>
        {AquaCss}
      </style>
      <div className="cover-letter-template">
        <div className="two-column-layout">
          {/* Left Column - Sender Details Only */}
          <div className="left-column">
            <div className="sender-info">
              <h1 className="sender-name">{data.sender.name.trim()}</h1>
              <p className="sender-title">{data.sender.job_title}</p>
              <div className="contact-info">
                <p>{data.sender.address}</p>
                <p>{data.sender.location}</p>
                <p>{data.sender.phone}</p>
                <p>{data.sender.email}</p>
                {data.sender.linkedin && (
                  <p>
                    <a href={data.sender.linkedin} target="_blank" rel="noopener noreferrer">
                      LinkedIn Profile
                    </a>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Everything Else */}
          <div className="right-column">
            <section className="recipient-section">
              <div className="recipient-info">
                <p className="recipient-name">{data.recipient.name}</p>
                <p className="recipient-title">{data.recipient.title}</p>
                <p className="recipient-company">{data.recipient.company}</p>
                <p className="recipient-address">{data.recipient.address}</p>
              </div>
            </section>

            <main className="letter-content">
              <section className="introduction">
                <p>{formatText(data.content.introduction)}</p>
              </section>

              <section className="body">
                <p>{formatText(data.content.body)}</p>
              </section>

              <section className="closing">
                <p>{formatText(data.content.closing || '')}</p>
              </section>
            </main>
          </div>
        </div>
      </div>
    </>
  );
};

export default Aqua;