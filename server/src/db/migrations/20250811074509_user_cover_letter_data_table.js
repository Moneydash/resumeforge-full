/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('user_cover_letter_data', (table) => {
    table.string('id').primary();
    table.string('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.text('cover_letter_data').nullable();
    table.string('template').nullable();
    table.string('cover_letter_name');
    table.string('cover_letter_slug_name');
    table.dateTime('deleted_at').index().defaultTo(null).comment('Soft delete Timestamp');
    table.timestamps(true, true); // Creates created_at and updated at
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTable('user_cover_letter_data');
};
