import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect } from 'react';
import {
  View,
  Platform,
  StatusBar,
} from 'react-native';

import 'react-native-reanimated';
import '@/global.css';

import ThemeToggle from '@/components/ThemeToggle';

// NativeWind (v4)
import { useColorScheme as useNativeWindColorScheme } from "nativewind";

// Android UI control
import * as SystemUI from 'expo-system-ui';
import * as NavigationBar from 'expo-navigation-bar';

// Notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: 'index',
};

// Keep splash screen visible until fonts loaded
SplashScreen.preventAutoHideAsync();

// ======================================================
// ROOT: Load fonts, wrap with NativeWind theme auto-handler
// ======================================================
export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  // NO ThemeProvider needed for NativeWind v4
  return <RootLayoutNav />;
}

// ======================================================
// MAIN NAV + UI WRAPPER WITH NativeWind THEME
// ======================================================
function RootLayoutNav() {
  const { colorScheme } = useNativeWindColorScheme();
  const isDark = colorScheme === "dark";

  // Sync system UI: status bar + Android nav
  useEffect(() => {
    StatusBar.setBarStyle(isDark ? "light-content" : "dark-content");

    if (Platform.OS === "android") {
      const bg = isDark ? "#0d1117" : "#ffffff";
      SystemUI.setBackgroundColorAsync(bg);
      NavigationBar.setBackgroundColorAsync(bg);
      NavigationBar.setButtonStyleAsync(isDark ? "light" : "dark");
    }
  }, [isDark]);

  return (
    <NavigationThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <View
        className={`flex-1 transition-colors duration-300 ${
          isDark ? "bg-[#0d1117]" : "bg-white"
        }`}
      >
        <StatusBar
          animated
          backgroundColor={isDark ? "#0d1117" : "#ffffff"}
          barStyle={isDark ? "light-content" : "dark-content"}
        />

        <Stack
          screenOptions={{
            headerShown: false,
          }}
        >
          {/* Root + modal routes */}
          <Stack.Screen name="index" />
          <Stack.Screen name="modal" options={{ presentation: "modal" }} />

          {/* Admin */}
          <Stack.Screen name="(admin)" />

          {/* Patient */}
          <Stack.Screen name="(patient)" />

          {/* Provider */}
          <Stack.Screen name="(provider)" />
        </Stack>

        {/* Floating theme toggle */}
        <View className="absolute bottom-8 right-8">
          <ThemeToggle />
        </View>
      </View>
    </NavigationThemeProvider>
  );
}
