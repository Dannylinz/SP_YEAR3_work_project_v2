// ✅ Use the promise-based version of mysql2
const mysql = require("mysql2/promise");

// ✅ Create the connection pool
const pool = mysql.createPool({
  host: "localhost",
  user: "root",         // change this if your DB username is different
  password: "",         // add your DB password if any
  database: "meganet",  // your database name
  waitForConnections: true,
  dateStrings: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: '+00:00'
});

// ✅ Export for async/await usage
module.exports = pool;
