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
    // Ensure default users exist with correct bcrypt hash
    const plainPassword = "123";
    const hashedPassword = await bcrypt.hash(plainPassword, 10);
    const defaultPassword = "Meganet@6688";
    const hashedDefaultPassword = await bcrypt.hash(defaultPassword, 10);

    // Array of default users to create/update
    const defaultUsers = [
      {
        username: "admin",
        email: "admin@meganet.com.sg",
        full_name: "System Administrator",
        password: hashedDefaultPassword,
        role_id: 1,
        active: true
      },{
        username: "Intern",
        email: "intern@meganet.com.sg",
        full_name: "Intern User",
        password: hashedDefaultPassword,
        role_id: 2,
        active: true
      },
      {
        username: "Part-timer",
        email: "parttimer@meganet.com.sg",
        full_name: "Part-time User",
        password: hashedDefaultPassword,
        role_id: 3,
        active: true
      },
      {
        username: "Full-timer",
        email: "fulltimer@meganet.com.sg",
        full_name: "Full-time User",
        password: hashedDefaultPassword,
        role_id: 4,
        active: true
      },
      {
        username: "nainglinhtet",
        email: "nainglinhtet.2005@gmail.com",
        full_name: "Naing Lin Htet",
        password: hashedPassword,
        role_id: 1,
        active: true
      }
    ];

    // Insert or update default users (avoid deleting to preserve foreign key relationships)
    for (const user of defaultUsers) {
      await authPool.query(`
        INSERT INTO User (username, email, full_name, password, role_id, active)
        VALUES (?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          password = VALUES(password),
          role_id = VALUES(role_id),
          active = VALUES(active)
      `, [
        user.username,
        user.email,
        user.full_name,
        user.password,
        user.role_id,
        user.active
      ]);
      console.log(`✅ Default user inserted/updated (email: ${user.email} | password: 123)`);
    }

    console.log("🎉 Auth DB setup complete! (User & Role ready)");

    process.exit(0);

  } catch (err) {
    console.error("❌ Error creating AUTH tables:", err);
    process.exit(1);
  }
})();
