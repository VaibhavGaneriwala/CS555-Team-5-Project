// components/TodaysMedicationsCard.tsx
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';

interface Schedule {
  time: string;
  days: string[];
}

interface Medication {
  _id: string;
  name: string;
  dosage?: string;
  frequency?: string;
  schedule?: Schedule[];
}

interface Props {
  medications: Medication[];
  submitting: string | null;
  onLogDose: (med: Medication) => void;
}

export default function TodaysMedicationsCard({
  medications,
  submitting,
  onLogDose,
}: Props) {
  return (
    <View
      className="bg-gray-200 dark:bg-gray-700 shadow-md border border-gray-300 dark:border-gray-600 mb-4 p-6 rounded-xl w-11/12 sm:max-w-[500px]"
    >
      <Text className="text-gray-700 dark:text-gray-200 text-center mb-2 font-semibold">
        Today&apos;s Medications
      </Text>

      <ScrollView className="max-h-60">
        {medications.length === 0 ? (
          <View className="items-center">
            <Text className="text-gray-500">
              No medications found
            </Text>
          </View>
        ) : (
          medications.map((med) => (
            <View key={med._id} className="mb-3">
              <Text className="text-gray-800 dark:text-gray-100 font-medium">
                {med.name} {med.dosage ? `(${med.dosage})` : ''}
              </Text>

              {med.schedule?.map((s, i) => (
                <Text
                  key={i}
                  className="text-gray-600 dark:text-gray-300 text-sm ml-2"
                >
                  🕒 {s.time} — {s.days.join(', ')}
                </Text>
              ))}

              <TouchableOpacity
                onPress={() => onLogDose(med)}
                disabled={submitting === med._id}
                activeOpacity={0.8}
                className={`px-4 py-2 rounded-xl mt-2 w-48 self-center ${
                  submitting === med._id ? 'bg-gray-400' : 'bg-green-600'
                }`}
              >
                <Text className="text-white text-center font-semibold">
                  {submitting === med._id ? 'Logging...' : 'Log Dose'}
                </Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}
