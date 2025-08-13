/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('resume_exports', (table) => {
    table.string('id').primary();
    table.string('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('resume_id').notNullable().references('id').inTable('user_resume_data').onDelete('CASCADE');
    table.string('export_format').notNullable();
    table.string('template').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now()); // Creates created_at
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTable('resume_exports');
};
