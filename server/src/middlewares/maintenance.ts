import type { RequestHandler } from 'express';
import { retryAfterSeconds } from '../utils/maintenance';
import type { MaintenanceStore } from '../utils/maintenanceStore';

/**
 * While maintenance is active, answer every request with 503. Mount it after the maintenance router
 * (which stays reachable) and before the CSRF check, so clients see the 503 and not a CSRF 403.
 * `X-Maintenance` lets the client recognise it even when the body is an unparsed blob (PDF requests).
 */
export const maintenanceGate = (store: MaintenanceStore): RequestHandler => (_req, res, next) => {
  const snapshot = store.snapshot();
  if (snapshot.status !== 'active') {
    next();
    return;
  }
  res.set('Retry-After', String(retryAfterSeconds(snapshot)));
  res.set('X-Maintenance', '1');
  res.status(503).json({ error: 'maintenance', endsAt: snapshot.endsAt });
};
