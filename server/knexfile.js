const { config } = require('dotenv');

config();

/**
 * @type { Object.<string, import("knex").Knex.Config> }
 */
module.exports = {
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'resumeforge',
    port: parseInt(process.env.DB_PORT || '3306'),
  },
  pool: {
    min: 2,
    max: 10
  },
  migrations: {
    directory: './src/db/migrations',
    tableName: 'knex_migrations'
  },
  seeds: {
    directory: './src/db/seeds'
  }
};
