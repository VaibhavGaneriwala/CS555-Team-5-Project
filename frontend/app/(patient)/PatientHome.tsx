import React, { useState, useEffect, useMemo } from 'react';
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

const toISO = (d: Date) => d.toISOString();

// ---------------- Component ----------------
export default function PatientHome() {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [medMap, setMedMap] = useState<MedMap>({});
  const [adherenceLogs, setAdherenceLogs] = useState<AdherenceLog[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [showLogs, setShowLogs] = useState<boolean>(false);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load token
  useEffect(() => {
    const loadToken = async () => {
      const storedToken = await AsyncStorage.getItem('token');
      setToken(storedToken);
    };
    loadToken();
  }, []);

  // Fetch patient profile
  useEffect(() => {
    const fetchPatient = async () => {
      if (!token) return;
      try {
        const res = await fetch(`${API_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          console.error("Failed to fetch profile", await res.text());
          return;
        }

        const data = await res.json();
        console.log("ME ENDPOINT:", data);

        console.log("ME ENDPOINT RAW:", data);

        // Convert MongoDB date format
        const extractDate = (raw: any): string | number | null => {
          if (!raw) return null;

          // MongoDB extended JSON: { $date: { $numberLong: "1234567" }}
          if (raw.$date?.$numberLong) {
            return Number(raw.$date.$numberLong);
          }

          // Already a string or number
          if (typeof raw === "string" || typeof raw === "number") {
            return raw;
          }

          return null;
        };

        const normalized: Patient = {
          firstName: data.firstName ?? "",
          lastName: data.lastName ?? "",
          email: data.email ?? "",
          role: data.role ?? "patient",
          phoneNumber: data.phoneNumber ?? "",
          dateOfBirth: extractDate(data.dateOfBirth),
          gender: data.gender ?? "",
          address: data.address ?? null,
        };

        console.log("ME ENDPOINT NORMALIZED:", normalized);

        setPatient(normalized);

      } catch (err) {
        console.error("Failed to fetch patient info", err);
      }
    };
    fetchPatient();
  }, [token]);

  // Build lookup map when medications change
  useEffect(() => {
    const map: MedMap = {};
    for (const m of medications) map[m._id] = { name: m.name, dosage: m.dosage };
    setMedMap((prev) => ({ ...prev, ...map }));
  }, [medications]);

  // Fetch all medications
  const fetchMedications = async () => {
    if (!token) return;
    try {
      const response = await fetch(`${API_URL}/api/medications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch medications');
      const data: Medication[] = await response.json();
      setMedications(data);
    } catch (err: any) {
      setError(err.message || 'Network error fetching medications');
    }
  };

  // Fetch adherence logs
  const fetchAdherenceLogs = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const now = new Date();

      const response = await fetch(
        `${API_URL}/api/adherence?startDate=${toISO(sevenDaysAgo)}&endDate=${toISO(now)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!response.ok) throw new Error('Failed to fetch adherence logs');

      const raw = await response.json();
      const data: AdherenceLog[] = normalizeToArray(raw);
      setAdherenceLogs(data);
    } catch (err: any) {
      setError(err.message || 'Network error fetching adherence logs');
      setAdherenceLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const displayLogs = async () => {
    setShowLogs(true);
    setLoading(true);
    await Promise.all([fetchMedications(), fetchAdherenceLogs()]);
    setLoading(false);
  };

  const closeLogs = () => {
    setShowLogs(false);
    setError(null);
  };

  const resolveMedDisplay = (medRef: string | PopulatedMedication) => {
    let name = 'Unknown Medication';
    let dosage = 'N/A';

    if (isPopulatedMedication(medRef)) {
      name = medRef.name || name;
      dosage = medRef.dosage || dosage;
    } else if (typeof medRef === 'string') {
      const known = medMap[medRef];
      if (known?.name) name = known.name;
      if (known?.dosage) dosage = known.dosage;
    }

    return { name, dosage };
  };

  const recentDoses = useMemo(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    return adherenceLogs
      .map((log) => {
        const effectiveTime = log.takenAt || log.scheduledTime || log.createdAt;
        if (!effectiveTime) return null;
        const { name, dosage } = resolveMedDisplay(log.medication);
        return {
          medName: name,
          dosage,
          status: log.status,
          takenAt: effectiveTime,
          notes: log.notes || '',
        };
      })
      .filter(Boolean)
      .sort(
        (a, b) =>
          new Date((b as any).takenAt).getTime() -
          new Date((a as any).takenAt).getTime()
      ) as Array<{
      medName: string;
      dosage: string;
      status: string;
      takenAt: string;
      notes: string;
    }>;
  }, [adherenceLogs, medMap]);

  // ---------------- UI ----------------
  return (
    <View className="flex-1 items-center justify-center bg-white dark:bg-gray-900 px-4">
      <Text className="text-3xl font-bold mb-8 text-gray-800 dark:text-white">
        Patient Dashboard
      </Text>

      <View className="flex justify-between items-center sm:items-start flex-col sm:flex-row gap-6 w-full max-w-6xl">
        {/* ---------- Left Section: Patient Overview ---------- */}
        <View className="flex items-center">
          <View className="bg-gray-100 dark:bg-gray-800 mb-6 p-8 rounded-2xl shadow-md border border-gray-300 dark:border-gray-600 w-full">
            {patient ? (
              <View>
                <Text className="text-gray-900 dark:text-white text-2xl font-extrabold text-center mb-4 tracking-wide">
                  {patient.firstName} {patient.lastName}
                </Text>

                <View className="space-y-1">
                  <Text className="text-gray-700 dark:text-gray-300 text-center text-base">Email: {patient.email || 'N/A'}</Text>
                </View>

                <View className="space-y-1">
                  <Text className="text-gray-700 dark:text-gray-300 text-center text-base">Phone: {patient.phoneNumber || 'N/A'}</Text>
                </View>

                <View className="space-y-1">
                  <Text className="text-gray-700 dark:text-gray-300 text-center text-base">Gender: {patient.gender || 'N/A'}</Text>
                </View>

                {patient.address && (
                  <View className="mt-4 space-y-1">
                    <Text className="text-gray-800 dark:text-gray-200 font-semibold text-center">Address</Text>
                    <Text className="text-gray-600 dark:text-gray-400 text-center">{patient.address.streetAddress}</Text>
                    <Text className="text-gray-600 dark:text-gray-400 text-center">{patient.address.city}, {patient.address.state} {patient.address.zipcode}</Text>
                  </View>
                )}
              </View>
            ) : (
              <View className="animate-pulse space-y-3 py-4">
                <View className="h-6 bg-gray-400 rounded w-48 mx-auto" />
                <View className="h-4 bg-gray-400 rounded w-56 mx-auto" />
                <View className="h-4 bg-gray-400 rounded w-40 mx-auto" />
                <View className="h-4 bg-gray-400 rounded w-36 mx-auto" />
                <View className="h-4 bg-gray-400 rounded w-52 mx-auto" />
              </View>
            )}
          </View>

          <TouchableOpacity
            onPress={() => router.push('/(patient)/MedicationCalendar')}
            activeOpacity={0.8}
            className="bg-blue-500 px-6 py-3 rounded-xl w-full max-w-[300px] mb-4"
          >
            <Text className="text-white text-lg font-semibold text-center">Go to Medication Calendar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={displayLogs}
            activeOpacity={0.8}
            disabled={!token}
            className={`px-6 py-3 rounded-xl w-full max-w-[300px] mb-6 ${token ? 'bg-green-500' : 'bg-gray-400'}`}
          >
            <Text className="text-white text-lg font-semibold text-center">
              {token ? 'View Dose Logs (Last 7 Days)' : 'Loading token...'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ---------- Right Column (Provider Overview) ---------- */}
        <View className="flex items-center">
          <View className="bg-gray-100 dark:bg-gray-800 mb-6 p-8 rounded-2xl shadow-md border border-gray-300 dark:border-gray-600 w-full">
            <Text className="text-gray-700 dark:text-gray-200 text-center">Provider Overview Placeholder</Text>
          </View>

          <TouchableOpacity
            onPress={() => router.push('/(patient)/ViewProviders')}
            activeOpacity={0.8}
            className="bg-blue-500 px-6 py-3 rounded-xl w-full max-w-[300px]"
          >
            <Text className="text-white text-lg font-semibold text-center">Go to View Providers</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ---------- Logs Modal ---------- */}
      <Modal visible={showLogs} animationType="slide" transparent>
        <View className="flex-1 justify-center items-center bg-black/50">
          <View className="bg-white dark:bg-gray-800 rounded-xl p-6 w-11/12 max-h-[80%]">
            <Text className="text-xl font-bold mb-4 text-gray-800 dark:text-white text-center">Dose Logs (Last 7 Days)</Text>

            {loading ? (
              <ActivityIndicator size="large" color="#3B82F6" />
            ) : error ? (
              <Text className="text-red-600 text-center">{error}</Text>
            ) : recentDoses.length > 0 ? (
              <ScrollView className="max-h-[60vh]">
                {recentDoses.map((dose, i) => (
                  <View key={i} className="border-b border-gray-300 py-2">
                    <Text className="text-gray-800 dark:text-gray-200 font-semibold">{dose.medName}</Text>
                    <Text className="text-gray-600 dark:text-gray-400">Dosage: {dose.dosage}</Text>
                    <Text className="text-gray-600 dark:text-gray-400">Status: {dose.status}</Text>
                    <Text className="text-gray-600 dark:text-gray-400">Taken At: {new Date(dose.takenAt).toLocaleString()}</Text>
                    {dose.notes ? <Text className="text-gray-500 italic">Notes: {dose.notes}</Text> : null}
                  </View>
                ))}
              </ScrollView>
            ) : (
              <Text className="text-gray-600 dark:text-gray-300 text-center">No doses logged in the last 7 days.</Text>
            )}

            <TouchableOpacity onPress={closeLogs} className="bg-red-500 px-6 py-3 rounded-xl mt-6">
              <Text className="text-white text-lg font-semibold text-center">Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}