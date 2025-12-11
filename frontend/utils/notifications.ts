import { Platform } from "react-native";

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
