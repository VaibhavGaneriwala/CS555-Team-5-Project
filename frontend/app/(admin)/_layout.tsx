import React from 'react';
import { Stack, router } from 'expo-router';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function AdminLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTitleAlign: 'center',
        headerLeft: () => (
          <TouchableOpacity
            onPress={() => router.push('/(admin)/AdminHome')}
            style={{ marginLeft: 15 }}
          >
            <Ionicons name="home-outline" size={24} color="black" />
          </TouchableOpacity>
        ),
        headerRight: () => (
          <TouchableOpacity
            onPress={() => router.push('/')}
            style={{ marginRight: 15 }}
          >
            <Ionicons name="exit-outline" size={24} color="black" />
          </TouchableOpacity>
        ),
      }}
    />
  );
}