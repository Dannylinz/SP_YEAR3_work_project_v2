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

    const [r] = await pool.query(
      `DELETE FROM ChatboxQuestion WHERE question_id = ?`,
      [id]
    );

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

/* =========================================================
   FLOW STEPS (BRANCHING YES/NO LOGIC)
   ========================================================= */

// Get all steps for a question (for admin builder)
exports.getFlowStepsByQuestion = async (req, res) => {
  const { question_id } = req.params;
  console.log("🔹 [getFlowStepsByQuestion] question_id:", question_id);

  if (!question_id) {
    return res.status(400).json({ message: "Missing question_id" });
  }

  try {
    const [rows] = await pool.query(
      `
      SELECT 
        step_id,
        question_id,
        step_text,
        yes_next_step,
        no_next_step,
        is_final,
        created_at
      FROM ChatboxFlowStep
      WHERE question_id = ?
      ORDER BY step_id ASC
      `,
      [question_id]
    );

    console.log(`✅ [getFlowStepsByQuestion] Found ${rows.length} steps`);
    res.status(200).json(rows);
  } catch (err) {
    console.error("❌ [getFlowStepsByQuestion] DB error:", err);
    res.status(500).json({ message: "Database error", error: err });
  }
};

// Create a new flow step
exports.createFlowStep = async (req, res) => {
  console.log("🔹 [createFlowStep] Body:", req.body);
  try {
    const { question_id, step_text, yes_next_step, no_next_step, is_final, role_id } = req.body || {};

    if (!isAdmin(role_id)) {
      console.warn("🚫 [createFlowStep] Forbidden — not admin:", role_id);
      return res.status(403).json({ message: "Forbidden: admin only" });
    }

    if (!question_id || !step_text) {
      console.warn("⚠️ [createFlowStep] Missing fields:", { question_id, step_text });
      return res.status(400).json({ message: "Missing fields" });
    }

    const [result] = await pool.query(
      `
      INSERT INTO ChatboxFlowStep
        (question_id, step_text, yes_next_step, no_next_step, is_final, created_at)
      VALUES (?, ?, ?, ?, ?, NOW())
      `,
      [
        question_id,
        step_text,
        yes_next_step || null,
        no_next_step || null,
        !!is_final
      ]
    );

    const [inserted] = await pool.query(
      `SELECT * FROM ChatboxFlowStep WHERE step_id = ?`,
      [result.insertId]
    );

    console.log("✅ [createFlowStep] Step inserted, ID:", result.insertId);
    res.status(201).json({
      message: "Flow step created successfully",
      step: inserted[0],
    });
  } catch (err) {
    console.error("❌ [createFlowStep] DB error:", err);
    res.status(500).json({ message: "Database error", error: err });
  }
};

// Update a flow step
exports.updateFlowStep = async (req, res) => {
  console.log("🔹 [updateFlowStep] Params:", req.params, "Body:", req.body);
  try {
    const { step_id } = req.params;
    const { step_text, yes_next_step, no_next_step, is_final, role_id } = req.body || {};

    if (!isAdmin(role_id)) {
      console.warn("🚫 [updateFlowStep] Forbidden — not admin:", role_id);
      return res.status(403).json({ message: "Forbidden: admin only" });
    }

    if (!step_id || !step_text) {
      console.warn("⚠️ [updateFlowStep] Missing fields:", { step_id, step_text });
      return res.status(400).json({ message: "Missing fields" });
    }

    const [r] = await pool.query(
      `
      UPDATE ChatboxFlowStep
      SET step_text = ?, 
          yes_next_step = ?, 
          no_next_step = ?, 
          is_final = ?
      WHERE step_id = ?
      `,
      [
        step_text,
        yes_next_step || null,
        no_next_step || null,
        !!is_final,
        step_id
      ]
    );

    if (r.affectedRows === 0) {
      console.warn("⚠️ [updateFlowStep] Step not found:", step_id);
      return res.status(404).json({ message: "Step not found" });
    }

    const [updated] = await pool.query(
      `SELECT * FROM ChatboxFlowStep WHERE step_id = ?`,
      [step_id]
    );

    console.log("✅ [updateFlowStep] Updated successfully:", step_id);
    res.json({
      message: "Flow step updated successfully",
      step: updated[0],
    });
  } catch (err) {
    console.error("❌ [updateFlowStep] DB error:", err);
    res.status(500).json({ message: "Database error", error: err });
  }
};

// Delete a flow step
exports.deleteFlowStep = async (req, res) => {
  console.log("🔹 [deleteFlowStep] Params:", req.params, "Body:", req.body);
  try {
    const { step_id } = req.params;
    const { role_id } = req.body || {};

    if (!isAdmin(role_id)) {
      console.warn("🚫 [deleteFlowStep] Forbidden — not admin:", role_id);
      return res.status(403).json({ message: "Forbidden: admin only" });
    }

    if (!step_id) {
      console.warn("⚠️ [deleteFlowStep] Missing step_id");
      return res.status(400).json({ message: "Missing step_id" });
    }

    const [r] = await pool.query(
      `DELETE FROM ChatboxFlowStep WHERE step_id = ?`,
      [step_id]
    );

    if (r.affectedRows === 0) {
      console.warn("⚠️ [deleteFlowStep] Step not found:", step_id);
      return res.status(404).json({ message: "Step not found" });
    }

    console.log("✅ [deleteFlowStep] Deleted successfully:", step_id);
    res.json({ message: "Flow step deleted successfully" });
  } catch (err) {
    console.error("❌ [deleteFlowStep] DB error:", err);
    res.status(500).json({ message: "Database error", error: err });
  }
};

// Get starting step for a question (user flow)
exports.getStartStep = async (req, res) => {
  const { question_id } = req.params;
  console.log("🔹 [getStartStep] question_id:", question_id);

  if (!question_id) {
    return res.status(400).json({ message: "Missing question_id" });
  }

  try {
    const [rows] = await pool.query(
      `
      SELECT 
        step_id,
        question_id,
        step_text,
        yes_next_step,
        no_next_step,
        is_final
      FROM ChatboxFlowStep
      WHERE question_id = ?
      ORDER BY step_id ASC
      LIMIT 1
      `,
      [question_id]
    );

    if (rows.length === 0) {
      console.warn("⚠️ [getStartStep] No steps configured for question:", question_id);
      return res.status(404).json({ message: "No guided flow defined for this question" });
    }

    console.log("✅ [getStartStep] Returning first step:", rows[0].step_id);
    res.json({ step: rows[0] });
  } catch (err) {
    console.error("❌ [getStartStep] DB error:", err);
    res.status(500).json({ message: "Database error", error: err });
  }
};

// Get next step given a step_id and yes/no choice
exports.getNextStep = async (req, res) => {
  const { step_id, choice } = req.params;
  console.log("🔹 [getNextStep] step_id:", step_id, "choice:", choice);

  if (!step_id || !choice) {
    return res.status(400).json({ message: "Missing step_id or choice" });
  }

  const normalizedChoice = String(choice).toLowerCase();

  try {
    const [rows] = await pool.query(
      `
      SELECT 
        step_id,
        question_id,
        step_text,
        yes_next_step,
        no_next_step,
        is_final
      FROM ChatboxFlowStep
      WHERE step_id = ?
      `,
      [step_id]
    );

    if (rows.length === 0) {
      console.warn("⚠️ [getNextStep] Current step not found:", step_id);
      return res.status(404).json({ message: "Current step not found" });
    }

    const current = rows[0];
    let nextId = null;

    if (normalizedChoice === "yes") {
      nextId = current.yes_next_step;
    } else if (normalizedChoice === "no") {
      nextId = current.no_next_step;
    } else {
      return res.status(400).json({ message: "Choice must be 'yes' or 'no'" });
    }

    if (!nextId) {
      // No further step; treat as end of flow
      console.log("ℹ️ [getNextStep] No next step; end of flow.");
      return res.json({
        step: current,
        end: true,
        message: "No further steps; this is the end of the guided flow.",
      });
    }

    const [nextRows] = await pool.query(
      `
      SELECT 
        step_id,
        question_id,
        step_text,
        yes_next_step,
        no_next_step,
        is_final
      FROM ChatboxFlowStep
      WHERE step_id = ?
      `,
      [nextId]
    );

    if (nextRows.length === 0) {
      console.warn("⚠️ [getNextStep] Next step not found:", nextId);
      return res.status(404).json({ message: "Next step not found" });
    }

    console.log("✅ [getNextStep] Returning step:", nextRows[0].step_id);
    res.json({ step: nextRows[0] });
  } catch (err) {
    console.error("❌ [getNextStep] DB error:", err);
    res.status(500).json({ message: "Database error", error: err });
  }
};
