import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import axios from 'axios';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { registerForPushNotificationsAsync } from '../utils/notifications';

const API_URL = Constants.expoConfig?.extra?.API_URL ?? 'http://localhost:3000';

interface Schedule {
  time: string; // "HH:mm"
  days: string[]; // ["Monday", ...]
  _id?: string;
}

interface Medication {
  _id: string;
  name: string;
  dosage?: string;
  frequency?: string;
  schedule?: Schedule[];
  startDate?: string;
  instructions?: string;
}

export default function MedicationCalendar() {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [submitting, setSubmitting] = useState<string | null>(null);

  useEffect(() => {
    registerForPushNotificationsAsync();
    fetchMedications();
  }, []);

  const fetchMedications = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await axios.get<Medication[]>(`${API_URL}/api/medications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMedications(response.data);
    } catch (error: any) {
      // console.error('Error fetching medications:', error?.message);
      Alert.alert('Error', 'Failed to load medication reminders.');
    }
  };

  // Takes string value from database stored as hour and minute and converts it into
  // a usable Date() format
  const buildTodayDateFromHHmm = (hhmm: string) => {
    const [h, m] = hhmm.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
  };

  const pickScheduledTime = (med: Medication) => {
    const now = new Date();
    const dayName = now.toLocaleDateString(undefined, { weekday: 'long' });
    const todaysTimes =
      med.schedule
        ?.filter((s) => s.days?.includes(dayName))
        ?.map((s) => buildTodayDateFromHHmm(s.time))
        ?.sort((a, b) => a.getTime() - b.getTime()) || [];

    if (todaysTimes.length === 0) return now;

    const pastOrNow = todaysTimes.filter((t) => t.getTime() <= now.getTime());
    if (pastOrNow.length) return pastOrNow[pastOrNow.length - 1];

    return todaysTimes[0] ?? now;
  };

  const logDose = async (med: Medication) => {
    try {
      setSubmitting(med._id);
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Error', 'You must be logged in to log a dose.');
        return;
      }

      const scheduledTime = pickScheduledTime(med);
      const payload = {
        medicationId: med._id,
        scheduledTime,
        takenAt: new Date(),
        status: 'taken',
        notes: 'Taken on time',
      };

      // Use backend route
      await axios.post(`${API_URL}/api/adherence`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      Alert.alert('✅ Dose Logged', `Logged a dose for ${med.name}.`, [
        { text: 'OK', onPress: () => router.push('/(patient)/PatientHome') },
      ]);
    } catch (error: any) {
      console.error('Dose logging failed:', error?.message);
      Alert.alert('Error', 'Unable to log dose. Please try again.');
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <View className="flex-1 items-center justify-center bg-white dark:bg-gray-900 px-4">
      <Text className="text-3xl font-bold mb-8 text-gray-800 dark:text-white">
        Medication Calendar
      </Text>

      <View className="flex items-center flex-col sm:flex-row bg-white dark:bg-gray-900 px-4">
        {/* ---------- Today / Reminders ---------- */}
        <View className="flex items-center flex-col">
          <View 
            className="bg-gray-200 dark:bg-gray-700 mb-4 p-6 rounded-xl w-11/12 
            sm:max-w-[600px]"
          >
            <Text className="text-gray-700 dark:text-gray-200 text-center mb-2 font-semibold">
              Today&apos;s Medications
            </Text>

            <ScrollView className="max-h-60">
              {medications.length === 0 ? (
                <Text className="text-center text-gray-500">
                  No medications found
                </Text>
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
                      onPress={() => logDose(med)}
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

          <TouchableOpacity
            onPress={() => router.push('/(patient)/EditMedication')}
            activeOpacity={0.8}
            className="bg-blue-500 px-6 py-3 rounded-xl w-11/12 sm:max-w-[300px] mt-3"
          >
            <Text className="text-white text-lg font-semibold text-center">
              Go to Edit Medication
            </Text>
          </TouchableOpacity>
        </View>

        <View className="py-4 sm:py-0" />

        {/* ---------- Medication List ---------- */}
        <View className="flex items-center flex-col">
          <View 
            className="bg-gray-200 dark:bg-gray-700 mb-4 p-6 rounded-xl
            w-11/12 sm:max-w-[600px]"
          >
            <Text className="text-gray-700 dark:text-gray-200 text-center mb-2 font-semibold">
              Medication List
            </Text>

            <ScrollView className="max-h-60">
              {medications.length === 0 ? (
                <Text className="text-center text-gray-500">
                  No medications added
                </Text>
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

          <TouchableOpacity
            onPress={() => router.push('/(patient)/PatientHome')}
            activeOpacity={0.8}
            className="bg-blue-500 px-6 py-3 rounded-xl w-11/12 sm:max-w-[300px]"
          >
            <Text className="text-white text-lg font-semibold text-center">
              Back to Patient Home
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
