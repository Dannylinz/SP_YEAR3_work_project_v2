const pool = require("../services/db");
const fs = require("fs");
const path = require("path");

// ----------------------------
// GET all SOPs
exports.getAllSops = async (req, res) => {
  try {
    console.log("[getAllSops] Fetching all SOPs...");
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
    console.log(`[getAllSops] Retrieved ${sops.length} SOPs`);

    const sopIds = sops.map(s => s.sop_id);
    let attachmentsMap = {};

    if (sopIds.length > 0) {
      const [attachments] = await pool.query(
        `SELECT parent_id, attachment_id, filename, storage_path 
         FROM Attachment 
         WHERE parent_type = 'sop' AND parent_id IN (?)`,
        [sopIds]
      );
      console.log(`[getAllSops] Retrieved ${attachments.length} attachments`);

      attachmentsMap = attachments.reduce((acc, att) => {
        if (!acc[att.parent_id]) acc[att.parent_id] = [];
        acc[att.parent_id].push({
          attachment_id: att.attachment_id,
          file_name: att.filename,
          file_path: att.storage_path.replace(/\\/g, "/")
        });
        return acc;
      }, {});
    }

    const sopsWithAttachments = sops.map(sop => ({
      ...sop,
      attachments: attachmentsMap[sop.sop_id] || [],
    }));

    res.status(200).json(sopsWithAttachments);
  } catch (err) {
    console.error("[getAllSops] Error fetching SOPs:", err);
    res.status(500).json({ message: "Database error", error: err });
  }
};

// ----------------------------
// ADD SOP
exports.addSop = async (req, res) => {
  try {
    console.log("[addSop] Body received:", req.body);
    if (req.file) console.log("[addSop] File received:", req.file);

    const { title, content, category_id, created_by_user_id } = req.body;
    const userId = created_by_user_id || 1;

    if (!title || !content) {
      console.log("[addSop] Missing title or content");
      return res.status(400).json({ message: "Missing title or content" });
    }

    const sql = `
      INSERT INTO SOP (title, content, version, effective_date, created_by_user_id, status, department_id, category_id)
      VALUES (?, ?, '1.0', NULL, ?, 'draft', 1, ?)
    `;
    const [result] = await pool.query(sql, [title, content, userId, category_id || null]);
    const sopId = result.insertId;
    console.log("[addSop] SOP inserted with ID:", sopId);

    let attachments = [];
    if (req.file) {
      const { originalname, path: filePath } = req.file;
      const storagePath = filePath.replace(/\\/g, "/");

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

      console.log("[addSop] Attachment inserted:", attachments[0]);
    }

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
    sop.attachments = attachments;

    res.status(201).json(sop);
  } catch (err) {
    console.error("[addSop] Error adding SOP:", err);
    res.status(500).json({ message: "Database error", error: err });
  }
};

// ----------------------------
// UPDATE SOP
// ----------------------------
// UPDATE SOP
exports.updateSop = async (req, res) => {
  const { sop_id } = req.params;
  const { title, content, category_id } = req.body;
  const file = req.file;

  console.log("[updateSop] Request params:", req.params);
  console.log("[updateSop] Body received:", req.body);
  if (file) console.log("[updateSop] File received:", file);

  try {
    // Get current SOP
    const [rows] = await pool.query("SELECT * FROM SOP WHERE sop_id = ?", [sop_id]);
    if (rows.length === 0) {
      console.log("[updateSop] SOP not found");
      return res.status(404).json({ message: "SOP not found" });
    }
    const oldSop = rows[0];
    console.log("[updateSop] Current SOP:", oldSop);

    // Update SOP
    const [result] = await pool.query(
      "UPDATE SOP SET title = ?, content = ?, category_id = ? WHERE sop_id = ?",
      [
        title || oldSop.title,
        content || oldSop.content,
        category_id || oldSop.category_id,
        sop_id
      ]
    );
    console.log("[updateSop] SOP update result:", result);

    // Handle file replacement
    if (file) {
      const [oldFiles] = await pool.query(
        "SELECT * FROM Attachment WHERE parent_type='sop' AND parent_id=?",
        [sop_id]
      );

      for (const f of oldFiles) {
        if (fs.existsSync(f.storage_path)) {
          fs.unlinkSync(f.storage_path);
          console.log("[updateSop] Deleted old file:", f.storage_path);
        }
      }

      await pool.query("DELETE FROM Attachment WHERE parent_type='sop' AND parent_id=?", [sop_id]);

      const storagePath = file.path.replace(/\\/g, "/");
      const [attResult] = await pool.query(
        "INSERT INTO Attachment (parent_type, parent_id, filename, storage_path, uploaded_by_user_id) VALUES (?, ?, ?, ?, ?)",
        ["sop", sop_id, file.originalname, storagePath, 1]
      );
      console.log("[updateSop] New attachment inserted:", attResult.insertId);
    }

    // Fetch updated SOP
    const [updatedRows] = await pool.query(
      `SELECT s.sop_id, s.title, s.content, s.version, s.effective_date, 
              s.status, s.department_id, s.created_by_user_id, 
              c.category_id, c.category_name,
              u.username
       FROM SOP s
       LEFT JOIN SOPCategory c ON s.category_id = c.category_id
       LEFT JOIN User u ON s.created_by_user_id = u.user_id
       WHERE s.sop_id = ?`,
      [sop_id]
    );

    const updatedSop = updatedRows[0];

    // Fetch attachments
    const [attachments] = await pool.query(
      "SELECT attachment_id, filename, storage_path FROM Attachment WHERE parent_type='sop' AND parent_id=?",
      [sop_id]
    );

    updatedSop.attachments = attachments.map(a => ({
      attachment_id: a.attachment_id,
      file_name: a.filename,
      file_path: a.storage_path.replace(/\\/g, "/")
    }));

    console.log("[updateSop] Updated SOP:", updatedSop);

    res.status(200).json({ message: "SOP updated successfully", sop: updatedSop });
  } catch (err) {
    console.error("[updateSop] Error updating SOP:", err);
    res.status(500).json({ message: "Database error", error: err });
  }
};


// ----------------------------
// DELETE SOP
exports.deleteSop = async (req, res) => {
  const { sop_id } = req.params;
  try {
    const [attachments] = await pool.query(
      "SELECT storage_path FROM Attachment WHERE parent_type = 'sop' AND parent_id = ?",
      [sop_id]
    );

    for (const file of attachments) {
      if (fs.existsSync(file.storage_path)) {
        fs.unlinkSync(file.storage_path);
        console.log("[deleteSop] Deleted file:", file.storage_path);
      }
    }

    await pool.query("DELETE FROM Attachment WHERE parent_type = 'sop' AND parent_id = ?", [sop_id]);

    const [result] = await pool.query("DELETE FROM SOP WHERE sop_id = ?", [sop_id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: "SOP not found" });

    console.log("[deleteSop] SOP deleted successfully:", sop_id);
    res.status(200).json({ message: "SOP and related files deleted successfully" });
  } catch (err) {
    console.error("[deleteSop] Error deleting SOP:", err);
    res.status(500).json({ message: "Database error", error: err });
  }
};

// ----------------------------
// GET categories
exports.getAllCategories = async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM SOPCategory ORDER BY category_name");
    res.status(200).json(rows);
  } catch (err) {
    console.error("[getAllCategories] Error fetching categories:", err);
    res.status(500).json({ message: "Database error", error: err });
  }
};

// ----------------------------
// ADD category
exports.addCategory = async (req, res) => {
  const { category_name } = req.body;
  if (!category_name) return res.status(400).json({ message: "Missing category name" });

  try {
    await pool.query("INSERT INTO SOPCategory (category_name) VALUES (?)", [category_name]);
    console.log("[addCategory] Category added:", category_name);
    res.status(201).json({ message: "Category added successfully" });
  } catch (err) {
    console.error("[addCategory] Error adding category:", err);
    if (err.code === "ER_DUP_ENTRY") return res.status(400).json({ message: "Category already exists" });
    res.status(500).json({ message: "Database error", error: err });
  }
};

// ----------------------------
// UPLOAD attachment
exports.uploadAttachment = async (req, res) => {
  const { sop_id } = req.params;
  const uploaded_by_user_id = 1;

  console.log("[uploadAttachment] Params:", req.params);
  console.log("[uploadAttachment] File received:", req.file);

  if (!req.file) return res.status(400).json({ message: "No file uploaded" });

  try {
    const { originalname, path: filePath } = req.file;
    const storagePath = filePath.replace(/\\/g, "/");

    const [result] = await pool.query(
      `INSERT INTO Attachment (parent_type, parent_id, filename, storage_path, uploaded_by_user_id)
       VALUES ('sop', ?, ?, ?, ?)`,
      [sop_id, originalname, storagePath, uploaded_by_user_id]
    );

    console.log("[uploadAttachment] Attachment inserted:", result.insertId);

    res.status(201).json({
      message: "File uploaded successfully",
      attachment: {
        attachment_id: result.insertId,
        file_name: originalname,
        file_path: storagePath
      }
    });
  } catch (err) {
    console.error("[uploadAttachment] Error uploading attachment:", err);
    res.status(500).json({ message: "Database error", error: err });
  }
};

// ----------------------------
// GET attachments
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
    console.error("[getSopFiles] Error fetching SOP files:", err);
    res.status(500).json({ message: "Database error", error: err });
  }
};
