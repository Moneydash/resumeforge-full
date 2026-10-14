import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchKeywords, saveKeywords } from './keyword-api';
import { EMPTY_LISTS, type KeywordLists } from './keywords';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface KeywordPreferences {
  lists: KeywordLists;
  loadState: 'loading' | 'ready' | 'failed';
  saveStatus: SaveStatus;
  update: (next: KeywordLists) => void;
  retryLoad: () => void;
  retrySave: () => void;
}

const SAVE_DELAY_MS = 600;

export const useKeywordPreferences = (): KeywordPreferences => {
  const [lists, setLists] = useState<KeywordLists>(EMPTY_LISTS);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

  const latest = useRef<KeywordLists>(EMPTY_LISTS);
  const dirty = useRef(false); // edits not yet sent
  const inFlight = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const mounted = useRef(true);

  const flush = useCallback(async () => {
    if (inFlight.current || !dirty.current) return;
    inFlight.current = true;
    dirty.current = false;
    if (mounted.current) setSaveStatus('saving');
    try {
      await saveKeywords(latest.current);
      if (mounted.current && !dirty.current) setSaveStatus('saved');
    } catch (error) {
      console.error('Saving ATS keywords failed:', error);
      dirty.current = true; // keep the edits so Retry can send them
      if (mounted.current) setSaveStatus('error');
      inFlight.current = false;
      return;
    }
    inFlight.current = false;
    if (dirty.current) void flush(); // edits arrived during the save: send the newest lists next
  }, []);

  const load = useCallback(async () => {
    setLoadState('loading');
    try {
      const loaded = await fetchKeywords();
      if (!mounted.current) return;
      latest.current = loaded;
      setLists(loaded);
      setLoadState('ready');
    } catch (error) {
      console.error('Loading ATS keywords failed:', error);
      if (mounted.current) setLoadState('failed');
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    void load();
    return () => {
      mounted.current = false;
      clearTimeout(timer.current);
      if (dirty.current) void flush(); // do not lose the last edit when leaving the page
    };
  }, [load, flush]);

  const update = useCallback(
    (next: KeywordLists) => {
      if (loadState !== 'ready') return; // never save over stored data we failed to load
      latest.current = next;
      dirty.current = true;
      setLists(next);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), SAVE_DELAY_MS);
    },
    [loadState, flush],
  );

  const retrySave = useCallback(() => void flush(), [flush]);

  return { lists, loadState, saveStatus, update, retryLoad: () => void load(), retrySave };
};
