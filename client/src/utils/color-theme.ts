// Resume color themes: types, palette, color math and the CSS variables the four themeable templates read.
// Pure and import-free on purpose: the PDF server only sanitizes the variables this module computes.

export type Direction = 'horizontal' | 'diagonal' | 'vertical';
export type ColorTemplate = 'andromeda' | 'athena' | 'milky_way' | 'zeus' | 'artemis';

export type PrimaryFill =
  | { type: 'solid'; color: string }
  | { type: 'gradient'; from: string; to: string; direction: Direction };

/** What is stored in the resume JSON as `colorTheme`. Picks are saved exactly; adjustment happens when building variables. */
export interface ColorTheme {
  template: ColorTemplate;
  primary?: PrimaryFill;
  secondary?: string;
}

export const DIRECTION_ANGLE: Record<Direction, number> = { horizontal: 90, diagonal: 135, vertical: 180 };

export const PALETTE = [
  { id: 'navy', name: 'Navy', hex: '#1e3a8a' },
  { id: 'blue', name: 'Blue', hex: '#2563eb' },
  { id: 'teal', name: 'Teal', hex: '#0f766e' },
  { id: 'green', name: 'Green', hex: '#15803d' },
  { id: 'purple', name: 'Purple', hex: '#6d28d9' },
  { id: 'crimson', name: 'Crimson', hex: '#be123c' },
  { id: 'amber', name: 'Amber', hex: '#b45309' },
  { id: 'slate', name: 'Slate', hex: '#334155' },
] as const;

export interface ColorTemplateConfig {
  primaryLabel: string;
  secondaryLabel?: string;
  /** The template's current look, shown by the Default swatch. */
  defaultPrimary: PrimaryFill;
  defaultSecondary?: string;
  /** True when the secondary color is a fill under white text (so it is darkened for readability). */
  secondaryUnderWhiteText: boolean;
}

export const COLOR_TEMPLATES: Record<ColorTemplate, ColorTemplateConfig> = {
  andromeda: {
    primaryLabel: 'Header',
    defaultPrimary: { type: 'gradient', from: '#4940f5', to: '#00d4ff', direction: 'horizontal' },
    secondaryUnderWhiteText: false,
  },
  athena: {
    primaryLabel: 'Sidebar',
    defaultPrimary: { type: 'gradient', from: '#1e3a8a', to: '#2563eb', direction: 'vertical' },
    secondaryUnderWhiteText: false,
  },
  milky_way: {
    primaryLabel: 'Header',
    defaultPrimary: { type: 'gradient', from: '#7b2ff2', to: '#f357a8', direction: 'horizontal' },
    secondaryUnderWhiteText: false,
  },
  zeus: {
    primaryLabel: 'Header',
    secondaryLabel: 'Accents',
    defaultPrimary: { type: 'gradient', from: '#1a2855', to: '#2d4a9a', direction: 'diagonal' },
    defaultSecondary: '#d4af37',
    secondaryUnderWhiteText: false,
  },
  artemis: {
    primaryLabel: 'Header',
    secondaryLabel: 'Sidebar',
    defaultPrimary: { type: 'gradient', from: '#1a202c', to: '#4a5568', direction: 'diagonal' },
    defaultSecondary: '#667eea',
    secondaryUnderWhiteText: true,
  },
};

export const isColorTemplate = (t: unknown): t is ColorTemplate =>
  typeof t === 'string' && Object.prototype.hasOwnProperty.call(COLOR_TEMPLATES, t);

// ---- color math (sRGB, HSL, WCAG) ----------------------------------------------------------------

const HEX = /^#[0-9a-fA-F]{6}$/;
const WHITE = '#ffffff';

export const isHex = (v: unknown): v is string => typeof v === 'string' && HEX.test(v);
export const normalizeHex = (v: string): string => v.toLowerCase();

type RGB = [number, number, number];

const hexToRgb = (hex: string): RGB => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as RGB;
const clamp255 = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
const rgbToHex = ([r, g, b]: RGB): string => '#' + [r, g, b].map((n) => clamp255(n).toString(16).padStart(2, '0')).join('');

export const mix = (a: string, b: string, t: number): string => {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  return rgbToHex(A.map((v, i) => v * (1 - t) + B[i] * t) as RGB);
};

const linear = (c: number) => {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const luminance = (hex: string): number => {
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
};
export const contrast = (a: string, b: string): number => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (hi + 0.05) / (lo + 0.05);
};

const hexToHsl = (hex: string): [number, number, number] => {
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const l = (max + min) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  return [h, s * 100, l * 100];
};

const hslToHex = (h: number, s: number, l: number): string => {
  const S = s / 100;
  const L = l / 100;
  const c = (1 - Math.abs(2 * L - 1)) * S;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = L - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return rgbToHex([(r + m) * 255, (g + m) * 255, (b + m) * 255]);
};

const withLightness = (hex: string, l: number): string => {
  const [h, s] = hexToHsl(hex);
  return hslToHex(h, s, Math.max(0, Math.min(100, l)));
};
/** Lightness limited to at most `max` (and at least `floor`), same hue and saturation. */
const lightnessBetween = (hex: string, floor: number, max: number): string => {
  const [, , l] = hexToHsl(hex);
  return withLightness(hex, Math.max(floor, Math.min(l, max)));
};
const shiftLightness = (hex: string, delta: number): string => {
  const [, , l] = hexToHsl(hex);
  return withLightness(hex, Math.max(4, l + delta));
};

/**
 * Darken until the contrast against white reaches 4.5:1 (lightness lowered 2 points at a time, floor 4).
 * White text on the result and the result as text on white are the same ratio, so this one function
 * serves both the "clamp for white text" fills and the "ink" text colors.
 */
export const ensureWhiteContrast = (hex: string): string => {
  let c = normalizeHex(hex);
  for (let i = 0; i < 100 && contrast(c, WHITE) < 4.5; i++) {
    const [, , l] = hexToHsl(c);
    if (l <= 4) break;
    c = withLightness(c, l - 2);
  }
  return c;
};

// ---- validation and slot updates -------------------------------------------------------------------

const isDirection = (d: unknown): d is Direction =>
  typeof d === 'string' && Object.prototype.hasOwnProperty.call(DIRECTION_ANGLE, d);

const readPrimary = (v: unknown): PrimaryFill | undefined => {
  if (!v || typeof v !== 'object') return undefined;
  const f = v as Record<string, unknown>;
  if (f.type === 'solid' && isHex(f.color)) return { type: 'solid', color: normalizeHex(f.color) };
  if (f.type === 'gradient' && isHex(f.from) && isHex(f.to) && isDirection(f.direction)) {
    return { type: 'gradient', from: normalizeHex(f.from), to: normalizeHex(f.to), direction: f.direction };
  }
  return undefined;
};

/** A normalized theme with only the valid slots, or undefined when the template differs, the value is junk, or no slot is valid. */
export function readTheme(template: string, theme: unknown): ColorTheme | undefined {
  if (!isColorTemplate(template) || !theme || typeof theme !== 'object') return undefined;
  const t = theme as Record<string, unknown>;
  if (t.template !== template) return undefined;
  const primary = readPrimary(t.primary);
  const secondary = COLOR_TEMPLATES[template].secondaryLabel && isHex(t.secondary) ? normalizeHex(t.secondary) : undefined;
  return compact(template, primary, secondary);
}

function compact(template: ColorTemplate, primary?: PrimaryFill, secondary?: string): ColorTheme | undefined {
  if (!primary && !secondary) return undefined;
  return { template, ...(primary ? { primary } : {}), ...(secondary ? { secondary } : {}) };
}

/** Only an explicit `undefined` clears a slot; an invalid value (for example a half-typed hex) leaves the theme as it was. */
export function withPrimary(template: ColorTemplate, theme: unknown, fill: PrimaryFill | undefined): ColorTheme | undefined {
  const current = readTheme(template, theme);
  if (fill === undefined) return compact(template, undefined, current?.secondary);
  const next = readPrimary(fill);
  return next ? compact(template, next, current?.secondary) : current;
}

export function withSecondary(template: ColorTemplate, theme: unknown, hex: string | undefined): ColorTheme | undefined {
  const current = readTheme(template, theme);
  if (hex === undefined) return compact(template, current?.primary, undefined);
  return isHex(hex) ? compact(template, current?.primary, normalizeHex(hex)) : current;
}

// ---- previews for the UI -----------------------------------------------------------------------------

/** CSS background for a fill exactly as stored (used for the template's own default). */
export const rawFillPreview = (fill: PrimaryFill): string =>
  fill.type === 'solid' ? fill.color : `linear-gradient(${DIRECTION_ANGLE[fill.direction]}deg, ${fill.from}, ${fill.to})`;

/** CSS background for a fill as it will render under white text. */
export const fillPreview = (fill: PrimaryFill): string =>
  fill.type === 'solid'
    ? ensureWhiteContrast(fill.color)
    : `linear-gradient(${DIRECTION_ANGLE[fill.direction]}deg, ${ensureWhiteContrast(fill.from)}, ${ensureWhiteContrast(fill.to)})`;

export const previewSecondary = (template: ColorTemplate, hex: string): string =>
  COLOR_TEMPLATES[template].secondaryUnderWhiteText ? ensureWhiteContrast(hex) : hex;

// ---- CSS variables ---------------------------------------------------------------------------------

const rgbaFrom = (hex: string, alpha: number): string => {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

function primaryVars(fill: PrimaryFill): Record<string, string> {
  const P = fill.type === 'solid' ? fill.color : fill.from; // exact first stop, used for decoration
  const B = ensureWhiteContrast(P); // readable under white text, also the ink color for text on white
  const dark = lightnessBetween(B, 8, 38);
  const darker = lightnessBetween(B, 6, 26);
  const stops = fill.type === 'solid' ? [B] : [ensureWhiteContrast(fill.from), ensureWhiteContrast(fill.to)];
  const bg = fill.type === 'solid' ? B : `linear-gradient(${DIRECTION_ANGLE[fill.direction]}deg, ${stops[0]}, ${stops[1]})`;
  // light text that sits on the fill (Athena's sidebar) must read against every stop; "lighter" never falls below "light"
  const light = lightenToContrast(mix(B, WHITE, 0.75), stops);
  const lighterRaw = lightenToContrast(mix(B, WHITE, 0.88), stops);
  const lighter = luminance(lighterRaw) >= luminance(light) ? lighterRaw : light;
  return {
    '--doc-primary-bg': bg,
    '--doc-primary': P,
    '--doc-primary-ink': B,
    '--doc-primary-dark': dark,
    '--doc-primary-darker': darker,
    '--doc-primary-light': light,
    '--doc-primary-lighter': lighter,
    '--doc-primary-tint': mix(P, WHITE, 0.88),
    '--doc-primary-strip': `linear-gradient(90deg, ${darker}, ${dark}, ${B}, ${mix(B, WHITE, 0.4)}, ${mix(B, WHITE, 0.6)})`,
    '--doc-primary-fade': `linear-gradient(90deg, ${P}, ${rgbaFrom(P, 0.2)})`,
  };
}

/** Lighten `base` toward white until it reaches `min` contrast against every background (white always does on a fill darkened for white text). */
function lightenToContrast(base: string, backgrounds: string[], min = 4.5): string {
  for (let t = 0; t <= 1; t += 0.05) {
    const c = mix(base, WHITE, t);
    if (backgrounds.every((bg) => contrast(c, bg) >= min)) return c;
  }
  return WHITE;
}

/** The colors a template's header is painted with: the (adjusted) custom fill, or the template's own default. */
function headerStops(template: ColorTemplate, primary: PrimaryFill | undefined): string[] {
  if (!primary) {
    const def = COLOR_TEMPLATES[template].defaultPrimary;
    return def.type === 'solid' ? [def.color] : [def.from, def.to];
  }
  return primary.type === 'solid' ? [ensureWhiteContrast(primary.color)] : [ensureWhiteContrast(primary.from), ensureWhiteContrast(primary.to)];
}

function secondaryVars(S: string, light: string): Record<string, string> {
  const SB = ensureWhiteContrast(S);
  const dark = lightnessBetween(S, 8, 40);
  return {
    '--doc-secondary': S,
    '--doc-secondary-ink': SB,
    '--doc-secondary-dark': dark,
    '--doc-secondary-light': light,
    '--doc-secondary-bg': `linear-gradient(135deg, ${SB}, ${shiftLightness(SB, -10)})`,
    '--doc-secondary-strip': `linear-gradient(90deg, ${S}, ${light}, ${dark}, ${light}, ${S})`,
  };
}

/** Zeus paints its name, contact links and laurels in the accent color on top of the header. */
const ZEUS_DEFAULT_ACCENT = '#ffd700';
/** Artemis paints its social links in this pale blue on the header. */
const ARTEMIS_DEFAULT_LINK = '#63b3ed';

/** The end of the header fill: the solid color itself, or the gradient's last stop. */
const endOf = (fill: PrimaryFill): string => (fill.type === 'solid' ? fill.color : fill.to);

/** Only the variables for slots with a valid choice for this template; an empty object means "render the default". */
export function buildThemeVars(template: string, theme?: unknown): Record<string, string> {
  const t = readTheme(template, theme);
  if (!t) return {};
  // the accent text must read on whatever header the user ends up with, so it is lightened until it does
  const accentOn = (base: string) => lightenToContrast(base, headerStops(t.template, t.primary));
  const light = t.template === 'zeus' ? accentOn(t.secondary ? mix(t.secondary, WHITE, 0.35) : ZEUS_DEFAULT_ACCENT) : undefined;
  // Milky Way has one slot: its pink accents follow the end of the header gradient, its purple parts follow the start
  const accent: Record<string, string> = t.template === 'milky_way' && t.primary ? secondaryVars(endOf(t.primary), mix(endOf(t.primary), WHITE, 0.35)) : {};
  const link: Record<string, string> = t.template === 'artemis' && t.primary ? { '--doc-primary-link': lightenToContrast(ARTEMIS_DEFAULT_LINK, headerStops(t.template, t.primary)) } : {};
  return {
    ...(t.primary ? primaryVars(t.primary) : {}),
    ...(t.secondary ? secondaryVars(t.secondary, light ?? mix(t.secondary, WHITE, 0.35)) : {}),
    ...(light && !t.secondary ? { '--doc-secondary-light': light } : {}),
    ...link,
    ...accent,
  };
}
