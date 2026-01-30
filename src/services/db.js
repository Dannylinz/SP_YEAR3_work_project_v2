// ✅ Use the promise-based version of mysql2
const mysql = require("mysql2/promise");
require('dotenv').config();

// ✅ Create the connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "meganet",
  waitForConnections: true,
  dateStrings: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: '+00:00'
});

// ✅ Export for async/await usage
module.exports = pool;
