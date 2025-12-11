import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { TouchableOpacity, useColorScheme, Platform, View, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function PatientLayout() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
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

  const iconColor = isDark ? '#ffffff' : '#000000';

  const iconProps = Platform.select({
    web: { className: 'text-black dark:text-white' },
    default: { color: iconColor },
  });

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white dark:bg-gray-900" edges={['top', 'bottom']}>
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      </SafeAreaView>
    );
  }

  // Don't render protected routes if not authenticated (redirect will happen)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTitleAlign: 'center',
        headerLeft: () => (
          <TouchableOpacity
            onPress={() => {
              try {
                const { router } = require('expo-router');
                if (router && router.push) {
                  router.push('/(patient)/PatientHome');
                }
              } catch {
              }
            }}
            style={{ marginLeft: 15 }}
          >
            <Ionicons name="home-outline" size={24} {...iconProps} />
          </TouchableOpacity>
        ),
        headerRight: () => (
          <TouchableOpacity
            onPress={async () => {
              try {
                await AsyncStorage.removeItem('token');
                const { router } = require('expo-router');
                if (router && router.replace) {
                  router.replace('/');
                }
              } catch (err) {
                console.error('Logout error:', err);
                // Still try to navigate even if token removal fails
                try {
                  const { router } = require('expo-router');
                  if (router && router.replace) {
                    router.replace('/');
                  }
                } catch {
                }
              }
            }}
            style={{ marginRight: 15 }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="exit-outline" size={24} {...iconProps} />
          </TouchableOpacity>
        ),
      }}
    />
  );
}
