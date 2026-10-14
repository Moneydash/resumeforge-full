import client from '@/api/axiosInstance';
import { getCsrfToken } from '@/utils/helper';
import { parseSnapshot } from '@/maintenance/timing';
import type { MaintenanceSnapshot } from '@/maintenance/types';
import type { MaintenancePayload } from './form';
import type { AdminMe, AdminRow } from './types';

export type AdminMeResult =
  | { kind: 'admin'; me: AdminMe }
  | { kind: 'not-admin' }
  | { kind: 'maintenance' }
  | { kind: 'error' };

/** Who is asking? 404/401 = not an admin, 503 = maintenance is on and you are not an admin. */
export const loadAdminMe = async (): Promise<AdminMeResult> => {
  try {
    const { data } = await client.get('/admin/me');
    return { kind: 'admin', me: { id: data.id, role: data.role } };
  } catch (error) {
    const status = (error as { response?: { status?: number } }).response?.status;
    if (status === 503) return { kind: 'maintenance' };
    if (status === 404 || status === 401) return { kind: 'not-admin' };
    return { kind: 'error' };
  }
};

/** The server's own message when it sent one (for example "You can't remove yourself"). */
export const errorMessage = (error: unknown, fallback = 'Something went wrong. Please try again.'): string => {
  const message = (error as { response?: { data?: { error?: unknown } } })?.response?.data?.error;
  return typeof message === 'string' && message ? message : fallback;
};

export const fetchAdmins = async (): Promise<AdminRow[]> => {
  const { data } = await client.get('/admin/admins');
  return data.admins as AdminRow[];
};

const write = async (method: 'post' | 'put' | 'delete', url: string, data?: unknown): Promise<unknown> => {
  await getCsrfToken();
  const response = await client.request({ method, url, data });
  return response.data;
};

export const makeAdmin = (email: string) => write('post', '/admin/admins', { email });
export const removeAdmin = (id: string) => write('delete', `/admin/admins/${encodeURIComponent(id)}`);
export const makeSuperAdmin = (email: string) => write('post', '/admin/super-admins', { email });
export const demoteSuperAdmin = (id: string) => write('delete', `/admin/super-admins/${encodeURIComponent(id)}`);

/** Sets, schedules or ends maintenance. Returns the new status snapshot. */
export const sendMaintenance = async (body: MaintenancePayload): Promise<MaintenanceSnapshot | null> =>
  parseSnapshot(await write('put', '/maintenance', body));
