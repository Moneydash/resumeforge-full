import express from "express";
import {
  fetchResumeData,
  save_userData,
  fetchAllResumes,
  deleteResume,
  createInitResume,
  renameResume,
  cloneResume,
  saveExportedResume,
  shareResume
} from '../controllers/resume';
import generate_pdf from "../controllers/pdf";
import { isAuthenticated, validateSocialLogin, authRateLimit } from '../middlewares/auth';

const pdfRouter = express.Router();
// Apply authentication middleware to ensure user is logged in with Google, GitHub or LinkedIn
pdfRouter.post('/generate',
  authRateLimit(100, 30 * 60 * 1000),
  isAuthenticated,
  validateSocialLogin(['google', 'github', 'linkedin']),
  generate_pdf
);

pdfRouter.post('/save-data',
  authRateLimit(100, 30 * 60 * 1000),
  isAuthenticated,
  validateSocialLogin(['google', 'github', 'linkedin']),
  save_userData
);

pdfRouter.get('/fetch-data/:id/:userId',
  isAuthenticated,
  validateSocialLogin(['google', 'github', 'linkedin']),
  fetchResumeData
);

pdfRouter.get('/fetch-resumes/:userId',
  isAuthenticated,
  validateSocialLogin(['google', 'github', 'linkedin']),
  fetchAllResumes
);

pdfRouter.delete('/delete-resume/:id/:userId',
  isAuthenticated,
  validateSocialLogin(['google', 'github', 'linkedin']),
  deleteResume
);

pdfRouter.post('/create-init/:userId',
  authRateLimit(100, 30 * 60 * 1000),
  isAuthenticated,
  validateSocialLogin(['google', 'github', 'linkedin']),
  createInitResume
);

pdfRouter.post('/rename/:id/:userId',
  authRateLimit(100, 30 * 60 * 1000),
  isAuthenticated,
  validateSocialLogin(['google', 'github', 'linkedin']),
  renameResume
);

pdfRouter.post('/clone/:id/:userId',
  authRateLimit(100, 30 * 60 * 1000),
  isAuthenticated,
  validateSocialLogin(['google', 'github', 'linkedin']),
  cloneResume
);

pdfRouter.post('/share/:id/:userId',
  authRateLimit(100, 30 * 60 * 1000),
  isAuthenticated,
  validateSocialLogin(['google', 'github', 'linkedin']),
  shareResume
);

pdfRouter.post('/save-exports/:id/:userId',
  isAuthenticated,
  validateSocialLogin(['google', 'github', 'linkedin']),
  saveExportedResume
);

export default pdfRouter;