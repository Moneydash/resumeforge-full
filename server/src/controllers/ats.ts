import { Controller } from "@/types/types.controller-type";
import { scanResume, InvalidPdfError } from "../utils/atsScanner";

const PDF_MAGIC = '%PDF-';

const scan_resume: Controller = async (req, res) => {
  try {
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded. Attach a PDF in the "resume" field.'
      });
    }

    // MIME types are client-controlled, so also check the file signature
    if (file.buffer.subarray(0, 1024).toString('latin1').indexOf(PDF_MAGIC) === -1) {
      return res.status(400).json({
        success: false,
        error: 'Only PDF files are supported.'
      });
    }

    const result = await scanResume(file.buffer);
    return res.status(200).json({ success: true, result });
  } catch (error) {
    if (error instanceof InvalidPdfError) {
      return res.status(422).json({
        success: false,
        error: 'This PDF appears to be corrupted and could not be opened.'
      });
    }
    console.error('ATS scan failed:', error);
    return res.status(500).json({
      success: false,
      error: 'Something went wrong while scanning your resume.'
    });
  }
};

export default scan_resume;
