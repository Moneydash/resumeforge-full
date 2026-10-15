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
      if (browser && browser.connected) {
        await browser.close();
      }
    } catch (e) {
      console.error('Error closing browser:', e);
    }
  }
};

export default generate_pdf;
