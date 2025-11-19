import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import axios from 'axios';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { registerForPushNotificationsAsync } from '../utils/notifications';
import TodaysMedicationsCard from '@/components/TodaysMedicationsCard';
import MedicationListCard from '@/components/MedicationListCard';

const API_URL = Constants.expoConfig?.extra?.API_URL ?? 'http://localhost:3000';

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
    } catch (error) {
      Alert.alert('Error', 'Failed to load medication reminders.');
    }
  };

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
        ?.filter((s) => s.days.includes(dayName))
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

      await axios.post(
        `${API_URL}/api/adherence`,
        {
          medicationId: med._id,
          scheduledTime,
          takenAt: new Date(),
          status: 'taken',
          notes: 'Taken on time',
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      Alert.alert('Dose Logged', `Logged a dose for ${med.name}.`, [
        { text: 'OK', onPress: () => router.push('/(patient)/PatientHome') },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Unable to log dose. Please try again.');
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <View className="flex-1 items-center justify-center bg-white dark:bg-gray-900 px-4">
      {/* Page title */}
      <Text className="text-3xl font-bold mb-8 text-gray-800 dark:text-white">
        Medication Calendar
      </Text>

      {/* Main Centered Container (matches PatientHome) */}
      <View className="flex justify-center items-center w-full max-w-6xl">
        <View
          className="flex justify-center items-center min-[850px]:items-start flex-col min-[850px]:flex-row 
          gap-6 p-6 rounded-xl bg-gray-100 dark:bg-gray-800 shadow-lg w-full"
        >
          {/* ---------- Today's Medications ---------- */}
          <View className="flex items-center">
            <TodaysMedicationsCard
              medications={medications}
              submitting={submitting}
              onLogDose={logDose}
            />

            <TouchableOpacity
              onPress={() => router.push('/(patient)/EditMedication')}
              activeOpacity={0.8}
              className="bg-blue-500 px-6 py-3 rounded-xl w-full max-w-[300px]"
            >
              <Text className="text-white text-lg font-semibold text-center">
                Go to Edit Medication
              </Text>
            </TouchableOpacity>
          </View>

          {/* ---------- Medication List ---------- */}
          <View className="flex items-center">
            <MedicationListCard medications={medications} />

            <TouchableOpacity
              onPress={() => router.push('/(patient)/PatientHome')}
              activeOpacity={0.8}
              className="bg-blue-500 px-6 py-3 rounded-xl w-full max-w-[300px]"
            >
              <Text className="text-white text-lg font-semibold text-center">
                Back to Patient Home
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}
