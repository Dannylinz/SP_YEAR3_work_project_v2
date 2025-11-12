// src/services/authDb.js
const mysql = require("mysql2/promise");

const authPool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "",
  database: "meganet_auth",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

module.exports = authPool;
