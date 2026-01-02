const pool = require("../services/db");
const authPool = require("../services/authDb");
const path = require("path");
const fs = require("fs");
const nodemailer = require("nodemailer");

/**
 * 📧 Email Configuration
 */
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER, 
    pass: process.env.EMAIL_PASS  
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

    const [leaves] = await pool.query(sql, params);

    const [users] = await authPool.query("SELECT user_id, username FROM User");
    const userMap = {};
    users.forEach(u => userMap[u.user_id] = u.username);

    const result = leaves.map(leave => ({
      ...leave,
      username: userMap[leave.user_id] || `User #${leave.user_id}` 
    }));

    res.json(result);
  } catch (err) {
    console.error("❌ Fetch error:", err);
    res.status(500).json({ message: "Database error" });
  }
};

/**
 * 🟩 Submit Leave (Updated to accept and store days_count)
 */
exports.submitLeave = async (req, res) => {
  // Added days_count to destructuring
  const { user_id, username, leave_date, end_date, leave_type, reason, days_count } = req.body;

  try {
    // We calculate a fallback diff only if days_count wasn't provided by frontend
    const start = new Date(leave_date);
    const end = new Date(end_date);
    const fallbackDiff = Math.round(Math.abs(end - start) / (1000 * 60 * 60 * 24)) + 1;
    const finalDaysCount = days_count !== undefined ? days_count : fallbackDiff;

    const [result] = await pool.query(`
      INSERT INTO LeaveRequest (user_id, leave_date, end_date, leave_type, reason, days_count)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [user_id, leave_date, end_date, leave_type, reason, finalDaysCount]);
    
    if (req.file) {
      await pool.query(`INSERT INTO LeaveDocument (leave_id, file_path) VALUES (?, ?)`, 
      [result.insertId, `/uploads/mc/${req.file.filename}`]);
    }

    res.status(201).json({ message: "Leave submitted", days: finalDaysCount });
  } catch (err) {
    console.error("❌ Submit error:", err);
    res.status(500).json({ message: "Database error" });
  }
};

/**
 * 🟨 Update Status (Updated to deduct specific days_count)
 */
exports.updateLeaveStatus = async (req, res) => {
  const { leave_id } = req.params;
  const { status, user_id, role_id } = req.body;

  if (![1, 4].includes(Number(role_id))) {
    return res.status(403).json({ message: "Not authorized" });
  }

  try {
    const [[leave]] = await pool.query(
      "SELECT * FROM LeaveRequest WHERE leave_id=?",
      [leave_id]
    );

    if (!leave) {
      return res.status(404).json({ message: "Not found" });
    }

    const [[applicant]] = await authPool.query(
      "SELECT email, username FROM User WHERE user_id=?",
      [leave.user_id]
    );

    await pool.query(`
      UPDATE LeaveRequest
      SET status=?, approved_by=?, approved_at=NOW()
      WHERE leave_id=?
    `, [status, user_id, leave_id]);

    if (status === "approved" && leave.leave_type === "Annual Leave") {
        // FIX: Instead of recalculating from dates (which ignores 0.5), 
        // we use the days_count column from the database.
        const daysToDeduct = parseFloat(leave.days_count || 1.0);

        await pool.query(`
            UPDATE LeaveBalance
            SET remaining_days = remaining_days - ?,
                used_days = used_days + ?
            WHERE user_id=?
        `, [daysToDeduct, daysToDeduct, leave.user_id]);
    }

    const notifMessage = `Your ${leave.leave_type} request for ${new Date(leave.leave_date).toLocaleDateString()} has been ${status}.`;
    await pool.query(`
      INSERT INTO Notification (user_id, message, type)
      VALUES (?, ?, 'leave_status')
    `, [leave.user_id, notifMessage]);

    if (applicant && applicant.email) {
      const mailOptions = {
        from: '"MegaNet HR System" <your-email@gmail.com>',
        to: applicant.email,
        subject: `Leave Request Update: ${status.toUpperCase()}`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
            <h2 style="color: ${status === 'approved' ? '#28a745' : '#dc3545'}; text-align: center;">Leave ${status.toUpperCase()}</h2>
            <p>Hi <strong>${applicant.username}</strong>,</p>
            <p>Your leave request has been processed:</p>
            <table style="width: 100%; background: #f9f9f9; padding: 10px; border-radius: 5px;">
              <tr><td><strong>Date:</strong></td><td>${new Date(leave.leave_date).toLocaleDateString()}</td></tr>
              <tr><td><strong>Type:</strong></td><td>${leave.leave_type}</td></tr>
              <tr><td><strong>Days:</strong></td><td>${leave.days_count}</td></tr>
              <tr><td><strong>Status:</strong></td><td><span style="font-weight: bold; color: ${status === 'approved' ? '#28a745' : '#dc3545'};">${status.toUpperCase()}</span></td></tr>
            </table>
            <p>Please log in to your dashboard to view updated balances.</p>
          </div>
        `
      };

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) console.error("Email error:", error);
      });
    }

    await pool.query(`
      INSERT INTO LeaveAuditLog (user_id, action)
      VALUES (?, ?)
    `, [user_id, `${status} leave request ${leave_id}`]);

    res.json({ message: `Leave ${status} and user notified.` });

  } catch (err) {
    console.error("❌ Approval error:", err);
    res.status(500).json({ message: "Database error" });
  }
};

/**
 * 🟦 Upload MC Document
 */
exports.uploadMC = async (req, res) => {
  const { leave_id } = req.params;
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });

  try {
    const filePath = `/uploads/mc/${req.file.filename}`;
    await pool.query(`
      INSERT INTO LeaveDocument (leave_id, file_path)
      VALUES (?, ?)
    `, [leave_id, filePath]);
    res.json({ message: "MC uploaded", path: filePath });
  } catch (err) {
    res.status(500).json({ message: "Database error" });
  }
};