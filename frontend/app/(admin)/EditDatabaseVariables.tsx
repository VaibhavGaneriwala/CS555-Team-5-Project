import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';

export default function EditDatabaseVariables() {
  return (
    <View className="flex-1 items-center bg-white dark:bg-gray-900 px-4 py-6">
      <Text className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">
        Edit Database Variables
      </Text>

      <View className="w-11/12 bg-gray-200 dark:bg-gray-700 p-6 rounded-xl max-w-[600px] mb-4">
        <Text className="text-gray-700 dark:text-gray-200 text-center">
          Variable Form Placeholder
        </Text>
      </View>

      <View className="w-11/12 bg-gray-200 dark:bg-gray-700 p-6 rounded-xl max-w-[600px] mb-8">
        <Text className="text-gray-700 dark:text-gray-200 text-center">
          Save Changes Placeholder
        </Text>
      </View>

      <TouchableOpacity
        onPress={() => router.push('/(admin)/ViewDatabase')}
        activeOpacity={0.8}
        className="bg-blue-500 px-6 py-3 rounded-xl max-w-[300px] mb-4 w-11/12"
      >
        <Text className="text-white text-lg font-semibold text-center">
          Back to View Database
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => router.push('/(admin)/AdminHome')}
        activeOpacity={0.8}
        className="bg-gray-700 px-6 py-3 rounded-xl max-w-[300px] w-11/12"
      >
        <Text className="text-white text-lg font-semibold text-center">
          Back to Admin Home
        </Text>
      </TouchableOpacity>
    </View>
  );
}