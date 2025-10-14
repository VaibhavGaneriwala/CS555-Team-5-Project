const express = require('express');
const router = express.Router();
const {createMedication, getMedications, getMedicationById, updateMedication, deleteMedication} = require('../controllers/medicationController');
const {protect} = require('../middleware/auth');

router.route('/').post(protect, createMedication).get(protect, getMedications);

router.route('/:id').get(protect, getMedicationById).put(protect, updateMedication).delete(protect, deleteMedication);

module.exports = router;