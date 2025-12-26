const pool = require("../services/db");
const authPool = require("../services/authDb");
const path = require("path");
const fs = require("fs");

/**
 * 🟦 Get Leave Requests
 */
exports.getLeaves = async (req, res) => {
  const { user_id, role_id } = req.query;

  try {
    let sql = "SELECT * FROM LeaveRequest ORDER BY leave_date DESC";
    let params = [];

    // Intern & Part-timer → own records only
    if (![1,4].includes(Number(role_id))) {
      sql = "SELECT * FROM LeaveRequest WHERE user_id=? ORDER BY leave_date DESC";
      params = [user_id];
    }

    const [rows] = await pool.query(sql, params);
    res.json(rows);

  } catch (err) {
    console.error("❌ [Leave] Fetch error:", err);
    res.status(500).json({ message: "Database error" });
  }
};

/**
 * 🟩 Submit Leave
 */
exports.submitLeave = async (req, res) => {
  const { user_id, username, leave_date, leave_type, reason } = req.body;

  if (!user_id || !leave_date || !leave_type) {
    return res.status(400).json({ message: "Missing fields" });
  }

  try {
    await pool.query(`
      INSERT INTO LeaveRequest (user_id, leave_date, leave_type, reason)
      VALUES (?, ?, ?, ?)
    `, [user_id, leave_date, leave_type, reason]);

    await pool.query(`
      INSERT INTO LeaveAuditLog (user_id, action)
      VALUES (?, 'Submitted leave request')
    `, [user_id]);

    res.status(201).json({ message: "Leave submitted" });

  } catch (err) {
    console.error("❌ [Leave] Submit error:", err);
    res.status(500).json({ message: "Database error" });
  }
};

/**
 * 🟨 Approve / Reject Leave
 */
exports.updateLeaveStatus = async (req, res) => {
  const { leave_id } = req.params;
  const { status, user_id, role_id } = req.body;

  if (![1,4].includes(Number(role_id))) {
    return res.status(403).json({ message: "Not authorized" });
  }

  try {
    const [[leave]] = await pool.query(
      "SELECT * FROM LeaveRequest WHERE leave_id=?",
      [leave_id]
    );

    if (!leave) return res.status(404).json({ message: "Not found" });

    await pool.query(`
      UPDATE LeaveRequest
      SET status=?, approved_by=?, approved_at=NOW()
      WHERE leave_id=?
    `, [status, user_id, leave_id]);

    // Deduct leave
    if (status === "approved" && leave.leave_type === "Annual Leave") {
      await pool.query(`
        UPDATE LeaveBalance
        SET remaining_days = remaining_days - 1
        WHERE user_id=?
      `, [leave.user_id]);
    }

    await pool.query(`
      INSERT INTO LeaveAuditLog (user_id, action)
      VALUES (?, ?)
    `, [user_id, `${status} leave request`]);

    res.json({ message: `Leave ${status}` });

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

  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  try {
    await pool.query(`
      INSERT INTO LeaveDocument (leave_id, file_path)
      VALUES (?, ?)
    `, [leave_id, `/uploads/mc/${req.file.filename}`]);

    res.json({ message: "MC uploaded" });

  } catch (err) {
    console.error("❌ [Leave] MC upload error:", err);
    res.status(500).json({ message: "Database error" });
  }
};
