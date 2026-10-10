// Font registry for the PDF servers. The client has an identical copy in client/src/utils/fonts.ts
// (a client test fails if the two drift apart). Only ids from this list are ever turned into HTML.

export type FontId =
  | 'geist' | 'ibm-plex-sans' | 'ibm-plex-serif' | 'poppins' | 'lato' | 'montserrat'
  | 'lexend-deca' | 'dm-serif-text' | 'roboto-slab' | 'mozilla-headline'
  | 'inter' | 'source-sans-3' | 'roboto' | 'open-sans' | 'merriweather' | 'lora' | 'libre-baskerville'
  | 'dm-serif-text-cinzel';

export interface FontEntry {
  id: FontId;
  name: string;
  kind: 'sans' | 'serif' | 'pairing';
  /** CSS font-family value for document content. */
  bodyStack: string;
  /** CSS font-family value for the document name and section titles. Equals bodyStack for single fonts. */
  headingStack: string;
  googleHrefs: string[];
}

export interface SavedFont {
  template: string;
  id: FontId;
}

const GEIST = "'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const DM_SERIF_HREF = 'https://fonts.googleapis.com/css2?family=DM+Serif+Text:ital@0;1&display=swap';

export const FONTS: FontEntry[] = [
  { id: 'geist', name: 'Geist', kind: 'sans', bodyStack: GEIST, headingStack: GEIST, googleHrefs: ['https://fonts.googleapis.com/css2?family=Geist:wght@100..900&display=swap'] },
  { id: 'ibm-plex-sans', name: 'IBM Plex Sans', kind: 'sans', bodyStack: "'IBM Plex Sans', sans-serif", headingStack: "'IBM Plex Sans', sans-serif", googleHrefs: ['https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;1,100;1,200;1,300;1,400;1,500;1,600;1,700&display=swap'] },
  { id: 'ibm-plex-serif', name: 'IBM Plex Serif', kind: 'serif', bodyStack: "'IBM Plex Serif', serif", headingStack: "'IBM Plex Serif', serif", googleHrefs: ['https://fonts.googleapis.com/css2?family=IBM+Plex+Serif:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;1,100;1,200;1,300;1,400;1,500;1,600;1,700&display=swap'] },
  { id: 'poppins', name: 'Poppins', kind: 'sans', bodyStack: "'Poppins', Arial, sans-serif", headingStack: "'Poppins', Arial, sans-serif", googleHrefs: ['https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap'] },
  { id: 'lato', name: 'Lato', kind: 'sans', bodyStack: "'Lato', Arial, Helvetica, sans-serif", headingStack: "'Lato', Arial, Helvetica, sans-serif", googleHrefs: ['https://fonts.googleapis.com/css2?family=Lato:ital,wght@0,100;0,300;0,400;0,700;0,900;1,100;1,300;1,400;1,700;1,900&display=swap'] },
  { id: 'montserrat', name: 'Montserrat', kind: 'sans', bodyStack: "'Montserrat', sans-serif", headingStack: "'Montserrat', sans-serif", googleHrefs: ['https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,100..900;1,100..900&display=swap'] },
  { id: 'lexend-deca', name: 'Lexend Deca', kind: 'sans', bodyStack: "'Lexend Deca', Roboto, sans-serif", headingStack: "'Lexend Deca', Roboto, sans-serif", googleHrefs: ['https://fonts.googleapis.com/css2?family=Lexend+Deca:wght@100..900&display=swap'] },
  { id: 'dm-serif-text', name: 'DM Serif Text', kind: 'serif', bodyStack: "'DM Serif Text', Georgia, serif", headingStack: "'DM Serif Text', Georgia, serif", googleHrefs: [DM_SERIF_HREF] },
  { id: 'roboto-slab', name: 'Roboto Slab', kind: 'serif', bodyStack: "'Roboto Slab', serif", headingStack: "'Roboto Slab', serif", googleHrefs: ['https://fonts.googleapis.com/css2?family=Roboto+Slab:wght@100..900&display=swap'] },
  { id: 'mozilla-headline', name: 'Mozilla Headline', kind: 'sans', bodyStack: "'Mozilla Headline', sans-serif", headingStack: "'Mozilla Headline', sans-serif", googleHrefs: ['https://fonts.googleapis.com/css2?family=Mozilla+Headline:wght@200..700&display=swap'] },
  { id: 'inter', name: 'Inter', kind: 'sans', bodyStack: "'Inter', sans-serif", headingStack: "'Inter', sans-serif", googleHrefs: ['https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,100..900;1,100..900&display=swap'] },
  { id: 'source-sans-3', name: 'Source Sans 3', kind: 'sans', bodyStack: "'Source Sans 3', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", headingStack: "'Source Sans 3', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", googleHrefs: ['https://fonts.googleapis.com/css2?family=Source+Sans+3:ital,wght@0,200..900;1,200..900&display=swap'] },
  { id: 'roboto', name: 'Roboto', kind: 'sans', bodyStack: "'Roboto', sans-serif", headingStack: "'Roboto', sans-serif", googleHrefs: ['https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,100..900;1,100..900&display=swap'] },
  { id: 'open-sans', name: 'Open Sans', kind: 'sans', bodyStack: "'Open Sans', sans-serif", headingStack: "'Open Sans', sans-serif", googleHrefs: ['https://fonts.googleapis.com/css2?family=Open+Sans:ital,wght@0,300..800;1,300..800&display=swap'] },
  { id: 'merriweather', name: 'Merriweather', kind: 'serif', bodyStack: "'Merriweather', serif", headingStack: "'Merriweather', serif", googleHrefs: ['https://fonts.googleapis.com/css2?family=Merriweather:ital,wght@0,300..900;1,300..900&display=swap'] },
  { id: 'lora', name: 'Lora', kind: 'serif', bodyStack: "'Lora', serif", headingStack: "'Lora', serif", googleHrefs: ['https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400..700;1,400..700&display=swap'] },
  { id: 'libre-baskerville', name: 'Libre Baskerville', kind: 'serif', bodyStack: "'Libre Baskerville', serif", headingStack: "'Libre Baskerville', serif", googleHrefs: ['https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400..700;1,400..700&display=swap'] },
  { id: 'dm-serif-text-cinzel', name: 'DM Serif Text + Cinzel', kind: 'pairing', bodyStack: "'DM Serif Text', Georgia, serif", headingStack: "'Cinzel', serif", googleHrefs: [DM_SERIF_HREF, 'https://fonts.googleapis.com/css2?family=Cinzel:wght@400..900&display=swap'] },
];

export const TEMPLATE_DEFAULT_FONT: Record<string, FontId> = {
  // resume templates
  cigar: 'dm-serif-text',
  andromeda: 'ibm-plex-serif',
  comet: 'poppins',
  milky_way: 'lato',
  zeus: 'dm-serif-text-cinzel',
  athena: 'lexend-deca',
  apollo: 'poppins',
  artemis: 'source-sans-3',
  hermes: 'roboto-slab',
  hera: 'geist',
  // cover letter templates
  aether: 'montserrat',
  terra: 'poppins',
  aqua: 'mozilla-headline',
  ignis: 'geist',
  ventus: 'ibm-plex-sans',
};

export const getFont = (id: unknown): FontEntry | undefined => FONTS.find((f) => f.id === id);

/** True only for a well-formed choice that was made for this template and names a font in the registry. */
export function isUsableSavedFont(template: string, saved: unknown): saved is SavedFont {
  if (!saved || typeof saved !== 'object') return false;
  const s = saved as Record<string, unknown>;
  return s.template === template && getFont(s.id) !== undefined;
}

export function resolveFontId(template: string, saved?: unknown): FontId | undefined {
  if (!Object.prototype.hasOwnProperty.call(TEMPLATE_DEFAULT_FONT, template)) return undefined;
  return isUsableSavedFont(template, saved) ? saved.id : TEMPLATE_DEFAULT_FONT[template];
}

/**
 * HTML for the PDF page <head>: the Google Fonts <link>s for the resolved font and, only when the user has
 * a valid saved choice, a :root rule setting the two variables the template CSS reads. With no choice the
 * templates fall back to their built-in fonts, which the default font's links provide.
 */
export function buildFontHead(template: string, saved?: unknown): string {
  const font = getFont(resolveFontId(template, saved));
  if (!font) return '';
  const links = font.googleHrefs.map((href) => `<link href="${href}" rel="stylesheet">`).join('\n');
  if (!isUsableSavedFont(template, saved)) return links;
  return `${links}\n<style>:root{--doc-font:${font.bodyStack};--doc-heading-font:${font.headingStack};}</style>`;
}
