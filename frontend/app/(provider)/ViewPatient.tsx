import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';

export default function ViewPatient() {
  return (
    <View className="flex-1 items-center justify-center bg-white dark:bg-gray-900 px-4">
      <Text className="text-3xl font-bold mb-8 text-gray-800 dark:text-white">
        Patient Details
      </Text>

      <View className="flex items-center flex-col sm:flex-row bg-white dark:bg-gray-900 px-4">
        <View className="flex items-center flex-col">
          <View className="bg-gray-200 dark:bg-gray-700 mb-4 p-6 rounded-xl w-11/12 sm:max-w-[600px]">
            <Text className="text-gray-700 dark:text-gray-200 text-center">
              Patient Profile Placeholder
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => router.push('/(provider)/ViewPatients')}
            activeOpacity={0.8}
            className="bg-blue-500 px-6 py-3 rounded-xl w-11/12 sm:max-w-[300px]"
          >
            <Text className="text-white text-lg font-semibold text-center">
              Back to Patient List
            </Text>
          </TouchableOpacity>
        </View>

        <View className="py-4 sm:py-0" />

        <View className="flex items-center flex-col">
          <View className="bg-gray-200 dark:bg-gray-700 mb-4 p-6 rounded-xl w-11/12 sm:max-w-[600px]">
            <Text className="text-gray-700 dark:text-gray-200 text-center">
              Health Data Placeholder
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => router.push('/(provider)/ProviderHome')}
            activeOpacity={0.8}
            className="bg-blue-500 px-6 py-3 rounded-xl w-11/12 sm:max-w-[300px]"
          >
            <Text className="text-white text-lg font-semibold text-center">
              Back to Provider Home
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
