export type Role = 'user' | 'admin' | 'super_admin';

export const MAX_SUPER_ADMINS = 2;

export interface Person {
  id: string;
  role: Role;
}

export type Decision = { ok: true } | { ok: false; status: 403 | 404 | 409; message: string };

const allow: Decision = { ok: true };
const deny = (status: 403 | 404 | 409, message: string): Decision => ({ ok: false, status, message });

export const roleOf = (user: { role?: unknown } | null | undefined): Role => {
  const role = user?.role;
  return role === 'admin' || role === 'super_admin' ? role : 'user';
};

export const isAdminRole = (role: Role): boolean => role === 'admin' || role === 'super_admin';

/** Lower-cased, trimmed email, or null when the value is not a usable email string. */
export const normalizeEmail = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  return email && email.length <= 254 ? email : null;
};

/** The lowest super admin slot (1 or 2) that is not in use, or null when both are. */
export const freeSuperAdminSlot = (used: readonly number[]): number | null => {
  for (let slot = 1; slot <= MAX_SUPER_ADMINS; slot += 1) {
    if (!used.includes(slot)) return slot;
  }
  return null;
};

export const canMakeAdmin = (actor: Person, target: Person): Decision => {
  if (!isAdminRole(actor.role)) return deny(403, 'Only admins can do that');
  if (target.role === 'admin') return deny(409, 'That person is already an admin');
  if (target.role === 'super_admin') return deny(409, 'That person is already a super admin');
  return allow;
};

export const canRemoveAdmin = (actor: Person, target: Person): Decision => {
  if (!isAdminRole(actor.role)) return deny(403, 'Only admins can do that');
  if (target.id === actor.id) return deny(403, "You can't remove yourself");
  if (target.role === 'super_admin') return deny(403, 'A super admin can only be demoted by the other super admin');
  if (target.role === 'user') return deny(404, 'That person is not an admin');
  return allow;
};

export const canMakeSuperAdmin = (actor: Person, target: Person, superAdminCount: number): Decision => {
  if (actor.role !== 'super_admin') return deny(403, 'Only a super admin can do that');
  if (target.role === 'super_admin') return deny(409, 'That person is already a super admin');
  if (superAdminCount >= MAX_SUPER_ADMINS) return deny(409, 'There can be at most two super admins. Demote one first.');
  return allow;
};

export const canDemoteSuperAdmin = (actor: Person, target: Person, superAdminCount: number): Decision => {
  if (actor.role !== 'super_admin') return deny(403, 'Only a super admin can do that');
  if (target.id === actor.id) return deny(403, "You can't demote yourself. Ask the other super admin.");
  if (target.role !== 'super_admin') return deny(404, 'That person is not a super admin');
  if (superAdminCount <= 1) return deny(409, 'There must always be at least one super admin');
  return allow;
};
