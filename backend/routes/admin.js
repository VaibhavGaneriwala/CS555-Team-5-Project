const express = require('express');
const router = express.Router();

const { getAllUsers, assignPatientAsAdmin } = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

// All admin routes require: logged-in + role = admin
router.use(protect, authorize('admin'));

router.get('/users', getAllUsers);
router.post('/assign', assignPatientAsAdmin);

module.exports = router;
