import express from "express";
import generate_cl_pdf from "../controllers/cl-pdf";
import { isAuthenticated, validateSocialLogin, authRateLimit } from '../middlewares/auth';
import { save_userData, fetchAllCL, createInitCL, cloneCL, deleteCL, fetchCLData, renameCL, saveExportedCL } from "../controllers/cover-letter";

const clRouter = express.Router();
// Apply authentication middleware to ensure user is logged in with Google, GitHub or LinkedIn
clRouter.post('/generate-cl',
  authRateLimit(100, 30 * 60 * 1000),
  isAuthenticated,
  validateSocialLogin(['google', 'github', 'linkedin']),
  generate_cl_pdf
);

clRouter.post('/save-data',
  authRateLimit(100, 30 * 60 * 1000),
  isAuthenticated,
  validateSocialLogin(['google', 'github', 'linkedin']),
  save_userData
);

clRouter.get('/fetch-cover-letters/:userId',
  isAuthenticated,
  validateSocialLogin(['google', 'github', 'linkedin']),
  fetchAllCL
);

clRouter.post('/create-init/:userId',
  authRateLimit(100, 30 * 60 * 1000),
  isAuthenticated,
  validateSocialLogin(['google', 'github', 'linkedin']),
  createInitCL
);

clRouter.post('/clone/:id/:userId',
  authRateLimit(100, 30 * 60 * 1000),
  isAuthenticated,
  validateSocialLogin(['google', 'github', 'linkedin']),
  cloneCL
);

clRouter.delete('/delete/:id/:userId',
  authRateLimit(100, 30 * 60 * 1000),
  isAuthenticated,
  validateSocialLogin(['google', 'github', 'linkedin']),
  deleteCL
);

clRouter.get('/fetch-data/:id/:userId',
  authRateLimit(100, 30 * 60 * 1000),
  isAuthenticated,
  validateSocialLogin(['google', 'github', 'linkedin']),
  fetchCLData
);

clRouter.put('/rename-cl/:id/:userId',
  authRateLimit(100, 30 * 60 * 1000),
  isAuthenticated,
  validateSocialLogin(['google', 'github', 'linkedin']),
  renameCL
);

clRouter.post('/save-exports/:id/:userId',
  authRateLimit(100, 30 * 60 * 1000),
  isAuthenticated,
  validateSocialLogin(['google', 'github', 'linkedin']),
  saveExportedCL
)
export default clRouter;