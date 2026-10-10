import React from "react";
import { Check } from "lucide-react";
import resumeTemplates from "@/utils/templates-type";
import coverLetterTemplates from "@/utils/cl-templates-type";
import { TEMPLATE_THUMBS } from "@/utils/template-thumbs";
import type { Template } from "@/types";

interface TemplatesPanelProps {
  kind: "resume" | "cover-letter";
  current: string;
  onSelect: (id: string) => void;
  isDarkMode: boolean;
}

const RESUME_GROUPS: Array<{ label: string; theme: Template["theme"] }> = [
  { label: "Galaxy Collection", theme: "galaxy" },
  { label: "Greek Gods Collection", theme: "greek" },
];
const COVER_LETTER_GROUPS: Array<{ label: string; theme: Template["theme"] }> = [{ label: "Elements", theme: "elements" }];

// content only: DesignPanel supplies the side panel, its header and the tabs
const TemplatesPanel: React.FC<TemplatesPanelProps> = ({ kind, current, onSelect, isDarkMode }) => {
  const templates = kind === "resume" ? resumeTemplates : coverLetterTemplates;
  const groups = kind === "resume" ? RESUME_GROUPS : COVER_LETTER_GROUPS;

  return (
    <div className="flex-1 space-y-5 overflow-y-auto p-4 no-scrollbar">
      {groups.map((group) => (
        <section key={group.theme} aria-label={group.label}>
          <h3 className={`mb-2 text-[11px] font-semibold uppercase tracking-wide ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>{group.label}</h3>
          <div className="grid grid-cols-2 gap-3">
            {templates
              .filter((t) => t.theme === group.theme)
              .map((t) => {
                const active = t.id === current;
                return (
                  <button
                    key={t.id}
                    type="button"
                    aria-label={t.name}
                    aria-pressed={active}
                    disabled={!t.available}
                    onClick={() => onSelect(t.id)}
                    className={`group relative rounded-lg border-2 p-1 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${
                      active ? "border-indigo-500 ring-2 ring-indigo-300" : isDarkMode ? "border-gray-700 hover:border-gray-500" : "border-gray-200 hover:border-gray-400"
                    }`}
                  >
                    <img
                      src={TEMPLATE_THUMBS[t.id]}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="aspect-[3/4] w-full rounded-md bg-gray-100 object-cover object-top"
                    />
                    {active && (
                      <span className="absolute right-2 top-2 rounded-full bg-indigo-500 p-0.5 text-white">
                        <Check className="h-3 w-3" aria-hidden="true" />
                      </span>
                    )}
                    <span className="mt-1 block truncate px-1 text-xs font-medium">{t.name}</span>
                    <span className={`block truncate px-1 text-[10px] ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>{t.category}</span>
                  </button>
                );
              })}
          </div>
        </section>
      ))}
    </div>
  );
};

export default TemplatesPanel;
