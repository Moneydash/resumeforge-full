import React from "react";
import type { CLTemplateType } from "@/types";
import type { CLFormData } from "@/types/interface.cl-form-data";
import Aether from "./cover-letter/cl-templates/elements/aether";
import Terra from "./cover-letter/cl-templates/elements/terra";
import Aqua from "./cover-letter/cl-templates/elements/aqua";
import Ignis from "./cover-letter/cl-templates/elements/ignis";
import Ventus from "./cover-letter/cl-templates/elements/ventus";

interface CLPreviewProps {
  data: CLFormData,
  template?: CLTemplateType
}

const CLTemplateComponent: React.FC<CLPreviewProps> = ({ data, template = 'aether' }) => {
  const renderTemplate = () => {
    switch (template) {
      case 'aether':
        return <Aether data={data} />;
      case 'terra':
        return <Terra data={data} />;
      case 'aqua':
        return <Aqua data={data} />;
      case 'ignis':
        return <Ignis data={data} />;
      case 'ventus':
        return <Ventus data={data} />;
      default:
        return <Aether data={data} />
    }
  }

  return (
    <div className="p-6 min-h-screen">
      {renderTemplate()}
    </div>
  );
}

export default CLTemplateComponent;