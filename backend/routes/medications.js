// backend/routes/medications.js
const express = require('express');
const router = express.Router();
const {
  createMedication,
  getMedications,
  getMedicationById,
  updateMedication,
  deleteMedication,
  toggleReminder,          // 👈 ADD THIS
} = require('../controllers/medicationController');
const { protect } = require('../middleware/auth');

router
  .route('/')
  .post(protect, createMedication)
  .get(protect, getMedications);

router
  .route('/:id')
  .get(protect, getMedicationById)
  .put(protect, updateMedication)
  .patch(protect, updateMedication)
  .delete(protect, deleteMedication);

// 👇 NEW: smart reminder toggle
router.patch('/:id/reminder', protect, toggleReminder);

module.exports = router;