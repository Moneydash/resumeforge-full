import { Controller } from "@/types/types.controller-type";
import { formatDescription } from "../utils/helper";
import puppeteer, { Browser, Page } from "puppeteer";

// Centralized font configuration per template for clean extensibility
type FontConfig = { link: string; family: string };
const FONT_CONFIGS: Record<string, FontConfig> = {
  aether: {
    link:
      `<link href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,100..900;1,100..900&display=swap" rel="stylesheet">`,
    family: `'Montserrat', sans-serif`
  },
  terra: {
    link:
      `<link href="https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap" rel="stylesheet">`,
    family: `'Poppins', sans-serif`
  },
  aqua: {
    link:
      `<link href="https://fonts.googleapis.com/css2?family=Mozilla+Headline:wght@200..700&display=swap" rel="stylesheet">`,
    family: `'Mozilla Headline', sans-serif`
  },
  ignis: {
    link: `<link href="https://fonts.googleapis.com/css2?family=Geist:wght@100..900&display=swap" rel="stylesheet">`,
    family: `'Geist', sans-serif`
  },
  ventus: {
    link: `<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Serif:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;1,100;1,200;1,300;1,400;1,500;1,600;1,700&display=swap" rel="stylesheet">`,
    family: `'IBM Plex Serif', serif`
  }
};

const generate_cl_pdf: Controller = async (req, res) => {
  let browser: Browser | undefined;
  let page: Page | undefined;

  try {
    const { html, template } = req.body;
    const fontConfig = FONT_CONFIGS[String(template)];
    const formattedHtml = formatDescription(html)

    // Input validation
    if (!formattedHtml || typeof formattedHtml !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Invalid HTML content provided'
      });
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
          ${fontConfig ? fontConfig.link : ''}
          <style>
            /* Reset all default margins and padding */
            * {
              margin: 0 !important;
              padding: 0 !important;
              box-sizing: border-box;
            }
            
            /* Apply template-specific fonts */
            ${fontConfig ? `
            body, * {
              font-family: ${fontConfig.family} !important;
            }
            ` : ''}
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
    const dimensions = await page.evaluate(() => {
      // Force layout recalculation
      document.body.offsetHeight;
      document.body.scrollHeight;

      const body = document.body;
      const html = document.documentElement;

      // Get the actual rendered height
      const bodyHeight = body.scrollHeight;
      const htmlHeight = html.scrollHeight;
      const offsetHeight = body.offsetHeight;

      // Use the maximum height to ensure all content is captured
      const contentHeight = Math.max(bodyHeight, htmlHeight, offsetHeight);

      // Convert to inches (assuming 96 DPI)
      const contentHeightInInches = contentHeight / 96;
      const widthInInches = 8.5; // Standard letter width
      const letterHeightInInches = 11; // Standard letter height

      // Use letter height as default, but adjust if content is taller
      const finalHeight = Math.max(letterHeightInInches, contentHeightInInches);

      return {
        width: widthInInches,
        height: finalHeight, // finalHeight
        heightPx: finalHeight * 96 // finalHeight
      };
    });

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