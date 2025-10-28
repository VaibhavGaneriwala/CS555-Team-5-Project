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
} from 'react-native';
import 'react-native-reanimated';
import '@/global.css';

import ThemeToggle from '@/components/ThemeToggle';

// ✅ Optional: import for Android navigation bar color control
import * as SystemUI from 'expo-system-ui';
import * as NavigationBar from 'expo-navigation-bar';

// ✅ Global notification handler
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    };
  },
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
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) return null;

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const systemScheme = rnUseColorScheme();
  const [manualTheme, setManualTheme] = useState<'light' | 'dark' | null>(null);

  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    setManualTheme(newTheme);
  };

  const effectiveTheme = manualTheme || systemScheme || 'light';
  const isDark = effectiveTheme === 'dark';

  // ✅ Apply web theme logic
  useEffect(() => {
    if (Platform.OS === 'web') {
      const root = document.documentElement;
      root.setAttribute('data-theme', effectiveTheme);
      root.classList.toggle('dark', isDark);
    }
  }, [effectiveTheme]);

  // ✅ Apply Android/iOS system UI theme effects
  useEffect(() => {
    if (Platform.OS !== 'web') {
      // Update status bar for iOS and Android
      StatusBar.setBarStyle(isDark ? 'light-content' : 'dark-content', true);

      if (Platform.OS === 'android') {
        // Update navigation + system bar colors for Android
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
