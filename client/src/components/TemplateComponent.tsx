import React from "react";
import type { ResumeFormData } from "@/types/interface.resume-form-data";
import AndromedaTemplate from "./templates/galaxy/andromeda";
import type { TemplateType } from "@/types";
import CigarTemplate from "./templates/galaxy/cigar";
import CometTemplate from "./templates/galaxy/comet";
import MilkyWayTemplate from "./templates/galaxy/milky_way";
import ZeusTemplate from "./templates/greek/zeus";
import AthenaTemplate from "./templates/greek/athena";
import ApolloTemplate from "./templates/greek/apollo";
import ArtemisTemplate from "./templates/greek/artemis";
import HermesTemplate from "./templates/greek/hermes";
import HeraTemplate from "./templates/greek/hera";

interface ResumePreviewProps {
  data: ResumeFormData,
  template?: TemplateType
}

const TemplateComponent: React.FC<ResumePreviewProps> = ({ data, template = 'andromeda' }) => {
  const renderTemplate = () => {
    switch (template) {
      case 'andromeda':
        return <AndromedaTemplate data={data} />;
      case 'cigar':
        return <CigarTemplate data={data} />;
      case 'comet':
        return <CometTemplate data={data} />;
      case 'milky_way':
        return <MilkyWayTemplate data={data} />;
      case 'zeus':
        return <ZeusTemplate data={data} />;
      case 'athena':
        return <AthenaTemplate data={data} />;
      case 'apollo':
        return <ApolloTemplate data={data} />;
      case 'artemis':
        return <ArtemisTemplate data={data} />;
      case 'hermes':
        return <HermesTemplate data={data} />;
      case 'hera':
        return <HeraTemplate data={data} />;
      default:
        return <AndromedaTemplate data={data} />
    }
  }

  return (
    <div className="p-6 min-h-screen">
      {renderTemplate()}
    </div>
  );
}

export default TemplateComponent;