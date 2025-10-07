// src/configs/initTables.js
require('dotenv').config();
const mysql = require('mysql2/promise');

async function run() {
  const host = process.env.DB_HOST || '127.0.0.1';
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';
  const port = process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306;
  const dbName = process.env.DB_NAME || 'meganet';

  try {
    // connect without database to create DB if needed
    const conn = await mysql.createConnection({ host, user, password, port, multipleStatements: true });
    console.log('Connected to MySQL server — creating database (if not exists)...');
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;`);
    await conn.query(`USE \`${dbName}\`;`);

    // create tables (simple schema)
    const createQueries = [
`CREATE TABLE IF NOT EXISTS Role (
  role_id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(50) NOT NULL,
  description TEXT
);`,
`CREATE TABLE IF NOT EXISTS Department (
  department_id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100),
  description TEXT
);`,
`CREATE TABLE IF NOT EXISTS User (
  user_id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(100) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE,
  full_name VARCHAR(255),
  password VARCHAR(255),
  role_id INT,
  department_id INT,
  created_on DATETIME DEFAULT CURRENT_TIMESTAMP,
  active BOOLEAN DEFAULT TRUE,
  FOREIGN KEY (role_id) REFERENCES Role(role_id),
  FOREIGN KEY (department_id) REFERENCES Department(department_id)
);`,
`CREATE TABLE IF NOT EXISTS Project (
  project_id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255),
  short_description TEXT,
  repo_link VARCHAR(500),
  docs_link VARCHAR(500),
  owner_user_id INT,
  status VARCHAR(50) DEFAULT 'active',
  tags VARCHAR(255),
  FOREIGN KEY (owner_user_id) REFERENCES User(user_id)
);`,
`CREATE TABLE IF NOT EXISTS ProjectLink (
  id INT PRIMARY KEY AUTO_INCREMENT,
  project_id INT,
  display_name VARCHAR(255),
  location_type VARCHAR(50),
  url VARCHAR(1000),
  notes TEXT,
  FOREIGN KEY (project_id) REFERENCES Project(project_id)
);`,
`CREATE TABLE IF NOT EXISTS FAQ (
  faq_id INT PRIMARY KEY AUTO_INCREMENT,
  question TEXT,
  answer LONGTEXT,
  category VARCHAR(100),
  created_by_user_id INT,
  updated_on DATETIME,
  tags VARCHAR(255),
  is_published BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (created_by_user_id) REFERENCES User(user_id)
);`,
`CREATE TABLE IF NOT EXISTS SOP (
  sop_id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255),
  content LONGTEXT,
  version VARCHAR(50),
  effective_date DATE,
  created_by_user_id INT,
  status VARCHAR(50),
  department_id INT,
  FOREIGN KEY (created_by_user_id) REFERENCES User(user_id),
  FOREIGN KEY (department_id) REFERENCES Department(department_id)
);`,
`CREATE TABLE IF NOT EXISTS ProcedureTemplate (
  procedure_id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255),
  type VARCHAR(50),
  steps_json JSON,
  created_by_user_id INT,
  version VARCHAR(50),
  status VARCHAR(50),
  last_updated DATETIME,
  FOREIGN KEY (created_by_user_id) REFERENCES User(user_id)
);`,
`CREATE TABLE IF NOT EXISTS Procedure_Instance (
  instance_id INT PRIMARY KEY AUTO_INCREMENT,
  procedure_id INT,
  subject_user_id INT,
  started_by_user_id INT,
  started_on DATETIME,
  completed_on DATETIME,
  status VARCHAR(50),
  step_status_json JSON,
  FOREIGN KEY (procedure_id) REFERENCES ProcedureTemplate(procedure_id),
  FOREIGN KEY (subject_user_id) REFERENCES User(user_id),
  FOREIGN KEY (started_by_user_id) REFERENCES User(user_id)
);`,
`CREATE TABLE IF NOT EXISTS Attachment (
  attachment_id INT PRIMARY KEY AUTO_INCREMENT,
  parent_type VARCHAR(100),
  parent_id INT,
  filename VARCHAR(255),
  storage_path VARCHAR(1000),
  uploaded_by_user_id INT,
  uploaded_on DATETIME,
  FOREIGN KEY (uploaded_by_user_id) REFERENCES User(user_id)
);`,
`CREATE TABLE IF NOT EXISTS Comment (
  comment_id INT PRIMARY KEY AUTO_INCREMENT,
  parent_type VARCHAR(100),
  parent_id INT,
  user_id INT,
  content TEXT,
  created_on DATETIME,
  FOREIGN KEY (user_id) REFERENCES User(user_id)
);`,
`CREATE TABLE IF NOT EXISTS SOP_Audit_Log (
  audit_id INT PRIMARY KEY AUTO_INCREMENT,
  sop_id INT,
  changed_by_user_id INT,
  change_summary TEXT,
  changed_on DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sop_id) REFERENCES SOP(sop_id),
  FOREIGN KEY (changed_by_user_id) REFERENCES User(user_id)
);`,
`CREATE TABLE IF NOT EXISTS Access_Log (
  access_id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT,
  action VARCHAR(50),
  resource_type VARCHAR(100),
  resource_id INT,
  timestamp DATETIME,
  ip_address VARCHAR(100),
  FOREIGN KEY (user_id) REFERENCES User(user_id)
);`
    ];

    for (const q of createQueries) {
      await conn.query(q);
    }
    console.log('✅ Database and tables created (or already exist).');

    // seed: roles, department and admin user (password left NULL - dev fallback)
    await conn.query(`INSERT IGNORE INTO Role (role_id, name, description) VALUES
      (1,'Admin','Full admin'),
      (2,'Supervisor','Supervisor'),
      (3,'Intern','Intern'),
      (4,'Auditor','Auditor');`);
    await conn.query(`INSERT IGNORE INTO Department (department_id, name, description) VALUES
      (1,'IT','IT Dept'),
      (2,'Admin','Admin Dept'),
      (3,'Network','Network Dept');`);
    // create a dev admin user if not exists (no password hash so dev password 'password' will work with scaffold fallback)
    await conn.query(`INSERT IGNORE INTO User (user_id, username, email, full_name, password, role_id, department_id, active)
      VALUES (1,'admin','admin@example.com','Admin User', NULL, 1, 1, 1);`);
    console.log('✅ Seeded base roles, departments and admin (username=admin password=password dev fallback).');

    await conn.end();
    process.exit(0);
  } catch (err) {
    console.error('Error creating tables:', err);
    process.exit(1);
  }
}

run();
