import React from 'react';
import { Stack, router } from 'expo-router';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function ProviderLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTitleAlign: 'center',
        headerLeft: () => (
          <TouchableOpacity
            activeOpacity={0.6}
            onPress={() => router.push('/(provider)/ProviderHome')}
            style={{ marginLeft: 15 }}
          >
            <Ionicons name="home-outline" size={24} className={'text-black dark:text-white'}/>
          </TouchableOpacity>
        ),
        headerRight: () => (
          <TouchableOpacity
            activeOpacity={0.6}
            onPress={() => router.push('/')}
            style={{ marginRight: 15 }}
          >
            <Ionicons name="exit-outline" size={24} className={'text-black dark:text-white'}/>
          </TouchableOpacity>
        ),
      }}
    />
  );
}