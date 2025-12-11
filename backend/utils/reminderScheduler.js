const cron = require('node-cron');
const Medication = require('../models/Medication');
const User = require('../models/User');

// Schedule reminders 1 day before medication time
// Runs every hour to check for medications scheduled 1 day from now
cron.schedule('0 * * * *', async () => {
  console.log('⏰ Running reminder scheduler (1 day before check)...');
  try {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDayName = tomorrow.toLocaleString('en-US', { weekday: 'long' });

    const medications = await Medication.find({
      reminderEnabled: true,
      isActive: true
    }).populate('patient');

    for (const med of medications) {
      if (!med.schedule || med.schedule.length === 0) continue;
      
      // Check if medication is active tomorrow
      if (med.startDate && new Date(med.startDate) > tomorrow) continue;
      if (med.endDate && new Date(med.endDate) < tomorrow) continue;

      for (const sched of med.schedule) {
        if (sched.days.includes(tomorrowDayName)) {
          const [hours, minutes] = sched.time.split(':').map(Number);
          const reminderTime = new Date(tomorrow);
          reminderTime.setHours(hours, minutes, 0, 0);
          
          // Check if reminder should be sent now (within current hour)
          const currentHour = now.getHours();
          const reminderHour = reminderTime.getHours();
          
          if (currentHour === reminderHour) {
            console.log(
              `🔔 Reminder (1 day before): ${med.patient?.firstName || "User"} should take ${med.name} (${med.dosage}) tomorrow at ${sched.time}`
            );
            // Here you could send push notifications, emails, or SMS
            // For now, we log it. The frontend handles actual notifications.
          }
        }
      }
    }
  } catch (error) {
    console.error('Reminder Scheduler Error:', error.message);
  }
});

// Legacy function for backward compatibility (if called from routes)
exports.scheduleDailyReminders = async (userId) => {
  try {
    const medications = await Medication.find({
      patient: userId,
      reminderEnabled: true,
      isActive: true
    });

    console.log(`✅ Enabled reminders for ${medications.length} medications for user ${userId}`);
    return { success: true, count: medications.length };
  } catch (error) {
    console.error('Error scheduling reminders:', error);
    throw error;
  }
};
