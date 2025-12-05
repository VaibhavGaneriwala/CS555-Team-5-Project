// ================================================
// FINAL PatientHome.tsx (FULL WORKING + AI CHATBOT)
// ================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import PatientInfoCard from '@/components/PatientInfoCard';
import ProvidersCard from '@/components/ProvidersCard';

const API_URL = Constants.expoConfig?.extra?.API_URL ?? 'http://localhost:3000';

// ---------------- Types ----------------
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

interface PopulatedMedication {
  _id: string;
  name?: string;
  dosage?: string;
}

interface AdherenceLog {
  _id: string;
  medication: string | PopulatedMedication;
  status: string;
  takenAt?: string;
  scheduledTime?: string;
  notes?: string;
  createdAt: string;
}

interface Medication {
  _id: string;
  name: string;
  dosage: string;
  frequency: string;
  instructions: string;
  startDate: string;
  createdAt: string;
  endDate?: string;
  isActive?: boolean;
}

type MedMap = Record<string, { name?: string; dosage?: string }>;

// ---------------- Helpers ----------------
const normalizeToArray = (raw: any) => {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.data)) return raw.data;
  if (Array.isArray(raw?.items)) return raw.items;
  if (Array.isArray(raw?.logs)) return raw.logs;
  if (raw && typeof raw === 'object') return [raw];
  return [];
};

const isPopulatedMedication = (m: any): m is PopulatedMedication =>
  m && typeof m === 'object' && '_id' in m;

const getNextDoseDate = (med: Medication): Date | null => {
  try {
    const now = new Date();
    const start = new Date(med.startDate);
    if (now < start) return start;

    const freq = med.frequency?.toLowerCase() || '';
    const next = new Date(now);

    if (freq.includes('daily') && !freq.includes('twice')) next.setDate(now.getDate() + 1);
    else if (freq.includes('twice') || freq.includes('2 times')) next.setHours(now.getHours() + 12);
    else if (freq.includes('every')) {
      const hours = parseInt(freq.replace(/\D/g, ''));
      if (!isNaN(hours)) next.setHours(now.getHours() + hours);
      else next.setDate(now.getDate() + 1);
    } else next.setDate(now.getDate() + 1);

    return next;
  } catch {
    return null;
  }
};

// ---------------- Component ----------------

export default function PatientHome() {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [adherenceLogs, setAdherenceLogs] = useState<AdherenceLog[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  // Providers
  const [providers, setProviders] = useState<any[]>([]);
  const [providersLoading, setProvidersLoading] = useState(true);

  // Medication sections
  const [recentMedications, setRecentMedications] = useState<Medication[]>([]);
  const [upcomingMedications, setUpcomingMedications] = useState<any[]>([]);
  const [pastMedications, setPastMedications] = useState<Medication[]>([]);
  const [recentMedsLoading, setRecentMedsLoading] = useState(true);
  const [upcomingMedsLoading, setUpcomingMedsLoading] = useState(true);
  const [pastMedsLoading, setPastMedsLoading] = useState(true);

  // Load token
  useEffect(() => {
    AsyncStorage.getItem('token').then(setToken);
  }, []);

  // Fetch patient
  useEffect(() => {
    if (!token) return;

    const load = async () => {
      const res = await fetch(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setPatient(data);
    };

    load();
  }, [token]);

  // Fetch providers
  useEffect(() => {
    const load = async () => {
      const t = await AsyncStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/patient/providers`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      const data = await res.json();
      setProviders(data.providers ?? []);
      setProvidersLoading(false);
    };

    load();
  }, []);

  // Fetch medications (Recent, Upcoming, Past)
  const fetchRecentMedications = async () => {
    setRecentMedsLoading(true);
    setUpcomingMedsLoading(true);
    setPastMedsLoading(true);

    try {
      const t = await AsyncStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/medications`, {
        headers: { Authorization: `Bearer ${t}` },
      });

      const meds: Medication[] = normalizeToArray(await res.json());
      const now = new Date();

      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(now.getDate() - 7);

      const sevenDaysAhead = new Date(now);
      sevenDaysAhead.setDate(now.getDate() + 7);

      // Recent
      setRecentMedications(
        meds.filter((m) => new Date(m.createdAt) >= sevenDaysAgo).slice(0, 5)
      );

      // Upcoming
      const upcoming = meds
        .map((m) => {
          const next = getNextDoseDate(m);
          return next ? { ...m, nextDose: next } : null;
        })
        .filter((m): m is Medication & { nextDose: Date } => !!m)
        .filter((m) => m.nextDose > now && m.nextDose <= sevenDaysAhead)
        .sort((a, b) => a.nextDose.getTime() - b.nextDose.getTime())
        .slice(0, 5);

      setUpcomingMedications(upcoming);

      // Past
      setPastMedications(
        meds
          .filter((m) => {
            const next = getNextDoseDate(m);
            if (m.endDate && new Date(m.endDate) < now) return true;
            if (!next) return true;
            if (next > sevenDaysAhead) return true;
            return false;
          })
          .slice(0, 5)
      );
    } catch (err) {
      console.log('Medication fetch error:', err);
    } finally {
      setRecentMedsLoading(false);
      setUpcomingMedsLoading(false);
      setPastMedsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecentMedications();
  }, []);

  // ---------------- UI ----------------
  return (
    <View className="flex-1 items-center justify-center bg-white dark:bg-gray-900 px-4">
      <Text className="text-3xl font-bold mb-8 text-gray-800 dark:text-white">
        Patient Dashboard
      </Text>

      <View className="flex justify-center items-center w-full max-w-6xl">
        <View className="flex justify-center items-center sm:items-start flex-col sm:flex-row gap-6 p-6 rounded-xl bg-gray-100 dark:bg-gray-800 shadow-lg">
          
          {/* Patient Info Section */}
          <View className="flex items-center">
            <PatientInfoCard patient={patient} />

            {/* Calendar */}
            <TouchableOpacity
              onPress={() => router.push('/(patient)/MedicationCalendar')}
              className="bg-blue-500 px-6 py-3 rounded-xl w-full max-w-[300px] mb-4"
            >
              <Text className="text-white text-lg font-semibold text-center">
                Go to Medication Calendar
              </Text>
            </TouchableOpacity>

            {/* Logs */}
            <TouchableOpacity
              onPress={() => setShowLogs(true)}
              className="bg-green-500 px-6 py-3 rounded-xl w-full max-w-[300px] mb-4"
            >
              <Text className="text-white text-lg font-semibold text-center">
                View Dose Logs (Last 7 Days)
              </Text>
            </TouchableOpacity>

            {/* ⭐ AI Chatbot Button */}
            <TouchableOpacity
              onPress={() => router.push('/(patient)/Chatbot')}
              className="bg-purple-600 px-6 py-3 rounded-xl w-full max-w-[300px] mb-4"
            >
              <Text className="text-white text-lg font-semibold text-center">
                Chat with MedAssist (AI)
              </Text>
            </TouchableOpacity>
          </View>

          {/* Providers + Medication Cards */}
          <View className="flex items-center">
            <ProvidersCard providers={providers} loading={providersLoading} error={null} />

            {/* Upcoming Medications */}
            <View className="mt-4 w-full flex items-center">
              <View className="bg-gray-200 dark:bg-gray-700 p-4 rounded-xl w-11/12 sm:max-w-[300px]">
                <Text className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
                  Upcoming Medications
                </Text>

                {upcomingMedsLoading ? (
                  <ActivityIndicator size="small" color="#3B82F6" />
                ) : upcomingMedications.length > 0 ? (
                  upcomingMedications.map((m) => (
                    <View key={m._id} className="border-b border-gray-300 py-2">
                      <Text className="text-gray-800 dark:text-gray-200 font-semibold">
                        {m.name}
                      </Text>
                      <Text className="text-gray-600 dark:text-gray-400">
                        Next Dose: {new Date(m.nextDose).toLocaleString()}
                      </Text>
                      <Text className="text-gray-600 dark:text-gray-400">
                        Dosage: {m.dosage}
                      </Text>
                    </View>
                  ))
                ) : (
                  <Text className="text-gray-600 dark:text-gray-300">
                    No medications due in the next 7 days.
                  </Text>
                )}
              </View>
            </View>

            {/* Past Medications */}
            <View className="mt-4 w-full flex items-center">
              <View className="bg-gray-200 dark:bg-gray-700 p-4 rounded-xl w-11/12 sm:max-w-[300px]">
                <Text className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
                  Past Medications
                </Text>

                {pastMedsLoading ? (
                  <ActivityIndicator size="small" color="#3B82F6" />
                ) : pastMedications.length > 0 ? (
                  pastMedications.map((m) => (
                    <View key={m._id} className="border-b border-gray-300 py-2">
                      <Text className="text-gray-800 dark:text-gray-200 font-semibold">
                        {m.name}
                      </Text>
                      <Text className="text-gray-600 dark:text-gray-400">
                        Ended: {m.endDate ? new Date(m.endDate).toLocaleDateString() : 'Unknown'}
                      </Text>
                      <Text className="text-gray-600 dark:text-gray-400">
                        Dosage: {m.dosage}
                      </Text>
                    </View>
                  ))
                ) : (
                  <Text className="text-gray-600 dark:text-gray-300">
                    No past medications.
                  </Text>
                )}
              </View>
            </View>
          </View>

        </View>
      </View>

      {/* Logs Modal */}
      <Modal visible={showLogs} animationType="slide" transparent>
        <View className="flex-1 justify-center items-center bg-black/50">
          <View className="bg-white dark:bg-gray-800 rounded-xl p-6 w-11/12 max-h-[80%]">
            <Text className="text-xl font-bold mb-4 text-gray-800 dark:text-white text-center">
              Dose Logs (Last 7 Days)
            </Text>

            <ScrollView className="max-h-[60vh]">
              {adherenceLogs.length > 0 ? (
                adherenceLogs.map((log, i) => (
                  <View key={i} className="border-b border-gray-300 py-2">
                    <Text className="text-gray-800 dark:text-gray-200 font-semibold">
                      Medication Log Entry
                    </Text>
                    <Text className="text-gray-600 dark:text-gray-400">
                      Status: {log.status}
                    </Text>
                    <Text className="text-gray-600 dark:text-gray-400">
                      Time: {new Date(log.takenAt ?? log.scheduledTime ?? log.createdAt).toLocaleString()}
                    </Text>
                  </View>
                ))
              ) : (
                <Text className="text-gray-600 dark:text-gray-300 text-center">
                  No doses logged in the last 7 days.
                </Text>
              )}
            </ScrollView>

            <TouchableOpacity
              onPress={() => setShowLogs(false)}
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
  );
}
