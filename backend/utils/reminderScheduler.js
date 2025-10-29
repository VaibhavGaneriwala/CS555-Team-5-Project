const cron = require('node-cron');
const Medication = require('../models/Medication');
const User = require('../models/User');

// Runs every minute for demo
cron.schedule('* * * * *', async () => {
  console.log('⏰ Running reminder scheduler...');
  try {
    const now = new Date();
    const today = now.toLocaleString('en-US', { weekday: 'long' });

    const medications = await Medication.find({
      reminderEnabled: true,
      isActive: true
    }).populate('patient');

    for (const med of medications) {
      for (const sched of med.schedule) {
        if (sched.days.includes(today)) {
          const [hours, minutes] = sched.time.split(':').map(Number);
          const medTime = new Date();
          medTime.setHours(hours, minutes, 0, 0);

          const diff = (medTime - now) / (1000 * 60);

          if (diff >= 0 && diff <= 5) {
            console.log(
              `🔔 Reminder: ${med.patient?.firstName || "User"} should take ${med.name} (${med.dosage}) at ${sched.time}`
            );
          }
        }
      }
    }
  } catch (error) {
    console.error('Reminder Scheduler Error:', error.message);
  }
});
