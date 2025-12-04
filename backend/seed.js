const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
dotenv.config();

const User = require('./models/User');
const Medication = require('./models/Medication');
const connectDB = require('./config/db');

// Connect to database
connectDB();

// Sample data
const states = ['CA', 'NY', 'TX', 'FL', 'IL', 'PA', 'OH', 'GA', 'NC', 'MI'];
const cities = ['Los Angeles', 'New York', 'Houston', 'Miami', 'Chicago', 'Philadelphia', 'Columbus', 'Atlanta', 'Charlotte', 'Detroit'];
const streets = ['Main St', 'Oak Ave', 'Park Blvd', 'Elm St', 'Maple Dr', 'Cedar Ln', 'Pine Rd', 'First St', 'Second Ave', 'Third Blvd'];

const firstNames = {
  male: ['James', 'John', 'Robert', 'Michael', 'William', 'David', 'Richard', 'Joseph', 'Thomas', 'Christopher'],
  female: ['Mary', 'Patricia', 'Jennifer', 'Linda', 'Elizabeth', 'Barbara', 'Susan', 'Jessica', 'Sarah', 'Karen'],
  other: ['Alex', 'Jordan', 'Taylor', 'Casey', 'Morgan', 'Riley', 'Avery', 'Quinn', 'Sage', 'River']
};

const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];

const medicationNames = [
  'Lisinopril', 'Metformin', 'Atorvastatin', 'Amlodipine', 'Omeprazole',
  'Metoprolol', 'Albuterol', 'Gabapentin', 'Hydrochlorothiazide', 'Sertraline'
];

const dosages = ['10mg', '20mg', '50mg', '100mg', '5mg', '25mg', '500mg', '40mg', '80mg', '200mg'];

const frequencies = ['once-daily', 'twice-daily', 'three-times-daily', 'four-times-daily', 'weekly', 'as-needed'];

const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// Generate random date of birth (between 18 and 80 years old)
const randomDateOfBirth = () => {
  const age = Math.floor(Math.random() * 62) + 18; // 18-80 years old
  const year = new Date().getFullYear() - age;
  const month = Math.floor(Math.random() * 12);
  const day = Math.floor(Math.random() * 28) + 1;
  return new Date(year, month, day);
};

// Generate random phone number
const randomPhone = () => {
  return Math.floor(1000000000 + Math.random() * 9000000000).toString();
};

// Generate random address
const randomAddress = (index) => {
  const streetNum = Math.floor(Math.random() * 9999) + 1;
  return {
    streetAddress: `${streetNum} ${streets[index % streets.length]}`,
    city: cities[index % cities.length],
    state: states[index % states.length],
    zipcode: Math.floor(10000 + Math.random() * 90000).toString()
  };
};

// Hash password
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};

// Create users
const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seeding...');

    // Clear existing data (optional - comment out if you want to keep existing data)
    console.log('🗑️  Clearing existing data...');
    await User.deleteMany({});
    await Medication.deleteMany({});
    console.log('✅ Existing data cleared');

    // Create 10 Admins
    console.log('👑 Creating 10 admins...');
    const admins = [];
    for (let i = 0; i < 10; i++) {
      const gender = i % 3 === 0 ? 'male' : i % 3 === 1 ? 'female' : 'other';
      const firstName = firstNames[gender][i % firstNames[gender].length];
      const lastName = lastNames[i % lastNames.length];
      
      const admin = await User.create({
        firstName,
        lastName,
        email: `admin${i + 1}@medtracker.com`,
        password: await hashPassword('Admin123!'),
        role: 'admin',
        phoneNumber: randomPhone(),
        dateOfBirth: randomDateOfBirth(),
        gender,
        address: randomAddress(i),
        isActive: true
      });
      admins.push(admin);
    }
    console.log(`✅ Created ${admins.length} admins`);

    // Create 10 Providers
    console.log('👨‍⚕️ Creating 10 providers...');
    const providers = [];
    for (let i = 0; i < 10; i++) {
      const gender = i % 3 === 0 ? 'male' : i % 3 === 1 ? 'female' : 'other';
      const firstName = firstNames[gender][(i + 5) % firstNames[gender].length];
      const lastName = lastNames[(i + 3) % lastNames.length];
      
      const provider = await User.create({
        firstName,
        lastName,
        email: `provider${i + 1}@medtracker.com`,
        password: await hashPassword('Provider123!'),
        role: 'provider',
        phoneNumber: randomPhone(),
        dateOfBirth: randomDateOfBirth(),
        gender,
        address: randomAddress(i + 10),
        isActive: true,
        patients: [] // Will be populated after patients are created
      });
      providers.push(provider);
    }
    console.log(`✅ Created ${providers.length} providers`);

    // Create 10 Patients
    console.log('🏥 Creating 10 patients...');
    const patients = [];
    for (let i = 0; i < 10; i++) {
      const gender = i % 3 === 0 ? 'male' : i % 3 === 1 ? 'female' : 'other';
      const firstName = firstNames[gender][(i + 2) % firstNames[gender].length];
      const lastName = lastNames[(i + 5) % lastNames.length];
      
      const patient = await User.create({
        firstName,
        lastName,
        email: `patient${i + 1}@medtracker.com`,
        password: await hashPassword('Patient123!'),
        role: 'patient',
        phoneNumber: randomPhone(),
        dateOfBirth: randomDateOfBirth(),
        gender,
        address: randomAddress(i + 20),
        isActive: true,
        provider: [] // Will be populated after providers are created
      });
      patients.push(patient);
    }
    console.log(`✅ Created ${patients.length} patients`);

    // Assign patients to providers (each provider gets 1-2 patients)
    console.log('🔗 Assigning patients to providers...');
    let patientIndex = 0;
    for (let i = 0; i < providers.length && patientIndex < patients.length; i++) {
      const provider = providers[i];
      // Each provider gets at least 1 patient, some get 2
      const numPatients = i < 5 ? 1 : 2; // First 5 get 1, last 5 get 2
      
      for (let j = 0; j < numPatients && patientIndex < patients.length; j++) {
        const patient = patients[patientIndex];
        provider.patients.push(patient._id);
        patient.provider.push(provider._id);
        await provider.save();
        await patient.save();
        patientIndex++;
      }
    }
    console.log('✅ Patients assigned to providers');

    // Create 10 Medications (one for each patient)
    console.log('💊 Creating 10 medications...');
    const medications = [];
    for (let i = 0; i < 10; i++) {
      const patient = patients[i];
      const provider = providers[i % providers.length]; // Assign to a provider
      
      // Create schedule with random times and days
      const schedule = [];
      const numTimes = Math.floor(Math.random() * 2) + 1; // 1-2 times per day
      
      for (let j = 0; j < numTimes; j++) {
        const hour = Math.floor(Math.random() * 12) + 7; // 7 AM to 6 PM
        const minute = Math.random() < 0.5 ? 0 : 30;
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        
        // Random days of the week
        const numDays = Math.floor(Math.random() * 5) + 3; // 3-7 days
        const selectedDays = [];
        const shuffledDays = [...daysOfWeek].sort(() => Math.random() - 0.5);
        for (let k = 0; k < numDays; k++) {
          selectedDays.push(shuffledDays[k]);
        }
        
        schedule.push({
          time,
          days: selectedDays
        });
      }

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - Math.floor(Math.random() * 30)); // Started 0-30 days ago
      
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + Math.floor(Math.random() * 180) + 30); // Ends 30-210 days from start

      const medication = await Medication.create({
        patient: patient._id,
        name: medicationNames[i % medicationNames.length],
        dosage: dosages[i % dosages.length],
        frequency: frequencies[i % frequencies.length],
        schedule,
        startDate,
        endDate,
        instructions: `Take with food. Do not skip doses. Contact provider if side effects occur.`,
        prescribedBy: provider._id,
        isActive: true,
        reminderEnabled: true
      });
      medications.push(medication);
    }
    console.log(`✅ Created ${medications.length} medications`);

    // Summary
    console.log('\n📊 Seeding Summary:');
    console.log(`   👑 Admins: ${admins.length}`);
    console.log(`   👨‍⚕️ Providers: ${providers.length}`);
    console.log(`   🏥 Patients: ${patients.length}`);
    console.log(`   💊 Medications: ${medications.length}`);
    console.log('\n✅ Database seeding completed successfully!');
    console.log('\n📝 Login Credentials:');
    console.log('   Admins: admin1@medtracker.com - admin10@medtracker.com (Password: Admin123!)');
    console.log('   Providers: provider1@medtracker.com - provider10@medtracker.com (Password: Provider123!)');
    console.log('   Patients: patient1@medtracker.com - patient10@medtracker.com (Password: Patient123!)');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

// Run seed
seedDatabase();

