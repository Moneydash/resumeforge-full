import express from "express";
import scan_resume from "../controllers/ats";
import { get_keywords, save_keywords } from "../controllers/atsKeywords";
import { isAuthenticated, validateSocialLogin } from '../middlewares/auth';
import { atsRateLimit, uploadResume } from '../middlewares/ats';

const atsRouter = express.Router();

// Stateless: the uploaded PDF is scanned in memory and never stored.
// Auth runs first so the rate limit can count per user.
atsRouter.post('/scan',
  isAuthenticated,
  validateSocialLogin(['google', 'github', 'linkedin']),
  atsRateLimit,
  uploadResume,
  scan_resume
);

// Saved keyword lists (only the keywords are stored, never the resume). Not rate limited like scans.
atsRouter.get('/keywords',
  isAuthenticated,
  validateSocialLogin(['google', 'github', 'linkedin']),
  get_keywords
);
atsRouter.put('/keywords',
  isAuthenticated,
  validateSocialLogin(['google', 'github', 'linkedin']),
  save_keywords
);

export default atsRouter;
