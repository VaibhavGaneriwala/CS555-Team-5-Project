import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AdminNavbar from '@/components/AdminNavbar';
import { API_URL } from '@/utils/apiConfig';

interface CurrentUser {
  firstName: string;
  lastName: string;
  email: string;
}

export default function SystemStatus() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (!token) {
          setLoading(false);
          return;
        }

        const response = await fetch(`${API_URL}/api/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          setCurrentUser({
            firstName: data.firstName || '',
            lastName: data.lastName || '',
            email: data.email || '',
          });
        }
      } catch (err) {
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentUser();
  }, []);

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      <AdminNavbar />
      <ScrollView className="flex-1">
        <View className="px-4 pt-6 pb-8">
          {/* Back Button */}
          <TouchableOpacity
            onPress={() => router.back()}
            className="mb-4 flex-row items-center"
            activeOpacity={0.7}
          >
            <View className="bg-white dark:bg-gray-800 rounded-full p-2 shadow-md border border-gray-200 dark:border-gray-700">
              <Ionicons name="arrow-back" size={20} color="#7c3aed" />
            </View>
            <Text className="text-gray-700 dark:text-gray-300 font-semibold ml-2">
              Back
            </Text>
          </TouchableOpacity>

          {/* Header */}
          <View className="mb-6">
            <Text className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              System Information
            </Text>
            <Text className="text-gray-600 dark:text-gray-400">
              Database and system configuration
            </Text>
          </View>

        {/* Logged In User Info */}
        {loading ? (
          <View className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-md border border-gray-200 dark:border-gray-700 mb-4">
            <ActivityIndicator size="small" color="#2563eb" />
          </View>
        ) : currentUser ? (
          <View className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-md border border-gray-200 dark:border-gray-700 mb-4">
            <View className="flex-row items-center mb-4">
              <Ionicons name="person-circle-outline" size={24} color="#2563eb" />
              <Text className="text-lg font-semibold text-gray-900 dark:text-white ml-2">
                Logged In User
              </Text>
            </View>
            <View className="space-y-2">
              <View className="flex-row justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                <Text className="text-gray-600 dark:text-gray-400">Name</Text>
                <Text className="text-gray-900 dark:text-white font-semibold">
                  {currentUser.firstName} {currentUser.lastName}
                </Text>
              </View>
              <View className="flex-row justify-between py-2">
                <Text className="text-gray-600 dark:text-gray-400">Email</Text>
                <Text className="text-gray-900 dark:text-white font-mono text-sm">
                  {currentUser.email}
                </Text>
              </View>
            </View>
          </View>
        ) : null}

        {/* System Info Cards */}
        <View className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-md border border-gray-200 dark:border-gray-700 mb-4">
          <View className="flex-row items-center mb-4">
            <Ionicons name="server-outline" size={24} color="#2563eb" />
            <Text className="text-lg font-semibold text-gray-900 dark:text-white ml-2">
              API Configuration
            </Text>
          </View>
          <View className="space-y-2">
            <View className="flex-row justify-between py-2 border-b border-gray-200 dark:border-gray-700">
              <Text className="text-gray-600 dark:text-gray-400">API URL</Text>
              <Text className="text-gray-900 dark:text-white font-mono text-sm">
                {API_URL}
              </Text>
            </View>
            <View className="flex-row justify-between py-2">
              <Text className="text-gray-600 dark:text-gray-400">Environment</Text>
              <Text className="text-gray-900 dark:text-white">
                {Constants.expoConfig?.extra?.API_URL ? 'Production' : 'Development'}
              </Text>
            </View>
          </View>
        </View>

        <View className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-md border border-gray-200 dark:border-gray-700 mb-4">
          <View className="flex-row items-center mb-4">
            <Ionicons name="information-circle-outline" size={24} color="#059669" />
            <Text className="text-lg font-semibold text-gray-900 dark:text-white ml-2">
              Database Management
            </Text>
          </View>
          <Text className="text-gray-600 dark:text-gray-400 mb-4">
            Database operations are managed through the backend API. Use the admin dashboard
            to view statistics and manage users, medications, and adherence logs.
          </Text>
          <View className="space-y-2">
            <Text className="text-sm text-gray-500 dark:text-gray-500">
              • User management available in User Management page
            </Text>
            <Text className="text-sm text-gray-500 dark:text-gray-500">
              • Statistics available in Admin Dashboard
            </Text>
            <Text className="text-sm text-gray-500 dark:text-gray-500">
              • All database operations require admin authentication
            </Text>
          </View>
        </View>

        <View className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-md border border-gray-200 dark:border-gray-700 mb-6">
          <View className="flex-row items-center mb-4">
            <Ionicons name="shield-checkmark-outline" size={24} color="#7c3aed" />
            <Text className="text-lg font-semibold text-gray-900 dark:text-white ml-2">
              Security
            </Text>
          </View>
          <View className="space-y-2">
            <Text className="text-sm text-gray-600 dark:text-gray-400">
              All admin operations are protected by:
            </Text>
            <Text className="text-sm text-gray-500 dark:text-gray-500">
              • JWT token authentication
            </Text>
            <Text className="text-sm text-gray-500 dark:text-gray-500">
              • Role-based access control (RBAC)
            </Text>
            <Text className="text-sm text-gray-500 dark:text-gray-500">
              • Secure password hashing (bcrypt)
            </Text>
          </View>
        </View>
        </View>
      </ScrollView>
    </View>
  );
}
