export const MAX_TERM_LENGTH = 40;
export const MAX_ACTIVE = 100;
export const MAX_SUGGESTED = 200;

export interface KeywordLists {
  active: string[];
  suggested: string[];
}

export type ValidationResult = { ok: true; value: KeywordLists } | { ok: false; error: string };

// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;

const normalize = (raw: string): string => raw.trim().replace(/\s+/g, ' ');

/** Checks one list; `seen` is shared across both lists so a term can only appear once overall. */
const checkList = (name: string, raw: unknown, max: number, seen: Set<string>): string[] | string => {
  if (!Array.isArray(raw)) return `"${name}" must be an array of strings.`;
  if (raw.length > max) return `"${name}" can hold at most ${max} keywords.`;
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== 'string') return `Every keyword in "${name}" must be a string.`;
    const term = normalize(item);
    if (term.length === 0) return `Keywords in "${name}" cannot be empty.`;
    if (term.length > MAX_TERM_LENGTH) return `Keywords can be at most ${MAX_TERM_LENGTH} characters long.`;
    if (CONTROL_CHARS.test(term)) return 'Keywords cannot contain control characters.';
    const key = term.toLowerCase();
    if (seen.has(key)) return `"${term}" appears more than once.`;
    seen.add(key);
    out.push(term);
  }
  return out;
};

export const validateKeywordLists = (body: unknown): ValidationResult => {
  if (typeof body !== 'object' || body === null) return { ok: false, error: 'Expected a JSON object.' };
  const { active, suggested } = body as Record<string, unknown>;
  const seen = new Set<string>();
  const a = checkList('active', active, MAX_ACTIVE, seen);
  if (typeof a === 'string') return { ok: false, error: a };
  const s = checkList('suggested', suggested, MAX_SUGGESTED, seen);
  if (typeof s === 'string') return { ok: false, error: s };
  return { ok: true, value: { active: a, suggested: s } };
};
