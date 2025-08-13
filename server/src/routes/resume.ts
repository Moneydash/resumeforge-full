import express from "express";
import {
  fetchResumeData,
  save_userData,
  fetchAllResumes,
  deleteResume,
  createInitResume,
  renameResume,
  cloneResume,
  saveExportedResume
} from '../controllers/resume';
import generate_pdf from "../controllers/pdf";
import { isAuthenticated, validateSocialLogin, authRateLimit } from '../middlewares/auth';

const pdfRouter = express.Router();
// Apply authentication middleware to ensure user is logged in with Google or GitHub
pdfRouter.post('/generate',
  authRateLimit(100, 30 * 60 * 1000),
  isAuthenticated,
  validateSocialLogin(['google', 'github']),
  generate_pdf
);

pdfRouter.post('/save-data',
  authRateLimit(100, 30 * 60 * 1000),
  isAuthenticated,
  validateSocialLogin(['google', 'github']),
  save_userData
);

pdfRouter.get('/fetch-data/:id/:userId',
  isAuthenticated,
  validateSocialLogin(['google', 'github']),
  fetchResumeData
);

pdfRouter.get('/fetch-resumes/:userId',
  isAuthenticated,
  validateSocialLogin(['google', 'github']),
  fetchAllResumes
);

pdfRouter.delete('/delete-resume/:id/:userId',
  isAuthenticated,
  validateSocialLogin(['google', 'github']),
  deleteResume
);

pdfRouter.post('/create-init/:userId',
  authRateLimit(100, 30 * 60 * 1000),
  isAuthenticated,
  validateSocialLogin(['google', 'github']),
  createInitResume
);

pdfRouter.post('/rename/:id/:userId',
  authRateLimit(100, 30 * 60 * 1000),
  isAuthenticated,
  validateSocialLogin(['google', 'github']),
  renameResume
);

pdfRouter.post('/clone/:id/:userId',
  authRateLimit(100, 30 * 60 * 1000),
  isAuthenticated,
  validateSocialLogin(['google', 'github']),
  cloneResume
);

pdfRouter.post('/save-exports/:id/:userId',
  isAuthenticated,
  validateSocialLogin(['google', 'github']),
  saveExportedResume
);

export default pdfRouter;