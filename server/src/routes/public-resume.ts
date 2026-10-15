import express from "express";
import rateLimit from "express-rate-limit";
import { getPublicResume, getPublicResumePdf } from "../controllers/public-resume";

const publicResumeRouter = express.Router();

const limiter = (limit: number) => rateLimit({
  windowMs: 15 * 60 * 1000,
  limit,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later.' },
});

publicResumeRouter.get('/:token', limiter(300), getPublicResume);
publicResumeRouter.get('/:token/pdf', limiter(30), getPublicResumePdf); // each uncached request starts Chrome

export default publicResumeRouter;
