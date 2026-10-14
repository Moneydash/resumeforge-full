import { useId, useState } from 'react';
import { Plus, X } from 'lucide-react';
import {
  addKeywords, clearSuggestions, deleteSuggestion, MAX_ACTIVE, removeKeyword, restoreSuggestion,
} from './keywords';
import type { KeywordPreferences } from './useKeywordPreferences';

const SAVE_TEXT = { idle: '', saving: 'Saving...', saved: 'Saved', error: "Couldn't save your changes." } as const;

export default function KeywordBox({ prefs }: { prefs: KeywordPreferences }) {
  const { lists, loadState, saveStatus, update } = prefs;
  const inputId = useId();
  const [draft, setDraft] = useState('');
  const [message, setMessage] = useState(''); // inline error
  const [announce, setAnnounce] = useState(''); // screen reader updates

  if (loadState === 'loading') {
    return <p className="l-muted m-0 text-sm">Loading your saved keywords...</p>;
  }
  if (loadState === 'failed') {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="l-ink m-0 text-sm">We couldn't load your saved keywords. They have not been changed.</p>
        <button type="button" className="l-btn l-btn--ghost" onClick={prefs.retryLoad}>
          Try again
        </button>
      </div>
    );
  }

  const commit = (raw: string) => {
    if (raw.trim() === '') return;
    const change = addKeywords(lists, raw);
    setMessage(change.error ?? '');
    if (change.lists.active.length !== lists.active.length) {
      update(change.lists);
      setAnnounce(`Added. ${change.lists.active.length} keywords.`);
    }
    setDraft('');
  };

  const handleRemove = (term: string) => {
    update(removeKeyword(lists, term));
    setMessage('');
    setAnnounce(`${term} removed. Kept in suggestions.`);
  };

  const handleRestore = (term: string) => {
    const change = restoreSuggestion(lists, term);
    setMessage(change.error ?? '');
    if (change.lists !== lists) {
      update(change.lists);
      setAnnounce(`${term} added back.`);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div>
        <label htmlFor={inputId} className="l-ink text-sm font-semibold">
          Keywords to look for
        </label>
        <p className="l-muted m-0 mt-0.5 text-sm">
          Skills, tools or phrases from the job you want. Separate with commas, or paste a list.
        </p>
      </div>

      <div className="kw-field" onClick={() => document.getElementById(inputId)?.focus()}>
        {lists.active.map((term) => (
          <span key={term} className="kw-chip">
            <span className="kw-chip__label">{term}</span>
            <button type="button" className="kw-chip__x" aria-label={`Remove ${term}`} onClick={() => handleRemove(term)}>
              <X aria-hidden="true" className="size-3.5" />
            </button>
          </span>
        ))}
        <input
          id={inputId}
          className="kw-input"
          value={draft}
          placeholder={lists.active.length === 0 ? 'e.g. CRM, lead generation, SQL' : 'Add another'}
          autoComplete="off"
          onChange={(e) => {
            const value = e.target.value;
            // A paste or a typed comma commits immediately; plain typing waits for Enter.
            if (/[,;\n]/.test(value)) commit(value);
            else setDraft(value);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commit(draft);
            } else if (e.key === 'Backspace' && draft === '' && lists.active.length > 0) {
              handleRemove(lists.active[lists.active.length - 1]);
            }
          }}
          onBlur={() => commit(draft)}
        />
      </div>

      <div className="flex min-h-5 flex-wrap items-center justify-between gap-2 text-sm">
        <span className={message ? 'ats-fail' : 'l-muted'} role={message ? 'alert' : undefined}>
          {message || `${lists.active.length} of ${MAX_ACTIVE} keywords`}
        </span>
        <span className={saveStatus === 'error' ? 'ats-fail' : 'l-muted'} aria-live="polite">
          {SAVE_TEXT[saveStatus]}
          {saveStatus === 'error' && (
            <>
              {' '}
              <button type="button" className="kw-link" onClick={prefs.retrySave}>
                Retry
              </button>
            </>
          )}
        </span>
      </div>

      {lists.suggested.length > 0 && (
        <section aria-label="Suggestions">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="l-eyebrow l-muted m-0">Suggestions · removed earlier</h3>
            <button type="button" className="kw-link" onClick={() => update(clearSuggestions(lists))}>
              Clear suggestions
            </button>
          </div>
          <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
            {lists.suggested.map((term) => (
              <li key={term} className="kw-chip kw-chip--suggest">
                <button type="button" className="kw-chip__add" onClick={() => handleRestore(term)}>
                  <Plus aria-hidden="true" className="size-3.5" />
                  <span className="kw-chip__label">{term}</span>
                  <span className="sr-only">Add back</span>
                </button>
                <button
                  type="button"
                  className="kw-chip__x"
                  aria-label={`Delete suggestion ${term}`}
                  onClick={() => update(deleteSuggestion(lists, term))}
                >
                  <X aria-hidden="true" className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p role="status" aria-live="polite" className="sr-only">
        {announce}
      </p>
    </div>
  );
}
