import express, { type Request, type RequestHandler } from 'express';
import { isValidAdminToken, parseUpdate } from '../utils/maintenance';
import type { MaintenanceStore } from '../utils/maintenanceStore';

/** Public status. Mount it ahead of the session so polling never touches the database. */
export const createMaintenanceStatusRouter = (store: MaintenanceStore) => {
  const router = express.Router();
  router.get('/status', (_req, res) => {
    res.set('Cache-Control', 'no-store');
    res.json(store.snapshot());
  });
  return router;
};

export interface ControlOptions {
  isAdmin?: (req: Request) => boolean;
  /** The CSRF check, applied only on the admin-session path. */
  csrf?: RequestHandler;
}

/**
 * `PUT /maintenance`. Two ways in:
 * - the optional emergency token header (no cookie, so no CSRF);
 * - an admin session, which must pass the CSRF check.
 * Anyone else gets 404 so the route's existence is not revealed.
 */
export const createMaintenanceControlRouter = (
  store: MaintenanceStore,
  { isAdmin = () => false, csrf = (_req, _res, next) => next() }: ControlOptions = {},
) => {
  const router = express.Router();

  const authorize: RequestHandler = (req, res, next) => {
    const header = req.header('x-admin-token');
    if (header !== undefined) {
      const expected = process.env.MAINTENANCE_ADMIN_TOKEN;
      if (!expected) {
        res.status(404).json({ error: 'Not found' }); // emergency path switched off
        return;
      }
      if (!isValidAdminToken(header, expected)) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      next();
      return;
    }
    if (isAdmin(req)) {
      csrf(req, res, next);
      return;
    }
    res.status(404).json({ error: 'Not found' });
  };

  router.put('/', authorize, async (req, res) => {
    const parsed = parseUpdate(req.body, Date.now());
    if (!parsed.ok) {
      res.status(400).json({ error: parsed.error });
      return;
    }
    await store.set(parsed.state);
    res.json(store.snapshot());
  });

  return router;
};
