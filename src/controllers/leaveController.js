const pool = require("../services/db");
const authPool = require("../services/authDb");
const path = require("path");
const fs = require("fs");
const nodemailer = require("nodemailer");

/**
 * 📧 Email Configuration
 * Use your Gmail and the 16-character App Password generated from Google Account
 */
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER, // Pulls from .env
    pass: process.env.EMAIL_PASS  // Pulls from .env
  }
});

/**
 * 🟦 Get Leave Requests
 */
exports.getLeaves = async (req, res) => {
  const { user_id, role_id } = req.query;

  try {
    let sql = `
      SELECT l.*, d.file_path 
      FROM LeaveRequest l
      LEFT JOIN LeaveDocument d ON l.leave_id = d.leave_id
      ORDER BY l.leave_date DESC
    `;
    let params = [];

    // Intern & Part-timer (Role 2, 3 etc) → own records only
    // Admin (1) and Full-timer (4) can see more, but let's keep strict admin view
    if (!["1", "4"].includes(String(role_id))) {
      sql = `
        SELECT l.*, d.file_path 
        FROM LeaveRequest l
        LEFT JOIN LeaveDocument d ON l.leave_id = d.leave_id
        WHERE l.user_id=? 
        ORDER BY l.leave_date DESC
      `;
      params = [user_id];
    }

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error("❌ Fetch error:", err);
    res.status(500).json({ message: "Database error" });
  }
};

/**
 * 🟩 Submit Leave
 */
exports.submitLeave = async (req, res) => {
  const { user_id, username, leave_date, leave_type, reason } = req.body;
  console.log(`[Leave] Submission attempt by user: ${user_id} (${username}) for date: ${leave_date}`);

  if (!user_id || !leave_date || !leave_type) {
    console.warn("⚠️ [Leave] Submission rejected: Missing required fields", req.body);
    return res.status(400).json({ message: "Missing fields" });
  }

  try {
    console.log("[Leave] Inserting into LeaveRequest table...");
    const [result] = await pool.query(`
      INSERT INTO LeaveRequest (user_id, leave_date, leave_type, reason)
      VALUES (?, ?, ?, ?)
    `, [user_id, leave_date, leave_type, reason]);
    
    console.log(`[Leave] Request inserted. ID: ${result.insertId}`);

    console.log("[Leave] Recording audit log...");
    await pool.query(`
      INSERT INTO LeaveAuditLog (user_id, action)
      VALUES (?, 'Submitted leave request')
    `, [user_id]);

    res.status(201).json({ message: "Leave submitted", leave_id: result.insertId });

  } catch (err) {
    console.error("❌ [Leave] Submit error:", { message: err.message, sql: err.sql });
    res.status(500).json({ message: "Database error" });
  }
};

/**
 * 🟨 Approve / Reject Leave with Notifications
 */
exports.updateLeaveStatus = async (req, res) => {
  const { leave_id } = req.params;
  const { status, user_id, role_id } = req.body; // user_id here is the ADMIN/MANAGER

  console.log(`[Leave] Status update: ID ${leave_id} to '${status}' by admin_id ${user_id}`);

  if (![1, 4].includes(Number(role_id))) {
    console.warn(`[Leave] Unauthorized update attempt by role_id: ${role_id}`);
    return res.status(403).json({ message: "Not authorized" });
  }

  try {
    // 1. Get the leave record to find who the applicant is
    const [[leave]] = await pool.query(
      "SELECT * FROM LeaveRequest WHERE leave_id=?",
      [leave_id]
    );

    if (!leave) {
      console.warn(`[Leave] Leave ID ${leave_id} not found.`);
      return res.status(404).json({ message: "Not found" });
    }

    // 2. 🚀 Fetch applicant's email and name dynamically from the AUTH database
    const [[applicant]] = await authPool.query(
      "SELECT email, username FROM User WHERE user_id=?",
      [leave.user_id]
    );

    // 3. Update status in database
    await pool.query(`
      UPDATE LeaveRequest
      SET status=?, approved_by=?, approved_at=NOW()
      WHERE leave_id=?
    `, [status, user_id, leave_id]);

    // 4. Deduct leave balance if approved
    if (status === "approved" && leave.leave_type === "Annual Leave") {
      await pool.query(`
        UPDATE LeaveBalance
        SET remaining_days = remaining_days - 1
        WHERE user_id=?
      `, [leave.user_id]);
    }

    // 5. Save In-App Notification
    const notifMessage = `Your ${leave.leave_type} request for ${new Date(leave.leave_date).toLocaleDateString()} has been ${status}.`;
    await pool.query(`
      INSERT INTO Notification (user_id, message, type)
      VALUES (?, ?, 'leave_status')
    `, [leave.user_id, notifMessage]);

    // 6. 📧 Send Email Notification using the fetched email
    if (applicant && applicant.email) {
      const mailOptions = {
        from: '"MegaNet HR System" <your-email@gmail.com>', // System sender email
        to: applicant.email, // Dynamic recipient from Auth Database
        subject: `Leave Request Update: ${status.toUpperCase()}`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
            <h2 style="color: ${status === 'approved' ? '#28a745' : '#dc3545'}; text-align: center;">Leave ${status.toUpperCase()}</h2>
            <p>Hi <strong>${applicant.username}</strong>,</p>
            <p>Your leave request has been processed by the administrator:</p>
            <table style="width: 100%; background: #f9f9f9; padding: 10px; border-radius: 5px;">
              <tr><td><strong>Date:</strong></td><td>${new Date(leave.leave_date).toLocaleDateString()}</td></tr>
              <tr><td><strong>Type:</strong></td><td>${leave.leave_type}</td></tr>
              <tr><td><strong>Status:</strong></td><td><span style="font-weight: bold; color: ${status === 'approved' ? '#28a745' : '#dc3545'};">${status.toUpperCase()}</span></td></tr>
            </table>
            <p>Please log in to your dashboard to view updated balances.</p>
            <hr style="border: 0; border-top: 1px solid #eee;">
            <small style="color: #888;">This is an automated message from MegaNet HR Portal. Please do not reply.</small>
          </div>
        `
      };

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error("[Leave] Email failed to send to " + applicant.email + ":", error);
        } else {
          console.log("[Leave] Email sent successfully to: " + applicant.email);
        }
      });
    }

    // 7. Log to Audit
    await pool.query(`
      INSERT INTO LeaveAuditLog (user_id, action)
      VALUES (?, ?)
    `, [user_id, `${status} leave request ${leave_id}`]);

    res.json({ message: `Leave ${status} and user notified.` });

  } catch (err) {
    console.error("❌ [Leave] Approval error:", err);
    res.status(500).json({ message: "Database error" });
  }
};

/**
 * 🟦 Upload MC Document
 */
exports.uploadMC = async (req, res) => {
  const { leave_id } = req.params;
  
  console.log(`[Leave] Uploading MC for leave_id: ${leave_id}`);

  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  try {
    const filePath = `/uploads/mc/${req.file.filename}`;
    await pool.query(`
      INSERT INTO LeaveDocument (leave_id, file_path)
      VALUES (?, ?)
    `, [leave_id, filePath]);

    res.json({ message: "MC uploaded", path: filePath });

  } catch (err) {
    console.error("❌ [Leave] MC upload error:", err);
    res.status(500).json({ message: "Database error" });
  }
};