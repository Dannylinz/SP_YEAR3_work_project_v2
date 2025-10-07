const pool = require("../services/db");

exports.getAllSops = async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM SOP");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "DB error", error: err });
  }
};

exports.addSop = async (req, res) => {
  const { title, description } = req.body;
  if(!title || !description) return res.status(400).json({ message: "Missing fields" });

  try {
    await pool.query("INSERT INTO SOP (title, description) VALUES (?, ?)", [title, description]);
    res.status(201).json({ message: "SOP added" });
  } catch(err) {
    res.status(500).json({ message: "DB error", error: err });
  }
};
