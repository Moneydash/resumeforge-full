import { useState } from 'react';
import { ChevronRight } from 'lucide-react';

export default function ExtractedTextPanel({ text }: { text: string }) {
  // From lg up the panel is always open (and sticky); below that it starts collapsed behind a toggle.
  const [expanded, setExpanded] = useState(false);

  return (
    <section aria-labelledby="ats-text-title" className="app-card overflow-hidden lg:sticky lg:top-6">
      <button
        type="button"
        className="ats-disclosure l-border border-b lg:pointer-events-none"
        aria-expanded={expanded}
        aria-controls="ats-text-body"
        onClick={() => setExpanded((value) => !value)}
      >
        <span id="ats-text-title">What the ATS sees</span>
        <ChevronRight aria-hidden="true" className={`ml-auto size-4 lg:hidden ${expanded ? 'rotate-90' : ''}`} />
      </button>
      <div id="ats-text-body" className={expanded ? 'block' : 'hidden lg:block'}>
        <p className="l-muted m-0 px-4 pb-3 pt-3 text-sm leading-relaxed">
          This is the raw text extracted from your file. If it looks scrambled or incomplete, an ATS will see the same.
        </p>
        <pre className="ats-pre">{text || 'No text could be extracted from this file.'}</pre>
      </div>
    </section>
  );
}
