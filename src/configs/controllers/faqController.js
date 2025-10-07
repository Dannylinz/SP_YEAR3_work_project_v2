// src/controllers/faqController.js
const pool = require('../configs/db');

module.exports = {
  getAll: async (req, res) => {
    try {
      const [rows] = await pool.query('SELECT * FROM FAQ ORDER BY faq_id DESC');
      res.json(rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Error fetching FAQs' });
    }
  },

  create: async (req, res) => {
    const { question, answer } = req.body;
    if (!question || !answer) return res.status(400).json({ message: 'Missing fields' });
    try {
      await pool.query('INSERT INTO FAQ (question, answer, updated_on, is_published) VALUES (?, ?, NOW(), 1)', [question, answer]);
      res.status(201).json({ message: 'FAQ created' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Error creating FAQ' });
    }
  }
};
