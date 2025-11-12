// controllers/chatboxController.js
const pool = require("../services/db");           // For main database (meganet)
const authPool = require("../services/authDb");   // For auth database (meganet_auth)

const authDbName = process.env.AUTH_DB_NAME || "meganet_auth";

/* =========================================================
   SIMPLE ADMIN GATE
   ========================================================= */
function isAdmin(role_id) {
  return String(role_id) === "1";
}

/* =========================================================
   TOPICS
   ========================================================= */
exports.getTopics = async (req, res) => {
  console.log("🔹 [getTopics] Request received");
  try {
    // ✅ Fetch topics from main DB
    const [topics] = await pool.query(`
      SELECT 
        t.topic_id,
        t.topic_name,
        t.created_by_user_id,
        t.created_at
      FROM ChatboxTopic t
      ORDER BY t.created_at DESC
    `);

    // ✅ Fetch usernames from auth DB
    for (let topic of topics) {
      const [userRows] = await authPool.query(
        `SELECT username FROM User WHERE user_id = ?`,
        [topic.created_by_user_id]
      );
      topic.username = userRows.length ? userRows[0].username : "Unknown";
    }

    console.log(`✅ [getTopics] Retrieved ${topics.length} topics`);
    res.status(200).json(topics);
  } catch (err) {
    console.error("❌ [getTopics] Database error:", err);
    res.status(500).json({ message: "Database error", error: err });
  }
};

exports.createTopic = async (req, res) => {
  console.log("🔹 [createTopic] Request body:", req.body);
  try {
    const { topic_name, user_id, role_id } = req.body || {};

    if (!isAdmin(role_id)) {
      console.warn("🚫 [createTopic] Forbidden — user not admin:", role_id);
      return res.status(403).json({ message: "Forbidden: admin only" });
    }

    if (!topic_name || !user_id) {
      console.warn("⚠️ [createTopic] Missing fields:", { topic_name, user_id });
      return res.status(400).json({ message: "Missing fields" });
    }

    const [result] = await pool.query(
      `
      INSERT INTO ChatboxTopic (topic_name, created_by_user_id, created_at)
      VALUES (?, ?, NOW())
      `,
      [topic_name.trim(), user_id]
    );

    console.log("✅ [createTopic] Insert successful, ID:", result.insertId);

    return res.status(201).json({
      message: "Topic created successfully",
      topic_id: result.insertId,
    });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      console.warn("⚠️ [createTopic] Duplicate topic:", err.sqlMessage);
      return res.status(400).json({ message: "Topic already exists" });
    }
    console.error("❌ [createTopic] DB error:", err);
    res.status(500).json({ message: "Database error", error: err });
  }
};

exports.deleteTopic = async (req, res) => {
  console.log("🔹 [deleteTopic] Request params:", req.params, "Body:", req.body);
  try {
    const { role_id } = req.body || {};
    const { id } = req.params;

    if (!isAdmin(role_id)) {
      console.warn("🚫 [deleteTopic] Forbidden — user not admin:", role_id);
      return res.status(403).json({ message: "Forbidden: admin only" });
    }

    if (!id) {
      console.warn("⚠️ [deleteTopic] Missing topic id");
      return res.status(400).json({ message: "Missing topic id" });
    }

    const [r] = await pool.query(
      `DELETE FROM ChatboxTopic WHERE topic_id = ?`,
      [id]
    );

    if (r.affectedRows === 0) {
      console.warn("⚠️ [deleteTopic] Topic not found:", id);
      return res.status(404).json({ message: "Topic not found" });
    }

    console.log("✅ [deleteTopic] Deleted topic successfully:", id);
    res.json({ message: "Topic deleted successfully" });
  } catch (err) {
    console.error("❌ [deleteTopic] DB error:", err);
    res.status(500).json({ message: "Database error", error: err });
  }
};

/* =========================================================
   QUESTIONS
   ========================================================= */
exports.getQuestionsByTopic = async (req, res) => {
  console.log("🔹 [getQuestionsByTopic] Query params:", req.query);
  try {
    const { topic_id } = req.query;
    if (!topic_id) {
      console.warn("⚠️ [getQuestionsByTopic] Missing topic_id");
      return res.status(400).json({ message: "Missing topic_id" });
    }

    // ✅ Get questions from main DB
    const [questions] = await pool.query(
      `
      SELECT 
        q.question_id,
        q.topic_id,
        q.question_text AS question,
        q.answer_text AS answer,
        q.created_by_user_id,
        q.created_at
      FROM ChatboxQuestion q
      WHERE q.topic_id = ?
      ORDER BY q.created_at DESC
      `,
      [topic_id]
    );

    // ✅ Attach username from auth DB
    for (let q of questions) {
      const [userRows] = await authPool.query(
        `SELECT username FROM User WHERE user_id = ?`,
        [q.created_by_user_id]
      );
      q.username = userRows.length ? userRows[0].username : "Unknown";
    }

    console.log(`✅ [getQuestionsByTopic] Found ${questions.length} questions`);
    res.status(200).json(questions);
  } catch (err) {
    console.error("❌ [getQuestionsByTopic] DB error:", err);
    res.status(500).json({
      message: "Database error while fetching questions",
      error: err,
    });
  }
};

exports.createQuestion = async (req, res) => {
  console.log("🔹 [createQuestion] Body:", req.body);
  try {
    const { topic_id, question, answer, user_id, role_id } = req.body || {};

    if (!isAdmin(role_id)) {
      console.warn("🚫 [createQuestion] Forbidden — not admin:", role_id);
      return res.status(403).json({ message: "Forbidden: admin only" });
    }

    if (!topic_id || !question || !answer || !user_id) {
      console.warn("⚠️ [createQuestion] Missing fields:", {
        topic_id,
        question,
        answer,
        user_id,
      });
      return res.status(400).json({ message: "Missing fields" });
    }

    const [result] = await pool.query(
      `
      INSERT INTO ChatboxQuestion 
        (topic_id, question_text, answer_text, created_by_user_id, created_at)
      VALUES (?, ?, ?, ?, NOW())
      `,
      [topic_id, question, answer, user_id]
    );

    console.log("✅ [createQuestion] Question inserted, ID:", result.insertId);
    res.status(201).json({
      message: "Question created successfully",
      question_id: result.insertId,
    });
  } catch (err) {
    console.error("❌ [createQuestion] DB error:", err);
    res.status(500).json({ message: "Database error", error: err });
  }
};

exports.updateQuestion = async (req, res) => {
  console.log("🔹 [updateQuestion] Params:", req.params, "Body:", req.body);
  try {
    const { id } = req.params;
    const { question, answer, role_id } = req.body || {};

    if (!isAdmin(role_id)) {
      console.warn("🚫 [updateQuestion] Forbidden — not admin:", role_id);
      return res.status(403).json({ message: "Forbidden: admin only" });
    }

    if (!id || !question || !answer) {
      console.warn("⚠️ [updateQuestion] Missing fields:", { id, question, answer });
      return res.status(400).json({ message: "Missing fields" });
    }

    const [r] = await pool.query(
      `
      UPDATE ChatboxQuestion 
      SET question_text = ?, answer_text = ?, updated_at = NOW()
      WHERE question_id = ?
      `,
      [question, answer, id]
    );

    if (r.affectedRows === 0) {
      console.warn("⚠️ [updateQuestion] Question not found:", id);
      return res.status(404).json({ message: "Question not found" });
    }

    console.log("✅ [updateQuestion] Updated successfully:", id);
    res.json({ message: "Question updated successfully" });
  } catch (err) {
    console.error("❌ [updateQuestion] DB error:", err);
    res.status(500).json({ message: "Database error", error: err });
  }
};

exports.deleteQuestion = async (req, res) => {
  console.log("🔹 [deleteQuestion] Params:", req.params, "Body:", req.body);
  try {
    const { id } = req.params;
    const { role_id } = req.body || {};

    if (!isAdmin(role_id)) {
      console.warn("🚫 [deleteQuestion] Forbidden — not admin:", role_id);
      return res.status(403).json({ message: "Forbidden: admin only" });
    }

    if (!id) {
      console.warn("⚠️ [deleteQuestion] Missing question id");
      return res.status(400).json({ message: "Missing question id" });
    }

    const [r] = await pool.query(`DELETE FROM ChatboxQuestion WHERE question_id = ?`, [id]);

    if (r.affectedRows === 0) {
      console.warn("⚠️ [deleteQuestion] Question not found:", id);
      return res.status(404).json({ message: "Question not found" });
    }

    console.log("✅ [deleteQuestion] Deleted successfully:", id);
    res.json({ message: "Question deleted successfully" });
  } catch (err) {
    console.error("❌ [deleteQuestion] DB error:", err);
    res.status(500).json({ message: "Database error", error: err });
  }
};
