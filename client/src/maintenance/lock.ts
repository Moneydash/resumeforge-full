/** Identifies this browser tab, so tabs can tell their own lock from another tab's. */
export const TAB_ID = Math.random().toString(36).slice(2);

/**
 * When maintenance ends, every open tab on the same document would save. The first to claim this
 * short-lived lock does; the others skip. If storage is unavailable, save anyway.
 */
export const claimSaveLock = (
  storage: Pick<Storage, 'getItem' | 'setItem'>,
  key: string,
  owner: string,
  now: number,
  ttlMs = 15_000,
): boolean => {
  try {
    const raw = storage.getItem(key);
    if (raw) {
      const held = JSON.parse(raw) as { owner?: string; at?: number } | null;
      if (held && held.owner !== owner && typeof held.at === 'number' && now - held.at < ttlMs) return false;
    }
    storage.setItem(key, JSON.stringify({ owner, at: now }));
    const check = JSON.parse(storage.getItem(key) ?? 'null') as { owner?: string } | null;
    return check?.owner === owner;
  } catch {
    return true;
  }
};
