const authPool = require("../services/authDb");
const bcrypt = require("bcrypt");

(async () => {
  try {
    console.log("🔧 Starting AUTH database setup (meganet_auth)...");

    // ✅ Verify connection
    const [db] = await authPool.query("SELECT DATABASE() AS db");
    console.log("🔹 Connected to database:", db[0].db);

    // ----------------------------
    // Role Table
    await authPool.query(`
      CREATE TABLE IF NOT EXISTS Role (
        role_id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(50) NOT NULL UNIQUE,
        description TEXT
      );
    `);
    console.log("✅ Table 'Role' created");

    // Default roles
    await authPool.query(`
      INSERT IGNORE INTO Role (role_id, name, description) VALUES
      (1, 'Admin', 'System administrator with full access'),
      (2, 'Intern', 'Limited access user role'),
      (3, 'Part-timer', 'Part-time employee role'),
      (4, 'Full-timer', 'Full-time employee role');
    `);
    console.log("✅ Default roles inserted");

    // ----------------------------
    // User Table
    await authPool.query(`
      CREATE TABLE IF NOT EXISTS User (
        user_id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        email VARCHAR(255) NOT NULL UNIQUE,
        full_name VARCHAR(255),
        password VARCHAR(255),
        role_id INT DEFAULT 2,
        created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        active BOOLEAN DEFAULT TRUE,
        FOREIGN KEY (role_id) REFERENCES Role(role_id)
      );
    `);
    console.log("✅ Table 'User' created with Role relationship");

    // ----------------------------
    // Always ensure admin exists with correct bcrypt hash
    const plainPassword = "123";
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    // Delete any existing admin with same email to avoid mismatch
    await authPool.query(
      `DELETE FROM User WHERE email = ?`,
      ["nainglinhtet.2005@gmail.com"]
    );

    // Insert fresh admin
    await authPool.query(`
      INSERT INTO User (username, email, full_name, password, role_id, active)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      "admin",
      "nainglinhtet.2005@gmail.com",
      "Naing Lin Htet",
      hashedPassword,
      1, // Admin role
      true
    ]);

    console.log("✅ Default admin user inserted (email: nainglinhtet.2005@gmail.com | password: 123)");
    console.log("🎉 Auth DB setup complete! (User & Role ready)");

    process.exit(0);

  } catch (err) {
    console.error("❌ Error creating AUTH tables:", err);
    process.exit(1);
  }
})();
