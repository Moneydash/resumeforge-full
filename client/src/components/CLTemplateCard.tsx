import type { Template } from "@/types";
import React from "react";

// Import all cover letter snapshot images
import aetherImg from "@/assets/cl-snapshots/elements/aether.jpg";
import aquaImg from "@/assets/cl-snapshots/elements/aqua.jpg";
import ignisImg from "@/assets/cl-snapshots/elements/ignis.jpg";
import terraImg from "@/assets/cl-snapshots/elements/terra.jpg";
import ventusImg from "@/assets/cl-snapshots/elements/ventus.jpg";

const CLTemplateCard: React.FC<{
  template: Template;
  isHovered: boolean;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
}> = ({ template, isHovered, onHover, onSelect }) => {
  // Get the snapshot image based on template id
  const getSnapshotImage = () => {
    const imageMap: Record<string, string> = {
      aether: aetherImg,
      aqua: aquaImg,
      ignis: ignisImg,
      terra: terraImg,
      ventus: ventusImg,
    };
    return imageMap[template.id] || '';
  };

  return (
    <div
      className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-3 hover:scale-105 overflow-hidden border border-gray-200"
      onMouseEnter={() => onHover(template.id)}
      onMouseLeave={() => onHover(null)}
    >
      {/* Template Preview with Background Image */}
      <div className="relative h-80 overflow-hidden">
        {/* Background Image with Blur Effects */}
        <div
          className="absolute inset-0 bg-cover bg-top bg-no-repeat transition-transform duration-500 group-hover:scale-110"
          style={{
            backgroundImage: `url('${getSnapshotImage()}')`,
          }}
        >
          {/* Subtle Overlay for Readability */}
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(180deg, 
                rgba(255,255,255,0.1) 0%, 
                rgba(255,255,255,0.05) 25%, 
                rgba(255,255,255,0.02) 50%, 
                rgba(255,255,255,0.1) 75%, 
                rgba(255,255,255,0.2) 100%)`,
              backdropFilter: `blur(${isHovered ? '0.5px' : '0.3px'})`,
            }}
          />

          {/* Content Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/30">
            <div className="absolute bottom-6 left-6 right-6 text-white">
              <div className="flex items-center mb-2">
                <span className="text-3xl mr-3">{template.icon}</span>
                <div>
                  <h3 className="text-xl font-bold">{template.name}</h3>
                  <p className="text-sm opacity-90">Cover Letter Template</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Category Badge */}
        <div className="absolute top-4 left-4 z-10">
          <span className="px-3 py-1 bg-white/95 backdrop-blur-sm text-gray-800 text-sm font-semibold rounded-full shadow-lg border border-white/20">
            {template.category}
          </span>
        </div>

        {/* Theme Badge */}
        <div className="absolute top-4 right-4 z-10">
          <span className={`px-3 py-1 backdrop-blur-sm text-white text-xs font-bold rounded-full shadow-lg bg-blue-600/90`}>
            Cover Letter
          </span>
        </div>

        {/* Hover Overlay */}
        <div className={`absolute inset-0 bg-black/20 transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`} />
      </div>

      {/* Content */}
      <div className="p-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-3 flex items-center">
          <span className="mr-2">{template.icon}</span>
          {template.name}
        </h3>
        <p className="text-gray-600 mb-6 leading-relaxed">{template.description}</p>

        {/* Features */}
        <div className="space-y-3 mb-6">
          {template.features.map((feature, index) => (
            <div
              key={index}
              className="flex items-center transform transition-all duration-200"
              style={{
                transitionDelay: isHovered ? `${index * 50}ms` : '0ms'
              }}
            >
              <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-gray-700 font-medium">{feature}</span>
            </div>
          ))}
        </div>

        {/* Action Button */}
        <button
          onClick={() => onSelect(template.id)}
          className="w-full inline-flex items-center justify-center px-6 py-3 font-semibold rounded-xl transform hover:scale-105 transition-all duration-200 shadow-lg group bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
        >
          Select Template
          <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default CLTemplateCard;
