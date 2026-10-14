// Plain text matching of the user's keywords against the text an ATS read from the resume. Exact wording only,
// plus simple word-form normalization and a few acronym pairs. No AI.

export interface KeywordMatchResult {
  matched: string[];
  missing: string[];
  percent: number;
}

// Each row lists phrases that mean the same thing.
const ALIASES: string[][] = [
  ['crm', 'customer relationship management'],
  ['kpi', 'key performance indicator'],
  ['b2b', 'business to business'],
  ['b2c', 'business to consumer'],
  ['saas', 'software as a service'],
  ['p&l', 'profit and loss'],
  ['roi', 'return on investment'],
  ['seo', 'search engine optimization'],
  ['hr', 'human resources'],
  ['qa', 'quality assurance'],
  ['ui', 'user interface'],
  ['ux', 'user experience'],
  ['api', 'application programming interface'],
  ['erp', 'enterprise resource planning'],
  ['sop', 'standard operating procedure'],
];

// Words with letters, digits and inner . or & (node.js, p&l), plus a trailing ++ / # / + (c++, c#) or a leading dot
// (.net). Hyphens and slashes split words, so "full-stack" equals "full stack" and "ci/cd" is "ci cd".
const TOKEN = /\.?[a-z0-9]+(?:[.&][a-z0-9]+)*(?:\+\+|#|\+)?/g;

/** Crude stemming so manage / managed / managing and deal / deals line up. Only plain alphabetic words. */
const stem = (word: string): string => {
  if (!/^[a-z]{4,}$/.test(word)) return word;
  let w = word;
  if (w.endsWith('ies') && w.length > 4) w = `${w.slice(0, -3)}y`;
  else if (w.endsWith('ing') && w.length > 5) w = w.slice(0, -3);
  else if (w.endsWith('ed') && w.length > 4) w = w.slice(0, -2);
  else if (w.endsWith('es') && w.length > 4) w = w.slice(0, -2);
  else if (w.endsWith('s') && !w.endsWith('ss') && w.length > 3) w = w.slice(0, -1);
  return w.endsWith('e') ? w.slice(0, -1) : w;
};

const tokenize = (text: string): string[] =>
  (text.toLowerCase().replace(/[-/]/g, ' ').match(TOKEN) ?? []).map(stem);

/** A padded token string, so "a b" can be found with includes() without matching inside other words. */
const toKey = (text: string): string => {
  const tokens = tokenize(text);
  return tokens.length === 0 ? '' : ` ${tokens.join(' ')} `;
};

const ALIAS_GROUPS: string[][] = ALIASES.map((group) => group.map(toKey));

const variantsOf = (keyword: string): string[] => {
  const key = toKey(keyword);
  if (key === '') return [];
  const group = ALIAS_GROUPS.find((g) => g.includes(key));
  return group ?? [key];
};

export const matchKeywords = (text: string, keywords: string[]): KeywordMatchResult => {
  const textKey = toKey(text);
  const matched: string[] = [];
  const missing: string[] = [];

  for (const keyword of keywords) {
    const variants = variantsOf(keyword);
    if (variants.length === 0) continue; // blank or punctuation-only
    (variants.some((v) => textKey.includes(v)) ? matched : missing).push(keyword);
  }

  const total = matched.length + missing.length;
  return { matched, missing, percent: total === 0 ? 0 : Math.round((matched.length / total) * 100) };
};
