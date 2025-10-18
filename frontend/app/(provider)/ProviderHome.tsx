import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';

export default function ProviderHome() {
  return (
    <View className="flex-1 items-center justify-center bg-white dark:bg-gray-900 px-4">
      <Text className="text-3xl font-bold mb-8 text-gray-800 dark:text-white">
        Provider Dashboard
      </Text>

      <View className="w-11/12 bg-gray-200 dark:bg-gray-700 p-6 rounded-xl max-w-[600px] mb-6">
        <Text className="text-gray-700 dark:text-gray-200 text-center">
          Provider Overview Placeholder
        </Text>
      </View>

      <TouchableOpacity
        onPress={() => router.push('/(provider)/ViewPatients')}
        activeOpacity={0.8}
        className="bg-blue-500 px-6 py-3 rounded-xl max-w-[300px] w-11/12"
      >
        <Text className="text-white text-lg font-semibold text-center">
          Go to View Patients
        </Text>
      </TouchableOpacity>
    </View>
  );
}