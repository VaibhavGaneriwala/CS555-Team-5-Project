import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ProviderLayout() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (token) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
          setTimeout(() => {
            try {
              const { router } = require('expo-router');
              if (router && router.replace) {
                router.replace('/');
              }
            } catch {
            }
          }, 500);
        }
      } catch {
        setIsAuthenticated(false);
        setTimeout(() => {
          try {
            const { router } = require('expo-router');
            if (router && router.replace) {
              router.replace('/');
            }
          } catch {
          }
        }, 500);
      } finally {
        setIsLoading(false);
      }
    };

    const timer = setTimeout(checkAuth, 300);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white dark:bg-gray-900" edges={['top', 'bottom']}>
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      </SafeAreaView>
    );
  }

  // Always return Stack to maintain navigation context
  // If not authenticated, the redirect will happen via useEffect
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}