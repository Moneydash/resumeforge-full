import { describe, expect, it } from "vitest";
import { FONTS, TEMPLATE_DEFAULT_FONT, chooseFont, getFont, isUsableSavedFont, resolveFontId } from "./fonts";

describe("client font registry", () => {
  it("has 18 entries with unique ids, including exactly one pairing", () => {
    expect(FONTS).toHaveLength(18);
    expect(new Set(FONTS.map((f) => f.id)).size).toBe(18);
    expect(FONTS.filter((f) => f.kind === 'pairing').map((f) => f.id)).toEqual(['dm-serif-text-cinzel']);
  });

  it("every template default exists in the registry", () => {
    Object.entries(TEMPLATE_DEFAULT_FONT).forEach(([template, id]) => {
      expect(getFont(id), template).toBeDefined();
    });
    expect(Object.keys(TEMPLATE_DEFAULT_FONT)).toHaveLength(15);
  });

  it("matches the confirmed defaults", () => {
    expect(TEMPLATE_DEFAULT_FONT.hermes).toBe('roboto-slab');
    expect(TEMPLATE_DEFAULT_FONT.artemis).toBe('source-sans-3');
    expect(TEMPLATE_DEFAULT_FONT.zeus).toBe('dm-serif-text-cinzel');
    expect(TEMPLATE_DEFAULT_FONT.ventus).toBe('ibm-plex-sans');
  });

  it("resolveFontId follows the saved choice only for the same template and a known id", () => {
    expect(resolveFontId('athena')).toBe('lexend-deca');
    expect(resolveFontId('athena', { template: 'athena', id: 'lora' })).toBe('lora');
    expect(resolveFontId('athena', { template: 'zeus', id: 'lora' })).toBe('lexend-deca');
    expect(resolveFontId('athena', { template: 'athena', id: 'ubuntu' })).toBe('lexend-deca');
    expect(resolveFontId('athena', 'lora')).toBe('lexend-deca');
    expect(resolveFontId('athena', null)).toBe('lexend-deca');
  });

  it("isUsableSavedFont rejects malformed values", () => {
    expect(isUsableSavedFont('athena', { template: 'athena', id: 'lora' })).toBe(true);
    expect(isUsableSavedFont('athena', {})).toBe(false);
    expect(isUsableSavedFont('athena', [])).toBe(false);
    expect(isUsableSavedFont('athena', undefined)).toBe(false);
  });

  it("chooseFont records the template the choice was made for", () => {
    expect(chooseFont('zeus', 'inter')).toEqual({ template: 'zeus', id: 'inter' });
  });
});
