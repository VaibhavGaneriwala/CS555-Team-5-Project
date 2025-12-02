import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.API_URL ?? 'http://localhost:3000';

interface Patient {
  _id: string;
  name: string;
  email: string;
  gender: string;
  dateOfBirth: string;
  adherence: string | number;
}

export default function ViewPatients() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* -------------------------------------------------------
      FETCH ASSIGNED PATIENTS
  ------------------------------------------------------- */
  const fetchPatients = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        setError('Authentication token missing. Please log in again.');
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_URL}/api/provider/patients`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Failed to fetch patients');
      } else {
        setPatients(data.patients || []);
      }
    } catch (err) {
      console.error(err);
      setError('Unable to connect to server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  /* -------------------------------------------------------
      LOADING SCREEN
  ------------------------------------------------------- */
  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-gray-900">
        <ActivityIndicator size="large" color="#2563eb" />
        <Text className="mt-3 text-gray-600 dark:text-gray-300">
          Loading Patients...
        </Text>
      </View>
    );
  }

  /* -------------------------------------------------------
      ERROR SCREEN
  ------------------------------------------------------- */
  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-gray-900 px-4">
        <Text className="text-red-500 text-lg font-semibold mb-3 text-center">
          {error}
        </Text>

        <TouchableOpacity
          onPress={fetchPatients}
          className="bg-blue-500 px-6 py-3 rounded-xl"
          activeOpacity={0.8}
        >
          <Text className="text-white text-lg font-semibold">Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  /* -------------------------------------------------------
      MAIN UI
  ------------------------------------------------------- */
  return (
    <View className="flex-1 bg-white dark:bg-gray-900 px-4 pt-10 pb-6">
      <Text className="text-3xl font-bold mb-6 text-gray-800 dark:text-white text-center">
        Assigned Patients
      </Text>

      {patients.length === 0 ? (
        <Text className="text-center text-gray-600 dark:text-gray-300 mt-8">
          No patients assigned yet.
        </Text>
      ) : (
        <FlatList
          data={patients}
          keyExtractor={(item) => item._id}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View className="bg-gray-100 dark:bg-gray-800 p-4 mb-3 rounded-2xl shadow">
              
              {/* Patient Info */}
              <Text className="text-xl font-semibold text-gray-900 dark:text-white">
                {item.name}
              </Text>
              <Text className="text-gray-700 dark:text-gray-300">
                Email: {item.email}
              </Text>
              <Text className="text-gray-700 dark:text-gray-300">
                Gender: {item.gender}
              </Text>
              <Text className="text-gray-700 dark:text-gray-300">
                DOB: {new Date(item.dateOfBirth).toLocaleDateString()}
              </Text>

              <Text className="text-blue-600 dark:text-blue-400 font-semibold mt-1">
                Adherence: {item.adherence === 'N/A' ? 'N/A' : `${item.adherence}%`}
              </Text>

              {/* VIEW REPORTS */}
              <TouchableOpacity
                onPress={() =>
                  router.push({
                    pathname: '/(provider)/ViewReports',
                    params: { patientId: item._id },
                  })
                }
                activeOpacity={0.8}
                className="mt-3 bg-green-500 px-4 py-2 rounded-xl self-start"
              >
                <Text className="text-white text-sm font-semibold">
                  View Adherence Trend
                </Text>
              </TouchableOpacity>

              {/* VIEW MEDICATIONS */}
              <TouchableOpacity
                onPress={() =>
                  router.push({
                    pathname: '/(provider)/ViewMedications',
                    params: { patientId: item._id },
                  })
                }
                activeOpacity={0.8}
                className="mt-3 bg-blue-500 px-4 py-2 rounded-xl self-start"
              >
                <Text className="text-white text-sm font-semibold">
                  View Medications
                </Text>
              </TouchableOpacity>

              {/* ADD MEDICATION */}
              <TouchableOpacity
                onPress={() =>
                  router.push({
                    pathname: '/(provider)/CreateMedication',
                    params: { patientId: item._id },
                  })
                }
                activeOpacity={0.8}
                className="mt-3 bg-purple-500 px-4 py-2 rounded-xl self-start"
              >
                <Text className="text-white text-sm font-semibold">
                  Add Medication
                </Text>
              </TouchableOpacity>

            </View>
          )}
        />
      )}

      {/* BACK BUTTON */}
      <TouchableOpacity
        onPress={() => router.push('/(provider)/ProviderHome')}
        activeOpacity={0.8}
        className="bg-blue-500 px-6 py-3 rounded-xl mt-6"
      >
        <Text className="text-white text-lg font-semibold text-center">
          Back to Provider Home
        </Text>
      </TouchableOpacity>
    </View>
  );
}
