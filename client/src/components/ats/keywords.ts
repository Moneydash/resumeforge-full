// Pure operations on the user's two keyword lists. Limits mirror server/src/utils/atsKeywords.ts.
export const MAX_TERM_LENGTH = 40;
export const MAX_ACTIVE = 100;
export const MAX_SUGGESTED = 200;

export interface KeywordLists {
  active: string[];
  suggested: string[];
}

export interface ListChange {
  lists: KeywordLists;
  error?: string;
}

export const EMPTY_LISTS: KeywordLists = { active: [], suggested: [] };

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
const without = (list: string[], term: string) => list.filter((t) => !same(t, term));

export const normalizeTerm = (raw: string): string => raw.trim().replace(/\s+/g, ' ');

/** Splits pasted text on commas, semicolons and line breaks. */
export const splitInput = (raw: string): string[] =>
  raw.split(/[,;\n\r]+/).map(normalizeTerm).filter((t) => t.length > 0);

export const addKeywords = (lists: KeywordLists, raw: string): ListChange => {
  let active = lists.active;
  let suggested = lists.suggested;
  let error: string | undefined;

  for (const term of splitInput(raw)) {
    if (term.length > MAX_TERM_LENGTH) {
      error = `Keywords can be at most ${MAX_TERM_LENGTH} characters long.`;
      continue;
    }
    if (active.some((t) => same(t, term))) continue;
    if (active.length >= MAX_ACTIVE) {
      error = `You can track up to ${MAX_ACTIVE} keywords.`;
      break;
    }
    active = [...active, term];
    suggested = without(suggested, term);
  }
  return { lists: { active, suggested }, error };
};

/** Removing a chip keeps it as a suggestion (newest first) so it can be brought back with one click. */
export const removeKeyword = (lists: KeywordLists, term: string): KeywordLists => {
  const existing = lists.active.find((t) => same(t, term));
  if (!existing) return lists;
  const suggested = [existing, ...without(lists.suggested, existing)].slice(0, MAX_SUGGESTED);
  return { active: without(lists.active, existing), suggested };
};

export const restoreSuggestion = (lists: KeywordLists, term: string): ListChange => {
  const existing = lists.suggested.find((t) => same(t, term));
  if (!existing) return { lists };
  if (lists.active.length >= MAX_ACTIVE) {
    return { lists, error: `You can track up to ${MAX_ACTIVE} keywords.` };
  }
  return { lists: { active: [...lists.active, existing], suggested: without(lists.suggested, existing) } };
};

export const deleteSuggestion = (lists: KeywordLists, term: string): KeywordLists => ({
  active: lists.active,
  suggested: without(lists.suggested, term),
});

export const clearSuggestions = (lists: KeywordLists): KeywordLists => ({ active: lists.active, suggested: [] });
