const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getAssignedProviders } = require('../controllers/patientController');

router.get('/providers', protect, getAssignedProviders);

module.exports = router;
