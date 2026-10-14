import type { Request, RequestHandler } from 'express';
import { retryAfterSeconds } from '../utils/maintenance';
import type { MaintenanceStore } from '../utils/maintenanceStore';

const OAUTH_SIGN_IN = /^\/auth\/(google|github|linkedin)(\/callback)?$/;

export interface GateOptions {
  /** Admins pass the gate while maintenance is active. */
  isAdmin?: (req: Request) => boolean;
}

/**
 * While maintenance is active, answer every request with 503, except:
 * - admins (they keep using the app, for example to check an upgrade before reopening it);
 * - `PUT /maintenance`, which checks its own credentials (the emergency token has no session);
 * - the OAuth sign-in routes, so an admin can sign back in (a restart drops every session while the
 *   maintenance state survives). Anyone else who signs in is still blocked everywhere else.
 * Mount it after the session (so it can see who is asking) and before the CSRF check, so clients see the
 * 503 and not a CSRF 403. `X-Maintenance` lets the client recognise it even when the body is an unparsed
 * blob (PDF requests).
 */
export const maintenanceGate = (store: MaintenanceStore, { isAdmin = () => false }: GateOptions = {}): RequestHandler =>
  (req, res, next) => {
    const snapshot = store.snapshot();
    if (snapshot.status !== 'active') {
      next();
      return;
    }
    if (req.method === 'PUT' && req.path === '/maintenance') {
      next();
      return;
    }
    if (req.method === 'GET' && OAUTH_SIGN_IN.test(req.path)) {
      next();
      return;
    }
    if (isAdmin(req)) {
      next();
      return;
    }
    res.set('Retry-After', String(retryAfterSeconds(snapshot)));
    res.set('X-Maintenance', '1');
    res.status(503).json({ error: 'maintenance', endsAt: snapshot.endsAt });
  };
