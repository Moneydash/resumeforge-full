// Strict sanitizer for the resume color variables the client computes (client/src/utils/color-theme.ts).
// Only fixed variable names and strictly shaped values ever reach the PDF page HTML.

const NAMES = [
  '--doc-primary-bg', '--doc-primary', '--doc-primary-ink', '--doc-primary-dark', '--doc-primary-darker',
  '--doc-primary-light', '--doc-primary-lighter', '--doc-primary-tint', '--doc-primary-strip', '--doc-primary-fade',
  '--doc-primary-link',
  '--doc-secondary', '--doc-secondary-ink', '--doc-secondary-dark', '--doc-secondary-light', '--doc-secondary-bg',
  '--doc-secondary-strip',
] as const;

const HEX = /^#[0-9a-fA-F]{6}$/;
const STOP = '(?:#[0-9a-fA-F]{6}|rgba\\(\\d{1,3}, \\d{1,3}, \\d{1,3}, (?:0|1|0?\\.\\d{1,3})\\))(?: \\d{1,3}%)?';
const GRADIENT = new RegExp(`^linear-gradient\\(\\d{1,3}deg(?:, ${STOP}){2,6}\\)$`);

export function sanitizeThemeVars(vars: unknown): Record<string, string> {
  if (!vars || typeof vars !== 'object' || Array.isArray(vars)) return {};
  const input = vars as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const name of NAMES) {
    const value = Object.prototype.hasOwnProperty.call(input, name) ? input[name] : undefined;
    if (typeof value === 'string' && (HEX.test(value) || GRADIENT.test(value))) out[name] = value.toLowerCase();
  }
  return out;
}

export function buildThemeHead(vars: unknown): string {
  const entries = Object.entries(sanitizeThemeVars(vars));
  if (entries.length === 0) return '';
  return `<style>:root{${entries.map(([name, value]) => `${name}:${value};`).join('')}}</style>`;
}
