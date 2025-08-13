/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('users', (table) => {
    table.string('id').primary();
    table.string('google_id').unique();
    table.string('email').notNullable().unique();
    table.string('name').notNullable();
    table.text('avatar');
    table.timestamps(true, true); // Creates created_at and updated_at
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTable('users');
}; 