import { Platform, Alert } from "react-native";

export async function registerForPushNotificationsAsync() {
  // ✅ Skip web completely
  if (Platform.OS === "web") {
    console.log("ℹ️ Skipping push registration on web (no service worker)");
    return;
  }

  // Dynamically import to avoid SSR/localStorage issues
  const [NotificationsModule, DeviceModule] = await Promise.all([
    import("expo-notifications"),
    import("expo-device"),
  ]);

  const Notifications = NotificationsModule.default || NotificationsModule;
  const Device = DeviceModule.default || DeviceModule;

  if (!Device.isDevice) {
    console.log("⚠️ Must use a physical device for notifications");
    return;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("❌ Permission not granted for notifications");
    return;
  }

  const token = (await Notifications.getExpoPushTokenAsync()).data;
  console.log("✅ Expo push token:", token);
  return token;
}

// Store web alert timeouts for cleanup
const webAlertTimeouts: Map<string, ReturnType<typeof setTimeout>> = new Map();

// Schedule medication reminder notification 1 day before
export async function scheduleMedicationReminder(
  medicationId: string,
  medicationName: string,
  dosage: string,
  scheduledDate: Date,
  scheduledTime: string
) {
  if (Platform.OS === "web") {
    // For web, use browser alerts
    const reminderDate = new Date(scheduledDate);
    const [hours, minutes] = scheduledTime.split(":").map(Number);
    reminderDate.setHours(hours, minutes, 0, 0);
    reminderDate.setDate(reminderDate.getDate() - 1); // 1 day before

    const now = new Date();
    const timeUntilReminder = reminderDate.getTime() - now.getTime();

    // Clear existing timeout for this medication
    const existingTimeout = webAlertTimeouts.get(medicationId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    if (timeUntilReminder > 0 && timeUntilReminder < 7 * 24 * 60 * 60 * 1000) {
      // Only schedule if within 7 days (to avoid very long timeouts)
      const timeout = setTimeout(() => {
        Alert.alert(
          "Medication Reminder",
          `Don't forget: ${medicationName} (${dosage}) is scheduled for tomorrow at ${scheduledTime}`,
          [{ text: "OK" }]
        );
        webAlertTimeouts.delete(medicationId);
      }, timeUntilReminder);
      webAlertTimeouts.set(medicationId, timeout);
    }
    return;
  }

  // For mobile, use expo-notifications
  try {
    const NotificationsModule = await import("expo-notifications");
    const Notifications = NotificationsModule.default || NotificationsModule;

    // Request permissions if not already granted
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") {
      const { status: newStatus } = await Notifications.requestPermissionsAsync();
      if (newStatus !== "granted") {
        console.log("❌ Notification permission not granted");
        return;
      }
    }

    // Calculate reminder time (1 day before scheduled time)
    const reminderDate = new Date(scheduledDate);
    const [hours, minutes] = scheduledTime.split(":").map(Number);
    reminderDate.setHours(hours, minutes, 0, 0);
    reminderDate.setDate(reminderDate.getDate() - 1); // 1 day before

    const now = new Date();
    if (reminderDate <= now) {
      // If reminder time has passed, schedule for next occurrence
      reminderDate.setDate(reminderDate.getDate() + 7); // Next week
    }

    // Cancel any existing notification for this medication
    await Notifications.cancelScheduledNotificationAsync(medicationId);

    // Calculate seconds until reminder
    const secondsUntilReminder = Math.floor((reminderDate.getTime() - now.getTime()) / 1000);
    
    if (secondsUntilReminder > 0) {
      // Schedule the notification using date trigger
      await Notifications.scheduleNotificationAsync({
        identifier: medicationId,
        content: {
          title: "Medication Reminder",
          body: `Don't forget: ${medicationName} (${dosage}) is scheduled for tomorrow at ${scheduledTime}`,
          sound: true,
          data: {
            medicationId,
            medicationName,
            dosage,
            scheduledTime,
          },
        },
        trigger: reminderDate as any, // expo-notifications accepts Date directly
      });
    }

    console.log(`✅ Scheduled reminder for ${medicationName} on ${reminderDate.toLocaleString()}`);
  } catch (error) {
    console.error("Error scheduling notification:", error);
  }
}

// Cancel all medication reminders
export async function cancelAllMedicationReminders() {
  if (Platform.OS === "web") {
    // Clear all web alert timeouts
    webAlertTimeouts.forEach((timeout) => {
      if (timeout) clearTimeout(timeout);
    });
    webAlertTimeouts.clear();
    return;
  }

  try {
    const NotificationsModule = await import("expo-notifications");
    const Notifications = NotificationsModule.default || NotificationsModule;

    const allNotifications = await Notifications.getAllScheduledNotificationsAsync();
    const medicationNotifications = allNotifications.filter(
      (notif) => notif.content.data?.medicationId
    );

    for (const notif of medicationNotifications) {
      await Notifications.cancelScheduledNotificationAsync(notif.identifier);
    }

    console.log(`✅ Cancelled ${medicationNotifications.length} medication reminders`);
  } catch (error) {
    console.error("Error cancelling notifications:", error);
  }
}

// Schedule reminders for all upcoming medications
export async function scheduleAllMedicationReminders(medications: any[]) {
  // Cancel existing reminders first
  await cancelAllMedicationReminders();

  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  for (const med of medications) {
    if (!med.schedule || med.schedule.length === 0) continue;
    if (med.endDate && new Date(med.endDate) < tomorrow) continue;
    if (med.startDate && new Date(med.startDate) > tomorrow) continue;

    const tomorrowDayName = tomorrow.toLocaleDateString("en-US", { weekday: "long" });

    for (const schedule of med.schedule) {
      if (schedule.days.includes(tomorrowDayName)) {
        await scheduleMedicationReminder(
          med._id,
          med.name,
          med.dosage,
          tomorrow,
          schedule.time
        );
      }
    }
  }
}
