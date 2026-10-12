export type Verdict = 'friendly' | 'partial' | 'not_friendly';
export type CheckStatus = 'pass' | 'warn' | 'fail';

export interface ScanCheck {
  id: string;
  label: string;
  status: CheckStatus;
  detail: string;
}

export interface ScanResult {
  verdict: Verdict;
  score: number; // 0-100 readability score
  parseTimeMs: number;
  pagesRead: number;
  totalPages: number;
  checks: ScanCheck[];
  extractedText: string;
}
