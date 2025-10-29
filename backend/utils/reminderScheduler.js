const cron = require('node-cron');
const Medication = require('../models/Medication');
const User = require('../models/User');

// This job runs every minute for demo; change to '*/10 * * * *' to run every 10 min
cron.schedule('* * * * *', async () => {
  console.log('⏰ Running reminder scheduler...');
  try {
    const now = new Date();
    const medications = await Medication.find({
      reminderEnabled: true,
      isActive: true
    }).populate('patient');

    for (const med of medications) {
      for (const sched of med.schedule) {
        const today = now.toLocaleString('en-US', { weekday: 'long' });
        if (sched.days.includes(today)) {
          const [hours, minutes] = sched.time.split(':').map(Number);
          const medTime = new Date(now);
          medTime.setHours(hours, minutes, 0, 0);

          const diff = (medTime - now) / (1000 * 60);
          if (diff >= 0 && diff <= 5) {
            console.log(
              `🔔 Reminder: ${med.patient.firstName} should take ${med.name} (${med.dosage}) at ${sched.time}`
            );
          }
        }
      }
    }
  } catch (error) {
    console.error('Reminder Scheduler Error:', error.message);
  }
});
