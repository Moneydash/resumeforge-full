const TABLE = 'user_cover_letter_data';
const COLUMN = 'cover_letter_slug_name';
const LEGACY_COLUMN = 'cl_slug_name';

/**
 * Some databases were created with the slug column named `cl_slug_name`, but the model, the controllers
 * and the original create-table migration all use `cover_letter_slug_name`. Every cover letter query that
 * touches the slug (create, rename, clone) then fails with "Unknown column 'cover_letter_slug_name'".
 *
 * Idempotent: renames the legacy column (keeping its data), adds the column if neither exists, and does
 * nothing when `cover_letter_slug_name` is already there (fresh databases, or a table that has both).
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  if (await knex.schema.hasColumn(TABLE, COLUMN)) return;

  const hasLegacy = await knex.schema.hasColumn(TABLE, LEGACY_COLUMN);
  await knex.schema.alterTable(TABLE, (table) => {
    if (hasLegacy) {
      table.renameColumn(LEGACY_COLUMN, COLUMN);
    } else {
      table.string(COLUMN);
    }
  });
};

/**
 * `cover_letter_slug_name` is the canonical name from the original create-table migration, so there is
 * nothing to undo.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {};
