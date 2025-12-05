const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();

const connectDB = require('./config/db');
console.log(`PORT from env: "${process.env.PORT}"`);

const app = express();

// Connect DB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// ----------------------------
// Route Imports
// ----------------------------
const providerRoutes = require('./routes/provider');
const chatRoutes = require('./routes/chatRoutes');
const adherencePredictionRoutes = require('./routes/adherencePrediction'); // ✅ FIXED (must be before use)

// ----------------------------
// API Routes
// ----------------------------
app.use('/api/auth', require('./routes/auth'));
app.use('/api/provider', providerRoutes);
app.use('/api/medications', require('./routes/medications'));
app.use('/api/patient', require('./routes/patient'));
app.use('/api/adherence', require('./routes/adherence'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/reminders', require('./routes/reminders'));

// ⭐ Your prediction endpoint (two URL styles if you want both)
app.use('/api/adherence-prediction', adherencePredictionRoutes); 
app.use('/api/adherence/predict', adherencePredictionRoutes);   // consistent with your choice "C"

// Chatbot Route
app.use('/api/chat', chatRoutes);

// ----------------------------
// Default Home Route
// ----------------------------
app.use('/', (req, res) => {
  res.json({ message: 'Medication Tracker API is running' });
});

// ----------------------------
// Start Server
// ----------------------------
const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

// ----------------------------
// Reminder Scheduler (runs after server starts)
// ----------------------------
require('./utils/reminderScheduler');
