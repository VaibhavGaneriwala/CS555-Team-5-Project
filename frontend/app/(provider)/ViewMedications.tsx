import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, router } from 'expo-router';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.API_URL ?? "http://localhost:3000";

interface ScheduleEntry {
  time: string;
  days?: string[];
}

interface Medication {
  _id: string;
  name: string;
  dosage: string;
  frequency: string;
  schedule: ScheduleEntry[];
  startDate: string;
  endDate?: string;
  instructions?: string;
  prescribedBy?: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

export default function ViewMedications() {
  const { patientId } = useLocalSearchParams<{ patientId: string }>();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMedications = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        setError("Authentication token missing.");
        setLoading(false);
        return;
      }

      const res = await fetch(`${API_URL}/api/medications?patientId=${patientId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Failed to fetch medications");
      } else {
        setMedications(data || []);
      }
    } catch (err) {
      console.error(err);
      setError("Unable to connect to server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedications();
  }, []);

  const deleteMedication = async (id: string) => {
    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to delete this medication?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem("token");

              const res = await fetch(`${API_URL}/api/medications/${id}`, {
                method: "DELETE",
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                },
              });

              const data = await res.json();

              if (!res.ok) {
                Alert.alert("Error", data.message || "Failed to delete medication");
                return;
              }

              Alert.alert("Success", "Medication deleted");
              fetchMedications();
            } catch (err) {
              Alert.alert("Error", "Server error. Try again.");
            }
          },
        },
      ]
    );
  };

  const formatSchedule = (schedule: ScheduleEntry[] | undefined) => {
    if (!schedule || schedule.length === 0) return "No schedule set";

    return schedule
      .map((entry) => {
        const time = entry.time;
        const days = entry.days && entry.days.length
          ? ` (${entry.days.join(", ")})`
          : "";
        return `${time}${days}`;
      })
      .join(", ");
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-gray-900">
        <ActivityIndicator size="large" color="#2563eb" />
        <Text className="mt-3 text-gray-600 dark:text-gray-300">
          Loading Medications...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-gray-900 px-4">
        <Text className="text-red-500 text-lg font-semibold mb-3 text-center">
          {error}
        </Text>

        <TouchableOpacity
          onPress={fetchMedications}
          className="bg-blue-500 px-6 py-3 rounded-xl"
        >
          <Text className="text-white text-lg font-semibold text-center">Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-white dark:bg-gray-900 px-4 pt-10 pb-6">
      <Text className="text-3xl font-bold mb-6 text-gray-800 dark:text-white text-center">
        Patient Medications
      </Text>

      {medications.length === 0 ? (
        <Text className="text-gray-600 dark:text-gray-300 text-center mt-8">
          This patient has no medications.
        </Text>
      ) : (
        medications.map((med) => (
          <View
            key={med._id}
            className="bg-gray-100 dark:bg-gray-800 p-4 mb-4 rounded-2xl shadow"
          >
            <Text className="text-xl font-bold text-gray-900 dark:text-white">
              {med.name}
            </Text>

            <Text className="text-gray-700 dark:text-gray-300">
              Dosage: {med.dosage}
            </Text>
            <Text className="text-gray-700 dark:text-gray-300">
              Frequency: {med.frequency}
            </Text>
            <Text className="text-gray-700 dark:text-gray-300">
              Schedule: {formatSchedule(med.schedule)}
            </Text>

            <Text className="text-gray-700 dark:text-gray-300">
              Start: {new Date(med.startDate).toLocaleDateString()}
            </Text>

            {med.endDate ? (
              <Text className="text-gray-700 dark:text-gray-300">
                End: {new Date(med.endDate).toLocaleDateString()}
              </Text>
            ) : (
              <Text className="text-gray-500 dark:text-gray-400">
                End: No end date
              </Text>
            )}

            {med.instructions ? (
              <Text className="text-gray-700 dark:text-gray-300 mt-1">
                Instructions: {med.instructions}
              </Text>
            ) : null}

            <View className="flex-row mt-3">
              <TouchableOpacity
                onPress={() =>
                  router.push({
                    pathname: "/(provider)/EditMedication",
                    params: { medicationId: med._id, patientId },
                  })
                }
                className="bg-blue-500 px-4 py-2 rounded-xl mr-3"
              >
                <Text className="text-white font-semibold text-sm">
                  Edit
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => deleteMedication(med._id)}
                className="bg-red-500 px-4 py-2 rounded-xl"
              >
                <Text className="text-white font-semibold text-sm">
                  Delete
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}

      <TouchableOpacity
        onPress={() => router.push("/(provider)/ViewPatients")}
        className="bg-blue-500 px-6 py-3 rounded-xl mt-8"
      >
        <Text className="text-white text-lg font-semibold text-center">
          Back to Patients
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
