// controllers/profileController.js
const pool = require("../services/db");        // meganet DB
const authPool = require("../services/authDb"); // meganet_auth DB

/* =========================================================
   GET USER PROFILE (from meganet_auth)
   ========================================================= */
exports.getProfile = async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await authPool.query(
      `SELECT user_id, username, email, full_name, role_id, active, created_on
       FROM User
       WHERE user_id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json(rows[0]);
  } catch (err) {
    console.error("💥 [getProfile] Error:", err);
    res.status(500).json({ message: "Database error", error: err });
  }
};

/* =========================================================
   USER SOPs
   ========================================================= */
exports.getUserSOPs = async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await pool.query(
      `SELECT sop_id, title, status
       FROM SOP
       WHERE created_by_user_id = ?`,
      [id]
    );

    return res.json(rows);
  } catch (err) {
    console.error("💥 [getUserSOPs] Error:", err);
    res.status(500).json({ message: "Database error", error: err });
  }
};

/* =========================================================
   USER Chatbox Questions
   ========================================================= */
exports.getUserChatbox = async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await pool.query(
      `SELECT question_id, topic_id, question_text, answer_text, created_at
       FROM ChatboxQuestion
       WHERE created_by_user_id = ?`,
      [id]
    );

    return res.json(rows);
  } catch (err) {
    console.error("💥 [getUserChatbox] Error:", err);
    res.status(500).json({ message: "Database error", error: err });
  }
};

/* =========================================================
   USER FAQs
   ========================================================= */
exports.getUserFAQs = async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await pool.query(
      `SELECT faq_id, question, answer, created_at
       FROM FAQ
       WHERE created_by_user_id = ?`,
      [id]
    );

    return res.json(rows);
  } catch (err) {
    console.error("💥 [getUserFAQs] Error:", err);
    res.status(500).json({ message: "Database error", error: err });
  }
};
