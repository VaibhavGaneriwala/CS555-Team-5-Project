import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.API_URL ?? 'http://localhost:3000';

interface Medication {
  _id: string;
  name: string;
  dosage: string;
  frequency: string;
  instructions: string;
  createdAt: string;
}

export default function PatientHome() {
  const [logs, setLogs] = useState<Medication[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [showLogs, setShowLogs] = useState<boolean>(false);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Load the user's token
  useEffect(() => {
    const loadToken = async () => {
      // Load it from async storage
      const storedToken = await AsyncStorage.getItem('token');
      setToken(storedToken);
    };
    loadToken();
  }, []);

  // Fetch the last 7 days of medications
  const fetchLogs = async () => {
    if (!token) {
      setError('Token invalid; try logging in again');
      return;
    }
    console.log(token);
    setError(null);
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/medications`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        // Try to extract server-provided error info
        let body: any = null;
        try {
          body = await response.json();
        } catch (e) {
          body = await response.text();
        }
        const message = typeof body === 'string' ? body : (body && body.message) ? body.message : JSON.stringify(body);
        console.error('Medications fetch failed', response.status, message);
        setError(`Failed to fetch medications: ${response.status} ${message}`);
        return;
      }
      const data: Medication[] = await response.json();
      console.log(data);
      // Get the last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      // Filter the data to have recent medications
      const recentMeds = data.filter(
        // createdAt automatically populated with timestamps = true
        (med) => new Date(med.createdAt) >= sevenDaysAgo
      );
      setLogs(recentMeds);
      return 'success';
    } catch (err: any) {
      console.error('fetchLogs error', err);
      setError(err?.message || 'Network error while fetching medications');
      return 'error';
    } finally {
      setLoading(false);
    }
  };
  // Display the logs: open modal immediately, then load data (shows spinner)
  const displayLogs = async () => {
    setShowLogs(true);
    await fetchLogs();
  };

  // Close the logs and clear transient error state
  const closeLogs = () => {
    setShowLogs(false);
    setError(null);
  };

  return (
    <View className="flex-1 items-center justify-center bg-white dark:bg-gray-900 px-4">
      <Text className="text-3xl font-bold mb-8 text-gray-800 dark:text-white">
        Patient Dashboard
      </Text>

      <View className="flex items-center flex-col sm:flex-row bg-white dark:bg-gray-900 px-4">
        <View className="flex items-center flex-col">
          <View className="bg-gray-200 dark:bg-gray-700 mb-4 p-6 rounded-xl w-11/12 sm:max-w-[600px]">
            <Text className="text-gray-700 dark:text-gray-200 text-center">
              Patient Overview Placeholder
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => router.push('/(patient)/MedicationCalendar')}
            activeOpacity={0.8}
            className="bg-blue-500 px-6 py-3 rounded-xl w-11/12 sm:max-w-[300px]"
          >
            <Text className="text-white text-lg font-semibold text-center">
              Go to Medication Calendar
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={displayLogs}
            activeOpacity={0.8}
            disabled={!token}
            className={`px-6 py-3 rounded-xl mb-6 w-11/12 sm:max-w-[300px] ${token ? 'bg-green-500' : 'bg-gray-400'}`}
          >
            <Text className="text-white text-lg font-semibold text-center">
              {token ? 'View Medication Logs (Last 7 Days)' : 'Loading token...'}
            </Text>
          </TouchableOpacity>
          {/* === Modal for Logs === */}
          <Modal visible={showLogs} animationType="slide" transparent>
            <View className="flex-1 justify-center items-center bg-black/50">
              <View className="bg-white dark:bg-gray-800 rounded-xl p-6 w-11/12 max-h-[80%]">
                <Text className="text-xl font-bold mb-4 text-gray-800 dark:text-white text-center">
                  Medication Logs (Last 7 Days)
                </Text>

                {loading ? (
                  <ActivityIndicator size="large" color="#3B82F6" />
                ) : error ? (
                  <Text className="text-red-600 text-center">{error}</Text>
                ) : logs.length > 0 ? (
                  <FlatList
                    data={logs}
                    keyExtractor={(item) => item._id}
                    renderItem={({ item }) => (
                      <View className="border-b border-gray-300 py-2">
                        <Text className="text-gray-800 dark:text-gray-200 font-semibold">
                          {item.name || 'Unnamed Medication'}
                        </Text>
                        <Text className="text-gray-600 dark:text-gray-400">
                          {`Dosage: ${item.dosage || 'N/A'}`}
                        </Text>
                        <Text className="text-gray-600 dark:text-gray-400">
                          {`Logged: ${new Date(item.createdAt).toLocaleString()}`}
                        </Text>
                        <Text className="text-gray-600 dark:text-gray-400">
                          {`Instructions: ${item.instructions || 'N/A'}`}
                        </Text>
                      </View>
                    )}
                  />
                ) : (
                  <Text className="text-gray-600 dark:text-gray-300 text-center">
                    No medications logged in the last 7 days.
                  </Text>
                )}

                <TouchableOpacity
                  onPress={closeLogs}
                  className="bg-red-500 px-6 py-3 rounded-xl mt-6"
                >
                  <Text className="text-white text-lg font-semibold text-center">
                    Close
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </View>

        <View className="py-4 sm:py-0" />

        <View className="flex items-center flex-col">
          <View className="bg-gray-200 dark:bg-gray-700 mb-4 p-6 rounded-xl w-11/12 sm:max-w-[600px]">
            <Text className="text-gray-700 dark:text-gray-200 text-center">
              Provider Overview Placeholder
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => router.push('/(patient)/ViewProviders')}
            activeOpacity={0.8}
            className="bg-blue-500 px-6 py-3 rounded-xl w-11/12 sm:max-w-[300px]"
          >
            <Text className="text-white text-lg font-semibold text-center">
              Go to View Providers
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
