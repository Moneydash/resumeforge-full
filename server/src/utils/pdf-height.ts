import type { Page } from "puppeteer";

/**
 * The height in CSS px a PDF page needs so the whole document fits on one page.
 *
 * scrollHeight and offsetHeight are rounded to whole pixels, so a layout that is 1252.4px tall used to be measured
 * as 1252. The PDF page was then a fraction of a pixel too short, the last fraction spilled onto a second page, and
 * the single-page export (pageRanges: "1") silently dropped it: the last card of a resume was cut off.
 * Measure the fractional layout height, round it up, and keep 1px of headroom.
 */
export async function measureDocumentHeightPx(page: Page): Promise<number> {
  return page.evaluate(() => {
    const body = document.body;
    const html = document.documentElement;
    const rounded = Math.max(body.scrollHeight, html.scrollHeight, body.offsetHeight);
    const fractional = Math.max(body.getBoundingClientRect().height, html.getBoundingClientRect().height);
    return Math.ceil(Math.max(rounded, fractional)) + 1;
  });
}
