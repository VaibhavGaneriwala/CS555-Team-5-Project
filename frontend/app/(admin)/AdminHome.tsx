import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';

export default function AdminHome() {
  return (
    <View className="flex-1 items-center justify-center bg-white dark:bg-gray-900 px-4">
      <Text className="text-3xl font-bold mb-8 text-gray-800 dark:text-white">
        Admin Dashboard
      </Text>

      <View className="w-11/12 bg-gray-200 dark:bg-gray-700 p-6 rounded-xl max-w-[600px] mb-6">
        <Text className="text-gray-700 dark:text-gray-200 text-center">
          Admin Quick Actions Placeholder
        </Text>
      </View>

      <TouchableOpacity
        onPress={() => router.push('/(admin)/ViewUsers')}
        activeOpacity={0.8}
        className="bg-blue-500 px-6 py-3 rounded-xl max-w-[300px] mb-4 w-11/12"
      >
        <Text className="text-white text-lg font-semibold text-center">
          Go to View Users
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => router.push('/(admin)/ViewDatabase')}
        activeOpacity={0.8}
        className="bg-blue-500 px-6 py-3 rounded-xl max-w-[300px] w-11/12"
      >
        <Text className="text-white text-lg font-semibold text-center">
          Go to View Database
        </Text>
      </TouchableOpacity>
    </View>
  );
}