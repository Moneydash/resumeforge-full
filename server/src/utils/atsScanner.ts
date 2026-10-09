import path from 'path';
import { pathToFileURL } from 'url';

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

/** Thrown when the buffer is not a readable PDF (corrupt, truncated, not a PDF at all). */
export class InvalidPdfError extends Error { }

const SCAN_TIMEOUT_MS = 30_000; // hard cap so a huge/malicious PDF can't tie up the server
const MAX_PAGES_SCANNED = 10;
const MAX_EXTRACTED_CHARS = 20_000; // keeps the response small
const MIN_CHARS_PER_PAGE = 20; // fewer than this and the page is treated as image-only
const PARSE_TIME_WARN_MS = 3_000;
const PARSE_TIME_FAIL_MS = 10_000;

// pdfjs-dist is ESM-only but this project compiles to CommonJS, where TypeScript would turn a plain
// import() into require(). Going through Function keeps it a real dynamic import.
const dynamicImport = new Function('specifier', 'return import(specifier)') as (specifier: string) => Promise<any>;

let pdfjsPromise: Promise<any> | undefined;
const loadPdfjs = () => {
  if (!pdfjsPromise) {
    const entry = require.resolve('pdfjs-dist/legacy/build/pdf.mjs');
    pdfjsPromise = dynamicImport(pathToFileURL(entry).href);
  }
  return pdfjsPromise;
};

const standardFontDataUrl = () => {
  const pkgDir = path.dirname(require.resolve('pdfjs-dist/package.json'));
  return pathToFileURL(path.join(pkgDir, 'standard_fonts') + path.sep).href;
};

const SECTION_PATTERNS: Array<{ id: string; label: string; pattern: RegExp }> = [
  { id: 'email', label: 'Email address', pattern: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i },
  { id: 'phone', label: 'Phone number', pattern: /(\+?\d[\d\s().-]{7,}\d)/ },
  { id: 'experience', label: 'Work experience section', pattern: /\b(work\s+)?experience\b|\bemployment(\s+history)?\b|\bwork\s+history\b/i },
  { id: 'education', label: 'Education section', pattern: /\beducation\b|\bacademic\b/i },
  { id: 'skills', label: 'Skills section', pattern: /\bskills\b|\bcompetenc(ies|y)\b/i },
];

interface PageExtraction {
  text: string;
  upwardJumps: number; // times the text stream moves back up the page: sign of columns / text boxes
}

const extractPage = async (page: any): Promise<PageExtraction> => {
  const content = await page.getTextContent();
  let text = '';
  let lastY: number | null = null;
  let upwardJumps = 0;

  for (const item of content.items) {
    if (typeof item.str !== 'string') continue;
    const y: number = item.transform?.[5] ?? 0;

    if (lastY !== null) {
      const delta = y - lastY; // PDF y-axis points up, so positive means moving up the page
      if (delta > 30) upwardJumps++;
      if (Math.abs(delta) > 2) text += '\n';
    }
    text += item.str;
    if (item.hasEOL) text += '\n';
    lastY = y;
  }

  return { text: text.trim(), upwardJumps };
};

/** Share of characters that an ATS would see as junk: replacement chars, control chars, icon-font glyphs. */
const garbledRatio = (text: string): number => {
  const chars = text.replace(/\s/g, '');
  if (!chars.length) return 0;
  const junk = chars.match(/[�-\u0000-\u0008\u000B\u000C\u000E-\u001F]/g)?.length ?? 0;
  return junk / chars.length;
};

/** Share of words that are single letters, e.g. "J O H N  S M I T H" from letter-spaced text. */
const spacedLetterRatio = (text: string): number => {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length < 20) return 0;
  const single = words.filter((w) => w.length === 1 && /[A-Za-z]/.test(w)).length;
  return single / words.length;
};

// How much each check contributes to the 0-100 score. Checks that were not run (no text to inspect) earn nothing.
const SCORE_WEIGHTS: Record<string, number> = {
  text_layer: 35,
  garbled: 20,
  sections: 20,
  reading_order: 10,
  parse_time: 10,
  length: 5,
};
const NO_TEXT_SCORE_CAP = 30; // a resume with no readable text can never look decent

const computeScore = (checks: ScanCheck[], hasText: boolean): number => {
  const earned = checks.reduce((sum, c) => {
    const weight = SCORE_WEIGHTS[c.id] ?? 0;
    return sum + (c.status === 'pass' ? weight : c.status === 'warn' ? weight / 2 : 0);
  }, 0);
  const score = Math.round(earned);
  return hasText ? score : Math.min(score, NO_TEXT_SCORE_CAP);
};

const check = (id: string, label: string, status: CheckStatus, detail: string): ScanCheck => ({ id, label, status, detail });

const buildVerdict = (checks: ScanCheck[]): Verdict => {
  if (checks.some((c) => c.status === 'fail')) return 'not_friendly';
  if (checks.some((c) => c.status === 'warn')) return 'partial';
  return 'friendly';
};

const failedResult = (parseTimeMs: number, totalPages: number, checks: ScanCheck[]): ScanResult => ({
  verdict: 'not_friendly',
  score: 0,
  parseTimeMs,
  pagesRead: 0,
  totalPages,
  checks,
  extractedText: '',
});

export const scanResume = async (buffer: Buffer): Promise<ScanResult> => {
  const pdfjs = await loadPdfjs();
  const started = Date.now();

  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer), // copy: pdfjs takes ownership of the array it is given
    useSystemFonts: true,
    isEvalSupported: false,
    disableFontFace: true,
    standardFontDataUrl: standardFontDataUrl(),
    verbosity: 0,
  });

  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<'timeout'>((resolve) => {
    timer = setTimeout(() => resolve('timeout'), SCAN_TIMEOUT_MS);
  });

  let pdf: any;
  try {
    const loaded = await Promise.race([loadingTask.promise, timeout]);
    if (loaded === 'timeout') {
      return failedResult(Date.now() - started, 0, [
        check('parse_time', 'Reading speed', 'fail', `The file could not be read within ${SCAN_TIMEOUT_MS / 1000} seconds. An ATS would likely give up on it.`),
      ]);
    }
    pdf = loaded;
  } catch (error: any) {
    clearTimeout(timer);
    if (error?.name === 'PasswordException') {
      return failedResult(Date.now() - started, 0, [
        check('encrypted', 'Password protection', 'fail', 'The PDF is password-protected, so an ATS cannot open it.'),
      ]);
    }
    throw new InvalidPdfError(error?.message || 'Unable to read PDF');
  }

  try {
    const totalPages: number = pdf.numPages;
    const pagesToScan = Math.min(totalPages, MAX_PAGES_SCANNED);
    const pageTexts: string[] = [];
    let upwardJumps = 0;

    const extraction = (async () => {
      for (let i = 1; i <= pagesToScan; i++) {
        const page = await pdf.getPage(i);
        const extracted = await extractPage(page);
        pageTexts.push(extracted.text);
        upwardJumps += extracted.upwardJumps;
        page.cleanup();
      }
      return 'done' as const;
    })();

    if ((await Promise.race([extraction, timeout])) === 'timeout') {
      return failedResult(Date.now() - started, totalPages, [
        check('parse_time', 'Reading speed', 'fail', `Reading the text took longer than ${SCAN_TIMEOUT_MS / 1000} seconds. An ATS would likely give up on it.`),
      ]);
    }

    const parseTimeMs = Date.now() - started;
    const fullText = pageTexts.join('\n\n').trim();
    const pagesWithText = pageTexts.filter((t) => t.replace(/\s/g, '').length >= MIN_CHARS_PER_PAGE).length;
    const checks: ScanCheck[] = [];

    // 1. Is there a text layer at all?
    if (pagesWithText === 0) {
      checks.push(check('text_layer', 'Readable text', 'fail',
        'No text could be extracted. The resume is probably a scan or an image, which an ATS cannot read without OCR.'));
    } else if (pagesWithText < pagesToScan) {
      checks.push(check('text_layer', 'Readable text', 'warn',
        `${pagesToScan - pagesWithText} of ${pagesToScan} pages contain no readable text and are likely images.`));
    } else {
      checks.push(check('text_layer', 'Readable text', 'pass', 'Text was extracted from every page.'));
    }

    // 2. Reading speed
    if (parseTimeMs >= PARSE_TIME_FAIL_MS) {
      checks.push(check('parse_time', 'Reading speed', 'fail', `Reading took ${(parseTimeMs / 1000).toFixed(1)} seconds. An ATS may time out on files this slow.`));
    } else if (parseTimeMs >= PARSE_TIME_WARN_MS) {
      checks.push(check('parse_time', 'Reading speed', 'warn', `Reading took ${(parseTimeMs / 1000).toFixed(1)} seconds, which is slower than expected.`));
    } else {
      checks.push(check('parse_time', 'Reading speed', 'pass', `Read in ${(parseTimeMs / 1000).toFixed(1)} seconds.`));
    }

    // The checks below only make sense when there is text to look at
    if (fullText) {
      // 3. Garbled / unreadable characters
      const junk = garbledRatio(fullText);
      const spaced = spacedLetterRatio(fullText);
      if (junk > 0.1) {
        checks.push(check('garbled', 'Character quality', 'fail', 'A large part of the text is unreadable symbols, often caused by custom fonts or icon fonts.'));
      } else if (junk > 0.02 || spaced > 0.3) {
        checks.push(check('garbled', 'Character quality', 'warn',
          junk > 0.02 ? 'Some characters are unreadable symbols, often from icons or special fonts.' : 'Letters appear to be spaced apart, so words may be read as separate letters.'));
      } else {
        checks.push(check('garbled', 'Character quality', 'pass', 'Text characters are clean and readable.'));
      }

      // 4. Reading order
      if (upwardJumps >= 3) {
        checks.push(check('reading_order', 'Reading order', 'warn',
          'The text jumps around the page, which usually means columns, tables or text boxes. An ATS may read sections out of order.'));
      } else {
        checks.push(check('reading_order', 'Reading order', 'pass', 'Text flows in a single, top-to-bottom order.'));
      }

      // 5. Key resume data present
      const missing = SECTION_PATTERNS.filter((s) => !s.pattern.test(fullText));
      if (missing.length >= 3) {
        checks.push(check('sections', 'Key information', 'fail',
          `Could not find: ${missing.map((m) => m.label.toLowerCase()).join(', ')}.`));
      } else if (missing.length > 0) {
        checks.push(check('sections', 'Key information', 'warn',
          `Could not find: ${missing.map((m) => m.label.toLowerCase()).join(', ')}.`));
      } else {
        checks.push(check('sections', 'Key information', 'pass', 'Contact details and the main sections were all found.'));
      }
    }

    // 6. Length
    if (totalPages > MAX_PAGES_SCANNED) {
      checks.push(check('length', 'Length', 'warn', `The resume has ${totalPages} pages. Only the first ${MAX_PAGES_SCANNED} were scanned, and most ATS-friendly resumes are 1-2 pages.`));
    } else if (totalPages > 2) {
      checks.push(check('length', 'Length', 'warn', `The resume has ${totalPages} pages. Most ATS-friendly resumes are 1-2 pages.`));
    } else {
      checks.push(check('length', 'Length', 'pass', `${totalPages} ${totalPages === 1 ? 'page' : 'pages'}.`));
    }

    return {
      verdict: buildVerdict(checks),
      score: computeScore(checks, pagesWithText > 0),
      parseTimeMs,
      pagesRead: pagesWithText,
      totalPages,
      checks,
      extractedText: fullText.slice(0, MAX_EXTRACTED_CHARS),
    };
  } finally {
    clearTimeout(timer);
    await loadingTask.destroy().catch(() => { });
  }
};
