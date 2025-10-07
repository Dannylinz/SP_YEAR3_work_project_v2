const pool = require("../services/db");

// ✅ Get all SOPs
exports.getAllSops = async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM SOP");
    res.status(200).json(rows);
  } catch (err) {
    console.error("Error fetching SOPs:", err);
    res.status(500).json({ message: "Database error", error: err });
  }
};

// ✅ Add SOP
exports.addSop = async (req, res) => {
  const { title, content } = req.body;
  if (!title || !content) {
    return res.status(400).json({ message: "Missing title or content" });
  }

  try {
    const sql = `
      INSERT INTO SOP (title, content, version, effective_date, created_by_user_id, status, department_id)
      VALUES (?, ?, '1.0', NULL, 1, 'draft', 1)
    `;
    await pool.query(sql, [title, content]);
    res.status(201).json({ message: "SOP added successfully" });
  } catch (err) {
    console.error("Error adding SOP:", err);
    res.status(500).json({ message: "Database error", error: err });
  }
};

// ✅ Update SOP  ← make sure this name exactly matches sopRoutes.js
exports.updateSop = async (req, res) => {
  const { sop_id } = req.params;
  const { title, content } = req.body;

  try {
    const [result] = await pool.query(
      "UPDATE SOP SET title = ?, content = ? WHERE sop_id = ?",
      [title, content, sop_id]
    );

    if (result.affectedRows === 0)
      return res.status(404).json({ message: "SOP not found" });

    res.status(200).json({ message: "SOP updated successfully" });
  } catch (err) {
    console.error("Error updating SOP:", err);
    res.status(500).json({ message: "Database error", error: err });
  }
};

// ✅ Delete SOP
exports.deleteSop = async (req, res) => {
  const { sop_id } = req.params;
  try {
    const [result] = await pool.query("DELETE FROM SOP WHERE sop_id = ?", [sop_id]);
    if (result.affectedRows === 0)
      return res.status(404).json({ message: "SOP not found" });
    res.status(200).json({ message: "SOP deleted successfully" });
  } catch (err) {
    console.error("Error deleting SOP:", err);
    res.status(500).json({ message: "Database error", error: err });
  }
};
