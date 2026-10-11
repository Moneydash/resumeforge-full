import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { CheckStatus, Verdict } from './types';

export type Tone = 'pass' | 'warn' | 'fail';

export const VERDICT_META: Record<Verdict, { title: string; description: string; tone: Tone; Icon: LucideIcon }> = {
  friendly: {
    title: 'ATS-friendly',
    description: 'All of your resume data was read quickly and completely.',
    tone: 'pass',
    Icon: CheckCircle2,
  },
  partial: {
    title: 'Partially ATS-friendly',
    description: 'Most of your resume was read, but some data was slow or hard to read.',
    tone: 'warn',
    Icon: AlertTriangle,
  },
  not_friendly: {
    title: 'Not ATS-friendly',
    description: 'An ATS would likely miss or misread important parts of this resume.',
    tone: 'fail',
    Icon: XCircle,
  },
};

export const CHECK_META: Record<CheckStatus, { Icon: LucideIcon; tone: Tone; label: string }> = {
  pass: { Icon: CheckCircle2, tone: 'pass', label: 'Passed' },
  warn: { Icon: AlertTriangle, tone: 'warn', label: 'Warning' },
  fail: { Icon: XCircle, tone: 'fail', label: 'Failed' },
};
