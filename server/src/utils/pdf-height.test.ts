import { afterAll, beforeAll, describe, expect, it } from "vitest";
import puppeteer, { Browser, Page } from "puppeteer";
import { PDFDocument } from "pdf-lib";
import { measureDocumentHeightPx } from "./pdf-height";

// Real browser, real PDF: these cover the bug where the last fraction of a pixel of a document spilled onto a
// second page that the single-page export drops (a cut-off last card).
const PDF_OPTIONS = {
  printBackground: true,
  scale: 1,
  displayHeaderFooter: false,
  margin: { top: "0mm", bottom: "0mm", left: "0mm", right: "0mm" },
  preferCSSPageSize: true,
} as const;

let browser: Browser;
beforeAll(async () => {
  browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
}, 60000);
afterAll(async () => {
  await browser?.close();
});

async function pageWithHeight(heightPx: number): Promise<Page> {
  const page = await browser.newPage();
  await page.setViewport({ width: 816, height: 1056 });
  await page.setContent(`<html><body style="margin:0"><div style="height:${heightPx}px;background:#eee"></div></body></html>`);
  return page;
}

const pageCount = async (page: Page, heightPx: number): Promise<number> => {
  const pdf = await page.pdf({ width: "8.5in", height: `${heightPx / 96}in`, ...PDF_OPTIONS });
  return (await PDFDocument.load(pdf)).getPageCount();
};

// the old measurement: whole pixels only
const oldMeasure = (page: Page): Promise<number> =>
  page.evaluate(() => Math.max(document.body.scrollHeight, document.documentElement.scrollHeight, document.body.offsetHeight));

// heights taken from real Artemis resumes that lost their last card
const FRACTIONAL_HEIGHTS = [1252.42, 2204.25, 2892.42];

describe("measureDocumentHeightPx", () => {
  it("rounds the fractional layout height up and adds 1px of headroom", async () => {
    const page = await pageWithHeight(1252.42);
    expect(await measureDocumentHeightPx(page)).toBe(1254);
    await page.close();
  });

  it("is never below the whole-pixel measurements", async () => {
    const page = await pageWithHeight(1056);
    expect(await measureDocumentHeightPx(page)).toBeGreaterThanOrEqual(1056);
    expect(await measureDocumentHeightPx(page)).toBe(1057);
    await page.close();
  });

  it.each(FRACTIONAL_HEIGHTS)("keeps a %fpx document on a single page", async (height) => {
    const page = await pageWithHeight(height);
    expect(await pageCount(page, await measureDocumentHeightPx(page))).toBe(1);
    await page.close();
  });

  it.each(FRACTIONAL_HEIGHTS)("(control) the old whole-pixel measurement of %fpx spilled onto a second page", async (height) => {
    const page = await pageWithHeight(height);
    expect(await pageCount(page, await oldMeasure(page))).toBeGreaterThan(1);
    await page.close();
  });
});
