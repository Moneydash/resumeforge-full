import { useEffect, useRef } from 'react';
import { RotateCcw } from 'lucide-react';
import ExtractedTextPanel from './ExtractedTextPanel';
import FindingsList from './FindingsList';
import VerdictCard from './VerdictCard';
import { VERDICT_META } from './verdict-meta';
import type { ScanResult } from './types';

interface ScanResultsProps {
  result: ScanResult;
  fileName: string;
  onReset: () => void;
}

export default function ScanResults({ result, fileName, onReset }: ScanResultsProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Move focus to the results when they open, so keyboard and screen reader users land on them.
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="l-eyebrow l-muted m-0">Results</p>
          <h2 ref={headingRef} tabIndex={-1} className="app-title m-0 mt-1 break-words">
            {fileName}
          </h2>
        </div>
        <button type="button" className="l-btn l-btn--ghost" onClick={onReset}>
          <RotateCcw aria-hidden="true" className="size-4" />
          Scan another
        </button>
      </div>

      <p role="status" aria-live="polite" className="sr-only">
        {`Scan complete. ${VERDICT_META[result.verdict].title}, score ${result.score} out of 100.`}
      </p>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <VerdictCard result={result} />
          <FindingsList checks={result.checks} />
        </div>
        <ExtractedTextPanel text={result.extractedText} />
      </div>
    </div>
  );
}
