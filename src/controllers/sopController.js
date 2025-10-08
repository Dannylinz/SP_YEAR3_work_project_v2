const pool = require("../services/db");

// ----------------------------
// GET all SOPs (with category)
exports.getAllSops = async (req, res) => {
  try {
    const sql = `
      SELECT s.sop_id, s.title, s.content, s.version, s.effective_date, 
             s.status, s.department_id, s.created_by_user_id, c.category_id, c.category_name
      FROM SOP s
      LEFT JOIN SOPCategory c ON s.category_id = c.category_id
      ORDER BY c.category_name, s.title
    `;
    const [rows] = await pool.query(sql);
    res.status(200).json(rows);
  } catch (err) {
    console.error("Error fetching SOPs:", err);
    res.status(500).json({ message: "Database error", error: err });
  }
};

// ----------------------------
// ADD a new SOP (with optional category)
exports.addSop = async (req, res) => {
  const { title, content, category_id } = req.body;
  if (!title || !content) {
    return res.status(400).json({ message: "Missing title or content" });
  }

  try {
    const sql = `
      INSERT INTO SOP (title, content, version, effective_date, created_by_user_id, status, department_id, category_id)
      VALUES (?, ?, '1.0', NULL, 1, 'draft', 1, ?)
    `;
    await pool.query(sql, [title, content, category_id || null]);
    res.status(201).json({ message: "SOP added successfully" });
  } catch (err) {
    console.error("Error adding SOP:", err);
    res.status(500).json({ message: "Database error", error: err });
  }
};

// ----------------------------
// UPDATE SOP
exports.updateSop = async (req, res) => {
  const { sop_id } = req.params;
  const { title, content, category_id } = req.body;

  try {
    const [result] = await pool.query(
      "UPDATE SOP SET title = ?, content = ?, category_id = ? WHERE sop_id = ?",
      [title, content, category_id || null, sop_id]
    );

    if (result.affectedRows === 0)
      return res.status(404).json({ message: "SOP not found" });

    res.status(200).json({ message: "SOP updated successfully" });
  } catch (err) {
    console.error("Error updating SOP:", err);
    res.status(500).json({ message: "Database error", error: err });
  }
};

// ----------------------------
// DELETE SOP
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

// ----------------------------
// GET all SOP categories
exports.getAllCategories = async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM SOPCategory ORDER BY category_name");
    res.status(200).json(rows);
  } catch (err) {
    console.error("Error fetching categories:", err);
    res.status(500).json({ message: "Database error", error: err });
  }
};

// ----------------------------
// ADD a new SOP category
exports.addCategory = async (req, res) => {
  const { category_name } = req.body;
  if (!category_name) return res.status(400).json({ message: "Missing category name" });

  try {
    await pool.query("INSERT INTO SOPCategory (category_name) VALUES (?)", [category_name]);
    res.status(201).json({ message: "Category added successfully" });
  } catch (err) {
    console.error("Error adding category:", err);
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(400).json({ message: "Category already exists" });
    }
    res.status(500).json({ message: "Database error", error: err });
  }
};
