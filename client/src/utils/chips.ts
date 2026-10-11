/** Normalise a saved value (list, comma separated text or nothing) into clean chips. */
export const toChips = (value: unknown): string[] => {
  const items = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : [];
  return items
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);
};

/** Add every comma separated entry of `raw`, skipping blanks and ones already present (case-insensitive). */
export const addChips = (current: string[], raw: string): string[] => {
  const next = [...current];
  for (const entry of toChips(raw)) {
    if (!next.some((chip) => chip.toLowerCase() === entry.toLowerCase())) next.push(entry);
  }
  return next;
};

/** Typing or pasting: everything before the last comma becomes chips, the rest stays as the draft. */
export const takeChips = (current: string[], draft: string): { chips: string[]; draft: string } => {
  const lastComma = draft.lastIndexOf(',');
  if (lastComma === -1) return { chips: current, draft };
  return { chips: addChips(current, draft.slice(0, lastComma)), draft: draft.slice(lastComma + 1) };
};

export const removeChip = (current: string[], index: number): string[] =>
  current.filter((_, i) => i !== index);
