import express from 'express';
import { isValidAdminToken, parseUpdate } from '../utils/maintenance';
import type { MaintenanceStore } from '../utils/maintenanceStore';

export const createMaintenanceRouter = (store: MaintenanceStore) => {
  const router = express.Router();

  router.get('/status', (_req, res) => {
    res.set('Cache-Control', 'no-store');
    res.json(store.snapshot());
  });

  router.put('/', async (req, res) => {
    const expected = process.env.MAINTENANCE_ADMIN_TOKEN;
    if (!expected) {
      res.status(404).json({ error: 'Not found' }); // feature switched off
      return;
    }
    if (!isValidAdminToken(req.header('x-admin-token'), expected)) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
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
