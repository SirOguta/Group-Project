import express from "express";
import WeightBalance from "../models/WeightBalance.js";

const router = express.Router();

// POST new record
router.post("/save", async (req, res) => {
  try {
    console.log("Incoming data:", req.body); // ← ADD THIS
    const newSheet = new WeightBalance(req.body);
    await newSheet.save();
    res.status(200).json({ message: "Saved", id: newSheet._id });
  } catch (err) {
    console.error("Save error:", err);
    res.status(500).json({ message: "Error saving sheet", error: err.message });
  }
});

// GET all records
router.get("/", async (req, res) => {
  try {
    const records = await WeightBalance.find(); // Get all records from MongoDB
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: "Error fetching records", error: err.message });
  }
});

export default router;
