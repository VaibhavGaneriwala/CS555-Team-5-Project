const express = require('express');
const router = express.Router();

const { getAssignedPatients, getAvailablePatients } = require('../controllers/providerController');
const { assignPatient } = require('../controllers/assignPatientController');
const { protect, authorize } = require('../middleware/auth');

// Provider-only routes
router.get('/patients', protect, authorize('provider'), getAssignedPatients);
router.get('/available-patients', protect, authorize('provider'), getAvailablePatients);
router.post('/assign', protect, authorize('provider'), assignPatient);

module.exports = router;