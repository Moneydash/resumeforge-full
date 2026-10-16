import { useSyncExternalStore } from "react";
import { isCustomId } from "@/utils/custom-sections";
import { SECTION_LABELS, type SectionId } from "@/utils/section-layout";

const STORAGE_KEY = 'resumeCollapsedSections';
const VALID_IDS = Object.keys(SECTION_LABELS);

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

const read = (storage: StorageLike | undefined): SectionId[] => {
  try {
    const parsed: unknown = JSON.parse(storage?.getItem(STORAGE_KEY) ?? '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is SectionId => typeof id === 'string' && (isCustomId(id) || VALID_IDS.includes(id)));
  } catch {
    return [];
  }
};

/**
 * Which form sections are collapsed. A view preference, so it lives in localStorage
 * (survives a refresh) and never in the saved resume. Falls back to memory when storage is blocked.
 */
export const createCollapseStore = (storage: StorageLike | undefined) => {
  let collapsed: readonly SectionId[] = read(storage);
  const listeners = new Set<() => void>();

  const set = (next: readonly SectionId[]) => {
    collapsed = next;
    try {
      storage?.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch { /* storage blocked: keep the in-memory state */ }
    listeners.forEach((listener) => listener());
  };

  return {
    getSnapshot: () => collapsed,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    toggle: (id: SectionId) =>
      set(collapsed.includes(id) ? collapsed.filter((c) => c !== id) : [...collapsed, id]),
    expandMany: (ids: readonly SectionId[]) => {
      if (ids.some((id) => collapsed.includes(id))) set(collapsed.filter((c) => !ids.includes(c)));
    },
    expand: (id: SectionId) => {
      if (collapsed.includes(id)) set(collapsed.filter((c) => c !== id));
    },
  };
};

const safeLocalStorage = (): StorageLike | undefined => {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage;
  } catch {
    return undefined;
  }
};

export const collapseStore = createCollapseStore(safeLocalStorage());

const NONE: readonly SectionId[] = [];

export const useCollapsedSections = (): readonly SectionId[] =>
  useSyncExternalStore(collapseStore.subscribe, collapseStore.getSnapshot, () => NONE);
