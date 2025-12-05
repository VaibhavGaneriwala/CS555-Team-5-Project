const express = require("express");
const router = express.Router();
const reminderScheduler = require("../utils/reminderScheduler");
const auth = require("../middleware/auth");

// Enable smart reminders for the logged-in patient
router.post("/enable", auth, async (req, res) => {
  try {
    const userId = req.user._id;

    // Trigger your reminder scheduler logic
    await reminderScheduler.scheduleDailyReminders(userId);

    res.json({
      status: "success",
      message: "Smart reminders enabled!",
    });
  } catch (error) {
    console.error("Error enabling reminders:", error);
    res.status(500).json({ message: "Failed to enable reminders" });
  }
});

module.exports = router;
