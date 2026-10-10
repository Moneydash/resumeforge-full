import React from "react";
import { Check, RotateCcw } from "lucide-react";
import { FONTS, type FontEntry, type FontId } from "@/utils/fonts";

const GROUPS: Array<{ label: string; kind: FontEntry["kind"] }> = [
  { label: "Sans", kind: "sans" },
  { label: "Serif", kind: "serif" },
  { label: "Pairings", kind: "pairing" },
];

interface FontListProps {
  activeId: FontId;
  defaultId: FontId;
  canReset: boolean;
  isDarkMode: boolean;
  onPick: (id: FontId) => void;
  onReset: () => void;
}

export const FontList: React.FC<FontListProps> = ({ activeId, defaultId, canReset, isDarkMode, onPick, onReset }) => (
  <div role="listbox" aria-label="Fonts">
    {GROUPS.map((group) => (
      <div key={group.kind}>
        <p className={`px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
          {group.label}
        </p>
        {FONTS.filter((f) => f.kind === group.kind).map((font) => {
          const active = font.id === activeId;
          return (
            <button
              key={font.id}
              type="button"
              role="option"
              aria-selected={active}
              onClick={() => onPick(font.id)}
              className={`flex w-full items-start gap-2 px-3 py-2 text-left transition-colors ${
                isDarkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"
              } ${active ? (isDarkMode ? "bg-gray-700" : "bg-indigo-50") : ""}`}
            >
              <span className="mt-1 h-4 w-4 shrink-0">{active && <Check className="h-4 w-4 text-indigo-500" />}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-base" style={{ fontFamily: font.headingStack }}>
                  {font.name}
                </span>
                {font.kind === "pairing" && (
                  <span className="block truncate text-xs opacity-70" style={{ fontFamily: font.bodyStack }}>
                    Cinzel headings · DM Serif Text body
                  </span>
                )}
              </span>
              {font.id === defaultId && (
                <span className={`mt-1 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${isDarkMode ? "bg-gray-600 text-gray-200" : "bg-gray-200 text-gray-700"}`}>
                  Template default
                </span>
              )}
            </button>
          );
        })}
      </div>
    ))}
    {canReset && (
      <button
        type="button"
        onClick={onReset}
        className={`mt-1 flex w-full items-center gap-2 border-t px-3 py-2 text-sm ${
          isDarkMode ? "border-gray-600 hover:bg-gray-700" : "border-gray-200 hover:bg-gray-100"
        }`}
      >
        <RotateCcw className="h-4 w-4" />
        Reset to template default
      </button>
    )}
  </div>
);
