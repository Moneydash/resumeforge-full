import { SCAN_STEPS } from './scan-progress';

// The steps that run after the upload (the first step is the upload itself)
const ANALYSIS_STEPS = SCAN_STEPS.slice(1).map((label) => label.replace(/\.\.\.$/, ''));

export default function IdleSteps() {
  return (
    <div>
      <ol className="app-card m-0 grid list-none grid-cols-1 p-0 sm:grid-cols-3">
        {ANALYSIS_STEPS.map((label, index) => (
          <li key={label} className="l-border border-b p-3 text-sm last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
            <span className="l-eyebrow l-muted mb-1 block">Step {index + 1}</span>
            <span className="l-ink">{label}</span>
          </li>
        ))}
      </ol>
      <p className="l-muted m-0 mt-2 text-sm">After upload, the scanner runs these three steps on your file.</p>
    </div>
  );
}
