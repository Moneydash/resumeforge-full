import { VERDICT_META } from './verdict-meta';
import type { ScanResult } from './types';

// Scan progress steps shown while a scan is running (wording unchanged from the previous page)
export const SCAN_STEPS = [
  'Uploading your resume...',
  'Reading the text layer...',
  'Checking sections and structure...',
  'Evaluating results...',
] as const;

export const STEP_MIN_MS = 900;
export const FINISH_BEAT_MS = 500;
export const TICK_MS = 100;

const LAST_STEP = SCAN_STEPS.length - 1;

export interface PacingState {
  step: number; // the step currently on screen (0-based)
  elapsedInStep: number;
  finished: boolean; // every step is checked off
  beatElapsed: number;
}

export const INITIAL_PACING: PacingState = { step: 0, elapsedInStep: 0, finished: false, beatElapsed: 0 };

/** A step may be checked off after its minimum time; the last one also needs the API response. */
export const canAdvance = (step: number, elapsedInStep: number, responseReady: boolean): boolean =>
  elapsedInStep >= STEP_MIN_MS && (step < LAST_STEP || responseReady);

/**
 * Advances the pacing by one tick. At most one step is checked off per tick, so no step is ever skipped.
 * `reveal` turns true once all steps are done and the closing beat has passed.
 */
export function tick(state: PacingState, deltaMs: number, responseReady: boolean): { state: PacingState; reveal: boolean } {
  if (state.finished) {
    const beatElapsed = state.beatElapsed + deltaMs;
    return { state: { ...state, beatElapsed }, reveal: beatElapsed >= FINISH_BEAT_MS };
  }
  const elapsedInStep = state.elapsedInStep + deltaMs;
  if (!canAdvance(state.step, elapsedInStep, responseReady)) {
    return { state: { ...state, elapsedInStep }, reveal: false };
  }
  if (state.step === LAST_STEP) {
    return { state: { ...state, elapsedInStep: 0, finished: true }, reveal: false };
  }
  return { state: { ...state, step: state.step + 1, elapsedInStep: 0 }, reveal: false };
}

export const formatFileSize = (bytes: number): string =>
  bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / (1024 * 1024)).toFixed(2)} MB`;

/** One line of real data shown under a completed step; null until that data exists. */
export function stepDetail(step: number, file: { size: number }, result: ScanResult | null): string | null {
  if (step === 0) return `${formatFileSize(file.size)} uploaded`;
  if (!result) return null;
  if (step === 1) {
    const pages = result.totalPages === 1 ? 'page' : 'pages';
    return `${result.pagesRead} of ${result.totalPages} ${pages} read · ${result.extractedText.length.toLocaleString('en-US')} characters`;
  }
  if (step === 2) {
    const count = result.checks.length;
    return `${count} ${count === 1 ? 'check' : 'checks'} run`;
  }
  if (step === LAST_STEP) return VERDICT_META[result.verdict].title;
  return null;
}
