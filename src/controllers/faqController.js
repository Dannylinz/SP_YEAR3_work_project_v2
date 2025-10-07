const pool = require("../services/db");

exports.getAllFaqs = async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM FAQ");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "DB error", error: err });
  }
};

exports.addFaq = async (req, res) => {
  const { question, answer } = req.body;
  if(!question || !answer) return res.status(400).json({ message: "Missing fields" });

  try {
    await pool.query("INSERT INTO FAQ (question, answer) VALUES (?, ?)", [question, answer]);
    res.status(201).json({ message: "FAQ added" });
  } catch(err) {
    res.status(500).json({ message: "DB error", error: err });
  }
};
