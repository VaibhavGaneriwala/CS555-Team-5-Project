const express = require('express');
const router = express.Router();

const { getAssignedPatients } = require('../controllers/providerController');
const { assignPatient } = require('../controllers/assignPatientController');
const { protect, authorize } = require('../middleware/auth');

// Provider-only route
router.get('/patients', protect, authorize('provider'), getAssignedPatients);
router.post('/assign', protect, authorize('provider'), assignPatient);

module.exports = router;