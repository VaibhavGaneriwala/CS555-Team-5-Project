import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect, useState } from 'react';
import {
  View,
  useColorScheme as rnUseColorScheme,
  Platform,
  StatusBar,
  Appearance,
} from 'react-native';
import 'react-native-reanimated';
import '@/global.css';

import ThemeToggle from '@/components/ThemeToggle';

// ✅ Android system bar customization
import * as SystemUI from 'expo-system-ui';
import * as NavigationBar from 'expo-navigation-bar';

// ✅ Optional persistence
import AsyncStorage from '@react-native-async-storage/async-storage';

// ✅ Global notification handler
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

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

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

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const systemScheme = rnUseColorScheme();
  const [manualTheme, setManualTheme] = useState<'light' | 'dark' | null>(null);

  // ✅ Load persisted theme
  useEffect(() => {
    (async () => {
      const stored = await AsyncStorage.getItem('theme');
      if (stored) setManualTheme(stored as 'light' | 'dark');
    })();
  }, []);

  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    setManualTheme(newTheme);
    AsyncStorage.setItem('theme', newTheme);
  };

  const effectiveTheme = manualTheme || systemScheme || 'light';
  const isDark = effectiveTheme === 'dark';

  // ✅ Sync dark mode for NativeWind + Web
  useEffect(() => {
    // 🔹 Force NativeWind to apply correct theme (v4.2+)
    Appearance.setColorScheme?.(effectiveTheme as 'light' | 'dark');

    // 🔹 Web DOM sync
    if (Platform.OS === 'web') {
      const root = document.documentElement;
      root.setAttribute('data-theme', effectiveTheme);
      root.classList.toggle('dark', effectiveTheme === 'dark');
    }
  }, [effectiveTheme]);

  // ✅ Apply system UI theme effects for mobile
  useEffect(() => {
    if (Platform.OS !== 'web') {
      StatusBar.setBarStyle(isDark ? 'light-content' : 'dark-content', true);

      if (Platform.OS === 'android') {
        SystemUI.setBackgroundColorAsync(isDark ? '#0d1117' : '#ffffff');
        NavigationBar.setBackgroundColorAsync(isDark ? '#0d1117' : '#ffffff');
        NavigationBar.setButtonStyleAsync(isDark ? 'light' : 'dark');
      }
    }
  }, [effectiveTheme]);

  return (
    <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <View
        className={`flex-1 transition-colors duration-300 ${
          isDark ? 'bg-[#0d1117]' : 'bg-white'
        }`}
      >
        <StatusBar
          animated
          backgroundColor={isDark ? '#0d1117' : '#ffffff'}
          barStyle={isDark ? 'light-content' : 'dark-content'}
        />

        <Stack
          screenOptions={{
            headerShown: false,
          }}
        >
          {/* 🔐 Root + Modal Routes */}
          <Stack.Screen name="index" />
          <Stack.Screen name="modal" options={{ presentation: 'modal' }} />

          {/* 👑 Admin Routes */}
          <Stack.Screen name="(admin)" options={{ headerShown: false }} />

          {/* 💊 Patient Routes */}
          <Stack.Screen name="(patient)" options={{ headerShown: false }} />

          {/* 🩺 Provider Routes */}
          <Stack.Screen name="(provider)" options={{ headerShown: false }} />
        </Stack>

        {/* 🌙 Floating Theme Toggle */}
        <View className="absolute bottom-8 right-8">
          <ThemeToggle onThemeChange={handleThemeChange} />
        </View>
      </View>
    </ThemeProvider>
  );
}
