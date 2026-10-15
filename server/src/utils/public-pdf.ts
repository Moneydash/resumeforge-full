import { formatDescription } from "./helper";
import { launchBrowser, renderPdf } from "./pdf-render";
import { createLimiter } from "./limiter";

// Each render starts a full Chrome: never more than two at once, however many links are requested.
const limitRenders = createLimiter(2);

// The token is validated by the caller (22 url-safe characters), so the URL cannot be steered elsewhere.
export const renderPublicPdf = (token: string) => limitRenders(() => renderPublicPdfNow(token));

async function renderPublicPdfNow(token: string) {
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
