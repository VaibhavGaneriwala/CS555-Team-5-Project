// backend/routes/adherencePrediction.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const AdherenceLog = require('../models/AdherenceLog');
const Medication = require('../models/Medication');

// Helper: bucket time of day
function getPeriod(dateLike) {
  const d = new Date(dateLike);
  const h = d.getHours();
  if (h < 12) return 'morning';
  if (h < 18) return 'afternoon';
  return 'evening';
}

// Helper: day of week
const dayNames = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

// GET /api/adherence/predict
router.get('/', protect, async (req, res) => {
  try {
    const userId = req.user._id;

    const daysBack = parseInt(req.query.days || '30', 10);
    const since = new Date();
    since.setDate(since.getDate() - daysBack);

    // Get recent adherence logs for this patient
    const logs = await AdherenceLog.find({
      patient: userId,
      scheduledTime: { $gte: since },
    }).lean();

    if (!logs.length) {
      return res.json({
        message: 'Not enough adherence data to generate a prediction.',
        patterns: null,
      });
    }

    // Stats by time-of-day + day-of-week
    const periodStats = {
      morning: { taken: 0, missed: 0 },
      afternoon: { taken: 0, missed: 0 },
      evening: { taken: 0, missed: 0 },
    };

    const dayStats = {
      Sunday: { taken: 0, missed: 0 },
      Monday: { taken: 0, missed: 0 },
      Tuesday: { taken: 0, missed: 0 },
      Wednesday: { taken: 0, missed: 0 },
      Thursday: { taken: 0, missed: 0 },
      Friday: { taken: 0, missed: 0 },
      Saturday: { taken: 0, missed: 0 },
    };

    // Consider status !== 'taken' as a "miss"
    for (const log of logs) {
      const status = (log.status || '').toLowerCase();
      const scheduled = log.scheduledTime || log.createdAt || log.takenAt || new Date();

      const period = getPeriod(scheduled);
      const dayName = dayNames[new Date(scheduled).getDay()];

      const periodBucket = periodStats[period];
      const dayBucket = dayStats[dayName];

      if (!periodBucket || !dayBucket) continue;

      if (status === 'taken') {
        periodBucket.taken += 1;
        dayBucket.taken += 1;
      } else {
        periodBucket.missed += 1;
        dayBucket.missed += 1;
      }
    }

    // Determine which periods/days are "problematic"
    const likelyMissedPeriods = [];
    const likelyMissedDays = [];

    for (const [period, stats] of Object.entries(periodStats)) {
      const total = stats.taken + stats.missed;
      if (total >= 3 && stats.missed / Math.max(total, 1) >= 0.4) {
        likelyMissedPeriods.push(period);
      }
    }

    for (const [day, stats] of Object.entries(dayStats)) {
      const total = stats.taken + stats.missed;
      if (total >= 3 && stats.missed / Math.max(total, 1) >= 0.4) {
        likelyMissedDays.push(day);
      }
    }

    // Simple "missed streak": how many of the last N logs were missed
    const sorted = [...logs].sort(
      (a, b) =>
        new Date(b.scheduledTime || b.createdAt) -
        new Date(a.scheduledTime || a.createdAt)
    );

    let streak = 0;
    for (const log of sorted.slice(0, 10)) {
      const status = (log.status || '').toLowerCase();
      if (status !== 'taken') streak += 1;
      else break;
    }

    // Build human-readable recommendation
    const recommendations = [];

    if (likelyMissedPeriods.includes('evening')) {
      recommendations.push(
        'You tend to miss your evening doses. Consider enabling smart reminders around your usual evening time.'
      );
    }
    if (likelyMissedPeriods.includes('morning')) {
      recommendations.push(
        'You often miss your morning doses. Try linking them to a stable routine like breakfast.'
      );
    }
    if (likelyMissedDays.length) {
      recommendations.push(
        `You miss doses more frequently on: ${likelyMissedDays.join(
          ', '
        )}. Planning ahead on those days may help.`
      );
    }
    if (streak >= 3) {
      recommendations.push(
        `You have missed ${streak} recent scheduled doses. It might help to talk to your provider about what’s getting in the way.`
      );
    }

    if (!recommendations.length) {
      recommendations.push(
        'Your recent adherence looks generally good. Keep up the great work!'
      );
    }

    res.json({
      patterns: {
        likelyMissedPeriods,
        likelyMissedDays,
        streak,
      },
      recommendations,
    });
  } catch (err) {
    console.error('Prediction error:', err);
    res.status(500).json({
      message: 'Failed to generate adherence prediction.',
    });
  }
});

module.exports = router;
