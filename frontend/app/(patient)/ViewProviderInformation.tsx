import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';

export default function ViewProviderInformation() {
  const { name, email, phone } = useLocalSearchParams();

  return (
    <View className="flex-1 bg-white dark:bg-gray-900 px-4 pt-10 pb-6 items-center">
      <Text className="text-3xl font-bold mb-6 text-gray-800 dark:text-white text-center">
        Provider Information
      </Text>

      <View className="bg-gray-100 dark:bg-gray-800 p-6 rounded-2xl shadow w-11/12 sm:max-w-[500px]">
        <Text className="text-lg font-semibold text-gray-900 dark:text-white">
          {name || 'Unknown Provider'}
        </Text>
        <Text className="text-gray-700 dark:text-gray-300 mt-2">Email: {email}</Text>
        <Text className="text-gray-700 dark:text-gray-300 mt-1">Phone: {phone || 'N/A'}</Text>
      </View>
      <TouchableOpacity
        onPress={() => router.push('/(patient)/PatientHome')}
        className="bg-green-500 px-6 py-3 rounded-xl mt-3"
      >
        <Text className="text-white text-lg font-semibold text-center">Back to Patient Home</Text>
      </TouchableOpacity>
    </View>
  );
}
