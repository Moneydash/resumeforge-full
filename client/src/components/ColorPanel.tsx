import React, { useState } from "react";
import { ArrowDown, ArrowDownRight, ArrowRight, RotateCcw } from "lucide-react";
import { HexColorInput, HexColorPicker } from "react-colorful";
import { Button } from "@/components/ui/button";
import {
  COLOR_TEMPLATES,
  PALETTE,
  fillPreview,
  mix,
  previewSecondary,
  rawFillPreview,
  readTheme,
  withPrimary,
  withSecondary,
  type ColorTemplate,
  type ColorTheme,
  type Direction,
  type PrimaryFill,
} from "@/utils/color-theme";

const CUSTOM_BG = "conic-gradient(red, yellow, lime, aqua, blue, magenta, red)";

const DIRECTIONS: Array<{ id: Direction; label: string; Icon: React.ComponentType<{ className?: string }> }> = [
  { id: "horizontal", label: "Horizontal", Icon: ArrowRight },
  { id: "diagonal", label: "Diagonal", Icon: ArrowDownRight },
  { id: "vertical", label: "Vertical", Icon: ArrowDown },
];

const defaultFirst = (fill: PrimaryFill): string => (fill.type === "solid" ? fill.color : fill.from);

interface SwatchProps {
  label: string;
  background: string;
  active: boolean;
  onClick: () => void;
  isDarkMode: boolean;
}

const Swatch: React.FC<SwatchProps> = ({ label, background, active, onClick, isDarkMode }) => (
  <button
    type="button"
    aria-label={label}
    aria-pressed={active}
    title={label}
    onClick={onClick}
    className={`h-8 w-8 rounded-full border-2 transition-transform hover:scale-110 ${
      active ? "border-indigo-500 ring-2 ring-indigo-300" : isDarkMode ? "border-gray-600" : "border-gray-300"
    }`}
    style={{ background }}
  />
);

interface SwatchGridProps {
  isDarkMode: boolean;
  defaultBackground: string;
  isDefaultActive: boolean;
  /** The color currently being edited (the solid color, the active gradient stop, or the secondary). */
  activeColor?: string;
  /** How a palette color is shown, e.g. darkened when it sits under white text. */
  adjust: (hex: string) => string;
  onDefault: () => void;
  onPick: (hex: string) => void;
  customOpen: boolean;
  onCustomToggle: () => void;
  customColor: string;
}

const SwatchGrid: React.FC<SwatchGridProps> = ({
  isDarkMode, defaultBackground, isDefaultActive, activeColor, adjust, onDefault, onPick, customOpen, onCustomToggle, customColor,
}) => {
  const inPalette = PALETTE.some((c) => c.hex === activeColor);
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <Swatch label="Default" background={defaultBackground} active={isDefaultActive} onClick={onDefault} isDarkMode={isDarkMode} />
        {PALETTE.map((c) => (
          <Swatch key={c.id} label={c.name} background={adjust(c.hex)} active={!isDefaultActive && activeColor === c.hex} onClick={() => onPick(c.hex)} isDarkMode={isDarkMode} />
        ))}
        <Swatch label="Custom" background={CUSTOM_BG} active={!isDefaultActive && !!activeColor && !inPalette} onClick={onCustomToggle} isDarkMode={isDarkMode} />
      </div>
      {customOpen && (
        <div className="mt-3 space-y-2">
          <HexColorPicker color={customColor} onChange={onPick} style={{ width: "100%" }} />
          <HexColorInput
            color={customColor}
            onChange={onPick}
            prefixed
            aria-label="Hex color"
            className={`w-full rounded-md border px-2 py-1 text-sm ${isDarkMode ? "border-gray-600 bg-gray-700 text-gray-100" : "border-gray-300 bg-white text-gray-900"}`}
          />
        </div>
      )}
    </div>
  );
};

interface SectionProps {
  template: ColorTemplate;
  theme: ColorTheme | undefined;
  onChange: (next: ColorTheme | undefined) => void;
  isDarkMode: boolean;
}

const segmentClass = (active: boolean, isDarkMode: boolean) =>
  `px-3 py-1 text-xs font-medium ${active ? "bg-indigo-500 text-white" : isDarkMode ? "bg-gray-700 text-gray-300" : "bg-white text-gray-700"}`;

const PrimarySection: React.FC<SectionProps> = ({ template, theme, onChange, isDarkMode }) => {
  const cfg = COLOR_TEMPLATES[template];
  const fill = theme?.primary;
  const [customOpen, setCustomOpen] = useState(false);
  const [activeStop, setActiveStop] = useState<"from" | "to">("from");
  const firstColor = fill ? defaultFirst(fill) : defaultFirst(cfg.defaultPrimary);
  const set = (next: PrimaryFill | undefined) => onChange(withPrimary(template, theme, next));
  const gradient = fill && fill.type === "gradient" ? fill : undefined;
  const editedColor = !fill ? undefined : gradient ? gradient[activeStop] : fill.type === "solid" ? fill.color : undefined;

  const applyColor = (hex: string) => {
    if (gradient) set(activeStop === "from" ? { ...gradient, from: hex } : { ...gradient, to: hex });
    else set({ type: "solid", color: hex });
  };

  return (
    <section aria-label={`Primary ${cfg.primaryLabel}`}>
      <h3 className="text-sm font-semibold">
        Primary <span className="font-normal text-gray-500">· {cfg.primaryLabel}</span>
      </h3>
      <div role="group" aria-label="Fill type" className="my-3 inline-flex overflow-hidden rounded-md border border-gray-300 dark:border-gray-600">
        <button type="button" aria-pressed={!gradient} className={segmentClass(!gradient, isDarkMode)} onClick={() => gradient && set({ type: "solid", color: firstColor })}>
          Solid
        </button>
        <button
          type="button"
          aria-pressed={!!gradient}
          className={segmentClass(!!gradient, isDarkMode)}
          onClick={() => !gradient && set({ type: "gradient", from: firstColor, to: mix(firstColor, "#000000", 0.35), direction: "diagonal" })}
        >
          Gradient
        </button>
      </div>

      {gradient && (
        <div className="mb-3 space-y-3">
          <div className="h-8 rounded-md border border-gray-300 dark:border-gray-600" style={{ background: fillPreview(gradient) }} aria-label="Gradient preview" />
          <div className="flex items-center gap-2">
            {(["from", "to"] as const).map((stop) => (
              <button
                key={stop}
                type="button"
                aria-pressed={activeStop === stop}
                onClick={() => setActiveStop(stop)}
                className={`flex items-center gap-1 rounded-md border px-2 py-1 text-xs ${
                  activeStop === stop ? "border-indigo-500 ring-1 ring-indigo-300" : isDarkMode ? "border-gray-600" : "border-gray-300"
                }`}
              >
                <span className="inline-block h-4 w-4 rounded-full border border-gray-300" style={{ background: fillPreview({ type: "solid", color: gradient[stop] }) }} />
                {stop === "from" ? "Start" : "End"}
              </button>
            ))}
            <div role="group" aria-label="Direction" className="ml-auto flex gap-1">
              {DIRECTIONS.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  type="button"
                  aria-label={label}
                  aria-pressed={gradient.direction === id}
                  title={label}
                  onClick={() => set({ ...gradient, direction: id })}
                  className={`rounded-md border p-1 ${
                    gradient.direction === id ? "border-indigo-500 bg-indigo-50 text-indigo-600 dark:bg-gray-700" : isDarkMode ? "border-gray-600" : "border-gray-300"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <SwatchGrid
        isDarkMode={isDarkMode}
        defaultBackground={rawFillPreview(cfg.defaultPrimary)}
        isDefaultActive={!fill}
        activeColor={editedColor}
        adjust={(hex) => fillPreview({ type: "solid", color: hex })}
        onDefault={() => set(undefined)}
        onPick={applyColor}
        customOpen={customOpen}
        onCustomToggle={() => setCustomOpen((open) => !open)}
        customColor={editedColor ?? firstColor}
      />
    </section>
  );
};

const SecondarySection: React.FC<SectionProps> = ({ template, theme, onChange, isDarkMode }) => {
  const cfg = COLOR_TEMPLATES[template];
  const secondary = theme?.secondary;
  const [customOpen, setCustomOpen] = useState(false);
  return (
    <section aria-label={`Secondary ${cfg.secondaryLabel}`}>
      <h3 className="mb-3 text-sm font-semibold">
        Secondary <span className="font-normal text-gray-500">· {cfg.secondaryLabel}</span>
      </h3>
      <SwatchGrid
        isDarkMode={isDarkMode}
        defaultBackground={cfg.defaultSecondary ?? "#cccccc"}
        isDefaultActive={!secondary}
        activeColor={secondary}
        adjust={(hex) => previewSecondary(template, hex)}
        onDefault={() => onChange(withSecondary(template, theme, undefined))}
        onPick={(hex) => onChange(withSecondary(template, theme, hex))}
        customOpen={customOpen}
        onCustomToggle={() => setCustomOpen((open) => !open)}
        customColor={secondary ?? cfg.defaultSecondary ?? "#cccccc"}
      />
    </section>
  );
};

interface ColorPanelProps {
  template: ColorTemplate;
  theme: ColorTheme | undefined;
  onChange: (next: ColorTheme | undefined) => void;
  isDarkMode: boolean;
}

// content only: DesignPanel supplies the side panel, its header and the tabs
const ColorPanel: React.FC<ColorPanelProps> = ({ template, theme, onChange, isDarkMode }) => {
  const current = readTheme(template, theme);
  return (
    <>
      <div className="flex-1 space-y-6 overflow-y-auto p-4 no-scrollbar">
        <PrimarySection template={template} theme={current} onChange={onChange} isDarkMode={isDarkMode} />
        {COLOR_TEMPLATES[template].secondaryLabel && (
          <SecondarySection template={template} theme={current} onChange={onChange} isDarkMode={isDarkMode} />
        )}
      </div>
      <div className="border-t border-gray-200/50 p-4 dark:border-gray-700/50">
        <Button variant="outline" className="w-full" onClick={() => onChange(undefined)} disabled={!current}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Reset all colors
        </Button>
      </div>
    </>
  );
};

export default ColorPanel;
