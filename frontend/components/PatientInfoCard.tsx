// components/PatientInfoCard.tsx
import React from 'react';
import { View, Text } from 'react-native';

interface Patient {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  phoneNumber?: string;
  dateOfBirth?: string | number | null;
  gender?: string;
  address?: {
    streetAddress: string;
    city: string;
    state: string;
    zipcode: string;
  } | null;
}

export default function PatientInfoCard({ patient }: { patient: Patient | null }) {
  return (
    <View className="bg-gray-100 dark:bg-gray-800 mb-6 p-8 rounded-2xl shadow-md border border-gray-300 dark:border-gray-600 w-full">
      {patient ? (
        <View>
          <Text className="text-gray-900 dark:text-white text-2xl font-bold text-center mb-4 tracking-wide">
            {patient.firstName} {patient.lastName}
          </Text>

          <Text className="text-gray-700 dark:text-gray-300 text-center text-base">
            Email: {patient.email || 'N/A'}
          </Text>

          <Text className="text-gray-700 dark:text-gray-300 text-center text-base">
            Phone: {patient.phoneNumber || 'N/A'}
          </Text>

          <Text className="text-gray-700 dark:text-gray-300 text-center text-base">
            Gender: {patient.gender || 'N/A'}
          </Text>

          {patient.address && (
            <View className="mt-4 space-y-1">
              <Text className="text-gray-800 dark:text-gray-200 font-semibold text-center">
                Address
              </Text>
              <Text className="text-gray-600 dark:text-gray-400 text-center">
                {patient.address.streetAddress}
              </Text>
              <Text className="text-gray-600 dark:text-gray-400 text-center">
                {patient.address.city}, {patient.address.state} {patient.address.zipcode}
              </Text>
            </View>
          )}
        </View>
      ) : (
        <View className="animate-pulse space-y-3 py-4">
          <View className="h-6 bg-gray-400 rounded w-48 mx-auto" />
          <View className="h-4 bg-gray-400 rounded w-56 mx-auto" />
          <View className="h-4 bg-gray-400 rounded w-40 mx-auto" />
          <View className="h-4 bg-gray-400 rounded w-36 mx-auto" />
          <View className="h-4 bg-gray-400 rounded w-52 mx-auto" />
        </View>
      )}
    </View>
  );
}
