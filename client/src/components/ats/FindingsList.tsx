import { useState } from 'react';
import { ChevronRight, CheckCircle2 } from 'lucide-react';
import { groupFindings } from './findings';
import { CHECK_META } from './verdict-meta';
import type { ScanCheck } from './types';

function FindingRow({ check }: { check: ScanCheck }) {
  const meta = CHECK_META[check.status];
  const Icon = meta.Icon;
  return (
    <li className="l-border flex gap-3 border-t px-4 py-3 first:border-t-0">
      <span className={`ats-${meta.tone} mt-0.5 shrink-0`}>
        <Icon aria-hidden="true" className="size-4" />
        <span className="sr-only">{meta.label}</span>
      </span>
      <div className="min-w-0">
        <p className="l-ink m-0 font-semibold">{check.label}</p>
        <p className="l-muted m-0 mt-0.5 text-sm leading-relaxed">{check.detail}</p>
      </div>
    </li>
  );
}

export default function FindingsList({ checks }: { checks: ScanCheck[] }) {
  const { attention, passed } = groupFindings(checks);
  // With nothing to fix, the passed checks are the whole story, so show them.
  const [showPassed, setShowPassed] = useState(attention.length === 0);
  const passedLabel = `${passed.length} ${passed.length === 1 ? 'check' : 'checks'} passed`;

  return (
    <div className="flex flex-col gap-4">
      {attention.length > 0 && (
        <section aria-labelledby="ats-attention">
          <h3 id="ats-attention" className="l-eyebrow l-muted m-0 mb-2">
            {`Needs attention · ${attention.length}`}
          </h3>
          <ul className="app-card m-0 list-none p-0">
            {attention.map((check) => (
              <FindingRow key={check.id} check={check} />
            ))}
          </ul>
        </section>
      )}

      {passed.length > 0 && (
        <section className="app-card">
          <button
            type="button"
            className="ats-disclosure"
            aria-expanded={showPassed}
            aria-controls="ats-passed"
            onClick={() => setShowPassed((value) => !value)}
          >
            <CheckCircle2 aria-hidden="true" className="ats-pass size-4" />
            {passedLabel}
            <ChevronRight aria-hidden="true" className={`ml-auto size-4 ${showPassed ? 'rotate-90' : ''}`} />
          </button>
          {showPassed && (
            <ul id="ats-passed" className="l-border m-0 list-none border-t p-0">
              {passed.map((check) => (
                <FindingRow key={check.id} check={check} />
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
