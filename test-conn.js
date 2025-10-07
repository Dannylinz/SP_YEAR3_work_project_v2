// test-conn.js
const pool = require('./src/services/db');

(async () => {
  try {
    const [rows] = await pool.query('SELECT 1+1 AS result');
    console.log('DB ping success:', rows);
    const [tables] = await pool.query("SHOW TABLES");
    console.log('Tables present:', tables.length);
    process.exit(0);
  } catch (err) {
    console.error('DB connection error:', err.message || err);
    process.exit(1);
  }
})();
