// components/MedicationListCard.tsx
import React from 'react';
import { View, Text, ScrollView } from 'react-native';

interface Medication {
  _id: string;
  name: string;
  dosage?: string;
  frequency?: string;
}

export default function MedicationListCard({
  medications,
}: {
  medications: Medication[];
}) {
  return (
    <View
      className="bg-gray-200 dark:bg-gray-700 shadow-md border border-gray-300 dark:border-gray-600 mb-4 p-6 rounded-xl w-11/12 sm:max-w-[600px]"
    >
      <Text className="text-gray-700 dark:text-gray-200 text-center mb-2 font-semibold">
        Medication List
      </Text>

      <ScrollView className="max-h-60">
        {medications.length === 0 ? (
          <Text className="text-center text-gray-500">No medications added</Text>
        ) : (
          medications.map((med) => (
            <View key={med._id} className="mb-2">
              <Text className="text-gray-800 dark:text-gray-100 font-medium">
                {med.name} {med.dosage ? `— ${med.dosage}` : ''}
              </Text>
              <Text className="text-gray-600 dark:text-gray-300 text-sm">
                Frequency: {med.frequency || 'N/A'}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}
