import express, { type Request, type Response } from 'express';
import { requireAdmin, requireSuperAdmin } from '../middlewares/adminAuth';
import { roleOf, type Person } from '../utils/adminRules';
import type { AdminService, Result } from '../services/adminService';

const actorOf = (req: Request): Person => {
  const user = req.user as { id: string; role?: unknown };
  return { id: user.id, role: roleOf(user) };
};

const send = <T,>(res: Response, result: Result<T>) => {
  if (result.ok) res.json(result.value);
  else res.status(result.status).json({ error: result.message });
};

export const createAdminRouter = (service: AdminService) => {
  const router = express.Router();
  router.use(requireAdmin);

  router.get('/me', (req, res) => {
    const actor = actorOf(req);
    res.json({ id: actor.id, role: actor.role });
  });

  router.get('/admins', async (_req, res) => {
    res.json({ admins: await service.list() });
  });

  router.post('/admins', async (req, res) => {
    send(res, await service.makeAdmin(actorOf(req), req.body?.email));
  });

  router.delete('/admins/:id', async (req, res) => {
    send(res, await service.removeAdmin(actorOf(req), req.params.id));
  });

  router.post('/super-admins', requireSuperAdmin, async (req, res) => {
    send(res, await service.makeSuperAdmin(actorOf(req), req.body?.email));
  });

  router.delete('/super-admins/:id', requireSuperAdmin, async (req, res) => {
    send(res, await service.demoteSuperAdmin(actorOf(req), req.params.id));
  });

  return router;
};
