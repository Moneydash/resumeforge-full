import React, { useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import SectionOrderPanel from "@/components/SectionOrderPanel";
import ColorPanel from "@/components/ColorPanel";
import TemplatesPanel from "@/components/TemplatesPanel";
import { FontList } from "@/components/FontList";
import { ensurePickerFontsLoaded } from "@/utils/load-picker-fonts";
import type { TemplateType } from "@/types";
import type { ResumeFormData } from "@/types/interface.resume-form-data";
import type { SectionLayout } from "@/utils/section-layout";
import type { ColorTemplate, ColorTheme } from "@/utils/color-theme";
import {
  TEMPLATE_DEFAULT_FONT,
  chooseFont,
  isUsableSavedFont,
  resolveFontId,
  type DocTemplate,
  type SavedFont,
} from "@/utils/fonts";

export type DesignTab = "sections" | "font" | "color" | "templates";

interface DesignPanelProps {
  tab: DesignTab;
  onTabChange: (tab: DesignTab) => void;
  onClose: () => void;
  isDarkMode: boolean;
  template: DocTemplate;
  fontSaved?: SavedFont;
  onFontChange: (next: SavedFont | undefined) => void;
  /** Resumes only. Cover letters have no sections to order, so they get just the Font content with no tabs. */
  sections?: {
    template: TemplateType;
    data: ResumeFormData;
    layout: SectionLayout | undefined;
    onChange: (layout: SectionLayout | undefined) => void;
  };
  /** Themeable resume templates only (Andromeda, Athena, Zeus, Artemis). */
  color?: {
    template: ColorTemplate;
    theme: ColorTheme | undefined;
    onChange: (next: ColorTheme | undefined) => void;
  };
  /** Switch template without leaving the editor. */
  templates?: {
    kind: "resume" | "cover-letter";
    current: string;
    onSelect: (id: string) => void;
  };
}

const TAB_LABELS: Record<DesignTab, string> = { sections: "Sections", font: "Font", color: "Color", templates: "Templates" };

const DesignPanel: React.FC<DesignPanelProps> = ({ tab, onTabChange, onClose, isDarkMode, template, fontSaved, onFontChange, sections, color, templates }) => {
  const available: DesignTab[] = [
    ...(sections ? (["sections"] as const) : []),
    "font",
    ...(color ? (["color"] as const) : []),
    ...(templates ? (["templates"] as const) : []),
  ];
  const active: DesignTab = available.includes(tab) ? tab : "font";

  useEffect(() => {
    if (active === "font") ensurePickerFontsLoaded();
  }, [active]);

  return (
    <aside
      className={`flex h-full w-80 shrink-0 flex-col border-l shadow-xl ${isDarkMode ? "bg-gray-800/95 border-gray-700/50" : "bg-white/95 border-gray-200/50"}`}
      aria-label="Design"
    >
      <div className="flex items-center justify-between border-b border-gray-200/50 p-4 dark:border-gray-700/50">
        <h2 className="text-lg font-semibold">Design</h2>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close design">
          <X size={16} />
        </Button>
      </div>

      {available.length > 1 && (
        <div role="tablist" aria-label="Design options" className="flex border-b border-gray-200/50 dark:border-gray-700/50">
          {available.map((id) => {
            const selected = id === active;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => onTabChange(id)}
                className={`flex-1 border-b-2 px-2 py-2 text-sm font-medium transition-colors ${
                  selected
                    ? "border-indigo-500 text-indigo-600 dark:text-indigo-400"
                    : `border-transparent ${isDarkMode ? "text-gray-400 hover:text-gray-200" : "text-gray-500 hover:text-gray-800"}`
                }`}
              >
                {TAB_LABELS[id]}
              </button>
            );
          })}
        </div>
      )}

      {active === "sections" && sections ? (
        <SectionOrderPanel template={sections.template} data={sections.data} layout={sections.layout} onChange={sections.onChange} />
      ) : active === "color" && color ? (
        <ColorPanel template={color.template} theme={color.theme} onChange={color.onChange} isDarkMode={isDarkMode} />
      ) : active === "templates" && templates ? (
        <TemplatesPanel kind={templates.kind} current={templates.current} onSelect={templates.onSelect} isDarkMode={isDarkMode} />
      ) : (
        <div className="flex-1 overflow-y-auto py-2 no-scrollbar">
          <FontList
            activeId={resolveFontId(template, fontSaved)}
            defaultId={TEMPLATE_DEFAULT_FONT[template]}
            canReset={isUsableSavedFont(template, fontSaved)}
            isDarkMode={isDarkMode}
            onPick={(id) => onFontChange(chooseFont(template, id))}
            onReset={() => onFontChange(undefined)}
          />
        </div>
      )}
    </aside>
  );
};

export default DesignPanel;
