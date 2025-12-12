const express = require('express');
const router = express.Router();

const {
  logAdherence,
  getAdherenceLogs,
  getAdherenceStats,
  getAdherenceReport,
  getAdherenceTrends,
  updateAdherenceLog,
  deleteAdherenceLog
} = require('../controllers/adherenceController');

const { protect } = require('../middleware/auth');

// -------------------------------------------
// CREATE LOG + GET LOGS
// -------------------------------------------
router.route('/')
  .post(protect, logAdherence)
  .get(protect, getAdherenceLogs);

// -------------------------------------------
// OVERALL STATS (Patient or Provider Summary)
// -------------------------------------------
router.route('/stats')
  .get(protect, getAdherenceStats);

// -------------------------------------------
// PROVIDER REPORTS (REQUIRES PROVIDER ROLE)
// -------------------------------------------
router.route('/report')
  .get(protect, getAdherenceReport);

// -------------------------------------------
// PROVIDER-ONLY TRENDS (TIME SERIES)
// -------------------------------------------
router.route('/trends')
  .get(protect, getAdherenceTrends);

// -------------------------------------------
// UPDATE / DELETE SPECIFIC LOG ENTRY
// -------------------------------------------
router.route('/:id')
  .put(protect, updateAdherenceLog)
  .delete(protect, deleteAdherenceLog);

module.exports = router;
