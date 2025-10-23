const pool = require("../services/db");
const path = require("path");
const fs = require("fs");

/**
 * 🟦 Get all FAQs or messages (supports search)
 */
exports.getAllFaqs = async (req, res) => {
  try {
    const search = req.query.search || "";
    console.log("🔍 [FAQ] Fetching FAQs with search:", search);

    const [rows] = await pool.query(
      `
      SELECT * FROM FAQ
      WHERE (question LIKE ? OR (question IS NULL OR question = ''))
      ORDER BY faq_id ASC
      `,
      [`%${search}%`]
    );

    console.log(`✅ [FAQ] Retrieved ${rows.length} records`);
    res.json(rows);
  } catch (err) {
    console.error("❌ [FAQ] Database error in getAllFaqs:", err);
    res.status(500).json({ message: "Database error", error: err.message });
  }
};

/**
 * 🟩 Add a new FAQ / message (with optional file)
 */
exports.addFaq = async (req, res) => {
  const { question, user_id, username } = req.body;
  const fileUrl = req.file ? `/uploads/${req.file.filename}` : null;

  console.log("🟩 [FAQ] Attempting to add new message:", { question, user_id, username, fileUrl });

  if ((!question || question.trim() === "") && !fileUrl) {
    return res.status(400).json({ message: "Message text or file required" });
  }

  if (!user_id || !username) {
    return res.status(400).json({ message: "Missing user information" });
  }

  try {
    const sql = `
      INSERT INTO FAQ (question, created_by_user_id, username, file_url, created_at)
      VALUES (?, ?, ?, ?, NOW())
    `;
    const [result] = await pool.query(sql, [question || null, user_id, username, fileUrl]);

    console.log("✅ [FAQ] Message inserted successfully, ID:", result.insertId);
    res.status(201).json({
      message: "Message added successfully!",
      faq_id: result.insertId,
      file_url: fileUrl,
    });
  } catch (err) {
    console.error("❌ [FAQ] Database insert error:", err.sqlMessage || err.message);
    res.status(500).json({ message: "Database error", error: err.message });
  }
};

/**
 * 🟨 Edit a message (supports new file)
 */
exports.updateFaq = async (req, res) => {
  const { id } = req.params;
  const { question, user_id, role_id } = req.body;
  const newFileUrl = req.file ? `/uploads/${req.file.filename}` : null;

  console.log("🟨 [FAQ] Edit request:", { id, question, user_id, role_id, newFileUrl });

  if (!user_id) {
    return res.status(400).json({ message: "Missing required user_id" });
  }

  try {
    const [existing] = await pool.query("SELECT * FROM FAQ WHERE faq_id = ?", [id]);
    if (existing.length === 0) return res.status(404).json({ message: "Message not found" });

    const message = existing[0];

    // 🔐 Authorization check
    if (message.created_by_user_id !== Number(user_id) && Number(role_id) !== 1) {
      console.warn("🚫 [FAQ] Unauthorized edit attempt by user:", user_id);
      return res.status(403).json({ message: "Not authorized to edit this message" });
    }

    // 🧹 If new file is uploaded, delete the old one
    if (newFileUrl && message.file_url) {
      const oldPath = path.join(__dirname, "../../", message.file_url);
      fs.unlink(oldPath, (err) => {
        if (err) console.warn("⚠️ [FAQ] Could not delete old file:", err.message);
        else console.log("🗑️ [FAQ] Old file deleted:", message.file_url);
      });
    }

    // 🧩 Prepare update SQL
    const sql = `
      UPDATE FAQ 
      SET question = ?, file_url = COALESCE(?, file_url), updated_on = NOW()
      WHERE faq_id = ?
    `;

    await pool.query(sql, [question || message.question, newFileUrl, id]);
    console.log("✅ [FAQ] Message updated successfully, ID:", id);

    res.json({ message: "Message updated successfully" });
  } catch (err) {
    console.error("❌ [FAQ] Database update error:", err.sqlMessage || err.message);
    res.status(500).json({ message: "Database error", error: err.message });
  }
};

/**
 * 🟥 Delete a message (only by owner or admin) and its file (if exists)
 */
exports.deleteFaq = async (req, res) => {
  const { id } = req.params;
  const { user_id, role_id } = req.body;

  console.log("🟥 [FAQ] Delete request:", { id, user_id, role_id });

  try {
    const [existing] = await pool.query("SELECT * FROM FAQ WHERE faq_id = ?", [id]);
    if (existing.length === 0) return res.status(404).json({ message: "Message not found" });

    const message = existing[0];

    if (message.created_by_user_id !== Number(user_id) && Number(role_id) !== 1) {
      console.warn("🚫 [FAQ] Unauthorized delete attempt by user:", user_id);
      return res.status(403).json({ message: "Not authorized to delete this message" });
    }

    // 🧹 Remove file if exists
    if (message.file_url) {
      const filePath = path.join(__dirname, "../../", message.file_url);
      fs.unlink(filePath, (err) => {
        if (err) console.warn("⚠️ [FAQ] Could not delete file:", err.message);
        else console.log("🗑️ [FAQ] File deleted:", message.file_url);
      });
    }

    await pool.query("DELETE FROM FAQ WHERE faq_id = ?", [id]);
    console.log("✅ [FAQ] Message deleted successfully, ID:", id);

    res.json({ message: "Message deleted successfully" });
  } catch (err) {
    console.error("❌ [FAQ] Database delete error:", err.sqlMessage || err.message);
    res.status(500).json({ message: "Database error", error: err.message });
  }
};
