import React from 'react';
import { Stack, router } from 'expo-router';
import { TouchableOpacity, useColorScheme, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function PatientLayout() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  // For native platforms
  const iconColor = isDark ? '#ffffff' : '#000000';

  // For web, we’ll still use Tailwind’s dark mode classes
  const iconProps = Platform.select({
    web: { className: 'text-black dark:text-white' },
    default: { color: iconColor },
  });

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTitleAlign: 'center',
        headerLeft: () => (
          <TouchableOpacity
            onPress={() => router.push('/(patient)/PatientHome')}
            style={{ marginLeft: 15 }}
          >
            <Ionicons name="home-outline" size={24} {...iconProps} />
          </TouchableOpacity>
        ),
        headerRight: () => (
          <TouchableOpacity
            onPress={() => router.push('/')}
            style={{ marginRight: 15 }}
          >
            <Ionicons name="exit-outline" size={24} {...iconProps} />
          </TouchableOpacity>
        ),
      }}
    />
  );
}
