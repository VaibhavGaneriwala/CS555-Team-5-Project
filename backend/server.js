import express from 'express';
import dotenv from 'dotenv';
// Get our env variables
dotenv.config();
import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import cors from 'cors';

// Connect to MongoDB
connectDB();

const app = express();
app.use(express.json());
app.use(cors());

app.get('/', (req, res) => res.send('App running'));
app.use('/api/auth', authRoutes);

const PORT = 5001
app.listen(PORT, () => console.log(`Server running on port ${PORT}`))