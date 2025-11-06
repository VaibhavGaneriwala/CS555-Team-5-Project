const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();
const connectDB = require('./config/db');
console.log(`PORT from env: "${process.env.PORT}"`);
const app = express();
const providerRoutes = require('./routes/provider');

connectDB();

app.use(cors());
app.use(express.json());

// Auth, medications, adherence routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/provider', providerRoutes);
app.use('/api/medications', require('./routes/medications'));
app.use('/api/patient', require('./routes/patient'));
app.use('/api/adherence', require('./routes/adherence'));

const port = process.env.PORT

// Default to home route
app.use('/', (req, res) => {
    res.json({message: 'Medication Tracker API is running'});
});

app.listen(port, () => {
    console.log("Server is running on port 3000");
});

require('./utils/reminderScheduler');