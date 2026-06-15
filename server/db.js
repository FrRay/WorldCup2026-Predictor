const mysql = require('mysql2/promise');

let pool = null;

function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      user: process.env.DB_USER || 'wc26',
      password: process.env.DB_PASSWORD || 'wc26pass',
      database: process.env.DB_NAME || 'wc26_predictor',
      waitForConnections: true,
      connectionLimit: 5,
      charset: 'utf8mb4',
    });
  }
  return pool;
}

module.exports = { getPool };
