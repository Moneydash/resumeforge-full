import client from '@/api/axiosInstance';
import { parseSnapshot } from './timing';
import type { MaintenanceSnapshot } from './types';

/** Returns null when the response is not a snapshot (for example the SPA's index.html from a wrong API URL). */
export const fetchMaintenanceStatus = async (): Promise<MaintenanceSnapshot | null> => {
  const response = await client.get('/maintenance/status', { timeout: 8000 });
  return parseSnapshot(response.data);
};
