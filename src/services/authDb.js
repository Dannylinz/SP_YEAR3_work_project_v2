// src/services/authDb.js
const mysql = require("mysql2/promise");
require('dotenv').config();

const authPool = mysql.createPool({
  host: process.env.AUTH_DB_HOST || "localhost",
  user: process.env.AUTH_DB_USER || "root",
  password: process.env.AUTH_DB_PASSWORD || "",
  database: process.env.AUTH_DB_NAME || "meganet_auth",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

module.exports = authPool;
