const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();

const connectDB = require('./config/db');

const app = express();

connectDB();

app.use(cors());
app.use(express.json());

const providerRoutes = require('./routes/provider');
const chatRoutes = require('./routes/chatRoutes');
const adherencePredictionRoutes = require('./routes/adherencePrediction');

app.use('/api/auth', require('./routes/auth'));
app.use('/api/provider', providerRoutes);
app.use('/api/medications', require('./routes/medications'));
app.use('/api/patient', require('./routes/patient'));
app.use('/api/adherence', require('./routes/adherence'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/reminders', require('./routes/reminders'));

app.use('/api/adherence-prediction', adherencePredictionRoutes); 
app.use('/api/adherence/predict', adherencePredictionRoutes);

app.use('/api/chat', chatRoutes);

app.use('/', (req, res) => {
  res.json({ message: 'Medication Tracker API is running' });
});

const port = process.env.PORT || 3000;

app.listen(port, '0.0.0.0', () => {
});

require('./utils/reminderScheduler');
