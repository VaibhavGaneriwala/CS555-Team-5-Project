import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import axios from 'axios';
import * as Notifications from 'expo-notifications';
import { registerForPushNotificationsAsync } from '../utils/notifications';
import { hasPlatformFeatureAsync } from 'expo-device';

import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.API_URL ?? 'http://localhost:3000';

// === Configure Notifications (Global Handler) ===
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    };
  },
});

// ---------- Interfaces ----------
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

// ---------- Component ----------
export default function MedicationCalendar() {
  const [medications, setMedications] = useState<Medication[]>([]);

  // 🔔 Request notification permission & fetch meds on mount
  useEffect(() => {
    registerForPushNotificationsAsync();
    fetchMedications();
  }, []);

  // ---------- Fetch Medications ----------
  const fetchMedications = async () => {
    try {
      const response = await axios.get<Medication[]>(`${API_URL}/api/medications`, {
        headers: {
          // Authorization: `Bearer ${token}`, // if using auth
        },
      });

      setMedications(response.data);

      // Schedule notifications for medications
      response.data.forEach((med) => {
        if (med.schedule && med.schedule.length > 0) {
          med.schedule.forEach((s) => {
            scheduleNotification(med.name, s.time);
          });
        }
      });
    } catch (error: any) {
      console.error('Error fetching medications:', error.message);
      Alert.alert('Error', 'Failed to load medication reminders.');
    }
  };

  // ---------- Schedule Notification ----------
  const scheduleNotification = async (medName: string, time: string) => {
    try {
      const now = new Date();
      const [hours, minutes] = time.split(':').map(Number);
      const triggerTime = new Date();
      triggerTime.setHours(hours, minutes, 0, 0);

      // Skip if already past today
      if (triggerTime < now) return;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '💊 Medication Reminder',
          body: `It's time to take your ${medName}`,
        },
        trigger: {
          hour: hours,
          minute: minutes,
          repeats: false,
        } as Notifications.NotificationTriggerInput,
      });
    } catch (error: any) {
      console.error('Notification scheduling failed:', error.message);
    }
  };

  return (
    <View className="flex-1 items-center justify-center bg-white dark:bg-gray-900 px-4">
      <Text className="text-3xl font-bold mb-8 text-gray-800 dark:text-white">
        Medication Calendar
      </Text>

      <View className="flex items-center flex-col sm:flex-row bg-white dark:bg-gray-900 px-4">
        {/* ---------- Calendar / Reminder Section ---------- */}
        <View className="flex items-center flex-col">
          <View className="bg-gray-200 dark:bg-gray-700 mb-4 p-6 rounded-xl w-11/12 sm:max-w-[600px]">
            <Text className="text-gray-700 dark:text-gray-200 text-center mb-2 font-semibold">
              Today's Reminders
            </Text>

            <ScrollView className="max-h-60">
              {medications.length === 0 ? (
                <Text className="text-center text-gray-500">No reminders yet</Text>
              ) : (
                medications.map((med) => (
                  <View key={med._id} className="mb-3">
                    <Text className="text-gray-800 dark:text-gray-100 font-medium">
                      {med.name} ({med.dosage})
                    </Text>
                    {med.schedule?.map((s, i) => (
                      <Text key={i} className="text-gray-600 dark:text-gray-300 text-sm ml-2">
                        🕒 {s.time} — {s.days.join(', ')}
                      </Text>
                    ))}
                  </View>
                ))
              )}
            </ScrollView>
          </View>

          {/* Test Notification Button */}
          <TouchableOpacity
            onPress={async () => {
              // Use the first medication name if available, otherwise fall back to a generic label
              const testName = medications[0]?.name ?? 'medication';
              await Notifications.scheduleNotificationAsync({
                content: {
                  title: "💊 Medication Reminder",
                  body: `It's time to take your ${testName}`,
                },
                // Schedule as a short time-interval trigger for testing
                trigger: {
                  seconds: 1,
                } as Notifications.NotificationTriggerInput,
              });
            }}
            activeOpacity={0.8}
            className="bg-green-500 px-6 py-3 rounded-xl w-11/12 sm:max-w-[300px] mt-2"
          >
            <Text className="text-white text-lg font-semibold text-center">
              Send Test Reminder
            </Text>
          </TouchableOpacity>

          {/* Edit Medication Button */}
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

        {/* Spacer */}
        <View className="py-4 sm:py-0" />

        {/* ---------- Medication List Section ---------- */}
        <View className="flex items-center flex-col">
          <View className="bg-gray-200 dark:bg-gray-700 mb-4 p-6 rounded-xl w-11/12 sm:max-w-[600px]">
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
                      {med.name} — {med.dosage}
                    </Text>
                    <Text className="text-gray-600 dark:text-gray-300 text-sm">
                      Frequency: {med.frequency || 'N/A'}
                    </Text>
                  </View>
                ))
              )}
            </ScrollView>
          </View>

          {/* Back Button */}
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