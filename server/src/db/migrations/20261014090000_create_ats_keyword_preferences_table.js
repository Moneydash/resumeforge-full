/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('ats_keyword_preferences', (table) => {
    table.string('id').primary();
    table.string('user_id').notNullable().unique().references('id').inTable('users').onDelete('CASCADE');
    table.json('active_keywords').notNullable();
    table.json('suggested_keywords').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTable('ats_keyword_preferences');
};
