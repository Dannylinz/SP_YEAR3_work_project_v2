const pool = require("../services/db");

// 1. Get all notifications for a specific user
exports.getNotifications = async (req, res) => {
  const { user_id } = req.params;
  try {
    const [rows] = await pool.query(
      "SELECT * FROM Notification WHERE user_id = ? ORDER BY created_at DESC LIMIT 15",
      [user_id]
    );
    res.json(rows);
  } catch (err) {
    console.error("❌ [Notif] Fetch error:", err);
    res.status(500).json({ message: "Database error" });
  }
};

// 2. Mark all notifications as read (clears the red badge)
exports.markAsRead = async (req, res) => {
  const { user_id } = req.params;
  try {
    await pool.query(
      "UPDATE Notification SET is_read = TRUE WHERE user_id = ?",
      [user_id]
    );
    res.json({ message: "Notifications updated" });
  } catch (err) {
    console.error("❌ [Notif] Update error:", err);
    res.status(500).json({ message: "Database error" });
  }
};