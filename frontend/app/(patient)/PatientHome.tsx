// ================================================
// FINAL PatientHome.tsx (BEAUTIFUL UI + SMART REMINDERS)
// ================================================

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  ScrollView,
  Alert,
} from "react-native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

import PatientInfoCard from "@/components/PatientInfoCard";
import ProvidersCard from "@/components/ProvidersCard";

const API_URL =
  Constants.expoConfig?.extra?.API_URL ?? "http://localhost:3000";

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

interface AdherenceLog {
  _id: string;
  status: string;
  takenAt?: string;
  scheduledTime?: string;
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
}

const normalizeToArray = (raw: any) => {
  if (Array.isArray(raw)) return raw;
  if (raw?.data) return raw.data;
  if (raw?.items) return raw.items;
  if (raw?.logs) return raw.logs;
  if (raw && typeof raw === "object") return [raw];
  return [];
};

// Calculate next dose
const getNextDoseDate = (med: Medication): Date | null => {
  try {
    const now = new Date();
    const start = new Date(med.startDate);
    if (now < start) return start;

    const freq = med.frequency.toLowerCase();
    const next = new Date(now);

    if (freq.includes("daily") && !freq.includes("twice"))
      next.setDate(now.getDate() + 1);
    else if (freq.includes("twice"))
      next.setHours(now.getHours() + 12);
    else if (freq.includes("every")) {
      const hours = parseInt(freq.replace(/\D/g, ""));
      next.setHours(now.getHours() + hours);
    } else next.setDate(now.getDate() + 1);

    return next;
  } catch {
    return null;
  }
};

// ----------------------------------------------
// COMPONENT
// ----------------------------------------------

export default function PatientHome() {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [adherenceLogs, setAdherenceLogs] = useState<AdherenceLog[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  const [prediction, setPrediction] = useState<any>(null);
  const [predictionLoading, setPredictionLoading] = useState(false);

  const [providers, setProviders] = useState<any[]>([]);
  const [providersLoading, setProvidersLoading] = useState(true);

  const [upcomingMedications, setUpcomingMedications] = useState<any[]>([]);
  const [upcomingMedsLoading, setUpcomingMedsLoading] = useState(true);

  // -------------------------------------------------
  // LOAD TOKEN
  // -------------------------------------------------
  useEffect(() => {
    AsyncStorage.getItem("token").then(setToken);
  }, []);

  // -------------------------------------------------
  // FETCH PATIENT
  // -------------------------------------------------
  useEffect(() => {
    if (!token) return;

    const load = async () => {
      const res = await fetch(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPatient(await res.json());
    };

    load();
  }, [token]);

  // -------------------------------------------------
  // FETCH PROVIDERS
  // -------------------------------------------------
  useEffect(() => {
    const load = async () => {
      const t = await AsyncStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/patient/providers`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      const data = await res.json();
      setProviders(data.providers ?? []);
      setProvidersLoading(false);
    };
    load();
  }, []);

  // -------------------------------------------------
  // FETCH AI PREDICTION
  // -------------------------------------------------
  const fetchPrediction = async () => {
    try {
      setPredictionLoading(true);
      const t = await AsyncStorage.getItem("token");

      const res = await fetch(`${API_URL}/api/adherence/predict`, {
        headers: { Authorization: `Bearer ${t}` },
      });

      setPrediction(await res.json());
    } catch (err) {
      console.log("Prediction fetch error:", err);
    } finally {
      setPredictionLoading(false);
    }
  };

  useEffect(() => {
    fetchPrediction();
  }, []);

  // -------------------------------------------------
  // FETCH UPCOMING MEDICATIONS
  // -------------------------------------------------
  useEffect(() => {
    const load = async () => {
      const t = await AsyncStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/medications`, {
        headers: { Authorization: `Bearer ${t}` },
      });

      const meds: Medication[] = normalizeToArray(await res.json());
      const now = new Date();

      const upcoming = meds
        .map((m) => {
          const next = getNextDoseDate(m);
          return next ? { ...m, nextDose: next } : null;
        })
        .filter((m): m is Medication & { nextDose: Date } => !!m)
        .filter((m) => m.nextDose > now)
        .sort((a, b) => a.nextDose.getTime() - b.nextDose.getTime())
        .slice(0, 5);

      setUpcomingMedications(upcoming);
      setUpcomingMedsLoading(false);
    };

    load();
  }, []);

  // -------------------------------------------------
  // ⭐ ENABLE SMART REMINDERS
  // -------------------------------------------------
  const enableSmartReminders = async () => {
    try {
      const t = await AsyncStorage.getItem("token");

      const res = await fetch(`${API_URL}/api/reminders/enable`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${t}`,
          "Content-Type": "application/json",
        },
      });

      const data = await res.json();

      Alert.alert("Smart Reminders Enabled", data.message);

      router.push("/(patient)/MedicationCalendar");
    } catch (err) {
      console.log("Reminder enable error:", err);
      Alert.alert("Error", "Failed to enable reminders.");
    }
  };

  // -------------------------------------------------
  // UI
  // -------------------------------------------------

  return (
    <ScrollView className="flex-1 bg-gray-50 dark:bg-gray-900 px-4 pt-10">
      <Text className="text-3xl font-bold text-gray-900 dark:text-white text-center mb-6">
        Patient Dashboard
      </Text>

      <View className="w-full max-w-5xl mx-auto">

        {/* TOP GRID */}
        <View className="flex-col md:flex-row gap-6">

          {/* Patient Info */}
          <View className="flex-1 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
            <PatientInfoCard patient={patient} />
          </View>

          {/* Providers */}
          <View className="flex-1 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
            <ProvidersCard
              providers={providers}
              loading={providersLoading}
              error={null}
            />
          </View>

        </View>

        {/* AI Prediction Card */}
        <View className="mt-6 bg-yellow-600/40 border border-yellow-700 p-5 rounded-2xl shadow-lg">
          <Text className="text-xl font-semibold text-gray-900 dark:text-yellow-200 mb-2">
            ⚠️ Dose Adherence Insight
          </Text>

          {predictionLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : prediction?.recommendations ? (
            <>
              <Text className="text-gray-800 dark:text-yellow-100 mb-4">
                {prediction.recommendations[0]}
              </Text>

              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={() => router.push("/(patient)/Chatbot")}
                  className="flex-1 bg-blue-600 py-3 rounded-xl"
                >
                  <Text className="text-white text-center font-semibold">
                    Ask MedAssist →
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={enableSmartReminders}
                  className="flex-1 bg-green-600 py-3 rounded-xl"
                >
                  <Text className="text-white text-center font-semibold">
                    Enable Smart Reminders
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <Text className="text-yellow-200">
              No prediction available.
            </Text>
          )}
        </View>

        {/* UPCOMING MEDS */}
        <View className="mt-6 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
          <Text className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
            Upcoming Medications
          </Text>

          {upcomingMedsLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : upcomingMedications.length > 0 ? (
            upcomingMedications.map((m) => (
              <View key={m._id} className="mb-4 pb-3 border-b border-gray-200 dark:border-gray-700">
                <Text className="text-gray-900 dark:text-white font-semibold">{m.name}</Text>
                <Text className="text-gray-600 dark:text-gray-400">
                  Next Dose: {new Date(m.nextDose).toLocaleString()}
                </Text>
                <Text className="text-gray-600 dark:text-gray-400">Dosage: {m.dosage}</Text>
              </View>
            ))
          ) : (
            <Text className="text-gray-600 dark:text-gray-400">No upcoming medications.</Text>
          )}
        </View>

        {/* BUTTON ROW */}
        <View className="mt-8 flex-col md:flex-row gap-4">

          <TouchableOpacity
            onPress={() => router.push("/(patient)/MedicationCalendar")}
            className="flex-1 bg-blue-600 py-4 rounded-2xl shadow-md"
          >
            <Text className="text-white text-center text-lg font-semibold">
              Go to Medication Calendar
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setShowLogs(true)}
            className="flex-1 bg-green-600 py-4 rounded-2xl shadow-md"
          >
            <Text className="text-white text-center text-lg font-semibold">
              View Dose Logs (Last 7 Days)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push("/(patient)/Chatbot")}
            className="flex-1 bg-purple-600 py-4 rounded-2xl shadow-md"
          >
            <Text className="text-white text-center text-lg font-semibold">
              Chat with MedAssist
            </Text>
          </TouchableOpacity>

        </View>

      </View>

      {/* LOGS MODAL */}
      <Modal visible={showLogs} animationType="slide" transparent>
        <View className="flex-1 justify-center items-center bg-black/50">
          <View 
            className="bg-white dark:bg-gray-800 rounded-xl p-6 w-11/12 max-h-[80%]"
            style={{
              ...(Platform.OS === 'web' && {
                maxWidth: '700px',
                width: '90%'
              })
            }}
          >
            <Text className="text-xl font-bold mb-4 text-center text-gray-900 dark:text-white">
              Dose Logs (Last 7 Days)
            </Text>

            <ScrollView className="max-h-[60vh]">
              {adherenceLogs.length > 0 ? (
                adherenceLogs.map((log, i) => (
                  <View key={i} className="border-b border-gray-300 py-2">
                    <Text className="text-gray-900 dark:text-gray-200 font-semibold">
                      Medication Log Entry
                    </Text>
                    <Text className="text-gray-700 dark:text-gray-400">
                      Status: {log.status}
                    </Text>
                    <Text className="text-gray-700 dark:text-gray-400">
                      Time:{" "}
                      {new Date(
                        log.takenAt ?? log.scheduledTime ?? log.createdAt
                      ).toLocaleString()}
                    </Text>
                  </View>
                ))
              ) : (
                <Text className="text-gray-700 dark:text-gray-300 text-center">
                  No doses logged.
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

    </ScrollView>
  );
}
