import { Request, Response, NextFunction } from 'express';
import { rateLimit, ipKeyGenerator, type AugmentedRequest } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import Redis from 'ioredis';
import multer from 'multer';
import type { User } from '@/types/interface.user';

export const ATS_MAX_FILE_SIZE_MB = 5;
const ATS_RATE_LIMIT = 10; // scans per user
const ATS_RATE_WINDOW_MS = 30 * 60 * 1000;

// With REDIS_URL set, counters survive restarts and are shared across server instances.
// Without it, they live in memory, which is fine for a single instance.
const buildStore = () => {
  if (!process.env.REDIS_URL) return undefined;
  const redis = new Redis(process.env.REDIS_URL);
  redis.on('error', (err) => console.error('Redis error (ATS rate limit):', err.message));
  return new RedisStore({
    prefix: 'rl:ats:',
    sendCommand: (command, ...args) => redis.call(command, ...args) as Promise<any>,
  });
};

/** 10 scans per 30 minutes, counted per signed-in user (falls back to IP). */
export const atsRateLimit = rateLimit({
  windowMs: ATS_RATE_WINDOW_MS,
  limit: ATS_RATE_LIMIT,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  store: buildStore(),
  keyGenerator: (req) => {
    const userId = (req.user as User | undefined)?.id;
    return userId ? `user:${userId}` : ipKeyGenerator(req.ip ?? 'unknown');
  },
  handler: (req, res) => {
    const resetTime = (req as AugmentedRequest).rateLimit?.resetTime;
    const retryAfter = resetTime ? Math.max(1, Math.ceil((resetTime.getTime() - Date.now()) / 1000)) : ATS_RATE_WINDOW_MS / 1000;
    res.status(429).json({
      success: false,
      error: `You've reached the limit of ${ATS_RATE_LIMIT} scans per 30 minutes. Please try again later.`,
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter,
    });
  },
});

const upload = multer({
  storage: multer.memoryStorage(), // nothing is written to disk; the buffer is dropped after the response
  limits: { fileSize: ATS_MAX_FILE_SIZE_MB * 1024 * 1024, files: 1 },
});

/** Accepts one file in the `resume` field and turns upload errors into JSON responses. */
export const uploadResume = (req: Request, res: Response, next: NextFunction): void => {
  upload.single('resume')(req, res, (err: unknown) => {
    if (!err) {
      next();
      return;
    }
    if (err instanceof multer.MulterError) {
      const tooLarge = err.code === 'LIMIT_FILE_SIZE';
      res.status(tooLarge ? 413 : 400).json({
        success: false,
        error: tooLarge ? `File is too large. Maximum size is ${ATS_MAX_FILE_SIZE_MB} MB.` : 'Invalid upload.',
        code: err.code,
      });
      return;
    }
    console.error('Unexpected upload error:', err);
    res.status(500).json({ success: false, error: 'Upload failed.' });
  });
};
