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

/** Width of the right-hand panel in px. The preview pages subtract it from the preview area, so keep them in sync through this constant. */
export const DESIGN_PANEL_WIDTH = 360;

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
      className={`flex h-full shrink-0 flex-col border-l shadow-xl ${isDarkMode ? "bg-gray-800/95 border-gray-700/50" : "bg-white/95 border-gray-200/50"}`}
      style={{ width: DESIGN_PANEL_WIDTH }}
      aria-label="Design"
    >
      <div className="flex items-center justify-between border-b border-gray-200/50 p-4 dark:border-gray-700/50">
        <h2 className="text-lg font-semibold">Design</h2>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close design">
          <X size={16} />
        </Button>
      </div>

      {available.length > 1 && (
        <div className="border-b border-gray-200/50 px-3 py-3 dark:border-gray-700/50">
          <div role="tablist" aria-label="Design options" className={`flex gap-1 rounded-full p-1 ${isDarkMode ? "bg-gray-900/60" : "bg-gray-100"}`}>
            {available.map((id) => {
              const selected = id === active;
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => onTabChange(id)}
                  className={`flex-auto whitespace-nowrap rounded-full px-2.5 py-1.5 text-xs font-medium outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-indigo-400 ${
                    selected
                      ? isDarkMode
                        ? "bg-gray-700 text-white shadow"
                        : "bg-white text-indigo-600 shadow-sm"
                      : isDarkMode
                        ? "text-gray-400 hover:text-gray-200"
                        : "text-gray-500 hover:text-gray-800"
                  }`}
                >
                  {TAB_LABELS[id]}
                </button>
              );
            })}
          </div>
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
