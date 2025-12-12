const express = require('express');
const router = express.Router();
const {register, login, getMe, getAllUsers, getAdminStats, getUserById, updateUser, updateMe, deleteUser} = require('../controllers/authController');
const {protect, authorize} = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.put('/me', protect, updateMe);
router.get('/users', protect, authorize('admin'), getAllUsers);
router.get('/users/:id', protect, authorize('admin'), getUserById);
router.put('/users/:id', protect, authorize('admin'), updateUser);
router.delete('/users/:id', protect, authorize('admin'), deleteUser);
router.get('/stats', protect, authorize('admin'), getAdminStats);

module.exports = router;