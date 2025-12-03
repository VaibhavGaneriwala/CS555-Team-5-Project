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

// ---------- Provider Types ----------
interface ProviderItem {
  _id: string;
  name: string;
  email: string;
  phoneNumber: string;
}

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

  // ---------- Provider State ----------
  const [providers, setProviders] = useState<ProviderItem[]>([]);
  const [providersLoading, setProvidersLoading] = useState<boolean>(true);
  const [providersError, setProvidersError] = useState<string | null>(null);

  // ---------- Recent Medications ----------
  const [recentMedications, setRecentMedications] = useState<Medication[]>([]);
  const [recentMedsLoading, setRecentMedsLoading] = useState<boolean>(true);
  const [recentMedsError, setRecentMedsError] = useState<string | null>(null);
  const [upcomingMedications, setUpcomingMedications] = useState<Medication[]>([]);
  const [upcomingMedsLoading, setUpcomingMedsLoading] = useState<boolean>(true);
  const [upcomingMedsError, setUpcomingMedsError] = useState<string | null>(null);
  const [pastMedications, setPastMedications] = useState<Medication[]>([]);
  const [pastMedsLoading, setPastMedsLoading] = useState<boolean>(true);
  const [pastMedsError, setPastMedsError] = useState<string | null>(null);

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

        const extractDate = (raw: any): string | number | null => {
          if (!raw) return null;
          if (raw.$date?.$numberLong) return Number(raw.$date.$numberLong);
          if (typeof raw === "string" || typeof raw === "number") return raw;
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

  // ---------- Fetch Providers ----------
  const fetchProviders = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('token');
      if (!storedToken) {
        setProvidersError('Please log in again.');
        setProvidersLoading(false);
        return;
      }

      const response = await fetch(`${API_URL}/api/patient/providers`, {
        headers: {
          Authorization: `Bearer ${storedToken}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        setProvidersError(data.message || 'Failed to fetch providers.');
      } else {
        setProviders(data.providers || []);
      }
    } catch (err) {
      setProvidersError('Could not connect to server.');
    } finally {
      setProvidersLoading(false);
    }
  };

  // ---------------- Recent Medications ----------------
  const fetchRecentMedications = async () => {
    setRecentMedsLoading(true);
    setRecentMedsError(null);
    setUpcomingMedsLoading(true);
    setUpcomingMedsError(null);
    setPastMedsLoading(true);
    setPastMedsError(null);
    try {
      const storedToken = await AsyncStorage.getItem('token');
      if (!storedToken) {
        const msg = 'Please log in again.';
        setRecentMedsError(msg);
        setUpcomingMedsError(msg);
        return;
      }

      const response = await fetch(`${API_URL}/api/medications`, {
        headers: {
          Authorization: `Bearer ${storedToken}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        const msg = data?.message || 'Failed to fetch medications.';
        setRecentMedsError(msg);
        setUpcomingMedsError(msg);
        setPastMedsError(msg);
      } else {
        const meds: Medication[] = normalizeToArray(data);

        // Recent: medications created in the last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const recent = meds.filter((m) => new Date(m.createdAt) >= sevenDaysAgo).slice(0, 5);
        setRecentMedications(recent);

        // Upcoming: medications whose startDate is in the next 7 days
        const now = new Date();
        const inSevenDays = new Date();
        inSevenDays.setDate(inSevenDays.getDate() + 7);
        const upcoming = meds.filter((m) => {
          if (!m.startDate) return false;
          const sd = new Date(m.startDate);
          return sd > now && sd <= inSevenDays;
        }).slice(0, 5);
        setUpcomingMedications(upcoming);

        // Past: medications that have an endDate before now, or are marked inactive
        const past = meds.filter((m) => {
          if (m.isActive === false) return true;
          if (m.endDate) {
            try {
              return new Date(m.endDate) < now;
            } catch (e) {
              return false;
            }
          }
          return false;
        }).slice(0, 5);
        setPastMedications(past);
      }
    } catch (err) {
      setRecentMedsError('Could not connect to server.');
      setUpcomingMedsError('Could not connect to server.');
      setPastMedsError('Could not connect to server.');
    } finally {
      setRecentMedsLoading(false);
      setUpcomingMedsLoading(false);
      setPastMedsLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
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
          {/* ---------- Patient Overview ---------- */}
          <View className="flex items-center">
            <PatientInfoCard patient={patient} />

            <TouchableOpacity
              onPress={() => router.push('/(patient)/MedicationCalendar')}
              activeOpacity={0.8}
              className="bg-blue-500 px-6 py-3 rounded-xl w-full max-w-[300px] mb-4"
            >
              <Text className="text-white text-lg font-semibold text-center">
                Go to Medication Calendar
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={displayLogs}
              activeOpacity={0.8}
              disabled={!token}
              className={`px-6 py-3 rounded-xl w-full max-w-[300px] mb-6 ${
                token ? 'bg-green-500' : 'bg-gray-400'
              }`}
            >
              <Text className="text-white text-lg font-semibold text-center">
                {token ? 'View Dose Logs (Last 7 Days)' : 'Loading token...'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* ---------- Provider List Section ---------- */}
          <View className="flex items-center">
            <ProvidersCard
              providers={providers}
              loading={providersLoading}
              error={providersError}
            />

            {/* Upcoming medications small card */}
            <View className="mt-4 w-full flex items-center">
              <View className="bg-gray-200 dark:bg-gray-700 p-4 rounded-xl w-11/12 sm:max-w-[300px]">
                <Text className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
                  Upcoming Medications
                </Text>
                {upcomingMedsLoading ? (
                  <ActivityIndicator size="small" color="#3B82F6" />
                ) : upcomingMedsError ? (
                  <Text className="text-red-500">{upcomingMedsError}</Text>
                ) : upcomingMedications && upcomingMedications.length > 0 ? (
                  upcomingMedications.map((m) => (
                    <View key={m._id} className="border-b border-gray-300 py-2">
                      <Text className="text-gray-800 dark:text-gray-200 font-semibold">{m.name || 'Unnamed'}</Text>
                      <Text className="text-gray-600 dark:text-gray-400">{`Starts: ${new Date(m.startDate).toLocaleDateString()}`}</Text>
                      <Text className="text-gray-600 dark:text-gray-400">{`Dosage: ${m.dosage || 'N/A'}`}</Text>
                    </View>
                  ))
                ) : (
                  <Text className="text-gray-600 dark:text-gray-300">No upcoming medications in the next 7 days.</Text>
                )}
              </View>
            </View>

            {/* Past medications small card */}
            <View className="mt-4 w-full flex items-center">
              <View className="bg-gray-200 dark:bg-gray-700 p-4 rounded-xl w-11/12 sm:max-w-[300px]">
                <Text className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
                  Past Medications
                </Text>
                {pastMedsLoading ? (
                  <ActivityIndicator size="small" color="#3B82F6" />
                ) : pastMedsError ? (
                  <Text className="text-red-500">{pastMedsError}</Text>
                ) : pastMedications && pastMedications.length > 0 ? (
                  pastMedications.map((m) => (
                    <View key={m._id} className="border-b border-gray-300 py-2">
                      <Text className="text-gray-800 dark:text-gray-200 font-semibold">{m.name || 'Unnamed'}</Text>
                      <Text className="text-gray-600 dark:text-gray-400">{`Ended: ${m.endDate ? new Date(m.endDate).toLocaleDateString() : 'Unknown'}`}</Text>
                      <Text className="text-gray-600 dark:text-gray-400">{`Dosage: ${m.dosage || 'N/A'}`}</Text>
                    </View>
                  ))
                ) : (
                  <Text className="text-gray-600 dark:text-gray-300">No past medications.</Text>
                )}
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* ---------- Logs Modal ---------- */}
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
                      <Text className="text-gray-500 italic">Notes: {dose.notes}</Text>
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
  );
}
