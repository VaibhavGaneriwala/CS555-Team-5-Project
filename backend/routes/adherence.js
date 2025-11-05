const express = require('express');
const router = express.Router();
const {logAdherence, getAdherenceLogs, getAdherenceStats, getAdherenceReport, updateAdherenceLog, deleteAdherenceLog} = require('../controllers/adherenceController');
const {protect} = require('../middleware/auth');

router.route('/').post(protect, logAdherence).get(protect, getAdherenceLogs);
router.route('/stats').get(protect, getAdherenceStats);
router.route('/:id').put(protect, updateAdherenceLog).delete(protect, deleteAdherenceLog);
router.route('/report').get(protect, getAdherenceReport);

module.exports = router;