import type { Response } from "express";
import { Controller } from "@/types/types.controller-type";
import { resumeModel } from "../models/Resume";
import { isValidShareToken } from "../utils/shareToken";
import { PublicPdfCache } from "../utils/publicPdfCache";
import { renderPublicPdf } from "../utils/public-pdf";
import { stripHiddenContent } from "../utils/publicResumeData";

const pdfCache = new PublicPdfCache(50);

// Every "no" looks the same: a bad token, a link switched off and a deleted resume are indistinguishable.
const notFound = (res: Response) => res.status(404).json({ message: 'Not found' });

const getPublicResume: Controller = async (req, res) => {
  const { token } = req.params;
  if (!isValidShareToken(token)) return notFound(res);

  const resume = await resumeModel.findPublicByToken(token);
  if (!resume || resume.share_token !== token) return notFound(res);

  res.set('Cache-Control', 'no-store');
  return res.json({
    resume_name: resume.resume_name,
    template: resume.template,
    resume_data: stripHiddenContent(resume.resume_data),
    updated_at: resume.updated_at,
  });
};

const getPublicResumePdf: Controller = async (req, res) => {
  const { token } = req.params;
  if (!isValidShareToken(token)) return notFound(res);

  // MySQL's default collation matches tokens case-insensitively; only the exact stored token is valid, which
  // also keeps the cache key unique per resume. The enabled / deleted check runs on every request, before the cache is consulted.
  const resume = await resumeModel.findPublicByToken(token);
  if (!resume || resume.share_token !== token) return notFound(res);

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
