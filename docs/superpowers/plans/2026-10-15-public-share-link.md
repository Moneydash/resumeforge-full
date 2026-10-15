# Public Share Link for Resumes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a resume owner turn a public share link on or off from the dashboard; when on anyone can view and download the resume, when off the same URL shows the 404 page.

**Architecture:** Two new columns on `user_resume_data` (`share_token`, `share_enabled`). An authenticated owner endpoint toggles sharing. Two unauthenticated endpoints (`/public/resume/:token` and `/public/resume/:token/pdf`) answer 404 unless sharing is on and the resume is not deleted. Templates only render in the browser, so the public PDF is made by Puppeteer opening the client route `/r/:token?print=1`, which exposes the same `{html, template, data, themeVars}` payload the normal export posts; the server then runs it through the same print routine as `/resume/generate`. The visible `/r/:token` page shows that PDF inline with a Download button.

**Tech Stack:** Express 5, knex/MySQL, Puppeteer, express-rate-limit, vitest (server); React + react-router, axios, Tailwind, Radix dialog (client).

**Spec:** `docs/superpowers/specs/2026-10-15-public-share-link-design.md`

> **Deviation from the spec (flagged for review):** the spec says the public page renders `ResumePreview` read-only. The normal export prints the template inside a *different* document (Tailwind 2.2.19 CDN + server-built font and theme heads), so rendering it in the app's own CSS would look different from the owner's PDF. The page therefore displays the generated PDF inline (the same thing the owner sees in Preview). `ResumePreview` is still used, but only in `?print=1` mode to produce the payload for Puppeteer.

## Global Constraints

- Resumes only. Cover letters get no share control (`CLDashboard` shares `DashboardView`; the Share menu item must be hidden when no `onShare` is passed).
- Share control lives on the dashboard only, in the actions menu beside Clone / Rename / Delete.
- Default `share_enabled` is false. Token is created on first enable and then kept (same URL when toggled off and on).
- `share_token`: 22 chars, URL-safe (`[A-Za-z0-9_-]`), unique, nullable.
- Unknown / malformed token, sharing off, and soft-deleted resume all return the same 404 from the public endpoints.
- `Cache-Control: no-store` on public responses so turning sharing off takes effect immediately.
- Toggling sharing must not change `updated_at` ("Last edited" on the dashboard).
- Public viewing pauses during maintenance (global `maintenanceGate` applies; do not exempt public routes).
- Project rules: tests may be written and run but **test files are deleted before each commit** (do not commit tests); commit locally on `feat/public-share-link`; **do not push, open a PR, or merge**; the user tests UI manually (give a checklist, do not drive the browser).

## Review Focus

- Token with wrong length / characters (`../`, 21 or 23 chars, empty) → 404 without touching the DB. (Task 3)
- Resume deleted while sharing is on → 404, even with a cached PDF. (Task 4)
- Sharing turned off after a PDF was cached → 404 immediately; cache must never be consulted before the enabled check. (Task 4)
- Two visitors request the same uncached PDF at once → one Puppeteer render. (Task 4)
- Another user calls the owner endpoint for someone else's resume, or sends a non-boolean `enabled` → 404 / 400. (Task 2)

---

## File Structure

Server
- Create `server/src/db/migrations/20261015100000_add_resume_sharing.js` — columns.
- Create `server/src/utils/shareToken.ts` — generate / validate tokens.
- Create `server/src/utils/pdf-render.ts` — `launchBrowser`, `renderPdf` (extracted from `controllers/pdf.ts`).
- Create `server/src/utils/publicPdfCache.ts` — small cache + in-flight de-dupe.
- Create `server/src/utils/public-pdf.ts` — `renderPublicPdf(token)` (Puppeteer → print page → `renderPdf`).
- Create `server/src/controllers/public-resume.ts` — the two public controllers.
- Create `server/src/routes/public-resume.ts` — public router with rate limits.
- Modify `server/src/models/Resume.ts`, `server/src/types/interface.resume.ts`, `server/src/controllers/resume.ts`, `server/src/routes/resume.ts`, `server/src/controllers/pdf.ts`, `server/src/index.ts`.

Client
- Create `client/src/pages/PublicResume.tsx` — `/r/:token` (view + print mode).
- Create `client/src/components/dashboard/ShareResumeDialog.tsx`.
- Modify `client/src/types/index.ts`, `client/src/routes.tsx`, `client/src/pages/Dashboard.tsx`, `client/src/components/dashboard/{types.ts,DashboardView.tsx,ResumeCard.tsx,ResumeTable.tsx,ResumeActionsMenu.tsx}`.

---

### Task 1: Migration, token helper, model

**Files:**
- Create: `server/src/db/migrations/20261015100000_add_resume_sharing.js`
- Create: `server/src/utils/shareToken.ts`
- Modify: `server/src/types/interface.resume.ts`
- Modify: `server/src/models/Resume.ts`
- Test (local only, delete before commit): `server/src/utils/shareToken.test.ts`

**Interfaces:**
- Produces: `generateShareToken(): string`, `isValidShareToken(v: unknown): v is string`, `SHARE_TOKEN_PATTERN`; `ResumeModel.findPublicByToken(token: string): Promise<ResumeData | null>`; `ResumeModel.setShare(id: string, userId: string, enabled: boolean, token: string): Promise<ResumeData | null>`; `ResumeData` gains `share_token?: string | null; share_enabled?: boolean | number; updated_at?: Date | string`.

- [ ] **Step 1: Write the failing test** `server/src/utils/shareToken.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { generateShareToken, isValidShareToken } from './shareToken';

describe('shareToken', () => {
  it('generates 22-char url-safe tokens that validate', () => {
    const t = generateShareToken();
    expect(t).toHaveLength(22);
    expect(isValidShareToken(t)).toBe(true);
  });
  it('generates different tokens', () => {
    expect(generateShareToken()).not.toBe(generateShareToken());
  });
  it.each(['', 'a'.repeat(21), 'a'.repeat(23), '../etc/passwd/aaaaaa', 'a'.repeat(21) + '!', undefined, 42])(
    'rejects %s', (v) => expect(isValidShareToken(v)).toBe(false));
});
```

- [ ] **Step 2: Run it to see it fail**

Run (in `server/`): `npx vitest run src/utils/shareToken.test.ts`
Expected: FAIL, cannot resolve `./shareToken`.

- [ ] **Step 3: Implement** `server/src/utils/shareToken.ts`

```ts
import { randomBytes } from 'crypto';

// 16 random bytes -> 22 base64url characters (128 bits: not guessable)
export const SHARE_TOKEN_PATTERN = /^[A-Za-z0-9_-]{22}$/;

export const generateShareToken = (): string => randomBytes(16).toString('base64url');

export const isValidShareToken = (value: unknown): value is string =>
  typeof value === 'string' && SHARE_TOKEN_PATTERN.test(value);
```

- [ ] **Step 4: Run it to see it pass**

Run: `npx vitest run src/utils/shareToken.test.ts` → Expected: PASS.

- [ ] **Step 5: Migration** `server/src/db/migrations/20261015100000_add_resume_sharing.js`

```js
/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.alterTable('user_resume_data', function (table) {
    table.string('share_token', 22).nullable().unique();
    table.boolean('share_enabled').notNullable().defaultTo(false);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.alterTable('user_resume_data', function (table) {
    table.dropColumn('share_token');
    table.dropColumn('share_enabled');
  });
};
```

- [ ] **Step 6: Types + model.** In `server/src/types/interface.resume.ts` add to `ResumeData`:

```ts
  share_token?: string | null;
  share_enabled?: boolean | number; // MySQL returns tinyint
  updated_at?: Date | string;
```

In `server/src/models/Resume.ts`, add inside the class (after `findByIdAndUserId`):

```ts
  // Only a resume that is shared and not deleted is publicly readable.
  async findPublicByToken(token: string): Promise<ResumeData | null> {
    try {
      const resume = await knex(this.tableName)
        .where('share_token', token)
        .andWhere('share_enabled', true)
        .whereNull('deleted_at')
        .first();

      return resume || null;
    } catch (error) {
      console.error('Error finding shared resume: ', error);
      throw error;
    }
  }

  // updated_at is left alone on purpose: sharing is not an edit.
  async setShare(id: string, userId: string, enabled: boolean, token: string): Promise<ResumeData | null> {
    try {
      await knex(this.tableName)
        .where('id', id)
        .andWhere('user_id', userId)
        .update({ share_enabled: enabled, share_token: token });

      return await this.findByIdAndUserId(id, userId);
    } catch (error) {
      console.error('Error updating resume sharing: ', error);
      throw error;
    }
  }
```

- [ ] **Step 7: Typecheck and apply migration**

Run (in `server/`): `npx tsc --noEmit` → Expected: no errors.
Run: `yarn migrate` (local dev DB) → Expected: batch lists `20261015100000_add_resume_sharing.js`.

- [ ] **Step 8: Delete the test file and commit**

```bash
rm server/src/utils/shareToken.test.ts
git add server/src/db/migrations/20261015100000_add_resume_sharing.js server/src/utils/shareToken.ts server/src/types/interface.resume.ts server/src/models/Resume.ts
git commit -m "feat(share): add share columns, token helper and model methods

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Owner toggle endpoint

**Files:**
- Modify: `server/src/controllers/resume.ts`
- Modify: `server/src/routes/resume.ts`
- Test (local only): `server/src/controllers/resume.share.test.ts`

**Interfaces:**
- Consumes: `resumeModel.findByIdAndUserId`, `resumeModel.setShare`, `generateShareToken` (Task 1).
- Produces: `shareResume` controller; route `POST /resume/share/:id/:userId` body `{ enabled: boolean }` → `200 { enabled: boolean, token: string }`; `400` if `enabled` not boolean; `404` if resume not found for that user. The existing `GET /resume/fetch-resumes/:userId` already returns `share_enabled` and `share_token` (it selects `*`).

- [ ] **Step 1: Write the failing test** `server/src/controllers/resume.share.test.ts`

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../models/Resume', () => ({
  resumeModel: { findByIdAndUserId: vi.fn(), setShare: vi.fn() },
}));
import { resumeModel } from '../models/Resume';
import { shareResume } from './resume';

const mockRes = () => {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};
const call = (params: any, body: any) => {
  const res = mockRes();
  return shareResume({ params, body } as any, res, vi.fn() as any).then(() => res);
};

describe('shareResume', () => {
  beforeEach(() => vi.clearAllMocks());

  it('404 when the resume is not the caller\'s', async () => {
    (resumeModel.findByIdAndUserId as any).mockResolvedValue(null);
    const res = await call({ id: 'r1', userId: 'someone-else' }, { enabled: true });
    expect(res.status).toHaveBeenCalledWith(404);
    expect(resumeModel.setShare).not.toHaveBeenCalled();
  });

  it('400 when enabled is not a boolean', async () => {
    const res = await call({ id: 'r1', userId: 'u1' }, { enabled: 'yes' });
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('creates a token on first enable', async () => {
    (resumeModel.findByIdAndUserId as any).mockResolvedValue({ id: 'r1', share_token: null });
    (resumeModel.setShare as any).mockResolvedValue({});
    const res = await call({ id: 'r1', userId: 'u1' }, { enabled: true });
    const token = (resumeModel.setShare as any).mock.calls[0][3];
    expect(token).toHaveLength(22);
    expect(res.json).toHaveBeenCalledWith({ enabled: true, token });
  });

  it('keeps the existing token when toggled again', async () => {
    (resumeModel.findByIdAndUserId as any).mockResolvedValue({ id: 'r1', share_token: 'A'.repeat(22) });
    (resumeModel.setShare as any).mockResolvedValue({});
    const res = await call({ id: 'r1', userId: 'u1' }, { enabled: false });
    expect(resumeModel.setShare).toHaveBeenCalledWith('r1', 'u1', false, 'A'.repeat(22));
    expect(res.json).toHaveBeenCalledWith({ enabled: false, token: 'A'.repeat(22) });
  });
});
```

- [ ] **Step 2: Run to fail**

Run: `npx vitest run src/controllers/resume.share.test.ts` → Expected: FAIL, `shareResume` is not exported.

- [ ] **Step 3: Implement.** In `server/src/controllers/resume.ts` add the import `import { generateShareToken } from "../utils/shareToken";`, then before the export block:

```ts
const shareResume: Controller = async (req, res) => {
  const { id, userId } = req.params;
  const { enabled } = req.body;

  if (typeof enabled !== 'boolean') {
    return res.status(400).json({ message: 'enabled must be true or false' });
  }

  const resume = await resumeModel.findByIdAndUserId(id, userId);

  if (!resume) {
    return res.status(404).json({ message: 'Resume not found' });
  }

  const token = resume.share_token || generateShareToken();
  await resumeModel.setShare(id, userId, enabled, token);
  return res.json({ enabled, token });
};
```

and add `shareResume` to the `export { ... }` list.

- [ ] **Step 4: Route.** In `server/src/routes/resume.ts` add `shareResume` to the controller import and, after the `clone` route:

```ts
pdfRouter.post('/share/:id/:userId',
  authRateLimit(100, 30 * 60 * 1000),
  isAuthenticated,
  validateSocialLogin(['google', 'github', 'linkedin']),
  shareResume
);
```

- [ ] **Step 5: Run to pass and typecheck**

Run: `npx vitest run src/controllers/resume.share.test.ts` → PASS; `npx tsc --noEmit` → no errors.

- [ ] **Step 6: Delete the test file and commit**

```bash
rm server/src/controllers/resume.share.test.ts
git add server/src/controllers/resume.ts server/src/routes/resume.ts
git commit -m "feat(share): add owner endpoint to toggle a resume's share link

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Extract the print routine (refactor, no behavior change)

**Files:**
- Create: `server/src/utils/pdf-render.ts`
- Modify: `server/src/controllers/pdf.ts`

**Interfaces:**
- Produces: `launchBrowser(): Promise<Browser>`; `renderPdf(browser: Browser, input: { html: string; template: unknown; data: any; themeVars: unknown }): Promise<Buffer | Uint8Array>` — `html` is already passed through `formatDescription`; the function opens and always closes its own page.

This is a pure move of the existing code in `generate_pdf` so the public PDF is byte-for-byte the same pipeline as the owner's export. Compare behavior by exporting a resume before and after (Step 4).

- [ ] **Step 1: Create `server/src/utils/pdf-render.ts`**

```ts
import puppeteer, { Browser } from "puppeteer";
import { execSync } from 'child_process';
import { buildFontHead } from "./fonts";
import { buildThemeHead } from "./theme-vars";
import { measureDocumentHeightPx } from "./pdf-height";

export interface PdfInput {
  html: string; // already run through formatDescription
  template: unknown;
  data: any;
  themeVars: unknown;
}

export async function launchBrowser(): Promise<Browser> {
  if (process.env.NODE_ENV === 'production') {
    try {
      console.log('Installing Chrome for Puppeteer...');
      execSync('npx puppeteer browsers install chrome', { stdio: 'inherit' });
    } catch (err) {
      console.error('Failed to install Chrome at runtime:', err);
    }
  }

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-first-run',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-extensions',
      '--disable-plugins',
      '--disable-default-apps',
      '--disable-web-security',
      '--disable-features=TranslateUI',
      '--disable-ipc-flooding-protection',
      '--memory-pressure-off',
      '--max_old_space_size=4096',
      '--js-flags=--max-old-space-size=4096'
    ],
    slowMo: 0,
    timeout: 60000
  });

  browser.on('disconnected', () => {
    console.log('Browser disconnected unexpectedly');
  });

  return browser;
}

export async function renderPdf(browser: Browser, { html, template, data, themeVars }: PdfInput) {
  const page = await browser.newPage();
  try {
    page.setDefaultTimeout(30000);
    page.setDefaultNavigationTimeout(30000);

    // Set a wider viewport to match typical PDF width
    await page.setViewport({
      width: 816, // 8.5 inches * 96 DPI
      height: 1056, // 11 inches * 96 DPI (will be adjusted)
      deviceScaleFactor: 1
    });

    // Create complete HTML with enhanced CSS for zero margins
    const htmlWithCSS = `
      <html>
        <head>
          <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css"/>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          ${buildFontHead(String(template), data?.fontFamily)}
          ${buildThemeHead(themeVars)}
          <style>
            /* Reset all default margins and padding */
            * {
              margin: 0 !important;
              padding: 0 !important;
              box-sizing: border-box;
            }
          </style>
        </head>
        <body>
          ${html}
        </body>
      </html>
    `;

    // Set content using the complete HTML with CSS
    await page.setContent(htmlWithCSS, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    // Wait for all fonts and resources to load
    await page.evaluate(() => {
      return new Promise((resolve) => {
        // Wait for fonts to load
        if (document.fonts && document.fonts.ready) {
          document.fonts.ready.then(() => {
            setTimeout(() => resolve(undefined), 500); // Additional buffer
          });
        } else {
          setTimeout(() => resolve(undefined), 2000);
        }
      });
    });

    // Get accurate content dimensions after everything is loaded
    const heightPx = await measureDocumentHeightPx(page);
    const dimensions = {
      width: 8.5, // Standard letter width
      height: heightPx / 96, // inches (96 DPI)
      heightPx,
    };

    const min_buffer = template === 'milky_way' ? 0.1 : 0;

    // Generate PDF with enhanced options for zero margins
    return await page.pdf({
      width: `${dimensions.width}in`,
      height: `${dimensions.height + min_buffer}in`, // Minimal buffer
      printBackground: true,
      scale: 1,
      displayHeaderFooter: false,
      pageRanges: "1",
      margin: {
        top: '0mm',
        bottom: '0mm',
        left: '0mm',
        right: '0mm'
      },
      preferCSSPageSize: true, // Changed to true to respect CSS @page rules
      omitBackground: false,
    });
  } finally {
    try {
      if (!page.isClosed()) await page.close();
    } catch (e) {
      console.error('Error closing page:', e);
    }
  }
}
```

- [ ] **Step 2: Slim down `server/src/controllers/pdf.ts`.** Replace the imports and the body of `generate_pdf` between the validation and the response so the file becomes:

```ts
import { Controller } from "@/types/types.controller-type";
import { formatDescription } from "../utils/helper";
import { Browser } from "puppeteer";
import { launchBrowser, renderPdf } from "../utils/pdf-render";

const generate_pdf: Controller = async (req, res) => {
  let browser: Browser | undefined;

  try {
    const { html, template, data, themeVars } = req.body;
    const formattedHtml = formatDescription(html)

    // Input validation
    if (!formattedHtml || typeof formattedHtml !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Invalid HTML content provided'
      });
    }

    browser = await launchBrowser();
    const pdfBuffer = await renderPdf(browser, { html: formattedHtml, template, data, themeVars });

    await browser.close();
    browser = undefined;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="resume.pdf"');
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);

  } catch (error: any) {
    // (keep the existing catch block exactly as it is)
  } finally {
    try {
      if (browser && browser.connected) {
        await browser.close();
      }
    } catch (e) {
      console.error('Error closing browser:', e);
    }
  }
};

export default generate_pdf;
```

Keep the existing `catch (error: any) { ... }` body unchanged (error naming → status mapping).

- [ ] **Step 3: Typecheck**

Run (in `server/`): `npx tsc --noEmit` → Expected: no errors.

- [ ] **Step 4: Verify no behavior change (manual, owner does this)**

Open an existing resume in Preview and Export PDF; the PDF should look identical to one exported before this task. Report back done/not done.

- [ ] **Step 5: Commit**

```bash
git add server/src/utils/pdf-render.ts server/src/controllers/pdf.ts
git commit -m "refactor(pdf): extract the print routine into a shared util

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Public endpoints

**Files:**
- Create: `server/src/utils/publicPdfCache.ts`
- Create: `server/src/utils/public-pdf.ts`
- Create: `server/src/controllers/public-resume.ts`
- Create: `server/src/routes/public-resume.ts`
- Modify: `server/src/index.ts`
- Test (local only): `server/src/utils/publicPdfCache.test.ts`, `server/src/controllers/public-resume.test.ts`

**Interfaces:**
- Consumes: `isValidShareToken` (Task 1), `resumeModel.findPublicByToken` (Task 1), `launchBrowser`/`renderPdf` (Task 3), `formatDescription` from `../utils/helper`.
- Produces: `GET /public/resume/:token` → `200 { resume_name, template, resume_data (string), updated_at }` or `404 { message: 'Not found' }`; `GET /public/resume/:token/pdf` → `200 application/pdf` (inline; `?download=1` → attachment) or `404` / `500 { message: 'Failed to generate PDF' }`. `PublicPdfCache.getOrCreate(key: string, version: number, make: () => Promise<Buffer | Uint8Array>)`. Print page contract (consumed by Task 7): `window.__PRINT_READY__ === true` and `window.__PRINT_PAYLOAD__ = { html, template, data, themeVars }`, or `window.__PRINT_ERROR__ === true`.

- [ ] **Step 1: Write failing cache test** `server/src/utils/publicPdfCache.test.ts`

```ts
import { describe, it, expect, vi } from 'vitest';
import { PublicPdfCache } from './publicPdfCache';

describe('PublicPdfCache', () => {
  it('reuses the same version and re-renders when the version changes', async () => {
    const cache = new PublicPdfCache(10);
    const make = vi.fn().mockResolvedValue(Buffer.from('a'));
    await cache.getOrCreate('t', 1, make);
    await cache.getOrCreate('t', 1, make);
    expect(make).toHaveBeenCalledTimes(1);
    await cache.getOrCreate('t', 2, make);
    expect(make).toHaveBeenCalledTimes(2);
  });

  it('runs one render for concurrent requests', async () => {
    const cache = new PublicPdfCache(10);
    let release!: () => void;
    const make = vi.fn().mockImplementation(() => new Promise((r) => { release = () => r(Buffer.from('x')); }));
    const a = cache.getOrCreate('t', 1, make);
    const b = cache.getOrCreate('t', 1, make);
    release();
    await Promise.all([a, b]);
    expect(make).toHaveBeenCalledTimes(1);
  });

  it('does not cache failures', async () => {
    const cache = new PublicPdfCache(10);
    const make = vi.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValue(Buffer.from('ok'));
    await expect(cache.getOrCreate('t', 1, make)).rejects.toThrow('boom');
    await expect(cache.getOrCreate('t', 1, make)).resolves.toBeTruthy();
  });

  it('evicts the oldest entry past the limit', async () => {
    const cache = new PublicPdfCache(2);
    const make = vi.fn().mockResolvedValue(Buffer.from('x'));
    await cache.getOrCreate('a', 1, make);
    await cache.getOrCreate('b', 1, make);
    await cache.getOrCreate('c', 1, make);
    await cache.getOrCreate('a', 1, make);
    expect(make).toHaveBeenCalledTimes(4);
  });
});
```

- [ ] **Step 2: Run to fail** — `npx vitest run src/utils/publicPdfCache.test.ts` → FAIL (module missing).

- [ ] **Step 3: Implement** `server/src/utils/publicPdfCache.ts`

```ts
type Pdf = Buffer | Uint8Array;

// Keeps the latest PDF per share token, keyed by the resume's updated_at ("version"), and lets
// simultaneous requests for the same version share one render. The caller checks that sharing is on
// BEFORE asking the cache, so a cached PDF is never served for a link that was switched off.
export class PublicPdfCache {
  private entries = new Map<string, { version: number; pdf: Pdf }>();
  private inFlight = new Map<string, Promise<Pdf>>();

  constructor(private maxEntries = 50) {}

  async getOrCreate(key: string, version: number, make: () => Promise<Pdf>): Promise<Pdf> {
    const hit = this.entries.get(key);
    if (hit && hit.version === version) return hit.pdf;

    const flightKey = `${key}:${version}`;
    const running = this.inFlight.get(flightKey);
    if (running) return running;

    const job = make()
      .then((pdf) => {
        this.entries.delete(key);
        this.entries.set(key, { version, pdf });
        while (this.entries.size > this.maxEntries) {
          this.entries.delete(this.entries.keys().next().value as string);
        }
        return pdf;
      })
      .finally(() => this.inFlight.delete(flightKey));

    this.inFlight.set(flightKey, job);
    return job;
  }
}
```

- [ ] **Step 4: Run to pass** — `npx vitest run src/utils/publicPdfCache.test.ts` → PASS.

- [ ] **Step 5: `server/src/utils/public-pdf.ts`**

```ts
import { formatDescription } from "./helper";
import { launchBrowser, renderPdf } from "./pdf-render";

// The token is validated by the caller (22 url-safe characters), so the URL cannot be steered elsewhere.
export async function renderPublicPdf(token: string) {
  const base = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/+$/, '');
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    await page.goto(`${base}/r/${token}?print=1`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction('window.__PRINT_READY__ === true || window.__PRINT_ERROR__ === true', { timeout: 30000 });

    const payload = await page.evaluate('window.__PRINT_PAYLOAD__') as
      { html?: unknown; template?: unknown; data?: unknown; themeVars?: unknown } | undefined;
    await page.close();

    if (!payload || typeof payload.html !== 'string') {
      throw new Error('The print page did not produce a resume');
    }
    return await renderPdf(browser, {
      html: formatDescription(payload.html),
      template: payload.template,
      data: payload.data,
      themeVars: payload.themeVars,
    });
  } finally {
    try {
      if (browser.connected) await browser.close();
    } catch (e) {
      console.error('Error closing browser:', e);
    }
  }
}
```

- [ ] **Step 6: Write failing controller test** `server/src/controllers/public-resume.test.ts`

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../models/Resume', () => ({ resumeModel: { findPublicByToken: vi.fn() } }));
vi.mock('../utils/public-pdf', () => ({ renderPublicPdf: vi.fn() }));
import { resumeModel } from '../models/Resume';
import { renderPublicPdf } from '../utils/public-pdf';
import { getPublicResume, getPublicResumePdf } from './public-resume';

const TOKEN = 'A'.repeat(22);
const mockRes = () => {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.set = vi.fn().mockReturnValue(res);
  res.setHeader = vi.fn().mockReturnValue(res);
  res.send = vi.fn().mockReturnValue(res);
  return res;
};
const run = async (fn: any, token: string, query: any = {}) => {
  const res = mockRes();
  await fn({ params: { token }, query } as any, res, vi.fn());
  return res;
};
const row = (over: any = {}) => ({
  id: 'r1', user_id: 'secret-user', resume_name: 'My CV', resume_slug_name: 'my-cv',
  template: 'andromeda', resume_data: '{"a":1}', updated_at: new Date('2026-01-01'), ...over,
});

describe('public resume', () => {
  beforeEach(() => vi.clearAllMocks());

  it('404s a malformed token without touching the database', async () => {
    for (const t of ['', 'short', '../'.repeat(8), 'A'.repeat(23)]) {
      const res = await run(getPublicResume, t);
      expect(res.status).toHaveBeenCalledWith(404);
    }
    expect(resumeModel.findPublicByToken).not.toHaveBeenCalled();
  });

  it('404s when the model finds nothing (off, deleted or unknown)', async () => {
    (resumeModel.findPublicByToken as any).mockResolvedValue(null);
    expect((await run(getPublicResume, TOKEN)).status).toHaveBeenCalledWith(404);
    expect((await run(getPublicResumePdf, TOKEN)).status).toHaveBeenCalledWith(404);
    expect(renderPublicPdf).not.toHaveBeenCalled();
  });

  it('returns only the fields the page needs', async () => {
    (resumeModel.findPublicByToken as any).mockResolvedValue(row());
    const res = await run(getPublicResume, TOKEN);
    const body = res.json.mock.calls[0][0];
    expect(body).toEqual({
      resume_name: 'My CV', template: 'andromeda', resume_data: '{"a":1}', updated_at: expect.any(Date),
    });
    expect(res.set).toHaveBeenCalledWith('Cache-Control', 'no-store');
  });

  it('serves the pdf, reuses the cache, and re-checks sharing on every request', async () => {
    (resumeModel.findPublicByToken as any).mockResolvedValue(row({ resume_slug_name: 'cv2' }));
    (renderPublicPdf as any).mockResolvedValue(Buffer.from('pdf'));
    const first = await run(getPublicResumePdf, TOKEN);
    await run(getPublicResumePdf, TOKEN);
    expect(renderPublicPdf).toHaveBeenCalledTimes(1);
    expect(resumeModel.findPublicByToken).toHaveBeenCalledTimes(2);
    expect(first.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');

    (resumeModel.findPublicByToken as any).mockResolvedValue(null); // switched off after caching
    const off = await run(getPublicResumePdf, TOKEN);
    expect(off.status).toHaveBeenCalledWith(404);
    expect(off.send).not.toHaveBeenCalled();
  });

  it('sends an attachment header for ?download=1 and sanitises the file name', async () => {
    (resumeModel.findPublicByToken as any).mockResolvedValue(row({ resume_slug_name: 'a"b\r\nc', updated_at: new Date('2026-02-02') }));
    (renderPublicPdf as any).mockResolvedValue(Buffer.from('pdf'));
    const res = await run(getPublicResumePdf, 'B'.repeat(22), { download: '1' });
    const disposition = res.setHeader.mock.calls.find((c: any[]) => c[0] === 'Content-Disposition')[1];
    expect(disposition).toBe('attachment; filename="a-b-c.pdf"');
  });

  it('500s with a generic message when rendering fails', async () => {
    (resumeModel.findPublicByToken as any).mockResolvedValue(row({ updated_at: new Date('2026-03-03') }));
    (renderPublicPdf as any).mockRejectedValue(new Error('chrome exploded'));
    const res = await run(getPublicResumePdf, 'C'.repeat(22));
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Failed to generate PDF' });
  });
});
```

- [ ] **Step 7: Run to fail** — `npx vitest run src/controllers/public-resume.test.ts` → FAIL (module missing).

- [ ] **Step 8: Implement** `server/src/controllers/public-resume.ts`

```ts
import { Controller } from "@/types/types.controller-type";
import { resumeModel } from "../models/Resume";
import { isValidShareToken } from "../utils/shareToken";
import { PublicPdfCache } from "../utils/publicPdfCache";
import { renderPublicPdf } from "../utils/public-pdf";

const pdfCache = new PublicPdfCache(50);

// Every "no" looks the same: a bad token, a link switched off and a deleted resume are indistinguishable.
const notFound = (res: Parameters<Controller>[1]) => res.status(404).json({ message: 'Not found' });

const getPublicResume: Controller = async (req, res) => {
  const { token } = req.params;
  if (!isValidShareToken(token)) return notFound(res);

  const resume = await resumeModel.findPublicByToken(token);
  if (!resume) return notFound(res);

  res.set('Cache-Control', 'no-store');
  return res.json({
    resume_name: resume.resume_name,
    template: resume.template,
    resume_data: resume.resume_data,
    updated_at: resume.updated_at,
  });
};

const getPublicResumePdf: Controller = async (req, res) => {
  const { token } = req.params;
  if (!isValidShareToken(token)) return notFound(res);

  // The enabled / deleted check runs on every request, before the cache is consulted.
  const resume = await resumeModel.findPublicByToken(token);
  if (!resume) return notFound(res);

  try {
    const version = new Date(resume.updated_at as Date | string).getTime();
    const pdf = await pdfCache.getOrCreate(token, version, () => renderPublicPdf(token));

    const fileName = (resume.resume_slug_name || 'resume').replace(/[^A-Za-z0-9_-]+/g, '-') || 'resume';
    const disposition = req.query.download === '1' ? 'attachment' : 'inline';
    res.set('Cache-Control', 'no-store');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `${disposition}; filename="${fileName}.pdf"`);
    res.setHeader('Content-Length', pdf.length);
    return res.send(Buffer.from(pdf));
  } catch (error) {
    console.error('Public PDF generation error:', error);
    return res.status(500).json({ message: 'Failed to generate PDF' });
  }
};

export { getPublicResume, getPublicResumePdf };
```

Note: the test's mock response has `set`, `setHeader`, `send`, `status`, `json` only; this file uses exactly those.

- [ ] **Step 9: Run to pass** — `npx vitest run src/controllers/public-resume.test.ts` → PASS. If a test fails because `Controller` has a different `res` type, adjust the `notFound` helper's parameter type to `Response` from express.

- [ ] **Step 10: Router** `server/src/routes/public-resume.ts`

```ts
import express from "express";
import rateLimit from "express-rate-limit";
import { getPublicResume, getPublicResumePdf } from "../controllers/public-resume";

const publicResumeRouter = express.Router();

const limiter = (limit: number) => rateLimit({
  windowMs: 15 * 60 * 1000,
  limit,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later.' },
});

publicResumeRouter.get('/:token', limiter(300), getPublicResume);
publicResumeRouter.get('/:token/pdf', limiter(30), getPublicResumePdf); // each uncached request starts Chrome

export default publicResumeRouter;
```

- [ ] **Step 11: Mount it.** In `server/src/index.ts` add `import publicResumeRouter from './routes/public-resume';` and, directly above `app.use(csrfProtection);`:

```ts
// Public share links: GET only, no sign-in. After the maintenance gate (they pause with the rest of the site)
// and before the CSRF check (nothing here changes state).
app.use('/public/resume', publicResumeRouter);
```

- [ ] **Step 12: Typecheck and smoke test**

Run: `npx tsc --noEmit` → no errors. Run the whole local suite once: `npx vitest run` → all PASS.
Start the server (`yarn dev`) and run `curl -i http://localhost:5000/public/resume/AAAAAAAAAAAAAAAAAAAAAA` (use the port your server prints) → Expected: `404 {"message":"Not found"}`.

- [ ] **Step 13: Delete the test files and commit**

```bash
rm server/src/utils/publicPdfCache.test.ts server/src/controllers/public-resume.test.ts
git add server/src/utils/publicPdfCache.ts server/src/utils/public-pdf.ts server/src/controllers/public-resume.ts server/src/routes/public-resume.ts server/src/index.ts
git commit -m "feat(share): add public resume data and PDF endpoints

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Dashboard share control

**Files:**
- Create: `client/src/components/dashboard/ShareResumeDialog.tsx`
- Modify: `client/src/types/index.ts` (`ResumeSummary`)
- Modify: `client/src/components/dashboard/types.ts` (`ResumeHandlers`)
- Modify: `client/src/components/dashboard/ResumeActionsMenu.tsx`, `ResumeCard.tsx`, `ResumeTable.tsx`, `DashboardView.tsx`
- Modify: `client/src/pages/Dashboard.tsx`

**Interfaces:**
- Consumes: `POST /resume/share/:id/:userId` `{ enabled }` → `{ enabled, token }` (Task 2); `fetch-resumes` rows with `share_enabled`, `share_token`.
- Produces: `ResumeHandlers.onShare?: (resume: ResumeSummary) => void`; `ShareResumeDialog` props `{ open: boolean; onOpenChange: (open: boolean) => void; resumeName: string; enabled: boolean; token: string | null; busy: boolean; onToggle: (enabled: boolean) => void }`. The public URL is `${window.location.origin}/r/${token}`.

- [ ] **Step 1: Types.** In `client/src/types/index.ts` extend `ResumeSummary`:

```ts
export interface ResumeSummary {
  id: string;
  resume_name: string;
  resume_slug_name: string;
  template: string;
  updated_at: string;
  share_enabled?: boolean | number; // MySQL sends 0 / 1
  share_token?: string | null;
};
```

In `client/src/components/dashboard/types.ts` add to `ResumeHandlers` (optional, so the cover letter dashboard stays unchanged):

```ts
  onShare?: (resume: ResumeSummary) => void; // resumes only; the menu item is hidden when absent
```

- [ ] **Step 2: Menu item.** In `ResumeActionsMenu.tsx` change the import to `import { Copy, MoreHorizontal, Pencil, Share2, Trash2 } from 'lucide-react';`, add `onShare?: () => void;` to the props, destructure it, and insert after the Rename item:

```tsx
        {onShare && (
          <DropdownMenuItem onSelect={onShare}>
            <Share2 aria-hidden="true" />
            Share
          </DropdownMenuItem>
        )}
```

- [ ] **Step 3: Pass it through.** In `ResumeCard.tsx` and `ResumeTable.tsx` destructure `onShare` from props (they already `extends ResumeHandlers`) and pass to the menu:

```tsx
            onShare={onShare ? () => onShare(resume) : undefined}
```

In `DashboardView.tsx` destructure `onShare` and use `const handlers = { onEdit, onClone, onRename, onDelete, onShare };`.

- [ ] **Step 4: Dialog** `client/src/components/dashboard/ShareResumeDialog.tsx`

```tsx
import { Copy } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogEyebrow, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { inputClasses } from '@/styles/form-classes';
import { popupGhostClasses } from '@/styles/popup-classes';

interface ShareResumeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resumeName: string;
  enabled: boolean;
  token: string | null;
  busy: boolean;
  onToggle: (enabled: boolean) => void;
}

// Portaled outside .app-shell, so it uses hex utilities (shared form and popup class strings), not the --l-* tokens.
export default function ShareResumeDialog({ open, onOpenChange, resumeName, enabled, token, busy, onToggle }: ShareResumeDialogProps) {
  const link = token ? `${window.location.origin}/r/${token}` : '';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast.success('Link copied');
    } catch {
      toast.error('Could not copy the link. Select it and copy it manually.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogEyebrow>Public link</DialogEyebrow>
          <DialogTitle>Share {resumeName}</DialogTitle>
          <DialogDescription>
            {enabled
              ? 'Anyone with the link can view and download this resume, signed in or not.'
              : 'Sharing is off. The link is reserved for you, but anyone who opens it sees a 404 page.'}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          <div className="flex items-center justify-between gap-4">
            <span id="share-switch-label" className="text-sm font-medium text-[#1a1a17] dark:text-[#f2f1ec]">
              {enabled ? 'Sharing is on' : 'Sharing is off'}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              aria-labelledby="share-switch-label"
              disabled={busy}
              onClick={() => onToggle(!enabled)}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-60 ${
                enabled ? 'bg-[#1a1a17] dark:bg-[#f2f1ec]' : 'bg-[#c9c8c2] dark:bg-[#3a3a36]'
              }`}
            >
              <span
                aria-hidden="true"
                className={`inline-block size-5 rounded-full bg-white shadow transition-transform dark:bg-[#1a1a17] ${
                  enabled ? 'translate-x-[22px]' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
          {enabled && token && (
            <div className="flex items-center gap-2">
              <Input readOnly aria-label="Public link" className={inputClasses} value={link} onFocus={(e) => e.currentTarget.select()} />
              <Button className={popupGhostClasses} onClick={copy}>
                <Copy className="size-4" aria-hidden="true" />
                Copy
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 5: Wire the dashboard.** In `client/src/pages/Dashboard.tsx`:

Add import `import ShareResumeDialog from '@/components/dashboard/ShareResumeDialog';`.

Add state next to the other `useState` lines:

```tsx
  const [shareResumeId, setShareResumeId] = useState<string | null>(null);
  const [shareBusy, setShareBusy] = useState(false);
```

Add handlers after `handleClone`:

```tsx
  const handleShare = (resume: ResumeSummary) => setShareResumeId(resume.id);

  const handleToggleShare = async (enabled: boolean) => {
    if (!shareResumeId) return;
    setShareBusy(true);
    try {
      await client.post(`/resume/share/${shareResumeId}/${userId}`, { enabled });
      await fetchResumes();
      toast.success(enabled ? 'Sharing is on' : 'Sharing is off');
    } catch (error) {
      console.error('Failed to update sharing: ', error);
      toast.error('Could not update sharing. Please try again.');
    } finally {
      setShareBusy(false);
    }
  };

  const shareResume = resumes.find((r) => r.id === shareResumeId);
```

Pass `onShare={handleShare}` to `<DashboardView ... />`, and add after `<DeleteResumeDialog ... />`:

```tsx
      <ShareResumeDialog
        open={!!shareResume}
        onOpenChange={(open) => {
          if (!open) setShareResumeId(null);
        }}
        resumeName={shareResume?.resume_name || 'Untitled'}
        enabled={!!shareResume?.share_enabled}
        token={shareResume?.share_token ?? null}
        busy={shareBusy}
        onToggle={handleToggleShare}
      />
```

Because the switch state comes from the refetched list, a failed request leaves the switch where it was (no manual rollback needed).

- [ ] **Step 6: Typecheck/build**

Run (in `client/`): the project's type check/build (`yarn build`; confirm the script in `client/package.json`) → Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add client/src/components/dashboard client/src/pages/Dashboard.tsx client/src/types/index.ts
git commit -m "feat(share): add Share dialog to the resume actions menu

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Public page `/r/:token`

**Files:**
- Create: `client/src/pages/PublicResume.tsx`
- Modify: `client/src/routes.tsx`

**Interfaces:**
- Consumes: `GET /public/resume/:token` and `GET /public/resume/:token/pdf` (Task 4), `pdfPayload` from `@/utils/helper`, `convertLayout` from `@/utils/section-layout`, `ResumePreview` from `@/components/TemplateComponent`.
- Produces: route `/r/:token` (outside `ProtectedRoute` and `MaintenanceGate`). Normal mode shows the PDF inline plus a Download link; a 404 from the API renders `NotFound`. `?print=1` mode sets `window.__PRINT_PAYLOAD__` / `__PRINT_READY__` / `__PRINT_ERROR__` for Puppeteer (the contract in Task 4) and renders nothing visible.

- [ ] **Step 1: Create `client/src/pages/PublicResume.tsx`**

```tsx
import React, { useEffect, useState } from 'react';
import { renderToString } from 'react-dom/server';
import { useParams, useSearchParams } from 'react-router-dom';
import client from '@/api/axiosInstance';
import ResumePreview from '@/components/TemplateComponent';
import Loader from '@/components/SuspenseLoader';
import NotFound from '@/pages/NotFound';
import type { TemplateType } from '@/types';
import type { ResumeFormData } from '@/types/interface.resume-form-data';
import { pdfPayload } from '@/utils/helper';
import { convertLayout } from '@/utils/section-layout';

type PrintWindow = Window & {
  __PRINT_PAYLOAD__?: unknown;
  __PRINT_READY__?: boolean;
  __PRINT_ERROR__?: boolean;
};

type Status = 'loading' | 'ready' | 'notfound' | 'error';

const statusOf = (error: unknown): Status =>
  (error as { response?: { status?: number } })?.response?.status === 404 ? 'notfound' : 'error';

// ?print=1: the server's Puppeteer opens this page and reads the same payload the owner's export posts.
const PrintMode: React.FC<{ token: string }> = ({ token }) => {
  useEffect(() => {
    const w = window as PrintWindow;
    (async () => {
      try {
        const { data: res } = await client.get(`/public/resume/${token}`);
        const parsed: ResumeFormData = JSON.parse(res.resume_data);
        const template = (res.template || 'andromeda') as TemplateType;
        // same carry-over the editor applies when the layout was arranged for another template
        const sectionLayout = parsed.sectionLayout && parsed.sectionLayout.template !== template
          ? convertLayout(parsed.sectionLayout, template, parsed)
          : parsed.sectionLayout;
        const data: ResumeFormData = { ...parsed, sectionLayout };
        const html = renderToString(<ResumePreview data={data} template={template} />);
        w.__PRINT_PAYLOAD__ = pdfPayload(data, html, template);
        w.__PRINT_READY__ = true;
      } catch {
        w.__PRINT_ERROR__ = true;
      }
    })();
  }, [token]);

  return null;
};

const ViewMode: React.FC<{ token: string }> = ({ token }) => {
  const [status, setStatus] = useState<Status>('loading');
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Shared resume';
    const robots = document.createElement('meta');
    robots.name = 'robots';
    robots.content = 'noindex, nofollow';
    document.head.appendChild(robots);
    return () => {
      robots.remove();
    };
  }, []);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    (async () => {
      try {
        const res = await client.get(`/public/resume/${token}/pdf`, { responseType: 'blob' });
        if (cancelled) return;
        objectUrl = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
        setPdfUrl(objectUrl);
        setStatus('ready');
      } catch (error) {
        if (!cancelled) setStatus(statusOf(error));
      }
    })();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [token]);

  if (status === 'notfound') return <NotFound />;
  if (status === 'loading') return <Loader />;
  if (status === 'error' || !pdfUrl) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
        <h1 className="text-xl font-semibold">We couldn't load this resume</h1>
        <p className="text-sm opacity-70">Please try again in a moment.</p>
        <button type="button" className="l-btn l-btn--primary" onClick={() => window.location.reload()}>
          Retry
        </button>
      </main>
    );
  }

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  return (
    <main className="flex min-h-screen flex-col bg-[#f2f1ec] dark:bg-[#1a1a17]">
      <header className="flex items-center justify-between gap-3 px-4 py-3">
        <span className="text-sm font-semibold">ResumeForge</span>
        <a className="l-btn l-btn--primary" href={`${apiUrl}/public/resume/${token}/pdf?download=1`}>
          Download PDF
        </a>
      </header>
      <iframe title="Resume" src={`${pdfUrl}#toolbar=0&zoom=100`} className="w-full flex-1 border-0" style={{ minHeight: '85vh' }} />
    </main>
  );
};

const PublicResume: React.FC = () => {
  const { token = '' } = useParams();
  const [searchParams] = useSearchParams();
  return searchParams.get('print') === '1' ? <PrintMode token={token} /> : <ViewMode token={token} />;
};

export default PublicResume;
```

Notes for the implementer: confirm `@/components/SuspenseLoader` default export (used in `routes.tsx` as `Loader`) and that `ResumeFormData` has `sectionLayout` (it does; `Preview.tsx` reads `parsedData.sectionLayout`). The `l-btn` classes come from `landing.css`; if they are not loaded on this route, import `@/styles/landing.css` at the top of the file like `NotFound.tsx` does.

- [ ] **Step 2: Route.** In `client/src/routes.tsx` add `const PublicResume = lazy(() => import('./pages/PublicResume'));` with the other lazy imports, and above the `path="*"` route:

```tsx
          <Route path="/r/:token" element={<PublicResume />} />
```

- [ ] **Step 3: Typecheck/build** — in `client/`: `yarn build` → no errors.

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/PublicResume.tsx client/src/routes.tsx
git commit -m "feat(share): add the public /r/:token page and print mode

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Final verification and manual checklist

**Files:** none (verification only)

- [ ] **Step 1: Server checks** — in `server/`: `npx tsc --noEmit` → no errors. Confirm no test files are left: `git status` shows a clean tree and `git ls-files | grep -E "\.test\.ts$"` returns nothing from this work.

- [ ] **Step 2: Client build** — in `client/`: `yarn build` → succeeds.

- [ ] **Step 3: Hand the owner this manual checklist (do not drive the browser) and wait for "done":**
  1. Dashboard → a resume's ⋯ menu shows **Share** between Rename and Delete; the cover letter dashboard has no Share item.
  2. Share dialog: switch is off by default; turning it on shows the link and Copy works.
  3. Open the link in a private window (not signed in): the resume appears (first load takes a few seconds), looks the same as the owner's Preview PDF, and Download PDF downloads it.
  4. Turn the switch off, reload the private window: the 404 page appears. Turn it on again: the **same** URL works again.
  5. Edit the resume and save; reload the link: it shows the update. The dashboard "Last edited" does not change when only the share switch is toggled.
  6. Delete the resume (sharing on): the link shows the 404 page.
  7. `…/r/not-a-real-token` shows the 404 page.
  8. Export PDF from Preview still works exactly as before (Task 3 refactor).
  9. During maintenance, the public link shows the "couldn't load" state; after it ends it works.

- [ ] **Step 4: Report** results; do not push, open a PR, or merge.
