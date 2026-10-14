export type DraftKind = 'resume' | 'cover-letter';

const KEYS: Record<DraftKind, string> = { resume: 'resumeDraft', 'cover-letter': 'clDraft' };
const DRAFT_KEYS = Object.values(KEYS);

export interface Draft {
  id: string;
  /** the whole document as JSON text, exactly as it would have been saved */
  data: string;
}

/**
 * A draft is an edit that was kept on the device because it could not be saved (maintenance).
 * It lives under its own key so it never gets mixed up with the copy loaded from the server.
 */
export const saveDraft = (storage: Pick<Storage, 'setItem'>, kind: DraftKind, id: string, data: string): boolean => {
  try {
    storage.setItem(KEYS[kind], JSON.stringify({ id, data }));
    return true;
  } catch {
    // storage full or blocked: the in-memory copy still saves when maintenance ends
    return false;
  }
};

export const readDraft = (storage: Pick<Storage, 'getItem'>, kind: DraftKind, id: string): Draft | null => {
  try {
    const raw = storage.getItem(KEYS[kind]);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Draft> | null;
    if (!parsed || parsed.id !== id || typeof parsed.data !== 'string') return null;
    return { id: parsed.id, data: parsed.data };
  } catch {
    return null;
  }
};

/** Removes the draft only if it belongs to document `id`: saving one document must not delete another's draft. */
export const clearDraft = (storage: Pick<Storage, 'getItem' | 'removeItem'>, kind: DraftKind, id: string): void => {
  try {
    const raw = storage.getItem(KEYS[kind]);
    if (!raw) return;
    let owner: unknown;
    try {
      owner = (JSON.parse(raw) as { id?: unknown } | null)?.id;
    } catch {
      owner = undefined; // corrupt: nothing worth keeping
    }
    if (owner === undefined || owner === id) storage.removeItem(KEYS[kind]);
  } catch {
    // nothing to do
  }
};

export type SaveSource = { kind: 'draft' | 'memory'; json: string } | { kind: 'skip' };

/**
 * What to save when maintenance ends. The shared draft holds the newest edit from any tab. If it is gone
 * although one was stored, another tab already saved it, so skip. Only when no draft could be stored at all
 * does this tab fall back to its own in-memory copy.
 */
export const chooseSaveSource = (draft: Draft | null, draftWasStored: boolean, memoryJson: string | null): SaveSource => {
  if (draft) return { kind: 'draft', json: draft.data };
  if (draftWasStored) return { kind: 'skip' };
  return memoryJson !== null ? { kind: 'memory', json: memoryJson } : { kind: 'skip' };
};

const stable = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    const entries = Object.keys(value as object).sort().map((k) => `${JSON.stringify(k)}:${stable((value as Record<string, unknown>)[k])}`);
    return `{${entries.join(',')}}`;
  }
  return JSON.stringify(value);
};

const sameJson = (a: string, b: string): boolean => {
  try {
    return stable(JSON.parse(a)) === stable(JSON.parse(b));
  } catch {
    return a === b;
  }
};

/** Only ask the user when the draft really differs from what the server has. */
export const shouldOfferDraft = (draftJson: string, serverJson: string): boolean => !sameJson(draftJson, serverJson);

/** `localStorage.clear()` that leaves unsaved drafts alone. Logout still uses a plain clear. */
export const clearStorageKeepingDrafts = (storage: Pick<Storage, 'getItem' | 'setItem' | 'clear'>): void => {
  const kept = DRAFT_KEYS.map((key) => [key, storage.getItem(key)] as const).filter(([, value]) => value !== null);
  storage.clear();
  kept.forEach(([key, value]) => storage.setItem(key, value as string));
};
