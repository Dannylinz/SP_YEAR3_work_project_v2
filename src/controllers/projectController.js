const pool = require("../services/db");

exports.getAllProjects = async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM Project");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "DB error", error: err });
  }
};

exports.addProject = async (req, res) => {
  const { name, description } = req.body;
  if(!name || !description) return res.status(400).json({ message: "Missing fields" });

  try {
    await pool.query("INSERT INTO Project (name, description) VALUES (?, ?)", [name, description]);
    res.status(201).json({ message: "Project added" });
  } catch(err) {
    res.status(500).json({ message: "DB error", error: err });
  }
};
