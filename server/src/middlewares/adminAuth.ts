import type { Request, RequestHandler } from 'express';
import { isAdminRole, roleOf } from '../utils/adminRules';

/** True for a signed-in admin or super admin. `req.user` is the users row, so it carries `role`. */
export const isAdminRequest = (req: Request): boolean =>
  req.isAuthenticated?.() === true && isAdminRole(roleOf(req.user as { role?: unknown } | undefined));

/** Admins only. Everyone else gets 404, so the admin area's existence is not revealed. */
export const requireAdmin: RequestHandler = (req, res, next) => {
  if (!isAdminRequest(req)) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  next();
};

/** Super admins only. Use after `requireAdmin`. */
export const requireSuperAdmin: RequestHandler = (req, res, next) => {
  if (roleOf(req.user as { role?: unknown } | undefined) !== 'super_admin') {
    res.status(403).json({ error: 'Only a super admin can do that' });
    return;
  }
  next();
};

/**
 * Wraps passport's session middleware: a failed user lookup (for example the database is down) means
 * "not signed in" instead of an error response, so the maintenance gate can still answer 503.
 */
export const lenientSession = (sessionMiddleware: RequestHandler): RequestHandler => (req, res, next) => {
  sessionMiddleware(req, res, (error?: unknown) => {
    if (error) {
      console.error('Session user lookup failed:', (error as Error).message);
      (req as { user?: unknown }).user = undefined;
    }
    next();
  });
};

/**
 * Tells a signed-in user their own role, so the UI can show admin-only links. This only drives what is
 * shown: the server still enforces every admin route.
 */
export const sendRole: RequestHandler = (req, res) => {
  if (req.isAuthenticated?.() !== true) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  res.json({ role: roleOf(req.user as { role?: unknown } | undefined) });
};
