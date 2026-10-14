/**
 * Adds roles to users. The first super admin is set by hand, see server/README.md.
 * `super_admin_slot` (1 or 2, unique) is what limits the system to two super admins at the database level.
 * The CHECK constraints are enforced by MySQL 8.0.16+ and MariaDB 10.2.1+; the unique index works everywhere.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  await knex.schema.alterTable('users', (table) => {
    table.string('role', 20).notNullable().defaultTo('user');
    table.tinyint('super_admin_slot').unsigned().nullable().unique();
  });
  await knex.raw("ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('user', 'admin', 'super_admin'))");
  await knex.raw(
    "ALTER TABLE users ADD CONSTRAINT users_super_admin_slot_check CHECK ((role = 'super_admin' AND super_admin_slot IN (1, 2)) OR (role <> 'super_admin' AND super_admin_slot IS NULL))",
  );
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  for (const name of ['users_super_admin_slot_check', 'users_role_check']) {
    try {
      await knex.raw(`ALTER TABLE users DROP CHECK ${name}`);
    } catch (error) {
      try {
        await knex.raw(`ALTER TABLE users DROP CONSTRAINT ${name}`);
      } catch (ignored) {
        // already gone, or an older server that never stored the constraint
      }
    }
  }
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('super_admin_slot');
    table.dropColumn('role');
  });
};
