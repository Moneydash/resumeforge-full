import { Request, Response, NextFunction } from 'express';
import { userModel } from '../models/User';
import { User } from '@/types/interface.user';
import csrf from 'csurf';

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Authentication middleware interface
interface AuthMiddleware {
  isAuthenticated: (req: Request, res: Response, next: NextFunction) => void;
  isGuest: (req: Request, res: Response, next: NextFunction) => void;
  hasRole: (roles: string[]) => (req: Request, res: Response, next: NextFunction) => void;
  isOwner: (resourceIdParam: string) => (req: Request, res: Response, next: NextFunction) => void;
}

// Social login provider types
type SocialProvider = 'google' | 'github' | 'facebook' | 'twitter';

// User session interface
interface UserSession {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  provider?: SocialProvider;
  lastLogin?: Date;
}

/**
 * Check if user is authenticated
 * Redirects to login if not authenticated
 */
const isAuthenticated = (req: Request, res: Response, next: NextFunction): void => {
  if (req.isAuthenticated()) {
    next();
    return;
  }

  // For API requests, return JSON error
  if (req.path.startsWith('/api/')) {
    res.status(401).json({
      error: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });

    return;
  }

  // For web requests, redirect to login
  res.redirect('/auth/login');
};

/**
 * Check if user is NOT authenticated (guest)
 * Redirects to dashboard if already authenticated
 */
const isGuest = (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated()) {
    next();
    return;
  }

  // For API requests, return JSON error
  if (req.path.startsWith('/api/')) {
    res.status(403).json({
      error: 'Already authenticated',
      code: 'ALREADY_AUTHENTICATED'
    });
    return;
  }

  // For web requests, redirect to dashboard
  res.redirect('/dashboard');
};

/**
 * Check if user has specific role(s)
 * @param roles - Array of allowed roles
 */
const hasRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
      return;
    }

    // For now, we'll use a simple role system
    // You can extend this based on your user model
    const user = req.user as User;

    // Check if user has any of the required roles
    // You can add a 'role' field to your User model
    const userRole = (user as any).role || 'user';

    if (roles.includes(userRole)) {
      next();
      return;
    }

    res.status(403).json({
      error: 'Insufficient permissions',
      code: 'INSUFFICIENT_PERMISSIONS'
    });
  };
};

/**
 * Check if user owns the resource
 * @param resourceIdParam - The parameter name containing the resource ID
 */
const isOwner = (resourceIdParam: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
      return;
    }

    const resourceId = req.params[resourceIdParam];
    const user = req.user as User;

    if (!resourceId) {
      res.status(400).json({
        error: 'Resource ID is required',
        code: 'MISSING_RESOURCE_ID'
      });
      return;
    }

    try {
      // This is a generic example - you'll need to implement specific logic
      // based on your resource types (resumes, profiles, etc.)

      // Example for resume ownership check:
      // const resume = await resumeModel.findById(resourceId);
      // if (!resume || resume.user_id !== user.id) {
      //   return res.status(403).json({ error: 'Access denied' });
      // }

      // For now, we'll just check if the resource ID matches the user ID
      // (this is just an example - implement your own logic)
      if (resourceId === user.id) {
        next();
        return;
      }

      res.status(403).json({
        error: 'Access denied',
        code: 'ACCESS_DENIED'
      });
    } catch (error) {
      console.error('Error checking resource ownership:', error);
      res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      });
    }
  };
};

/**
 * Optional authentication middleware
 * Sets req.user if authenticated, but doesn't require authentication
 */
const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated()) {
    // User is authenticated, req.user is already set
    next();
    return;
  }

  // User is not authenticated, but that's okay
  // req.user will be undefined
  next();
};

/**
 * Rate limiting middleware for authentication attempts
 */
const authRateLimit = (maxAttempts: number = 5, windowMs: number = 15 * 60 * 1000) => {
  const attempts = new Map<string, { count: number; resetTime: number }>();

  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();

    const userAttempts = attempts.get(ip);

    if (!userAttempts || now > userAttempts.resetTime) {
      // First attempt or window expired
      attempts.set(ip, { count: 1, resetTime: now + windowMs });
      next();
      return;
    }

    if (userAttempts.count >= maxAttempts) {
      res.status(429).json({
        error: 'Too many authentication attempts',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil((userAttempts.resetTime - now) / 1000)
      });
      return;
    }

    // Increment attempt count
    userAttempts.count++;
    next();
  };
};

/**
 * Social login validation middleware
 * Validates that the user has completed social login process
 */
const validateSocialLogin = (providers: SocialProvider[] = ['google', 'github']) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
      return;
    }

    const user = req.user as User;

    // Check if user has a social login provider
    const hasSocialLogin = providers.some(provider => {
      return user[`${provider}_id` as keyof User];
    });

    if (!hasSocialLogin) {
      res.status(403).json({
        error: 'Social login required',
        code: 'SOCIAL_LOGIN_REQUIRED'
      });
      return;
    }

    next();
  };
};

const csrfProtection = csrf({
  cookie: false,
  value: (req) => req.headers['x-csrf-token'] as string
});

// Export all middleware functions
export {
  isAuthenticated,
  isGuest,
  hasRole,
  isOwner,
  optionalAuth,
  authRateLimit,
  validateSocialLogin,
  csrfProtection,
  type SocialProvider,
  type UserSession
};
