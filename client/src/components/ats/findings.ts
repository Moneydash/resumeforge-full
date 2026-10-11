import type { ScanCheck } from './types';

/** Failures first, then warnings (each in their original order); passed checks are kept apart. */
export function groupFindings(checks: ScanCheck[]): { attention: ScanCheck[]; passed: ScanCheck[] } {
  return {
    attention: [...checks.filter((c) => c.status === 'fail'), ...checks.filter((c) => c.status === 'warn')],
    passed: checks.filter((c) => c.status === 'pass'),
  };
}
