const express = require('express');
const router = express.Router();

const { getAssignedPatients, getAvailablePatients } = require('../controllers/providerController');
const { assignPatient, unassignPatient } = require('../controllers/assignPatientController');
const { protect, authorize } = require('../middleware/auth');

router.get('/patients', protect, authorize('provider'), getAssignedPatients);
router.get('/available-patients', protect, authorize('provider'), getAvailablePatients);
router.post('/assign', protect, authorize('provider'), assignPatient);
router.delete('/assign/:patientId', protect, authorize('provider'), unassignPatient);

module.exports = router;