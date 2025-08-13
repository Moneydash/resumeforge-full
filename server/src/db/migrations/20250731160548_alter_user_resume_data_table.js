/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.alterTable('user_resume_data', function (table) {
    table.string('resume_name');
    table.string('resume_slug_name').unique();
    table.dateTime('deleted_at').index().defaultTo(null).comment('Soft delete Timestamp');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.alterTable('user_resume_data', function (table) {
    table.dropColumn('resume_name'); // Remove the column if rolled back
    table.dropColumn('resume_slug_name');
    table.dropColumn('deleted_at');
  });
};
