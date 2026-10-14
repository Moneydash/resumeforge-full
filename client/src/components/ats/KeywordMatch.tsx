import { useMemo } from 'react';
import { CheckCircle2, CircleAlert } from 'lucide-react';
import KeywordBox from './KeywordBox';
import { matchKeywords } from './keyword-match';
import type { KeywordPreferences } from './useKeywordPreferences';

export default function KeywordMatch({ text, prefs }: { text: string; prefs: KeywordPreferences }) {
  const { matched, missing, percent } = useMemo(
    () => matchKeywords(text, prefs.lists.active),
    [text, prefs.lists.active],
  );
  const total = matched.length + missing.length;

  return (
    <section aria-labelledby="kw-match-title" className="app-card flex flex-col gap-4 p-5">
      <div>
        <h3 id="kw-match-title" className="l-eyebrow l-muted m-0">
          Keyword match
        </h3>
        <p className="l-muted m-0 mt-1 text-xs">Based on exact wording. Edit the list to re-check instantly.</p>
      </div>

      {total === 0 ? (
        <p className="l-muted m-0 text-sm">Add the keywords you want to check and the match appears here.</p>
      ) : (
        <>
          <div>
            <p className="m-0 flex items-baseline gap-1 whitespace-nowrap">
              <span className="ats-score">{percent}%</span>
              <span className="l-muted">{`${matched.length} of ${total} found`}</span>
            </p>
            <div
              className="ats-bar mt-3"
              role="progressbar"
              aria-label="Keyword match"
              aria-valuenow={percent}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <i className="ats-bar__fill kw-bar-fill" style={{ width: `${percent}%` }} />
            </div>
          </div>

          {missing.length > 0 && (
            <div>
              <h4 className="l-ink m-0 mb-2 text-sm font-semibold">{`Missing · ${missing.length}`}</h4>
              <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
                {missing.map((term) => (
                  <li key={term} className="ats-chip ats-warn">
                    <CircleAlert aria-hidden="true" className="size-4" />
                    <span className="sr-only">Missing: </span>
                    {term}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {matched.length > 0 && (
            <div>
              <h4 className="l-ink m-0 mb-2 text-sm font-semibold">{`Found · ${matched.length}`}</h4>
              <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
                {matched.map((term) => (
                  <li key={term} className="ats-chip ats-pass">
                    <CheckCircle2 aria-hidden="true" className="size-4" />
                    <span className="sr-only">Found: </span>
                    {term}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      <div className="l-border border-t pt-4">
        <KeywordBox prefs={prefs} />
      </div>
    </section>
  );
}
