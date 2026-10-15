import { randomBytes } from 'crypto';

// 16 random bytes -> 22 base64url characters (128 bits: not guessable)
export const SHARE_TOKEN_PATTERN = /^[A-Za-z0-9_-]{22}$/;

export const generateShareToken = (): string => randomBytes(16).toString('base64url');

export const isValidShareToken = (value: unknown): value is string =>
  typeof value === 'string' && SHARE_TOKEN_PATTERN.test(value);
