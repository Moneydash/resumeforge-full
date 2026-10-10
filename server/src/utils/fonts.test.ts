import { describe, expect, it } from "vitest";
import { FONTS, TEMPLATE_DEFAULT_FONT, buildFontHead, getFont, resolveFontId } from "./fonts";

const RESUME_TEMPLATES = ['cigar', 'andromeda', 'comet', 'milky_way', 'zeus', 'athena', 'apollo', 'artemis', 'hermes', 'hera'];
const CL_TEMPLATES = ['aether', 'terra', 'aqua', 'ignis', 'ventus'];

describe("registry", () => {
  it("has 18 entries with unique ids", () => {
    expect(FONTS).toHaveLength(18);
    expect(new Set(FONTS.map((f) => f.id)).size).toBe(18);
  });

  it("every entry has a name, stacks and at least one Google Fonts href", () => {
    for (const f of FONTS) {
      expect(f.name.length).toBeGreaterThan(0);
      expect(f.bodyStack.length).toBeGreaterThan(0);
      expect(f.headingStack.length).toBeGreaterThan(0);
      expect(f.googleHrefs.length).toBeGreaterThan(0);
      f.googleHrefs.forEach((h) => expect(h).toMatch(/^https:\/\/fonts\.googleapis\.com\/css2\?family=/));
    }
  });

  it("single fonts use one stack for both roles; only the pairing differs", () => {
    for (const f of FONTS) {
      if (f.kind === 'pairing') {
        expect(f.id).toBe('dm-serif-text-cinzel');
        expect(f.headingStack).toContain('Cinzel');
        expect(f.bodyStack).toContain('DM Serif Text');
        expect(f.googleHrefs).toHaveLength(2);
      } else {
        expect(f.headingStack).toBe(f.bodyStack);
      }
    }
  });

  it("does not contain Ubuntu or a standalone Cinzel", () => {
    expect(FONTS.some((f) => /ubuntu/i.test(f.id + f.name + f.bodyStack))).toBe(false);
    expect(FONTS.some((f) => f.id === 'cinzel')).toBe(false);
  });

  it("every template has a default that exists in the registry", () => {
    for (const t of [...RESUME_TEMPLATES, ...CL_TEMPLATES]) {
      expect(getFont(TEMPLATE_DEFAULT_FONT[t]), t).toBeDefined();
    }
  });

  it("matches the confirmed defaults", () => {
    expect(TEMPLATE_DEFAULT_FONT).toMatchObject({
      cigar: 'dm-serif-text', zeus: 'dm-serif-text-cinzel', andromeda: 'ibm-plex-serif',
      comet: 'poppins', apollo: 'poppins', milky_way: 'lato', athena: 'lexend-deca', hera: 'geist',
      hermes: 'roboto-slab', artemis: 'source-sans-3',
      aether: 'montserrat', aqua: 'mozilla-headline', ignis: 'geist', terra: 'poppins', ventus: 'ibm-plex-sans',
    });
  });
});

describe("resolveFontId", () => {
  it("returns the template default when nothing is saved", () => {
    expect(resolveFontId('hermes')).toBe('roboto-slab');
    expect(resolveFontId('hermes', undefined)).toBe('roboto-slab');
  });

  it("returns the saved id when it was saved for this template", () => {
    expect(resolveFontId('athena', { template: 'athena', id: 'inter' })).toBe('inter');
  });

  it("ignores a choice saved for a different template", () => {
    expect(resolveFontId('athena', { template: 'zeus', id: 'inter' })).toBe('lexend-deca');
  });

  it("ignores an id that is not in the registry", () => {
    expect(resolveFontId('athena', { template: 'athena', id: 'ubuntu' })).toBe('lexend-deca');
  });

  it.each([null, 'inter', 42, [], {}, { id: 'inter' }, { template: 'athena' }, { template: 'athena', id: 7 }])(
    "falls back to the default for malformed value %j",
    (bad) => {
      expect(resolveFontId('athena', bad)).toBe('lexend-deca');
    },
  );

  it("returns undefined for an unknown template", () => {
    expect(resolveFontId('nope')).toBeUndefined();
    expect(resolveFontId('constructor')).toBeUndefined();
  });
});

describe("buildFontHead", () => {
  it("default hermes loads Roboto Slab and sets no variables", () => {
    const head = buildFontHead('hermes');
    expect(head).toContain('family=Roboto+Slab');
    expect(head).not.toContain('--doc-font');
    expect(head).not.toContain('Ubuntu');
  });

  it("default zeus loads both halves of the pairing and sets no variables", () => {
    const head = buildFontHead('zeus');
    expect(head).toContain('family=DM+Serif+Text');
    expect(head).toContain('family=Cinzel');
    expect(head).not.toContain('--doc-font');
  });

  it("a saved single font loads only that font and sets both variables to its stack", () => {
    const head = buildFontHead('athena', { template: 'athena', id: 'inter' });
    expect(head).toContain('family=Inter');
    expect(head).not.toContain('Lexend');
    expect(head).toContain("--doc-font:'Inter', sans-serif");
    expect(head).toContain("--doc-heading-font:'Inter', sans-serif");
  });

  it("the pairing on another template loads both fonts and splits the roles", () => {
    const head = buildFontHead('athena', { template: 'athena', id: 'dm-serif-text-cinzel' });
    expect(head).toContain('family=DM+Serif+Text');
    expect(head).toContain('family=Cinzel');
    expect(head).toContain("--doc-font:'DM Serif Text', Georgia, serif");
    expect(head).toContain("--doc-heading-font:'Cinzel', serif");
  });

  it("a choice saved for another template yields the default font and no variables", () => {
    const head = buildFontHead('hera', { template: 'zeus', id: 'inter' });
    expect(head).toContain('family=Geist');
    expect(head).not.toContain('--doc-font');
  });

  it("returns an empty string for an unknown template", () => {
    expect(buildFontHead('nope', { template: 'nope', id: 'inter' })).toBe('');
  });

  it("never emits a font-family declaration or a universal selector (icon fonts stay intact)", () => {
    for (const f of FONTS) {
      const head = buildFontHead('hera', { template: 'hera', id: f.id });
      expect(head).not.toMatch(/font-family/);
      expect(head).not.toMatch(/\*/);
    }
  });

  it("only contains allow-listed hrefs, even for hostile input", () => {
    const head = buildFontHead('hera', { template: 'hera', id: '"><script>alert(1)</script>' });
    expect(head).not.toContain('<script');
    expect(head).toContain('family=Geist');
  });
});
