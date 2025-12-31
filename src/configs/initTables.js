const pool = require("../services/db");
const authPool = require("../services/authDb"); // Required to bridge the two databases

(async () => {
  try {
    console.log("🔧 Starting MAIN database setup (meganet)...");

    const [db] = await pool.query("SELECT DATABASE() AS db");
    console.log("🔹 Connected to database:", db[0].db);

    // ----------------------------
    // Department Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS Department (
        department_id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT
      );
    `);
    console.log("✅ Table 'Department' created");

    // ----------------------------
    // FAQ Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS FAQ (
        faq_id INT AUTO_INCREMENT PRIMARY KEY,
        question TEXT,
        answer TEXT,
        username VARCHAR(100),
        created_by_user_id INT,
        file_url VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        tags VARCHAR(255),
        is_published BOOLEAN DEFAULT FALSE
      );
    `);
    console.log("✅ Table 'FAQ' created");

    // ----------------------------
    // SOP Category Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS SOPCategory (
        category_id INT AUTO_INCREMENT PRIMARY KEY,
        category_name VARCHAR(255) NOT NULL UNIQUE,
        created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✅ Table 'SOPCategory' created");

    // ----------------------------
    // SOP Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS SOP (
        sop_id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255),
        content LONGTEXT,
        version VARCHAR(20),
        effective_date DATE,
        created_by_user_id INT,
        status ENUM('draft','published','archived') DEFAULT 'draft',
        department_id INT,
        category_id INT
      );
    `);
    console.log("✅ Table 'SOP' created");

    // ----------------------------
    // Procedure Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS Procedure_ (
        procedure_id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255),
        type ENUM('onboarding','offboarding','other'),
        steps_json JSON,
        created_by_user_id INT,
        version VARCHAR(20),
        status ENUM('draft','published','archived') DEFAULT 'draft',
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `);
    console.log("✅ Table 'Procedure_' created");

    // ----------------------------
    // Project Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS Project (
        project_id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255),
        short_description TEXT,
        repo_link VARCHAR(255),
        docs_link VARCHAR(255),
        owner_user_id INT,
        status ENUM('active','archived','planning') DEFAULT 'active',
        tags VARCHAR(255)
      );
    `);
    console.log("✅ Table 'Project' created");

    // ----------------------------
    // Project Link Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ProjectLink (
        id INT AUTO_INCREMENT PRIMARY KEY,
        project_id INT,
        display_name VARCHAR(255),
        location_type ENUM('repo','drive','wiki','url'),
        url VARCHAR(255),
        notes TEXT
      );
    `);
    console.log("✅ Table 'ProjectLink' created");

    // ----------------------------
    // SOP Audit Log Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS SOP_Audit_Log (
        audit_id INT AUTO_INCREMENT PRIMARY KEY,
        sop_id INT,
        changed_by_user_id INT,
        change_summary TEXT,
        changed_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✅ Table 'SOP_Audit_Log' created");

    // ----------------------------
    // Procedure Instance Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS Procedure_Instance (
        instance_id INT AUTO_INCREMENT PRIMARY KEY,
        procedure_id INT,
        subject_user_id INT,
        started_by_user_id INT,
        started_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_on TIMESTAMP NULL,
        status ENUM('in_progress','completed','cancelled') DEFAULT 'in_progress',
        step_status_json JSON
      );
    `);
    console.log("✅ Table 'Procedure_Instance' created");

    // ----------------------------
    // Attachment Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS Attachment (
        attachment_id INT AUTO_INCREMENT PRIMARY KEY,
        parent_type ENUM('faq','sop','procedure_instance','project','leave'),
        parent_id INT,
        filename VARCHAR(255),
        storage_path VARCHAR(255),
        uploaded_by_user_id INT,
        uploaded_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✅ Table 'Attachment' created");

    // ----------------------------
    // Comment Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS Comment (
        comment_id INT AUTO_INCREMENT PRIMARY KEY,
        parent_type ENUM('sop','faq','project','procedure_instance','leave'),
        parent_id INT,
        user_id INT,
        content TEXT,
        created_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✅ Table 'Comment' created");

    // ----------------------------
    // Access Log Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS Access_Log (
        access_id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        action ENUM('view','edit','delete'),
        resource_type VARCHAR(50),
        resource_id INT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ip_address VARCHAR(50)
      );
    `);
    console.log("✅ Table 'Access_Log' created");

    // ----------------------------
    // ChatboxTopic Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ChatboxTopic (
        topic_id INT AUTO_INCREMENT PRIMARY KEY,
        topic_name VARCHAR(255) NOT NULL UNIQUE,
        created_by_user_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✅ Table 'ChatboxTopic' created");

    // ----------------------------
    // ChatboxQuestion Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ChatboxQuestion (
        question_id INT AUTO_INCREMENT PRIMARY KEY,
        topic_id INT NOT NULL,
        question_text TEXT NOT NULL,
        answer_text LONGTEXT,
        created_by_user_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `);
    console.log("✅ Table 'ChatboxQuestion' created");

    // ----------------------------
    // ChatboxFlowStep Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ChatboxFlowStep (
        step_id INT AUTO_INCREMENT PRIMARY KEY,
        question_id INT NOT NULL,
        step_text TEXT NOT NULL,
        yes_next_step INT DEFAULT NULL,
        no_next_step INT DEFAULT NULL,
        is_final BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (question_id) REFERENCES ChatboxQuestion(question_id)
      );
    `);
    console.log("✅ Table 'ChatboxFlowStep' created");

    // ----------------------------
    // LEAVE MANAGEMENT TABLES
    // ----------------------------
    await pool.query(`
      CREATE TABLE IF NOT EXISTS LeaveRequest (
        leave_id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        leave_date DATE NOT NULL,
        end_date DATE NOT NULL,
        leave_type VARCHAR(100) NOT NULL,
        reason TEXT,
        status ENUM('pending','approved','rejected') DEFAULT 'pending',
        approved_by INT,
        approved_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✅ Table 'LeaveRequest' created");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS LeaveBalance (
        user_id INT PRIMARY KEY,
        total_days INT DEFAULT 21,
        used_days INT DEFAULT 0,
        remaining_days INT DEFAULT 21
      );
    `);
    console.log("✅ Table 'LeaveBalance' created");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS LeaveAuditLog (
        audit_id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        action VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✅ Table 'LeaveAuditLog' created");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS LeaveDocument (
        doc_id INT AUTO_INCREMENT PRIMARY KEY,
        leave_id INT NOT NULL,
        file_path VARCHAR(255),
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✅ Table 'LeaveDocument' created");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS Notification (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        type VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✅ Table 'Notification' created");

    // ----------------------------
    // 🚀 INITIALIZE LEAVE BALANCES (Fetching from Auth DB)
    // ----------------------------
    console.log("⏳ Initializing Leave Balances for existing users from Auth DB...");
    
    try {
      // 1. Fetch user IDs from the 'User' table in meganet_auth
      const [users] = await authPool.query("SELECT user_id FROM User");

      if (users.length > 0) {
        console.log(`🔹 Found ${users.length} users. Checking for missing balance records...`);
        for (const user of users) {
          // 2. Insert into the LeaveBalance table in meganet
          await pool.query(`
            INSERT IGNORE INTO LeaveBalance (user_id, total_days, used_days, remaining_days)
            VALUES (?, 21, 0, 21)
          `, [user.user_id]);
        }
        console.log(`✅ Balance initialization/sync complete.`);
      } else {
        console.log("ℹ️ No users found in Auth DB.");
      }
    } catch (err) {
      console.warn("⚠️ Could not sync balances. Check if 'User' table exists in Auth DB:", err.message);
    }

    console.log("🎉 All MAIN + Leave tables and balances ready!");
    process.exit(0);

  } catch (err) {
    console.error("❌ Error during database setup:", err);
    process.exit(1);
  }
})();