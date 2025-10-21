// Routes for user authentication
import express from 'express';
import { registerUser, loginUser } from '../controllers/authController.js';

const router = express.Router();
// Create the routes for registering and logging in
router.post('/register', registerUser);
router.post('/login', loginUser);

export default router