const express = require('express');
const router = express.Router();
const {
  logAdherence,
  getAdherenceLogs,
  getAdherenceStats,
  getAdherenceReport,
  getAdherenceTrends,   // ✅ NEW
  updateAdherenceLog,
  deleteAdherenceLog
} = require('../controllers/adherenceController');
const { protect } = require('../middleware/auth');

// Create + list logs
router.route('/')
  .post(protect, logAdherence)
  .get(protect, getAdherenceLogs);

// High-level stats (status breakdown)
router.route('/stats')
  .get(protect, getAdherenceStats);

// Provider reports (per-patient summary, with filters)
router.route('/report')
  .get(protect, getAdherenceReport);

// ✅ NEW: Provider time-series trends
router.route('/trends')
  .get(protect, getAdherenceTrends);

// Update / delete a specific log
router.route('/:id')
  .put(protect, updateAdherenceLog)
  .delete(protect, deleteAdherenceLog);

module.exports = router;
