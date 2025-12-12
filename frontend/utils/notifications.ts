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

type ScheduleEntry = { time: string; days?: string[] };
type MedicationLike = {
  _id: string;
  name: string;
  dosage: string;
  frequency?: string;
  startDate?: string;
  endDate?: string;
  schedule?: ScheduleEntry[];
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function toDateOrNull(value?: string) {
  if (!value) return null;
  const d = new Date(value);
  // invalid date check
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function dateKey(d: Date) {
  return d.toISOString().split("T")[0];
}

function weekdayName(d: Date) {
  return d.toLocaleDateString("en-US", { weekday: "long" });
}

function isDailyFrequency(freq?: string) {
  const f = (freq || "").toLowerCase();
  return (
    f === "once-daily" ||
    f === "twice-daily" ||
    f === "three-times-daily" ||
    f === "four-times-daily"
  );
}

function scheduleEntryAppliesOnDate(
  med: MedicationLike,
  entry: ScheduleEntry,
  doseDate: Date
) {
  // If days provided, respect them.
  const days = entry.days || [];
  if (days.length > 0) {
    return days.includes(weekdayName(doseDate));
  }

  // If no days provided:
  // - For daily frequencies, treat as "every day"
  // - For other frequencies, we cannot infer → don't schedule.
  return isDailyFrequency(med.frequency);
}

// Schedule medication reminder notification 1 day before
export async function scheduleMedicationReminder(
  notificationId: string,
  medicationId: string,
  medicationName: string,
  dosage: string,
  scheduledDoseDate: Date,
  scheduledTime: string
) {
  if (Platform.OS === "web") {
    // For web, use browser alerts
    const reminderDate = new Date(scheduledDoseDate);
    const [hours, minutes] = scheduledTime.split(":").map(Number);
    reminderDate.setHours(hours, minutes, 0, 0);
    reminderDate.setDate(reminderDate.getDate() - 1); // 1 day before

    const now = new Date();
    const timeUntilReminder = reminderDate.getTime() - now.getTime();

    // Clear existing timeout for this specific reminder
    const existingTimeout = webAlertTimeouts.get(notificationId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    if (timeUntilReminder > 0 && timeUntilReminder < 31 * 24 * 60 * 60 * 1000) {
      // Only schedule if within ~30 days (avoid very long timeouts)
      const timeout = setTimeout(() => {
        Alert.alert(
          "Medication Reminder",
          `Don't forget: ${medicationName} (${dosage}) is scheduled for tomorrow at ${scheduledTime}`,
          [{ text: "OK" }]
        );
        webAlertTimeouts.delete(notificationId);
      }, timeUntilReminder);
      webAlertTimeouts.set(notificationId, timeout);
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
    const reminderDate = new Date(scheduledDoseDate);
    const [hours, minutes] = scheduledTime.split(":").map(Number);
    reminderDate.setHours(hours, minutes, 0, 0);
    reminderDate.setDate(reminderDate.getDate() - 1); // 1 day before

    const now = new Date();
    if (reminderDate > now) {
      await Notifications.scheduleNotificationAsync({
        // We pass an identifier if supported; otherwise expo generates one.
        identifier: notificationId,
        content: {
          title: "Medication Reminder",
          body: `Don't forget: ${medicationName} (${dosage}) is scheduled for tomorrow at ${scheduledTime}`,
          sound: true,
          data: {
            medicationId,
            medicationName,
            dosage,
            scheduledTime,
            scheduledDoseDate: scheduledDoseDate.toISOString(),
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
export async function scheduleAllMedicationReminders(medications: MedicationLike[]) {
  // Cancel existing reminders first
  await cancelAllMedicationReminders();

  const now = new Date();
  const todayStart = startOfDay(now);
  const tomorrowStart = new Date(todayStart.getTime() + MS_PER_DAY);

  // We can't reliably schedule an unbounded number of notifications on-device.
  // So we schedule for a rolling window ahead and re-run whenever meds refresh / app opens.
  const WINDOW_DAYS_AHEAD = 30;
  const windowEnd = new Date(todayStart.getTime() + WINDOW_DAYS_AHEAD * MS_PER_DAY);

  for (const med of medications) {
    const schedule = med.schedule || [];
    // If no schedule is mentioned, don't send reminders.
    if (schedule.length === 0) continue;

    // Require at least one valid time; if schedule entries have no time, skip.
    const hasAnyTime = schedule.some((s) => typeof s.time === "string" && s.time.includes(":"));
    if (!hasAnyTime) continue;

    const start = toDateOrNull(med.startDate) || null;
    const end = toDateOrNull(med.endDate) || null;

    // Dose dates start from tomorrow (because reminder is 1 day before dose time).
    let doseDateStart = tomorrowStart;
    if (start) {
      const startDay = startOfDay(start);
      if (startDay > doseDateStart) doseDateStart = startDay;
    }

    let doseDateEnd = windowEnd;
    if (end) {
      const endDay = startOfDay(end);
      if (endDay < doseDateEnd) doseDateEnd = endDay;
    }

    // If out of range, skip.
    if (doseDateStart > doseDateEnd) continue;

    // Iterate each day in the range and schedule reminders based on schedule/frequency.
    for (
      let d = new Date(doseDateStart);
      d <= doseDateEnd;
      d = new Date(d.getTime() + MS_PER_DAY)
    ) {
      // For once-daily: send daily between start/end at the given schedule time.
      // If multiple schedule times exist, we schedule all of them (covers multi-dose cases too).
      for (const entry of schedule) {
        if (!entry?.time || typeof entry.time !== "string" || !entry.time.includes(":"))
          continue;
        if (!scheduleEntryAppliesOnDate(med, entry, d)) continue;

        const id = `${med._id}:${dateKey(d)}:${entry.time}`;
        await scheduleMedicationReminder(
          id,
          med._id,
          med.name,
          med.dosage,
          d,
          entry.time
        );
      }
    }
  }
}
