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

const API_URL =
  Constants.expoConfig?.extra?.API_URL ?? 'http://localhost:3000';

// ---------------- Types ----------------
interface PopulatedMedication {
  _id: string;
  name?: string;
  dosage?: string;
}

interface AdherenceLog {
  _id: string;
  medication: string | PopulatedMedication;
  status: string; // 'taken', 'missed', etc.
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
  const [medications, setMedications] = useState<Medication[]>([]);
  const [medMap, setMedMap] = useState<MedMap>({});
  const [adherenceLogs, setAdherenceLogs] = useState<AdherenceLog[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [showLogs, setShowLogs] = useState<boolean>(false);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load auth token
  useEffect(() => {
    const loadToken = async () => {
      const storedToken = await AsyncStorage.getItem('token');
      setToken(storedToken);
    };
    loadToken();
  }, []);

  // Build lookup map when medications change
  useEffect(() => {
    const map: MedMap = {};
    for (const m of medications) {
      map[m._id] = { name: m.name, dosage: m.dosage };
    }
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
      console.error('fetchMedications error', err);
      setError(err.message || 'Network error fetching medications');
    }
  };

  // Fetch adherence logs (last 7 days)
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

      // Collect missing med IDs to fetch details
      const missingIds = new Set<string>();
      data.forEach((log) => {
        if (isPopulatedMedication(log.medication)) {
          const { _id, name, dosage } = log.medication;
          if (_id && (!name || !dosage) && !medMap[_id]) missingIds.add(_id);
        } else if (typeof log.medication === 'string') {
          if (!medMap[log.medication]) missingIds.add(log.medication);
        }
      });

      // Fetch missing medication details individually
      if (missingIds.size > 0) {
        const fetchedEntries: MedMap = {};
        await Promise.all(
          Array.from(missingIds).map(async (id) => {
            try {
              const res = await fetch(`${API_URL}/api/medications/${id}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              if (res.ok) {
                const med: Medication = await res.json();
                fetchedEntries[id] = { name: med.name, dosage: med.dosage };
              }
            } catch {
              /* ignore */
            }
          })
        );
        if (Object.keys(fetchedEntries).length > 0) {
          setMedMap((prev) => ({ ...prev, ...fetchedEntries }));
        }
      }

      setAdherenceLogs(data);
    } catch (err: any) {
      console.error('fetchAdherenceLogs error', err);
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

  // ✅ Pure resolver — no state updates here
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

      <View className="flex items-center flex-col sm:flex-row bg-white dark:bg-gray-900 px-4">
        {/* ---------- Left Column ---------- */}
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
            className={`px-6 py-3 rounded-xl mb-6 w-11/12 sm:max-w-[300px] ${
              token ? 'bg-green-500' : 'bg-gray-400'
            }`}
          >
            <Text className="text-white text-lg font-semibold text-center">
              {token ? 'View Dose Logs (Last 7 Days)' : 'Loading token...'}
            </Text>
          </TouchableOpacity>

          {/* === Modal for Dose Logs === */}
          <Modal visible={showLogs} animationType="slide" transparent>
            <View className="flex-1 justify-center items-center bg-black/50">
              <View className="bg-white dark:bg-gray-800 rounded-xl p-6 w-11/12 max-h-[80%]">
                <Text className="text-xl font-bold mb-4 text-gray-800 dark:text-white text-center">
                  Dose Logs (Last 7 Days)
                </Text>

                {loading ? (
                  <ActivityIndicator size="large" color="#3B82F6" />
                ) : error ? (
                  <Text className="text-red-600 text-center">{error}</Text>
                ) : recentDoses.length > 0 ? (
                  <ScrollView className="max-h-[60vh]">
                    {recentDoses.map((dose, i) => (
                      <View key={i} className="border-b border-gray-300 py-2">
                        <Text className="text-gray-800 dark:text-gray-200 font-semibold">
                          {dose.medName}
                        </Text>
                        <Text className="text-gray-600 dark:text-gray-400">
                          Dosage: {dose.dosage}
                        </Text>
                        <Text className="text-gray-600 dark:text-gray-400">
                          Status: {dose.status}
                        </Text>
                        <Text className="text-gray-600 dark:text-gray-400">
                          Taken At: {new Date(dose.takenAt).toLocaleString()}
                        </Text>
                        {dose.notes ? (
                          <Text className="text-gray-500 italic">
                            Notes: {dose.notes}
                          </Text>
                        ) : null}
                      </View>
                    ))}
                  </ScrollView>
                ) : (
                  <Text className="text-gray-600 dark:text-gray-300 text-center">
                    No doses logged in the last 7 days.
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

        {/* ---------- Spacer ---------- */}
        <View className="py-4 sm:py-0" />

        {/* ---------- Right Column ---------- */}
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
