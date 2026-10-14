import type { Knex } from 'knex';
import knex from '../db/knex';
import { roleOf } from '../utils/adminRules';
import { SlotTakenError, type AdminStore, type AdminTx, type AdminUser } from '../services/adminService';

const COLUMNS = ['id', 'email', 'name', 'role'];

const toAdminUser = (row: { id: string; email: string; name: string; role?: unknown }): AdminUser => ({
  id: row.id,
  email: row.email,
  name: row.name,
  role: roleOf(row),
});

const makeTx = (trx: Knex.Transaction): AdminTx => ({
  findByEmail: async (email) => {
    const row = await trx('users').whereRaw('LOWER(email) = ?', [email]).select(COLUMNS).forUpdate().first();
    return row ? toAdminUser(row) : null;
  },
  findById: async (id) => {
    const row = await trx('users').where('id', id).select(COLUMNS).forUpdate().first();
    return row ? toAdminUser(row) : null;
  },
  superAdminSlots: async () => {
    const rows = await trx('users').where('role', 'super_admin').select('super_admin_slot').forUpdate();
    return rows.map((r: { super_admin_slot: number | null }) => r.super_admin_slot).filter((s): s is number => typeof s === 'number');
  },
  setRole: async (id, role, slot) => {
    try {
      await trx('users').where('id', id).update({ role, super_admin_slot: slot, updated_at: new Date() });
    } catch (error) {
      if ((error as { code?: string }).code === 'ER_DUP_ENTRY') throw new SlotTakenError();
      throw error;
    }
  },
});

/** MySQL implementation. The rows it reads are locked until the transaction ends. */
export class KnexAdminStore implements AdminStore {
  async list(): Promise<AdminUser[]> {
    const rows = await knex('users')
      .whereIn('role', ['admin', 'super_admin'])
      .select(COLUMNS)
      .orderByRaw("FIELD(role, 'super_admin', 'admin')")
      .orderBy('email');
    return rows.map(toAdminUser);
  }

  transaction<T>(work: (tx: AdminTx) => Promise<T>): Promise<T> {
    return knex.transaction((trx) => work(makeTx(trx)));
  }
}
