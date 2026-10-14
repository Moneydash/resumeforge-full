import {
  canDemoteSuperAdmin,
  canMakeAdmin,
  canMakeSuperAdmin,
  canRemoveAdmin,
  freeSuperAdminSlot,
  normalizeEmail,
  type Person,
  type Role,
} from '../utils/adminRules';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

/** Work done inside one database transaction, with the rows it reads locked. */
export interface AdminTx {
  findByEmail(email: string): Promise<AdminUser | null>; // email already lower-cased
  findById(id: string): Promise<AdminUser | null>;
  superAdminSlots(): Promise<number[]>;
  setRole(id: string, role: Role, slot: number | null): Promise<void>;
}

export interface AdminStore {
  list(): Promise<AdminUser[]>;
  transaction<T>(work: (tx: AdminTx) => Promise<T>): Promise<T>;
}

/** Thrown by a store when a super admin slot is already taken (the database's unique rule). */
export class SlotTakenError extends Error {
  constructor() {
    super('Super admin slot already taken');
  }
}

export type Result<T> = { ok: true; value: T } | { ok: false; status: number; message: string };

const deny = (status: number, message: string) => ({ ok: false as const, status, message });
const granted = (value: AdminUser) => ({ ok: true as const, value });

const NO_SUCH_USER = 'No user with that email has signed in yet';
const NEEDS_EMAIL = 'Enter the email of a user who has signed in';
const SLOT_TAKEN = 'There can be at most two super admins. Demote one first.';

export class AdminService {
  constructor(private readonly store: AdminStore) {}

  list(): Promise<AdminUser[]> {
    return this.store.list();
  }

  async makeAdmin(actor: Person, email: unknown): Promise<Result<AdminUser>> {
    const normalized = normalizeEmail(email);
    if (!normalized) return deny(400, NEEDS_EMAIL);
    return this.run(async (tx) => {
      const target = await tx.findByEmail(normalized);
      if (!target) return deny(404, NO_SUCH_USER);
      const decision = canMakeAdmin(actor, target);
      if (!decision.ok) return deny(decision.status, decision.message);
      await tx.setRole(target.id, 'admin', null);
      return granted({ ...target, role: 'admin' });
    });
  }

  async removeAdmin(actor: Person, targetId: string): Promise<Result<AdminUser>> {
    return this.run(async (tx) => {
      const target = await tx.findById(targetId);
      if (!target) return deny(404, 'That person is not an admin');
      const decision = canRemoveAdmin(actor, target);
      if (!decision.ok) return deny(decision.status, decision.message);
      await tx.setRole(target.id, 'user', null);
      return granted({ ...target, role: 'user' });
    });
  }

  async makeSuperAdmin(actor: Person, email: unknown): Promise<Result<AdminUser>> {
    const normalized = normalizeEmail(email);
    if (!normalized) return deny(400, NEEDS_EMAIL);
    return this.run(async (tx) => {
      const target = await tx.findByEmail(normalized);
      if (!target) return deny(404, NO_SUCH_USER);
      const slots = await tx.superAdminSlots();
      const decision = canMakeSuperAdmin(actor, target, slots.length);
      if (!decision.ok) return deny(decision.status, decision.message);
      const slot = freeSuperAdminSlot(slots);
      if (slot === null) return deny(409, SLOT_TAKEN);
      await tx.setRole(target.id, 'super_admin', slot);
      return granted({ ...target, role: 'super_admin' });
    });
  }

  async demoteSuperAdmin(actor: Person, targetId: string): Promise<Result<AdminUser>> {
    return this.run(async (tx) => {
      const target = await tx.findById(targetId);
      if (!target) return deny(404, 'That person is not a super admin');
      const slots = await tx.superAdminSlots();
      const decision = canDemoteSuperAdmin(actor, target, slots.length);
      if (!decision.ok) return deny(decision.status, decision.message);
      await tx.setRole(target.id, 'admin', null);
      return granted({ ...target, role: 'admin' });
    });
  }

  private async run(work: (tx: AdminTx) => Promise<Result<AdminUser>>): Promise<Result<AdminUser>> {
    try {
      return await this.store.transaction(work);
    } catch (error) {
      if (error instanceof SlotTakenError) return deny(409, SLOT_TAKEN);
      throw error;
    }
  }
}
