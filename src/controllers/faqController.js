// src/controllers/faqController.js
const pool = require("../services/db");

/**
 * 🟦 Get all FAQs or messages (supports search)
 */
exports.getAllFaqs = async (req, res) => {
  try {
    const search = req.query.search || "";
    console.log("🔍 [FAQ] Fetching FAQs with search:", search);

    const [rows] = await pool.query(
      "SELECT * FROM FAQ WHERE question LIKE ? ORDER BY faq_id DESC",
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
 * 🟩 Add a new FAQ / message
 */
exports.addFaq = async (req, res) => {
  const { question, user_id, username } = req.body;

  console.log("🟩 [FAQ] Attempting to add new message:", { question, user_id, username });

  if (!question || !user_id || !username) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    const sql = `
      INSERT INTO FAQ (question, created_by_user_id, username, created_at)
      VALUES (?, ?, ?, NOW())
    `;
    const [result] = await pool.query(sql, [question, user_id, username]);

    console.log("✅ [FAQ] Message inserted successfully, ID:", result.insertId);
    res.status(201).json({ message: "Message added successfully!", faq_id: result.insertId });
  } catch (err) {
    console.error("❌ [FAQ] Database insert error:", err.sqlMessage || err.message);
    res.status(500).json({ message: "Database error", error: err.message });
  }
};


/**
 * 🟨 Edit a message (only by owner or admin)
 */
exports.updateFaq = async (req, res) => {
  const { id } = req.params;
  const { question, user_id, role_id } = req.body;

  console.log("🟨 [FAQ] Edit request:", { id, question, user_id, role_id });

  if (!question || !user_id) {
    console.warn("⚠️ [FAQ] Missing required fields for update");
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    const [existing] = await pool.query("SELECT * FROM FAQ WHERE faq_id = ?", [id]);

    if (existing.length === 0) {
      console.warn("⚠️ [FAQ] Message not found for ID:", id);
      return res.status(404).json({ message: "Message not found" });
    }

    const message = existing[0];

    if (message.created_by_user_id !== user_id && role_id !== 1) {
      console.warn("🚫 [FAQ] Unauthorized edit attempt by user:", user_id);
      return res.status(403).json({ message: "Not authorized to edit this message" });
    }

    await pool.query("UPDATE FAQ SET question = ? WHERE faq_id = ?", [question, id]);
    console.log("✅ [FAQ] Message updated successfully, ID:", id);

    res.json({ message: "Message updated successfully" });
  } catch (err) {
    console.error("❌ [FAQ] Database update error:", err.sqlMessage || err.message);
    res.status(500).json({ message: "Database error", error: err.message });
  }
};

/**
 * 🟥 Delete a message (only by owner or admin)
 */
exports.deleteFaq = async (req, res) => {
  const { id } = req.params;
  const { user_id, role_id } = req.body;

  console.log("🟥 [FAQ] Delete request:", { id, user_id, role_id });

  try {
    const [existing] = await pool.query("SELECT * FROM FAQ WHERE faq_id = ?", [id]);

    if (existing.length === 0) {
      console.warn("⚠️ [FAQ] Message not found for delete:", id);
      return res.status(404).json({ message: "Message not found" });
    }

    const message = existing[0];

    if (message.created_by_user_id !== user_id && role_id !== 1) {
      console.warn("🚫 [FAQ] Unauthorized delete attempt by user:", user_id);
      return res.status(403).json({ message: "Not authorized to delete this message" });
    }

    await pool.query("DELETE FROM FAQ WHERE faq_id = ?", [id]);
    console.log("✅ [FAQ] Message deleted successfully, ID:", id);

    res.json({ message: "Message deleted successfully" });
  } catch (err) {
    console.error("❌ [FAQ] Database delete error:", err.sqlMessage || err.message);
    res.status(500).json({ message: "Database error", error: err.message });
  }
};
