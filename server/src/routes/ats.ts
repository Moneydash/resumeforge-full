import express from "express";
import scan_resume from "../controllers/ats";
import { isAuthenticated, validateSocialLogin } from '../middlewares/auth';
import { atsRateLimit, uploadResume } from '../middlewares/ats';

const atsRouter = express.Router();

// Stateless: the uploaded PDF is scanned in memory and never stored.
// Auth runs first so the rate limit can count per user.
atsRouter.post('/scan',
  isAuthenticated,
  validateSocialLogin(['google', 'github']),
  atsRateLimit,
  uploadResume,
  scan_resume
);

export default atsRouter;
