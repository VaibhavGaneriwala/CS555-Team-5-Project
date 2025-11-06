import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';

export default function ProviderHome() {
  return (
    <View className="flex-1 items-center justify-center bg-white dark:bg-gray-900 px-4">
      <Text className="text-3xl font-bold mb-8 text-gray-800 dark:text-white">
        Provider Dashboard
      </Text>

      <View className="flex items-center flex-col sm:flex-row bg-white dark:bg-gray-900 px-4">
        <View className="flex items-center flex-col">
          <View className="bg-gray-200 dark:bg-gray-700 mb-4 p-6 rounded-xl w-11/12 sm:max-w-[600px]">
            <Text className="text-gray-700 dark:text-gray-200 text-center">
              Provider Overview Placeholder
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => router.push('/(provider)/ViewPatients')}
            activeOpacity={0.8}
            className="bg-blue-500 px-6 py-3 rounded-xl w-11/12 sm:max-w-[300px]"
          >
            <Text className="text-white text-lg font-semibold text-center">
              Go to View Patients
            </Text>
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity
          onPress={() => router.push('/(provider)/ViewReports' as any)}
          activeOpacity={0.8}
          className="bg-green-500 px-6 py-3 rounded-xl w-11/12 sm:max-w-[300px] sm:ml-8 mt-6 sm:mt-0"
        >
          <Text className="text-white text-lg font-semibold text-center">
            View Adherence Reports
          </Text>
        </TouchableOpacity>

        {/* <View className="py-4 sm:py-0" />

        <View className="flex items-center flex-col">
          <View className="bg-gray-200 dark:bg-gray-700 mb-4 p-6 rounded-xl w-11/12 sm:max-w-[600px]">
            <Text className="text-gray-700 dark:text-gray-200 text-center">
              Quick Actions Placeholder
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => router.push('/')}
            activeOpacity={0.8}
            className="bg-blue-500 px-6 py-3 rounded-xl w-11/12 sm:max-w-[300px]"
          >
            <Text className="text-white text-lg font-semibold text-center">
              Back to Home
            </Text>
          </TouchableOpacity>
        </View> */}
      </View>
    </View>
  );
}
