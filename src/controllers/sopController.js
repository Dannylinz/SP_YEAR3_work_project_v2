const pool = require("../services/db");
const fs = require("fs");
const path = require("path");

// ----------------------------
// GET all SOPs (with category, creator username, and attachments)
exports.getAllSops = async (req, res) => {
  try {
    // Join SOP with category and user table
    const sql = `
      SELECT s.sop_id, s.title, s.content, s.version, s.effective_date, 
             s.status, s.department_id, s.created_by_user_id, 
             c.category_id, c.category_name,
             u.username
      FROM SOP s
      LEFT JOIN SOPCategory c ON s.category_id = c.category_id
      LEFT JOIN User u ON s.created_by_user_id = u.user_id
      ORDER BY c.category_name, s.title
    `;
    const [sops] = await pool.query(sql);

    // Fetch attachments for each SOP
    const sopIds = sops.map(s => s.sop_id);
    let attachmentsMap = {};

    if (sopIds.length > 0) {
      const [attachments] = await pool.query(
        `SELECT parent_id, attachment_id, filename, storage_path 
         FROM Attachment 
         WHERE parent_type = 'sop' AND parent_id IN (?)`,
        [sopIds]
      );

      // Group attachments by SOP
      attachmentsMap = attachments.reduce((acc, att) => {
        if (!acc[att.parent_id]) acc[att.parent_id] = [];
        acc[att.parent_id].push({
          attachment_id: att.attachment_id,
          file_name: att.filename,
          file_path: att.storage_path.replace(/\\/g, "/") // normalize
        });
        return acc;
      }, {});
    }

    // Merge attachments into SOPs
    const sopsWithAttachments = sops.map(sop => ({
      ...sop,
      attachments: attachmentsMap[sop.sop_id] || [],
    }));

    res.status(200).json(sopsWithAttachments);
  } catch (err) {
    console.error("Error fetching SOPs:", err);
    res.status(500).json({ message: "Database error", error: err });
  }
};

// ----------------------------
// ADD a new SOP (with optional category + optional file upload)
exports.addSop = async (req, res) => {
  try {
    const { title, content, category_id, created_by_user_id } = req.body;
    const userId = created_by_user_id || 1; // Replace with req.user_id when auth is ready

    if (!title || !content) {
      return res.status(400).json({ message: "Missing title or content" });
    }

    // Insert SOP record
    const sql = `
      INSERT INTO SOP (title, content, version, effective_date, created_by_user_id, status, department_id, category_id)
      VALUES (?, ?, '1.0', NULL, ?, 'draft', 1, ?)
    `;
    const [result] = await pool.query(sql, [title, content, userId, category_id || null]);
    const sopId = result.insertId;

    let attachments = [];

    // If a file was uploaded, save in Attachment table
    if (req.file) {
      const { originalname, path: filePath } = req.file;
      const storagePath = filePath.replace(/\\/g, "/"); // Normalize Windows paths

      const [attResult] = await pool.query(
        `INSERT INTO Attachment (parent_type, parent_id, filename, storage_path, uploaded_by_user_id)
         VALUES ('sop', ?, ?, ?, ?)`,
        [sopId, originalname, storagePath, userId]
      );

      attachments.push({
        attachment_id: attResult.insertId,
        file_name: originalname,
        file_path: storagePath
      });
    }

    // Fetch full SOP record including username and attachments
    const [sopRows] = await pool.query(
      `SELECT s.sop_id, s.title, s.content, s.version, s.effective_date, 
              s.status, s.department_id, s.created_by_user_id, 
              c.category_id, c.category_name,
              u.username
       FROM SOP s
       LEFT JOIN SOPCategory c ON s.category_id = c.category_id
       LEFT JOIN User u ON s.created_by_user_id = u.user_id
       WHERE s.sop_id = ?`,
      [sopId]
    );

    const sop = sopRows[0];
    sop.attachments = attachments; // merge attachments

    res.status(201).json(sop);
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

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "SOP not found" });
    }

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
    // Delete related attachments
    const [attachments] = await pool.query(
      "SELECT storage_path FROM Attachment WHERE parent_type = 'sop' AND parent_id = ?",
      [sop_id]
    );

    for (const file of attachments) {
      if (fs.existsSync(file.storage_path)) {
        fs.unlinkSync(file.storage_path);
      }
    }

    await pool.query("DELETE FROM Attachment WHERE parent_type = 'sop' AND parent_id = ?", [sop_id]);

    // Delete SOP
    const [result] = await pool.query("DELETE FROM SOP WHERE sop_id = ?", [sop_id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "SOP not found" });
    }

    res.status(200).json({ message: "SOP and related files deleted successfully" });
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

// ----------------------------
// UPLOAD attachment for an existing SOP
exports.uploadAttachment = async (req, res) => {
  const { sop_id } = req.params;
  const uploaded_by_user_id = 1; // Replace with req.user_id when auth is ready

  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  try {
    const { originalname, path: filePath } = req.file;
    const storagePath = filePath.replace(/\\/g, "/");

    const [result] = await pool.query(
      `INSERT INTO Attachment (parent_type, parent_id, filename, storage_path, uploaded_by_user_id)
       VALUES ('sop', ?, ?, ?, ?)`,
      [sop_id, originalname, storagePath, uploaded_by_user_id]
    );

    res.status(201).json({
      message: "File uploaded successfully",
      attachment: {
        attachment_id: result.insertId,
        file_name: originalname,
        file_path: storagePath
      }
    });
  } catch (err) {
    console.error("Error uploading attachment:", err);
    res.status(500).json({ message: "Database error", error: err });
  }
};

// ----------------------------
// GET all attachments for a SOP
exports.getSopFiles = async (req, res) => {
  const { sop_id } = req.params;
  try {
    const [files] = await pool.query(
      `SELECT attachment_id, filename, storage_path, uploaded_on
       FROM Attachment WHERE parent_type = 'sop' AND parent_id = ?`,
      [sop_id]
    );
    res.status(200).json(files.map(f => ({
      attachment_id: f.attachment_id,
      file_name: f.filename,
      file_path: f.storage_path.replace(/\\/g, "/"),
      uploaded_on: f.uploaded_on
    })));
  } catch (err) {
    console.error("Error fetching SOP files:", err);
    res.status(500).json({ message: "Database error", error: err });
  }
};
