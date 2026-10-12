import { VERDICT_META } from './verdict-meta';
import type { ScanResult } from './types';

export default function VerdictCard({ result }: { result: ScanResult }) {
  const meta = VERDICT_META[result.verdict];
  const Icon = meta.Icon;
  const readLine = `${(result.parseTimeMs / 1000).toFixed(1)} s to read · ${result.pagesRead} of ${result.totalPages} pages read`;

  return (
    <section aria-label="Verdict" className="app-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <span className={`ats-chip ats-${meta.tone}`}>
            <Icon aria-hidden="true" className="size-4" />
            {meta.title}
          </span>
          <p className="l-muted m-0 mt-3 max-w-xs text-sm leading-relaxed">{meta.description}</p>
        </div>
        <p className="m-0 flex items-baseline gap-1 whitespace-nowrap">
          <span className="ats-score">{result.score}</span>
          <span className="l-muted">/100</span>
        </p>
      </div>
      <div
        className="ats-bar mt-4"
        role="progressbar"
        aria-label="Readability score"
        aria-valuenow={result.score}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <i className={`ats-bar__fill ats-bg-${meta.tone}`} style={{ width: `${result.score}%` }} />
      </div>
      <p className="l-muted m-0 mt-3 font-mono text-xs">{readLine}</p>
      <p className="l-muted m-0 mt-2 text-xs">Readability score: how completely and cleanly an ATS can read your file.</p>
    </section>
  );
}
