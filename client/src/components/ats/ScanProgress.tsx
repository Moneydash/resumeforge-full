import { CheckCircle2, Loader2 } from 'lucide-react';
import { SCAN_STEPS, stepDetail } from './scan-progress';
import type { ScanResult } from './types';

interface ScanProgressProps {
  step: number;
  finished: boolean;
  file: { size: number; name: string };
  result: ScanResult | null;
}

export default function ScanProgress({ step, finished, file, result }: ScanProgressProps) {
  return (
    <div role="status" aria-live="polite" className="app-card px-4 py-1">
      <ol className="m-0 list-none p-0">
        {SCAN_STEPS.map((label, index) => {
          const done = finished || index < step;
          const current = !finished && index === step;
          const detail = done ? stepDetail(index, file, result) : null;
          return (
            <li
              key={label}
              className="ats-step"
              data-state={done ? 'done' : current ? 'current' : 'todo'}
              aria-current={current ? 'step' : undefined}
            >
              <span aria-hidden="true" className="mt-0.5">
                {done ? (
                  <CheckCircle2 className="ats-pass size-4" />
                ) : current ? (
                  <Loader2 className="l-accent size-4 animate-spin" />
                ) : (
                  <span className="ats-dot" />
                )}
              </span>
              <span>
                <span className="ats-step__label">{label}</span>
                {detail && <span className="l-muted ats-step__detail">{detail}</span>}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
