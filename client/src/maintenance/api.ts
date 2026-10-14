import client from '@/api/axiosInstance';
import { parseSnapshot } from './timing';
import type { MaintenanceSnapshot } from './types';

/** Returns null when the response is not a snapshot (for example the SPA's index.html from a wrong API URL). */
export const fetchMaintenanceStatus = async (): Promise<MaintenanceSnapshot | null> => {
  const response = await client.get('/maintenance/status', { timeout: 8000 });
  return parseSnapshot(response.data);
};

/**
 * Asks the server whether the signed-in viewer is an admin. During maintenance only an admin gets an answer
 * (everyone else gets the 503), so any failure means "not an admin".
 */
export const probeAdmin = async (): Promise<boolean> => {
  try {
    const response = await client.get('/admin/me', { timeout: 8000 });
    const role = response.data?.role;
    return role === 'admin' || role === 'super_admin';
  } catch {
    return false;
  }
};
