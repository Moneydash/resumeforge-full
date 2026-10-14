import type { AdminMe, AdminRow } from './types';

export type RowAction = 'remove' | 'makeSuper' | 'demote';

export const MAX_SUPER_ADMINS = 2;

/**
 * Which buttons to offer on a row. Mirrors the server rules (the server is what actually enforces them):
 * nothing on your own row; admins can remove admins; only super admins can make a super admin (while fewer
 * than two exist) or demote the other one.
 */
export const rowActions = (me: AdminMe, row: AdminRow, rows: AdminRow[]): RowAction[] => {
  if (row.id === me.id) return [];
  const superAdmins = rows.filter((r) => r.role === 'super_admin').length;
  if (row.role === 'admin') {
    const actions: RowAction[] = ['remove'];
    if (me.role === 'super_admin' && superAdmins < MAX_SUPER_ADMINS) actions.push('makeSuper');
    return actions;
  }
  return me.role === 'super_admin' ? ['demote'] : [];
};
