/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.alterTable('user_resume_data', function (table) {
    table.string('share_token', 22).nullable().unique();
    table.boolean('share_enabled').notNullable().defaultTo(false);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.alterTable('user_resume_data', function (table) {
    table.dropColumn('share_token');
    table.dropColumn('share_enabled');
  });
};
