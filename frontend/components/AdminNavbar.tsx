import React from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AdminNavbar = React.memo(function AdminNavbar() {
  const handleLogout = async () => {
    await AsyncStorage.removeItem('token');
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.location.href = '/';
      return;
    }
    
    requestAnimationFrame(() => {
      setTimeout(() => {
        try {
          if (typeof global !== 'undefined' || typeof window !== 'undefined') {
            const expoRouter = require('expo-router');
            if (expoRouter) {
              const router = expoRouter.router || expoRouter.default?.router || expoRouter.default || expoRouter;
              if (router && typeof router.replace === 'function') {
                router.replace('/');
              }
            }
          }
        } catch (err) {
        }
      }, 500);
    });
  };

  const handleHomePress = () => {
    requestAnimationFrame(() => {
      setTimeout(() => {
        try {
          if (typeof global !== 'undefined' || typeof window !== 'undefined') {
            const expoRouter = require('expo-router');
            if (expoRouter) {
              const router = expoRouter.router || expoRouter.default?.router || expoRouter.default || expoRouter;
              if (router && typeof router.push === 'function') {
                router.push('/(admin)/AdminHome');
              }
            }
          }
        } catch (err) {
        }
      }, 500);
    });
  };

  return (
    <SafeAreaView className="bg-white dark:bg-gray-800">
      <View className="border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <View className="flex-row items-center justify-between px-2 sm:px-4 py-2 sm:py-3 relative">
        <View className="w-16" />

        <TouchableOpacity
          onPress={handleHomePress}
          className="absolute left-0 right-0 flex-row items-center justify-center"
          activeOpacity={0.7}
        >
          <View className="flex-row items-center">
            <Ionicons name="shield-checkmark" size={20} color="#2563eb" />
            <Text className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white ml-2">
              Admin Dashboard
            </Text>
          </View>
        </TouchableOpacity>

        {/* Logout Button - Right */}
        <TouchableOpacity
          onPress={handleLogout}
          className="px-2 sm:px-4 py-2 rounded-lg bg-red-500 flex-row items-center"
          activeOpacity={0.7}
        >
          <Ionicons name="log-out-outline" size={16} color="#fff" />
          <Text className="ml-1 sm:ml-2 text-xs sm:text-sm font-semibold text-white">Logout</Text>
        </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}, () => true);

AdminNavbar.displayName = 'AdminNavbar';

export default AdminNavbar;
