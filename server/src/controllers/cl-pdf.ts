import { Controller } from "@/types/types.controller-type";
import { formatDescription } from "../utils/helper";
import puppeteer, { Browser, Page } from "puppeteer";
import { execSync } from 'child_process';
import { buildFontHead } from "../utils/fonts";
import { measureDocumentHeightPx } from "../utils/pdf-height";

const generate_cl_pdf: Controller = async (req, res) => {
  let browser: Browser | undefined;
  let page: Page | undefined;

  try {
    const { html, template, data } = req.body;
    const formattedHtml = formatDescription(html)

    // Input validation
    if (!formattedHtml || typeof formattedHtml !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Invalid HTML content provided'
      });
    }

    if (process.env.NODE_ENV === 'production') {
      try {
        console.log('Installing Chrome for Puppeteer...');
        execSync('npx puppeteer browsers install chrome', { stdio: 'inherit' });
      } catch (err) {
        console.error('Failed to install Chrome at runtime:', err);
      }
    }

    // Launch browser with more stable configuration
    browser = await puppeteer.launch({
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

    page = await browser.newPage();
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
          ${formattedHtml}
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
    const contentHeightPx = await measureDocumentHeightPx(page);
    const letterHeightInInches = 11; // Standard letter height
    // Use letter height as default, but adjust if content is taller
    const finalHeight = Math.max(letterHeightInInches, contentHeightPx / 96);
    const dimensions = {
      width: 8.5, // Standard letter width
      height: finalHeight,
      heightPx: finalHeight * 96,
    };

    // const min_buffer = template === 'milky_way' ? 0.1 : 0;
    const min_buffer = 0;

    // Generate PDF with enhanced options for zero margins
    const pdfOptions = {
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
    };

    const pdfBuffer = await page.pdf(pdfOptions);

    await page.close();
    page = undefined;
    await browser.close();
    browser = undefined;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="resume.pdf"');
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);

  } catch (error: any) {
    console.error('PDF generation error:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });

    let errorMessage = 'Failed to generate PDF';
    let statusCode = 500;

    if (error.name === 'TargetCloseError' || error.name === 'ProtocolError') {
      errorMessage = 'Browser connection lost during PDF generation';
    } else if (error.name === 'TimeoutError') {
      errorMessage = 'PDF generation timed out';
      statusCode = 408;
    } else if (error.message && error.message.includes('Navigation timeout')) {
      errorMessage = 'Content loading timed out';
      statusCode = 408;
    }

    res.status(statusCode).json({
      success: false,
      message: errorMessage
    });

  } finally {
    try {
      if (page && !page.isClosed()) {
        await page.close();
      }
    } catch (e) {
      console.error('Error closing page:', e);
    }

    try {
      if (browser && browser.connected) {
        await browser.close();
      }
    } catch (e) {
      console.error('Error closing browser:', e);
    }
  }
};

export default generate_cl_pdf;