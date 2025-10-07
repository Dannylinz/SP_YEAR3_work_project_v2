const express = require("express");
const router = express.Router();
const { getAllSops, addSop } = require("../controllers/sopController");

router.get("/", getAllSops);
router.post("/", addSop);

module.exports = router;
