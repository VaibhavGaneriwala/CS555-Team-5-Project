import 'dotenv/config';

export default {
  expo: {
    name: "MAT HealthTech",
    slug: "mat-healthtech",
    description: "Medication Adherence Tracker – Smart reminders, real-time adherence monitoring, and secure patient-provider communication.",
    version: "1.0.0",

    orientation: "portrait",
    scheme: "mat",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,

    icon: "./assets/images/logo.png",

    splash: {
      image: "./assets/images/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff",
    },

    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.danielstorms.medtracker",
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
      },
      icon: "./assets/images/logo.png",
    },

    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#ffffff",
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      package: "com.medtracker.frontend",
      icon: "./assets/images/logo.png",
    },

    // ⭐ WEB CONFIGURATION (THIS CONTROLS THE TAB TITLE + FAVICON + PWA SETTINGS)
    web: {
      bundler: "metro",
      output: "static",

      favicon: "./assets/images/logo.png",   // <-- Use your logo as favicon

      // Title shown in browser tab
      name: "MAT HealthTech",

      // PWA Manifest values
      shortName: "MAT",
      themeColor: "#4F46E5",
      backgroundColor: "#ffffff",
      display: "standalone",

      // Optional metadata
      meta: {
        appleMobileWebAppCapable: "yes",
        appleMobileWebAppStatusBarStyle: "black-translucent",
        description: "A modern medication adherence tracker for patients and providers.",
      },
    },

    plugins: ["expo-router"],

    experiments: {
      typedRoutes: true,
    },

    extra: {
      API_URL: process.env.EXPO_PUBLIC_API_URL,
      eas: {
        projectId: "85f31d38-6202-4e49-a8f3-dd19c3170fe8",
      },
    },
  },
};
