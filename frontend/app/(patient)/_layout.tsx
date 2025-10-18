import React from 'react';
import { Stack, router } from 'expo-router';
import { TouchableOpacity, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function PatientLayout() {
  const colorScheme = useColorScheme();
  const iconColor = colorScheme === 'dark' ? 'white' : 'black';

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
            <Ionicons name="home-outline" size={24} color={iconColor} />
          </TouchableOpacity>
        ),
        headerRight: () => (
          <TouchableOpacity
            onPress={() => router.push('/')}
            style={{ marginRight: 15 }}
          >
            <Ionicons name="exit-outline" size={24} color={iconColor} />
          </TouchableOpacity>
        ),
      }}
    />
  );
}