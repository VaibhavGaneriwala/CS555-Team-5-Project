// ================================================
// PatientHome.tsx - Beautiful Complete Dashboard
// ================================================

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  ScrollView,
  Platform,
  Alert,
  RefreshControl,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
} from "react-native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { Ionicons } from "@expo/vector-icons";
import { Calendar } from "react-native-calendars";
import { useColorScheme } from "nativewind";

import ProvidersCard from "@/components/ProvidersCard";
import PatientNavbar from "@/components/PatientNavbar";
import {
  scheduleAllMedicationReminders,
  registerForPushNotificationsAsync,
} from "@/utils/notifications";

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
  medication?: {
    _id: string;
    name: string;
    dosage: string;
  };
  notes?: string;
}

interface AdherenceStats {
  total: number;
  taken: number;
  missed: number;
  adherenceRate: number;
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
  schedule?: { time: string; days: string[] }[];
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
  const [adherenceStats, setAdherenceStats] = useState<AdherenceStats | null>(null);
  const [showLogs, setShowLogs] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const [providers, setProviders] = useState<any[]>([]);
  const [providersLoading, setProvidersLoading] = useState(true);

  const [upcomingMedications, setUpcomingMedications] = useState<any[]>([]);
  const [upcomingMedsLoading, setUpcomingMedsLoading] = useState(true);

  // Edit modal state
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipcode, setZipcode] = useState('');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState<string | null>(null);

  // Chatbot modal state
  const [chatbotModalVisible, setChatbotModalVisible] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'bot'; text: string }>>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatScrollRef = useRef<ScrollView | null>(null);
  const STORAGE_KEY = "medassist_chat_messages";

  // Medication Calendar modal state
  const [calendarModalVisible, setCalendarModalVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [calendarSuccessMessage, setCalendarSuccessMessage] = useState("");
  const [lastLogId, setLastLogId] = useState<string | null>(null);
  const { colorScheme } = useColorScheme();
  const isDarkMode = colorScheme === "dark";

  // Load chat history when modal opens
  useEffect(() => {
    if (chatbotModalVisible) {
      const loadMessages = async () => {
        try {
          const stored = await AsyncStorage.getItem(STORAGE_KEY);
          if (stored) {
            const parsed = JSON.parse(stored);
            setChatMessages(parsed);
          }
        } catch (err) {
          console.error("Failed to load chat history:", err);
        }
      };
      loadMessages();
    }
  }, [chatbotModalVisible]);

  // Save chat history
  useEffect(() => {
    if (chatMessages.length === 0) return;
    const saveMessages = async () => {
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(chatMessages));
      } catch (err) {
        console.error("Failed to save chat history:", err);
      }
    };
    saveMessages();
  }, [chatMessages]);

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
      try {
        const res = await fetch(`${API_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          setPatient(await res.json());
        }
      } catch (err) {
        console.error("Error fetching patient:", err);
      }
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
  // FETCH ADHERENCE STATS
  // -------------------------------------------------
  const fetchAdherenceStats = async () => {
    try {
      const t = await AsyncStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/adherence/stats`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (res.ok) {
        const stats = await res.json();
        setAdherenceStats(stats);
      }
    } catch (err) {
      console.error("Error fetching adherence stats:", err);
    }
  };

  // -------------------------------------------------
  // FETCH ADHERENCE LOGS (EXTENDED RANGE FOR CALENDAR)
  // -------------------------------------------------
  const fetchAdherenceLogs = async () => {
    try {
      const t = await AsyncStorage.getItem("token");
      const endDate = new Date();
      const startDate = new Date();
      // Fetch logs for past 90 days to match calendar range
      startDate.setDate(startDate.getDate() - 90);

      const res = await fetch(
        `${API_URL}/api/adherence?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`,
        {
          headers: { Authorization: `Bearer ${t}` },
        }
      );
      if (res.ok) {
        const logs = await res.json();
        setAdherenceLogs(normalizeToArray(logs));
      }
    } catch (err) {
      console.error("Error fetching adherence logs:", err);
    }
  };

  // -------------------------------------------------
  // FETCH ALL MEDICATIONS
  // -------------------------------------------------
  const fetchUpcomingMedications = async () => {
    try {
      const t = await AsyncStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/medications`, {
        headers: { Authorization: `Bearer ${t}` },
      });

      if (res.ok) {
        const meds: Medication[] = normalizeToArray(await res.json());
        setMedications(meds);
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
      }
      setUpcomingMedsLoading(false);
    } catch (err) {
      console.error("Error fetching medications:", err);
      setUpcomingMedsLoading(false);
    }
  };

  useEffect(() => {
    fetchUpcomingMedications();
    fetchAdherenceStats();
    fetchAdherenceLogs();
  }, []);

  // -------------------------------------------------
  // AUTO-SCHEDULE REMINDERS WHEN MEDICATIONS CHANGE
  // -------------------------------------------------
  useEffect(() => {
    if (medications.length > 0) {
      // Automatically schedule reminders when medications are loaded
      scheduleAllMedicationReminders(medications).catch((err) => {
        console.error("Error auto-scheduling reminders:", err);
      });
    }
  }, [medications]);

  // -------------------------------------------------
  // REFRESH FUNCTION
  // -------------------------------------------------
  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchUpcomingMedications(),
      fetchAdherenceStats(),
      fetchAdherenceLogs(),
    ]);
    setRefreshing(false);
  };

  // -------------------------------------------------
  // ⭐ ENABLE SMART REMINDERS (1 Day Before Notifications)
  // -------------------------------------------------
  const enableSmartReminders = async () => {
    try {
      // Register for push notifications on mobile
      if (Platform.OS !== "web") {
        await registerForPushNotificationsAsync();
      }

      // Schedule all medication reminders
      await scheduleAllMedicationReminders(medications);

      Alert.alert(
        "Smart Reminders Enabled",
        Platform.OS === "web"
          ? "You will receive alerts 1 day before your scheduled medication times."
          : "You will receive push notifications 1 day before your scheduled medication times.",
        [{ text: "OK", onPress: () => setCalendarModalVisible(true) }]
      );
    } catch (err) {
      console.log("Reminder enable error:", err);
      Alert.alert("Error", "Failed to enable reminders.");
    }
  };

  // -------------------------------------------------
  // HANDLE OPEN EDIT MODAL
  // -------------------------------------------------
  const handleOpenEditModal = () => {
    if (patient) {
      setPhoneNumber(patient.phoneNumber || '');
      setStreetAddress(patient.address?.streetAddress || '');
      setCity(patient.address?.city || '');
      setState(patient.address?.state || '');
      setZipcode(patient.address?.zipcode || '');
      setValidationErrors({});
      setSaveError(null);
      setEditModalVisible(true);
    }
  };

  // -------------------------------------------------
  // CALENDAR HELPER FUNCTIONS
  // -------------------------------------------------
  const getDayName = (dateString: string) => {
    const d = new Date(dateString);
    return d.toLocaleDateString("en-US", { weekday: "long" });
  };

  const getMedsForDate = (dateString: string) => {
    const day = getDayName(dateString);
    const selectedDateObj = new Date(dateString);
    selectedDateObj.setHours(0, 0, 0, 0);
    
    // Get medications that have adherence logs for this date
    const medIdsWithLogs = new Set<string>();
    const medLogsMap = new Map<string, AdherenceLog[]>();
    
    adherenceLogs.forEach((log) => {
      // Handle both string and object medication IDs
      let medId: string | null = null;
      if (log.medication) {
        if (typeof log.medication === 'string') {
          medId = log.medication;
        } else if (log.medication._id) {
          const medIdValue = log.medication._id;
          medId = typeof medIdValue === 'string' ? medIdValue : String(medIdValue);
        }
      }
      
      if (medId) {
        const logDate = new Date(log.takenAt || log.scheduledTime || log.createdAt);
        logDate.setHours(0, 0, 0, 0);
        if (logDate.getTime() === selectedDateObj.getTime()) {
          medIdsWithLogs.add(medId);
          if (!medLogsMap.has(medId)) {
            medLogsMap.set(medId, []);
          }
          medLogsMap.get(medId)!.push(log);
        }
      }
    });
    
    // Helper to normalize medication ID for comparison
    const normalizeMedId = (id: string): string => id.toString();
    
    return medications.filter((m) => {
      const medId = normalizeMedId(m._id);
      // Check if medication has a log for this date
      const hasLogForDate = medIdsWithLogs.has(medId);
      
      // Check if medication has a schedule that matches this day
      let hasMatchingSchedule = false;
      if (m.schedule && m.schedule.length > 0) {
        hasMatchingSchedule = m.schedule.some((s) => s.days.includes(day));
      }
      
      // Include medication if it has a log for this date OR has a matching schedule
      if (!hasLogForDate && !hasMatchingSchedule) return false;
      
      // Check start date - medication must have started on or before this date
      if (m.startDate) {
        const startDateObj = new Date(m.startDate);
        startDateObj.setHours(0, 0, 0, 0);
        if (startDateObj > selectedDateObj) return false;
      }
      
      // Show medications even if they've ended (for historical view)
      return true;
    }).concat(
      // Also include medications from logs that might not be in the medications array
      Array.from(medIdsWithLogs)
        .filter(medId => !medications.some(m => normalizeMedId(m._id) === medId))
        .map(medId => {
          const log = adherenceLogs.find(l => {
            let logMedId: string | null = null;
            if (l.medication) {
              if (typeof l.medication === 'string') {
                logMedId = l.medication;
              } else if (l.medication._id) {
                const medIdValue = l.medication._id;
                logMedId = typeof medIdValue === 'string' ? medIdValue : String(medIdValue);
              }
            }
            return logMedId === medId;
          });
          
          if (!log?.medication) return null;
          
          const medName = typeof log.medication === 'object' && log.medication.name 
            ? log.medication.name 
            : 'Unknown Medication';
          const medDosage = typeof log.medication === 'object' && log.medication.dosage 
            ? log.medication.dosage 
            : '';
          
          return {
            _id: medId,
            name: medName,
            dosage: medDosage,
            frequency: '',
            instructions: '',
            startDate: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            schedule: undefined,
          } as Medication;
        })
        .filter((m): m is Medication => m !== null)
    );
  };

  const markedDates = useMemo(() => {
    const marks: any = {};
    
    // Create a map of dates that have adherence logs
    const datesWithLogs = new Set<string>();
    adherenceLogs.forEach((log) => {
      const logDate = new Date(log.takenAt || log.scheduledTime || log.createdAt);
      const dateString = logDate.toISOString().split("T")[0];
      datesWithLogs.add(dateString);
    });
    
    // Show medications for past 90 days and future 90 days (180 days total)
    for (let i = -90; i < 90; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const ds = d.toISOString().split("T")[0];
      const medsForDate = getMedsForDate(ds);
      const hasLogs = datesWithLogs.has(ds);
      
      if (medsForDate.length > 0 || hasLogs) {
        // Different color for past vs future dates
        const isPast = i < 0;
        // If there are logs for this date, use a different color
        if (hasLogs) {
          marks[ds] = { 
            marked: true, 
            dotColor: isPast ? "#10B981" : "#3B82F6" // Green for past with logs, blue for future
          };
        } else {
          marks[ds] = { 
            marked: true, 
            dotColor: isPast ? "#9CA3AF" : "#3B82F6" // Gray for past, blue for future
          };
        }
      }
    }
    marks[selectedDate] = {
      ...(marks[selectedDate] || {}),
      selected: true,
      selectedColor: "#2563EB",
    };
    return marks;
  }, [medications, selectedDate, adherenceLogs]);

  const logDose = async (medId: string, time: string) => {
    try {
      if (!token) return;
      const res = await fetch(`${API_URL}/api/adherence`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          medicationId: medId,
          scheduledTime: `${selectedDate} ${time}`,
          takenAt: new Date().toISOString(),
          status: "taken",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        console.error("Log dose error:", data);
        throw new Error(data?.message || "Failed to log dose");
      }
      if (data?.adherenceLog?._id) {
        setLastLogId(data.adherenceLog._id);
      } else {
        setLastLogId(null);
      }
      setCalendarSuccessMessage("Dose logged successfully!");
      setTimeout(() => setCalendarSuccessMessage(""), 2500);
      // Refresh adherence stats
      fetchAdherenceStats();
      fetchAdherenceLogs();
    } catch (err) {
      console.error(err);
      setCalendarSuccessMessage("Error logging dose.");
      setTimeout(() => setCalendarSuccessMessage(""), 2500);
    }
  };

  const undoDose = async () => {
    if (!lastLogId || !token) return;
    try {
      const res = await fetch(`${API_URL}/api/adherence/${lastLogId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        console.error("Undo dose error:", data);
        throw new Error(data?.message || "Failed to undo dose");
      }
      setCalendarSuccessMessage("Dose undone.");
      setLastLogId(null);
      setTimeout(() => setCalendarSuccessMessage(""), 2500);
      // Refresh adherence stats
      fetchAdherenceStats();
      fetchAdherenceLogs();
    } catch (err) {
      console.error(err);
      setCalendarSuccessMessage("Error undoing dose.");
      setTimeout(() => setCalendarSuccessMessage(""), 2500);
    }
  };

  // -------------------------------------------------
  // HANDLE SAVE PATIENT INFO
  // -------------------------------------------------
  const handleSavePatientInfo = async () => {
    setValidationErrors({});
    setSaveError(null);

    const errors: Record<string, string> = {};

    // Validate phone number if provided
    if (phoneNumber && phoneNumber.trim() !== '') {
      if (!/^\d{10}$/.test(phoneNumber)) {
        errors.phoneNumber = 'Phone number must be exactly 10 digits';
      }
    }

    // Validate address fields - if any address field is provided, all are required
    if (streetAddress || city || state || zipcode) {
      if (!streetAddress || streetAddress.trim() === '') {
        errors.streetAddress = 'Street address is required';
      }
      if (!city || city.trim() === '') {
        errors.city = 'City is required';
      }
      if (!state || state.trim() === '') {
        errors.state = 'State is required';
      }
      if (!zipcode || zipcode.trim() === '') {
        errors.zipcode = 'Zipcode is required';
      } else if (!/^\d{5}$/.test(zipcode)) {
        errors.zipcode = 'Zipcode must be exactly 5 digits';
      }
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      if (Platform.OS !== 'web') {
        Alert.alert('Validation Error', 'Please fix the errors in the form.');
      }
      return;
    }

    setSaving(true);
    try {
      if (!token) {
        const errorMessage = 'Authentication token missing. Please log in again.';
        setSaveError(errorMessage);
        if (Platform.OS !== 'web') {
          Alert.alert('Error', errorMessage);
        }
        setSaving(false);
        return;
      }

      const updateData: any = {};
      
      if (phoneNumber) {
        updateData.phoneNumber = phoneNumber;
      }

      if (streetAddress && city && state && zipcode) {
        updateData.address = {
          streetAddress,
          city,
          state,
          zipcode,
        };
      }

      const response = await fetch(`${API_URL}/api/auth/me`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data.message || 'Failed to update patient information.';
        setSaveError(errorMessage);
        if (Platform.OS !== 'web') {
          Alert.alert('Error', errorMessage);
        }
        setSaving(false);
        return;
      }

      // Success
      if (Platform.OS === 'web') {
        setSaveError(null);
        setValidationErrors({});
      } else {
        Alert.alert('Success', 'Patient information updated successfully!');
      }
      setEditModalVisible(false);
      setValidationErrors({});
      setSaveError(null);
      
      // Refresh patient data
      const res = await fetch(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setPatient(await res.json());
      }
    } catch (err) {
      console.error('Error updating patient:', err);
      const errorMessage = 'Could not connect to server. Please check your connection and try again.';
      setSaveError(errorMessage);
      if (Platform.OS !== 'web') {
        Alert.alert('Error', errorMessage);
      }
    } finally {
      setSaving(false);
    }
  };

  // -------------------------------------------------
  // UI
  // -------------------------------------------------

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "taken":
        return "bg-green-500";
      case "missed":
        return "bg-red-500";
      case "skipped":
        return "bg-yellow-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "taken":
        return "checkmark-circle";
      case "missed":
        return "close-circle";
      case "skipped":
        return "remove-circle";
      default:
        return "time";
    }
  };

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      <PatientNavbar />
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View className="px-4 pt-6 pb-8">
        {/* Header */}
        <View 
          className="mb-8 rounded-3xl p-6 shadow-2xl"
          style={{ backgroundColor: '#2563eb' }}
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-3xl font-bold text-white mb-2">
                Patient Dashboard
              </Text>
              {patient ? (
                <Text className="text-blue-100 text-base">
                  Welcome, {patient.firstName} {patient.lastName}
                </Text>
              ) : (
                <Text className="text-blue-100 text-base">
                  Medication management and adherence tracking
                </Text>
              )}
            </View>
            <View className="bg-white/20 rounded-full p-4 backdrop-blur">
              <Ionicons name="medical" size={32} color="#fff" />
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View className="mb-8">
          <View className="flex-row items-center mb-5">
            <View className="h-1 w-12 bg-blue-500 rounded-full mr-3" />
            <Text className="text-xl font-bold text-gray-900 dark:text-white">
              Quick Actions
            </Text>
          </View>

          <View className="flex-row flex-wrap gap-4">
            <ActionButton
              icon="calendar"
              title="Medication Calendar"
              description="View and manage schedule"
              onPress={() => setCalendarModalVisible(true)}
              color="#2563eb"
            />
            <ActionButton
              icon="chatbubble-ellipses"
              title="MedAssist AI"
              description="Get medication help"
              onPress={() => setChatbotModalVisible(true)}
              color="#10b981"
            />
          </View>
        </View>

        {/* Statistics Section */}
        <View className="bg-white dark:bg-gray-800 rounded-3xl p-6 mb-6 shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
          <View className="absolute top-0 right-0 w-32 h-32 bg-blue-100 dark:bg-blue-900/20 rounded-full -mr-16 -mt-16 opacity-50" />
          <View className="flex-row items-center mb-4 relative z-10">
            <View className="bg-blue-100 dark:bg-blue-900/30 rounded-xl p-3 mr-3">
              <Ionicons name="stats-chart" size={28} color="#2563eb" />
            </View>
            <Text className="text-xl font-bold text-gray-900 dark:text-white">
              Statistics
            </Text>
          </View>
          <View className="flex-row flex-wrap gap-3 relative z-10">
            <StatCard
              label="Adherence Rate"
              value={adherenceStats ? `${Math.round(adherenceStats.adherenceRate * 100)}%` : "0%"}
              color={adherenceStats && adherenceStats.adherenceRate >= 0.8 ? "#16a34a" : "#dc2626"}
              icon="checkmark-circle-outline"
            />
            <StatCard
              label="Total Medications"
              value={medications.length || upcomingMedications.length}
              color="#2563eb"
              icon="medical-outline"
            />
            <StatCard
              label="Doses Taken"
              value={adherenceStats?.taken || 0}
              color="#16a34a"
              icon="checkmark-outline"
            />
            <StatCard
              label="Missed Doses"
              value={adherenceStats?.missed || 0}
              color="#dc2626"
              icon="close-outline"
            />
            <StatCard
              label="Total Logs"
              value={adherenceStats?.total || 0}
              color="#0891b2"
              icon="document-text-outline"
            />
          </View>
        </View>

        {/* Patient Info & Providers - Side by Side on Web, Stacked on Mobile */}
        <View className={Platform.OS === 'web' ? "flex-row gap-6 mb-6" : "mb-6"}>
          {/* Patient Info Card */}
          {patient && (
            <View className={`bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-lg border border-gray-100 dark:border-gray-700 ${Platform.OS === 'web' ? 'flex-1' : 'mb-6'}`}>
              <View className="flex-row items-center justify-between mb-4">
                <View className="flex-row items-center">
                  <View className="bg-blue-100 dark:bg-blue-900/30 rounded-xl p-3 mr-3">
                    <Ionicons name="person-circle" size={28} color="#2563eb" />
                  </View>
                  <Text className="text-xl font-bold text-gray-900 dark:text-white">
                    Patient Information
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={handleOpenEditModal}
                  className="bg-blue-500 px-4 py-2 rounded-xl flex-row items-center"
                  activeOpacity={0.7}
                >
                  <Ionicons name="create-outline" size={18} color="#fff" />
                  <Text className="text-white font-semibold ml-2">Edit</Text>
                </TouchableOpacity>
              </View>
              <View className="space-y-3">
                <View className="flex-row items-center">
                  <Ionicons name="person-outline" size={18} color="#6b7280" />
                  <Text className="text-gray-700 dark:text-gray-300 ml-2 text-base font-semibold">
                    {patient.firstName} {patient.lastName}
                  </Text>
                </View>
                <View className="flex-row items-center">
                  <Ionicons name="mail-outline" size={18} color="#6b7280" />
                  <Text className="text-gray-700 dark:text-gray-300 ml-2">
                    {patient.email}
                  </Text>
                </View>
                {patient.phoneNumber && (
                  <View className="flex-row items-center">
                    <Ionicons name="call-outline" size={18} color="#6b7280" />
                    <Text className="text-gray-700 dark:text-gray-300 ml-2">
                      {patient.phoneNumber}
                    </Text>
                  </View>
                )}
                {patient.address && (
                  <View className="flex-row items-center">
                    <Ionicons name="location-outline" size={18} color="#6b7280" />
                    <Text 
                      className="text-gray-700 dark:text-gray-300 ml-2 flex-1"
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {patient.address.streetAddress}, {patient.address.city}, {patient.address.state} {patient.address.zipcode}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Providers Card */}
          <View className={`bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-lg border border-gray-100 dark:border-gray-700 ${Platform.OS === 'web' ? 'flex-1' : ''}`}>
            <View className="flex-row items-center mb-4">
              <View className="bg-green-100 dark:bg-green-900/30 rounded-xl p-3 mr-3">
                <Ionicons name="people" size={28} color="#059669" />
              </View>
              <Text className="text-xl font-bold text-gray-900 dark:text-white">
                Your Providers
              </Text>
            </View>
            {providersLoading ? (
              <View className="items-center py-4">
                <ActivityIndicator size="small" color="#2563eb" />
                <Text className="mt-2 text-gray-600 dark:text-gray-300 text-sm">
                  Loading providers...
                </Text>
              </View>
            ) : providers.length === 0 ? (
              <Text className="text-center text-gray-600 dark:text-gray-300">
                No providers assigned yet.
              </Text>
            ) : (
              <ScrollView className="max-h-[260px]" showsVerticalScrollIndicator={false}>
                {providers.map((p) => (
                  <View key={p._id} className="mb-4">
                    <View className="flex-row items-center mb-1">
                      <Ionicons name="person-outline" size={18} color="#6b7280" />
                      <Text className="text-gray-700 dark:text-gray-300 ml-2 text-base font-semibold">
                        {p.name}
                      </Text>
                    </View>
                    <View className="flex-row items-center mb-1">
                      <Ionicons name="mail-outline" size={18} color="#6b7280" />
                      <Text className="text-gray-700 dark:text-gray-300 ml-2">
                        {p.email}
                      </Text>
                    </View>
                    {p.phoneNumber && (
                      <View className="flex-row items-center">
                        <Ionicons name="call-outline" size={18} color="#6b7280" />
                        <Text className="text-gray-700 dark:text-gray-300 ml-2">
                          {p.phoneNumber}
                        </Text>
                      </View>
                    )}
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>

        {/* Upcoming Medications */}
        <View className="mb-6">
          <View className="flex-row items-center mb-5">
            <View className="h-1 w-12 bg-blue-500 rounded-full mr-3" />
            <Text className="text-xl font-bold text-gray-900 dark:text-white">
              Upcoming Medications
            </Text>
          </View>

          <View className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">

            {upcomingMedsLoading ? (
              <View className="py-8">
                <ActivityIndicator size="large" color="#3b82f6" />
              </View>
            ) : upcomingMedications.length > 0 ? (
              <View className="gap-3">
                {upcomingMedications.map((m) => {
                  const timeUntil = m.nextDose.getTime() - new Date().getTime();
                  const hoursUntil = Math.floor(timeUntil / (1000 * 60 * 60));
                  const isSoon = hoursUntil <= 2;

                  return (
                    <View
                      key={m._id}
                      className={`p-4 rounded-xl border ${
                        isSoon
                          ? "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800"
                          : "bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600"
                      }`}
                    >
                      <View className="flex-row items-start justify-between mb-2">
                        <View className="flex-1">
                          <Text className="text-lg font-bold text-gray-900 dark:text-white">
                            {m.name}
                          </Text>
                          <Text className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {m.dosage} • {m.frequency}
                          </Text>
                        </View>
                        {isSoon && (
                          <View className="bg-orange-500 px-2 py-1 rounded-full">
                            <Text className="text-white text-xs font-semibold">SOON</Text>
                          </View>
                        )}
                      </View>
                      <View className="flex-row items-center mt-2">
                        <Ionicons
                          name="time-outline"
                          size={16}
                          color={isSoon ? "#ea580c" : "#6b7280"}
                        />
                        <Text
                          className={`ml-1 text-sm ${
                            isSoon
                              ? "text-orange-700 dark:text-orange-300 font-semibold"
                              : "text-gray-600 dark:text-gray-400"
                          }`}
                        >
                          {hoursUntil > 0
                            ? `In ${hoursUntil} hour${hoursUntil !== 1 ? "s" : ""}`
                            : "Due now"}
                        </Text>
                        <Text className="text-gray-400 dark:text-gray-500 ml-2 text-sm">
                          • {new Date(m.nextDose).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : (
              <View className="py-8 items-center">
                <Ionicons name="calendar-outline" size={48} color="#9ca3af" />
                <Text className="text-gray-600 dark:text-gray-400 mt-3 text-center">
                  No upcoming medications scheduled.
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Dose Logs Action */}
        <View className="mb-6">
          <TouchableOpacity
            onPress={() => setShowLogs(true)}
            className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-lg border border-gray-100 dark:border-gray-700 flex-row items-center justify-between"
            activeOpacity={0.8}
          >
            <View className="flex-row items-center flex-1">
              <View className="bg-green-100 dark:bg-green-900/30 rounded-xl p-3 mr-4">
                <Ionicons name="list" size={28} color="#10b981" />
              </View>
              <View className="flex-1">
                <Text className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                  View Dose Logs
                </Text>
                <Text className="text-sm text-gray-600 dark:text-gray-400">
                  Last 7 days of medication adherence
                </Text>
              </View>
            </View>
            {adherenceLogs.length > 0 && (
              <View className="bg-green-500 px-3 py-1 rounded-full">
                <Text className="text-white text-sm font-bold">
                  {adherenceLogs.length}
                </Text>
              </View>
            )}
            <Ionicons name="chevron-forward" size={24} color="#6b7280" />
          </TouchableOpacity>
        </View>

      </View>

      {/* LOGS MODAL */}
      <Modal visible={showLogs} animationType="slide" transparent>
        <View className="flex-1 justify-end bg-black/50">
          <View
            className="bg-white dark:bg-gray-800 rounded-t-3xl p-6 max-h-[85%]"
            style={
              Platform.OS === "web"
                ? {
                    maxWidth: 700,
                    width: "90%",
                    marginHorizontal: "auto",
                    borderRadius: 16,
                  }
                : undefined
            }
          >
            <View className="flex-row items-center justify-between mb-6">
              <View className="flex-row items-center">
                <Ionicons name="list" size={28} color="#3b82f6" />
                <Text className="text-2xl font-bold text-gray-900 dark:text-white ml-2">
                  Dose Logs (Last 7 Days)
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowLogs(false)}
                className="bg-gray-200 dark:bg-gray-700 p-2 rounded-full"
              >
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView className="max-h-[60vh]" showsVerticalScrollIndicator={false}>
              {adherenceLogs.length > 0 ? (
                <View className="gap-3">
                  {adherenceLogs
                    .sort(
                      (a, b) =>
                        new Date(
                          b.takenAt ?? b.scheduledTime ?? b.createdAt
                        ).getTime() -
                        new Date(
                          a.takenAt ?? a.scheduledTime ?? a.createdAt
                        ).getTime()
                    )
                    .map((log, i) => {
                      const logDate = new Date(
                        log.takenAt ?? log.scheduledTime ?? log.createdAt
                      );
                      const statusColor = getStatusColor(log.status);
                      const statusIcon = getStatusIcon(log.status);

                      return (
                        <View
                          key={log._id || i}
                          className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl border border-gray-200 dark:border-gray-600"
                        >
                          <View className="flex-row items-start justify-between mb-2">
                            <View className="flex-1">
                              <Text className="text-lg font-semibold text-gray-900 dark:text-white">
                                {log.medication?.name || "Medication"}
                              </Text>
                              {log.medication?.dosage && (
                                <Text className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                  {log.medication.dosage}
                                </Text>
                              )}
                            </View>
                            <View
                              className={`${statusColor} px-3 py-1 rounded-full flex-row items-center`}
                            >
                              <Ionicons name={statusIcon} size={16} color="white" />
                              <Text className="text-white text-xs font-semibold ml-1 uppercase">
                                {log.status}
                              </Text>
                            </View>
                          </View>
                          <View className="flex-row items-center mt-2">
                            <Ionicons name="time" size={16} color="#6b7280" />
                            <Text className="text-gray-600 dark:text-gray-400 ml-1 text-sm">
                              {logDate.toLocaleDateString()} at{" "}
                              {logDate.toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </Text>
                          </View>
                          {log.notes && (
                            <Text className="text-gray-600 dark:text-gray-400 mt-2 text-sm italic">
                              Note: {log.notes}
                            </Text>
                          )}
                        </View>
                      );
                    })}
                </View>
              ) : (
                <View className="py-12 items-center">
                  <Ionicons name="document-outline" size={64} color="#9ca3af" />
                  <Text className="text-gray-600 dark:text-gray-400 mt-4 text-center text-lg">
                    No doses logged in the last 7 days.
                  </Text>
                  <Text className="text-gray-500 dark:text-gray-500 mt-2 text-center text-sm">
                    Start logging your medication intake to track your adherence.
                  </Text>
                </View>
              )}
            </ScrollView>

            <TouchableOpacity
              onPress={() => setShowLogs(false)}
              className="bg-blue-600 py-4 rounded-xl mt-6 shadow-lg"
            >
              <Text className="text-white text-lg font-semibold text-center">
                Close
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Edit Patient Info Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}
      >
        {Platform.OS === 'web' ? (
          <View className="flex-1 justify-center items-center bg-black/50">
            <Pressable 
              style={{ 
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0
              }}
              onPress={() => setEditModalVisible(false)}
            />
            <View
              className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl"
              style={{ 
                maxHeight: '90%',
                maxWidth: 600,
                width: '90%'
              }}
              onStartShouldSetResponder={() => true}
            >
              {/* Header */}
              <View className="flex-row items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <Text className="text-2xl font-bold text-gray-900 dark:text-white">
                  Edit Patient Information
                </Text>
                <TouchableOpacity
                  onPress={() => setEditModalVisible(false)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={28} color="#6b7280" />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ 
                  paddingHorizontal: 16,
                  paddingTop: 16,
                  paddingBottom: 20,
                  flexGrow: 1
                }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={true}
                nestedScrollEnabled={true}
                bounces={true}
              >
                {/* Error Banner */}
                {saveError && (
                  <View className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                    <View className="flex-row items-start">
                      <Ionicons name="alert-circle" size={20} color="#ef4444" style={{ marginRight: 8, marginTop: 2 }} />
                      <Text className="text-red-700 dark:text-red-400 flex-1 text-sm font-medium">
                        {saveError}
                      </Text>
                      <TouchableOpacity onPress={() => setSaveError(null)}>
                        <Ionicons name="close" size={18} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Validation Errors Banner */}
                {Object.keys(validationErrors).length > 0 && (
                  <View className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                    <View className="flex-row items-start">
                      <Ionicons name="alert-circle" size={20} color="#ef4444" style={{ marginRight: 8, marginTop: 2 }} />
                      <View className="flex-1">
                        <Text className="text-red-700 dark:text-red-400 text-sm font-semibold mb-1">
                          Please fix the following errors:
                        </Text>
                        {Object.entries(validationErrors).map(([field, message]) => (
                          <Text key={field} className="text-red-600 dark:text-red-400 text-sm">
                            • {message}
                          </Text>
                        ))}
                      </View>
                      <TouchableOpacity onPress={() => setValidationErrors({})}>
                        <Ionicons name="close" size={18} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Read-only Information */}
                <View className="mb-4">
                  <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Account Information
                  </Text>

                  <View className="mb-4">
                    <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Name
                    </Text>
                    <View className="bg-gray-100 dark:bg-gray-700 rounded-xl px-4 py-3 border border-gray-200 dark:border-gray-600 opacity-60">
                      <Text className="text-gray-500 dark:text-gray-400">
                        {patient?.firstName} {patient?.lastName}
                      </Text>
                    </View>
                    <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-1">
                      This field cannot be edited
                    </Text>
                  </View>

                  <View className="mb-4">
                    <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Email
                    </Text>
                    <View className="bg-gray-100 dark:bg-gray-700 rounded-xl px-4 py-3 border border-gray-200 dark:border-gray-600 opacity-60">
                      <Text className="text-gray-500 dark:text-gray-400">
                        {patient?.email}
                      </Text>
                    </View>
                    <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-1">
                      This field cannot be edited
                    </Text>
                  </View>

                  <View className="mb-4">
                    <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Role
                    </Text>
                    <View className="bg-gray-100 dark:bg-gray-700 rounded-xl px-4 py-3 border border-gray-200 dark:border-gray-600 opacity-60">
                      <Text className="text-gray-500 dark:text-gray-400 capitalize">
                        {patient?.role}
                      </Text>
                    </View>
                    <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-1">
                      This field cannot be edited
                    </Text>
                  </View>
                </View>

                {/* Editable Information */}
                <View className="mb-4">
                  <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Contact Information
                  </Text>

                  <View className="mb-4">
                    <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Phone Number
                    </Text>
                    <TextInput
                      value={phoneNumber}
                      onChangeText={(text) => {
                        setPhoneNumber(text);
                        if (validationErrors.phoneNumber) {
                          setValidationErrors({ ...validationErrors, phoneNumber: '' });
                        }
                      }}
                      keyboardType="phone-pad"
                      maxLength={10}
                      className={`bg-gray-50 dark:bg-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white border ${
                        validationErrors.phoneNumber 
                          ? 'border-red-500 dark:border-red-500' 
                          : 'border-gray-200 dark:border-gray-600'
                      }`}
                      placeholder="10 digits"
                      placeholderTextColor="#9ca3af"
                    />
                    {validationErrors.phoneNumber && (
                      <Text className="text-red-500 text-xs mt-1 ml-1">
                        {validationErrors.phoneNumber}
                      </Text>
                    )}
                  </View>
                </View>

                {/* Address Information */}
                <View className="mb-4">
                  <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Address
                  </Text>

                  <View className="mb-4">
                    <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Street Address <Text className="text-red-500">*</Text>
                    </Text>
                    <TextInput
                      value={streetAddress}
                      onChangeText={(text) => {
                        setStreetAddress(text);
                        if (validationErrors.streetAddress) {
                          setValidationErrors({ ...validationErrors, streetAddress: '' });
                        }
                      }}
                      className={`bg-gray-50 dark:bg-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white border ${
                        validationErrors.streetAddress 
                          ? 'border-red-500 dark:border-red-500' 
                          : 'border-gray-200 dark:border-gray-600'
                      }`}
                      placeholder="Street Address"
                      placeholderTextColor="#9ca3af"
                    />
                    {validationErrors.streetAddress && (
                      <Text className="text-red-500 text-xs mt-1 ml-1">
                        {validationErrors.streetAddress}
                      </Text>
                    )}
                  </View>

                  <View className="mb-4">
                    <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      City <Text className="text-red-500">*</Text>
                    </Text>
                    <TextInput
                      value={city}
                      onChangeText={(text) => {
                        setCity(text);
                        if (validationErrors.city) {
                          setValidationErrors({ ...validationErrors, city: '' });
                        }
                      }}
                      className={`bg-gray-50 dark:bg-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white border ${
                        validationErrors.city 
                          ? 'border-red-500 dark:border-red-500' 
                          : 'border-gray-200 dark:border-gray-600'
                      }`}
                      placeholder="City"
                      placeholderTextColor="#9ca3af"
                    />
                    {validationErrors.city && (
                      <Text className="text-red-500 text-xs mt-1 ml-1">
                        {validationErrors.city}
                      </Text>
                    )}
                  </View>

                  <View className="mb-4">
                    <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      State <Text className="text-red-500">*</Text>
                    </Text>
                    <TextInput
                      value={state}
                      onChangeText={(text) => {
                        setState(text);
                        if (validationErrors.state) {
                          setValidationErrors({ ...validationErrors, state: '' });
                        }
                      }}
                      className={`bg-gray-50 dark:bg-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white border ${
                        validationErrors.state 
                          ? 'border-red-500 dark:border-red-500' 
                          : 'border-gray-200 dark:border-gray-600'
                      }`}
                      placeholder="State"
                      placeholderTextColor="#9ca3af"
                    />
                    {validationErrors.state && (
                      <Text className="text-red-500 text-xs mt-1 ml-1">
                        {validationErrors.state}
                      </Text>
                    )}
                  </View>

                  <View className="mb-4">
                    <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Zipcode <Text className="text-red-500">*</Text>
                    </Text>
                    <TextInput
                      value={zipcode}
                      onChangeText={(text) => {
                        setZipcode(text);
                        if (validationErrors.zipcode) {
                          setValidationErrors({ ...validationErrors, zipcode: '' });
                        }
                      }}
                      keyboardType="number-pad"
                      maxLength={5}
                      className={`bg-gray-50 dark:bg-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white border ${
                        validationErrors.zipcode 
                          ? 'border-red-500 dark:border-red-500' 
                          : 'border-gray-200 dark:border-gray-600'
                      }`}
                      placeholder="5 digits"
                      placeholderTextColor="#9ca3af"
                    />
                    {validationErrors.zipcode && (
                      <Text className="text-red-500 text-xs mt-1 ml-1">
                        {validationErrors.zipcode}
                      </Text>
                    )}
                  </View>
                </View>

                {/* Action Buttons */}
                <View className="flex-row gap-3 mt-6">
                  <TouchableOpacity
                    onPress={handleSavePatientInfo}
                    className="flex-1 bg-blue-500 px-6 py-4 rounded-xl"
                    activeOpacity={0.7}
                    disabled={saving}
                  >
                    {saving ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text className="text-white text-lg font-semibold text-center">
                        Save Changes
                      </Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setEditModalVisible(false)}
                    className="bg-gray-500 px-6 py-4 rounded-xl"
                    activeOpacity={0.7}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Text className="text-white text-lg font-semibold text-center">
                      Cancel
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        ) : (
          <View className="flex-1 justify-end bg-black/50">
            <Pressable 
              style={{ flex: 1 }}
              onPress={() => setEditModalVisible(false)}
            />
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={{ justifyContent: 'flex-end' }}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >
              <View
                className="bg-white dark:bg-gray-800 rounded-t-3xl"
                style={{ 
                  height: '85%',
                  maxHeight: '90%'
                }}
              >
                {/* Header */}
                <View className="flex-row items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                  <Text className="text-2xl font-bold text-gray-900 dark:text-white">
                    Edit Patient Information
                  </Text>
                  <TouchableOpacity
                    onPress={() => setEditModalVisible(false)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="close" size={28} color="#6b7280" />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  style={{ flex: 1 }}
                  contentContainerStyle={{ 
                    paddingHorizontal: 16,
                    paddingTop: 16,
                    paddingBottom: 20,
                    flexGrow: 1
                  }}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={true}
                  nestedScrollEnabled={true}
                  bounces={true}
                >
                  {/* Same content as web version */}
                  {/* Error Banner */}
                  {saveError && (
                    <View className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                      <View className="flex-row items-start">
                        <Ionicons name="alert-circle" size={20} color="#ef4444" style={{ marginRight: 8, marginTop: 2 }} />
                        <Text className="text-red-700 dark:text-red-400 flex-1 text-sm font-medium">
                          {saveError}
                        </Text>
                        <TouchableOpacity onPress={() => setSaveError(null)}>
                          <Ionicons name="close" size={18} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  {/* Validation Errors Banner */}
                  {Object.keys(validationErrors).length > 0 && (
                    <View className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                      <View className="flex-row items-start">
                        <Ionicons name="alert-circle" size={20} color="#ef4444" style={{ marginRight: 8, marginTop: 2 }} />
                        <View className="flex-1">
                          <Text className="text-red-700 dark:text-red-400 text-sm font-semibold mb-1">
                            Please fix the following errors:
                          </Text>
                          {Object.entries(validationErrors).map(([field, message]) => (
                            <Text key={field} className="text-red-600 dark:text-red-400 text-sm">
                              • {message}
                            </Text>
                          ))}
                        </View>
                        <TouchableOpacity onPress={() => setValidationErrors({})}>
                          <Ionicons name="close" size={18} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  {/* Read-only Information */}
                  <View className="mb-4">
                    <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      Account Information
                    </Text>

                    <View className="mb-4">
                      <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Name
                      </Text>
                      <View className="bg-gray-100 dark:bg-gray-700 rounded-xl px-4 py-3 border border-gray-200 dark:border-gray-600 opacity-60">
                        <Text className="text-gray-500 dark:text-gray-400">
                          {patient?.firstName} {patient?.lastName}
                        </Text>
                      </View>
                      <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-1">
                        This field cannot be edited
                      </Text>
                    </View>

                    <View className="mb-4">
                      <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Email
                      </Text>
                      <View className="bg-gray-100 dark:bg-gray-700 rounded-xl px-4 py-3 border border-gray-200 dark:border-gray-600 opacity-60">
                        <Text className="text-gray-500 dark:text-gray-400">
                          {patient?.email}
                        </Text>
                      </View>
                      <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-1">
                        This field cannot be edited
                      </Text>
                    </View>

                    <View className="mb-4">
                      <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Role
                      </Text>
                      <View className="bg-gray-100 dark:bg-gray-700 rounded-xl px-4 py-3 border border-gray-200 dark:border-gray-600 opacity-60">
                        <Text className="text-gray-500 dark:text-gray-400 capitalize">
                          {patient?.role}
                        </Text>
                      </View>
                      <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-1">
                        This field cannot be edited
                      </Text>
                    </View>
                  </View>

                  {/* Editable Information */}
                  <View className="mb-4">
                    <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      Contact Information
                    </Text>

                    <View className="mb-4">
                      <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Phone Number
                      </Text>
                      <TextInput
                        value={phoneNumber}
                        onChangeText={(text) => {
                          setPhoneNumber(text);
                          if (validationErrors.phoneNumber) {
                            setValidationErrors({ ...validationErrors, phoneNumber: '' });
                          }
                        }}
                        keyboardType="phone-pad"
                        maxLength={10}
                        className={`bg-gray-50 dark:bg-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white border ${
                          validationErrors.phoneNumber 
                            ? 'border-red-500 dark:border-red-500' 
                            : 'border-gray-200 dark:border-gray-600'
                        }`}
                        placeholder="10 digits"
                        placeholderTextColor="#9ca3af"
                      />
                      {validationErrors.phoneNumber && (
                        <Text className="text-red-500 text-xs mt-1 ml-1">
                          {validationErrors.phoneNumber}
                        </Text>
                      )}
                    </View>
                  </View>

                  {/* Address Information */}
                  <View className="mb-4">
                    <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      Address
                    </Text>

                    <View className="mb-4">
                      <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Street Address <Text className="text-red-500">*</Text>
                      </Text>
                      <TextInput
                        value={streetAddress}
                        onChangeText={(text) => {
                          setStreetAddress(text);
                          if (validationErrors.streetAddress) {
                            setValidationErrors({ ...validationErrors, streetAddress: '' });
                          }
                        }}
                        className={`bg-gray-50 dark:bg-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white border ${
                          validationErrors.streetAddress 
                            ? 'border-red-500 dark:border-red-500' 
                            : 'border-gray-200 dark:border-gray-600'
                        }`}
                        placeholder="Street Address"
                        placeholderTextColor="#9ca3af"
                      />
                      {validationErrors.streetAddress && (
                        <Text className="text-red-500 text-xs mt-1 ml-1">
                          {validationErrors.streetAddress}
                        </Text>
                      )}
                    </View>

                    <View className="mb-4">
                      <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        City <Text className="text-red-500">*</Text>
                      </Text>
                      <TextInput
                        value={city}
                        onChangeText={(text) => {
                          setCity(text);
                          if (validationErrors.city) {
                            setValidationErrors({ ...validationErrors, city: '' });
                          }
                        }}
                        className={`bg-gray-50 dark:bg-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white border ${
                          validationErrors.city 
                            ? 'border-red-500 dark:border-red-500' 
                            : 'border-gray-200 dark:border-gray-600'
                        }`}
                        placeholder="City"
                        placeholderTextColor="#9ca3af"
                      />
                      {validationErrors.city && (
                        <Text className="text-red-500 text-xs mt-1 ml-1">
                          {validationErrors.city}
                        </Text>
                      )}
                    </View>

                    <View className="mb-4">
                      <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        State <Text className="text-red-500">*</Text>
                      </Text>
                      <TextInput
                        value={state}
                        onChangeText={(text) => {
                          setState(text);
                          if (validationErrors.state) {
                            setValidationErrors({ ...validationErrors, state: '' });
                          }
                        }}
                        className={`bg-gray-50 dark:bg-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white border ${
                          validationErrors.state 
                            ? 'border-red-500 dark:border-red-500' 
                            : 'border-gray-200 dark:border-gray-600'
                        }`}
                        placeholder="State"
                        placeholderTextColor="#9ca3af"
                      />
                      {validationErrors.state && (
                        <Text className="text-red-500 text-xs mt-1 ml-1">
                          {validationErrors.state}
                        </Text>
                      )}
                    </View>

                    <View className="mb-4">
                      <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Zipcode <Text className="text-red-500">*</Text>
                      </Text>
                      <TextInput
                        value={zipcode}
                        onChangeText={(text) => {
                          setZipcode(text);
                          if (validationErrors.zipcode) {
                            setValidationErrors({ ...validationErrors, zipcode: '' });
                          }
                        }}
                        keyboardType="number-pad"
                        maxLength={5}
                        className={`bg-gray-50 dark:bg-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white border ${
                          validationErrors.zipcode 
                            ? 'border-red-500 dark:border-red-500' 
                            : 'border-gray-200 dark:border-gray-600'
                        }`}
                        placeholder="5 digits"
                        placeholderTextColor="#9ca3af"
                      />
                      {validationErrors.zipcode && (
                        <Text className="text-red-500 text-xs mt-1 ml-1">
                          {validationErrors.zipcode}
                        </Text>
                      )}
                    </View>
                  </View>

                  {/* Action Buttons */}
                  <View className="flex-row gap-3 mt-6">
                    <TouchableOpacity
                      onPress={handleSavePatientInfo}
                      className="flex-1 bg-blue-500 px-6 py-4 rounded-xl"
                      activeOpacity={0.7}
                      disabled={saving}
                    >
                      {saving ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text className="text-white text-lg font-semibold text-center">
                          Save Changes
                        </Text>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => setEditModalVisible(false)}
                      className="bg-gray-500 px-6 py-4 rounded-xl"
                      activeOpacity={0.7}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Text className="text-white text-lg font-semibold text-center">
                        Cancel
                      </Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </View>
            </KeyboardAvoidingView>
          </View>
        )}
      </Modal>

      {/* Chatbot Modal */}
      <Modal
        visible={chatbotModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setChatbotModalVisible(false)}
      >
        <KeyboardAvoidingView
          className="flex-1 bg-black/60"
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View className="flex-1 justify-center items-center">
            <View 
              className="w-[92%] max-w-2xl h-[80%] rounded-3xl bg-white dark:bg-gray-900 shadow-2xl overflow-hidden"
              style={
                Platform.OS === "web"
                  ? {
                      maxWidth: 800,
                      width: "90%",
                      height: "85%",
                    }
                  : undefined
              }
            >
              {/* Header */}
              <View className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex-row items-center justify-between bg-blue-600 dark:bg-blue-700">
                <View>
                  <Text className="text-xs text-blue-100">Chat with</Text>
                  <Text className="text-xl font-bold text-white">MedAssist AI</Text>
                </View>

                <TouchableOpacity 
                  onPress={() => setChatbotModalVisible(false)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={28} color="#fff" />
                </TouchableOpacity>
              </View>

              {/* Messages */}
              <ScrollView
                ref={chatScrollRef}
                className="flex-1"
                contentContainerStyle={{ padding: 16 }}
                showsVerticalScrollIndicator={false}
                onContentSizeChange={() =>
                  chatScrollRef.current?.scrollToEnd({ animated: true })
                }
              >
                {chatMessages.length === 0 && (
                  <View className="items-center justify-center py-8">
                    <Ionicons name="chatbubble-ellipses" size={48} color="#9ca3af" />
                    <Text className="text-gray-500 dark:text-gray-400 mt-4 text-center">
                      Start a conversation with MedAssist AI
                    </Text>
                    <Text className="text-gray-400 dark:text-gray-500 mt-2 text-sm text-center">
                      Ask questions about your medications, adherence, or health
                    </Text>
                  </View>
                )}
                {chatMessages.map((msg, index) => (
                  <View
                    key={index}
                    className={`max-w-[80%] p-3 rounded-2xl my-2 ${
                      msg.sender === "user"
                        ? "self-end bg-blue-600"
                        : "self-start bg-gray-200 dark:bg-gray-700"
                    }`}
                  >
                    <Text
                      className={`text-base ${
                        msg.sender === "user"
                          ? "text-white"
                          : "text-gray-900 dark:text-gray-100"
                      }`}
                    >
                      {msg.text}
                    </Text>
                  </View>
                ))}

                {chatLoading && (
                  <View className="mt-2">
                    <View className="self-start bg-gray-300 dark:bg-gray-700 rounded-xl p-3 my-1 w-16 flex-row items-center justify-center">
                      <ActivityIndicator size="small" />
                    </View>
                    <Text className="text-gray-500 dark:text-gray-400 ml-1">
                      MedAssist AI is typing…
                    </Text>
                  </View>
                )}
              </ScrollView>

              {/* Input Bar */}
              <View className="flex-row items-center px-3 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800">
                <TextInput
                  className="flex-1 bg-white dark:bg-gray-700 text-black dark:text-white px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600"
                  placeholder="Ask me anything..."
                  placeholderTextColor="#9CA3AF"
                  value={chatInput}
                  onChangeText={setChatInput}
                  onSubmitEditing={async () => {
                    if (!chatInput.trim() || chatLoading) return;

                    const userMsg = { sender: 'user' as const, text: chatInput };
                    setChatMessages((prev) => [...prev, userMsg]);
                    const textToSend = chatInput;
                    setChatInput("");
                    setChatLoading(true);

                    try {
                      const t = await AsyncStorage.getItem("token");
                      const res = await fetch(`${API_URL}/api/chat`, {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          Authorization: t ? `Bearer ${t}` : "",
                        },
                        body: JSON.stringify({ message: textToSend }),
                      });

                      const data = await res.json();
                      const botMsg = {
                        sender: 'bot' as const,
                        text: res.status === 200
                          ? data.reply
                          : data.error || "Sorry, I couldn't process that. Please try again.",
                      };
                      setChatMessages((prev) => [...prev, botMsg]);
                    } catch (err) {
                      console.error("Chat error:", err);
                      const errorMsg = {
                        sender: 'bot' as const,
                        text: "Something went wrong connecting to the server.",
                      };
                      setChatMessages((prev) => [...prev, errorMsg]);
                    }

                    setChatLoading(false);
                    setTimeout(() => {
                      chatScrollRef.current?.scrollToEnd({ animated: true });
                    }, 100);
                  }}
                  multiline
                />

                <TouchableOpacity
                  onPress={async () => {
                    if (!chatInput.trim() || chatLoading) return;

                    const userMsg = { sender: 'user' as const, text: chatInput };
                    setChatMessages((prev) => [...prev, userMsg]);
                    const textToSend = chatInput;
                    setChatInput("");
                    setChatLoading(true);

                    try {
                      const t = await AsyncStorage.getItem("token");
                      const res = await fetch(`${API_URL}/api/chat`, {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          Authorization: t ? `Bearer ${t}` : "",
                        },
                        body: JSON.stringify({ message: textToSend }),
                      });

                      const data = await res.json();
                      const botMsg = {
                        sender: 'bot' as const,
                        text: res.status === 200
                          ? data.reply
                          : data.error || "Sorry, I couldn't process that. Please try again.",
                      };
                      setChatMessages((prev) => [...prev, botMsg]);
                    } catch (err) {
                      console.error("Chat error:", err);
                      const errorMsg = {
                        sender: 'bot' as const,
                        text: "Something went wrong connecting to the server.",
                      };
                      setChatMessages((prev) => [...prev, errorMsg]);
                    }

                    setChatLoading(false);
                    setTimeout(() => {
                      chatScrollRef.current?.scrollToEnd({ animated: true });
                    }, 100);
                  }}
                  disabled={chatLoading}
                  className={`ml-2 px-4 py-3 rounded-full ${
                    chatLoading ? "bg-gray-400" : "bg-blue-600"
                  }`}
                >
                  <Ionicons name="send" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Medication Calendar Modal */}
      <Modal
        visible={calendarModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCalendarModalVisible(false)}
      >
        <KeyboardAvoidingView
          className="flex-1 bg-black/60"
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View className="flex-1 justify-center items-center">
            <View 
              className="w-[95%] max-w-4xl h-[90%] rounded-3xl bg-white dark:bg-gray-900 shadow-2xl overflow-hidden"
              style={
                Platform.OS === "web"
                  ? {
                      maxWidth: 1000,
                      width: "95%",
                      height: "90%",
                    }
                  : undefined
              }
            >
              {/* Header */}
              <View className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex-row items-center justify-between bg-blue-600 dark:bg-blue-700">
                <View>
                  <Text className="text-xs text-blue-100">View and manage</Text>
                  <Text className="text-xl font-bold text-white">Medication Calendar</Text>
                </View>

                <TouchableOpacity 
                  onPress={() => setCalendarModalVisible(false)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={28} color="#fff" />
                </TouchableOpacity>
              </View>

              {/* Content */}
              <ScrollView
                className="flex-1"
                contentContainerStyle={{ padding: 16 }}
                showsVerticalScrollIndicator={false}
              >
                {/* Calendar */}
                <Calendar
                  key={isDarkMode ? "dark" : "light"}
                  markingType="dot"
                  markedDates={markedDates}
                  onDayPress={(day) => setSelectedDate(day.dateString)}
                  theme={{
                    backgroundColor: isDarkMode ? "#111827" : "#F9FAFB",
                    calendarBackground: isDarkMode ? "#1F2937" : "#FFFFFF",
                    monthTextColor: isDarkMode ? "#F9FAFB" : "#111827",
                    dayTextColor: isDarkMode ? "#E5E7EB" : "#1F2937",
                    selectedDayBackgroundColor: "#2563EB",
                    selectedDayTextColor: "#FFFFFF",
                    arrowColor: isDarkMode ? "#60A5FA" : "#2563EB",
                  }}
                />

                {/* Success Message + Undo */}
                {calendarSuccessMessage !== "" && (
                  <View className="bg-green-600 p-4 rounded-xl mt-4 flex-row justify-between items-center">
                    <Text className="text-white font-semibold">{calendarSuccessMessage}</Text>
                    {lastLogId && (
                      <TouchableOpacity
                        onPress={undoDose}
                        className="bg-white px-3 py-1 rounded-lg"
                      >
                        <Text className="text-green-700 font-bold">Undo</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {/* Medication List */}
                <View className="mt-6">
                  <View className="bg-gray-50 dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700">
                    <Text className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                      Medications on {selectedDate}
                    </Text>

                    {getMedsForDate(selectedDate).length === 0 ? (
                      <Text className="text-gray-600 dark:text-gray-400">
                        No medications scheduled or logged for this date.
                      </Text>
                    ) : (
                      getMedsForDate(selectedDate)
                        .filter(m => m !== null)
                        .map((m) => {
                        const selectedDateObj = new Date(selectedDate);
                        selectedDateObj.setHours(0, 0, 0, 0);
                        const startDateObj = m.startDate ? new Date(m.startDate) : null;
                        if (startDateObj) startDateObj.setHours(0, 0, 0, 0);
                        const endDateObj = m.endDate ? new Date(m.endDate) : null;
                        if (endDateObj) endDateObj.setHours(0, 0, 0, 0);
                        
                        const isActive = (!endDateObj || endDateObj >= selectedDateObj) && 
                                        (!startDateObj || startDateObj <= selectedDateObj);
                        const isFuture = startDateObj && startDateObj > selectedDateObj;
                        const isEnded = endDateObj && endDateObj < selectedDateObj;
                        
                        // Get logs for this medication on this date
                        const logsForThisMed = adherenceLogs.filter((log) => {
                          // Handle both string and object medication IDs
                          let logMedId: string | null = null;
                          if (log.medication) {
                            if (typeof log.medication === 'string') {
                              logMedId = log.medication;
                            } else if (log.medication._id) {
                              const medIdValue = log.medication._id;
                              logMedId = typeof medIdValue === 'string' ? medIdValue : String(medIdValue);
                            }
                          }
                          
                          const medId = typeof m._id === 'string' ? m._id : String(m._id);
                          if (logMedId !== medId) return false;
                          
                          const logDate = new Date(log.takenAt || log.scheduledTime || log.createdAt);
                          logDate.setHours(0, 0, 0, 0);
                          return logDate.getTime() === selectedDateObj.getTime();
                        });
                        
                        // Get schedule times for this day
                        const dayName = getDayName(selectedDate);
                        const scheduleTimes = m.schedule?.filter((s) => s.days.includes(dayName)) || [];
                        
                        // If no schedule but has logs, show the log times
                        const hasSchedule = scheduleTimes.length > 0;
                        const hasLogs = logsForThisMed.length > 0;
                        
                        // If medication has no schedule and no logs, don't show it
                        if (!hasSchedule && !hasLogs) return null;
                        
                        return (
                          <View
                            key={m._id}
                            className={`border-b border-gray-200 dark:border-gray-700 py-3 last:border-b-0 ${
                              isEnded ? 'opacity-60' : ''
                            }`}
                          >
                            <View className="flex-row items-center justify-between mb-1">
                              <Text className={`text-gray-900 dark:text-gray-200 font-semibold text-lg ${
                                isEnded ? 'line-through' : ''
                              }`}>
                                {m.name} — {m.dosage}
                              </Text>
                              {isEnded && (
                                <View className="bg-gray-500 px-2 py-1 rounded-full">
                                  <Text className="text-white text-xs font-semibold">Ended</Text>
                                </View>
                              )}
                              {isFuture && (
                                <View className="bg-blue-500 px-2 py-1 rounded-full">
                                  <Text className="text-white text-xs font-semibold">Upcoming</Text>
                                </View>
                              )}
                              {isActive && !isFuture && !isEnded && (
                                <View className="bg-green-500 px-2 py-1 rounded-full">
                                  <Text className="text-white text-xs font-semibold">Active</Text>
                                </View>
                              )}
                            </View>

                            {/* Show scheduled times if available */}
                            {hasSchedule && scheduleTimes.map((s, i) => (
                              <View
                                key={`schedule-${i}`}
                                className="flex-row justify-between items-center mt-2"
                              >
                                <View className="flex-row items-center">
                                  <Ionicons name="time-outline" size={18} color="#6b7280" />
                                  <Text className="text-gray-600 dark:text-gray-300 ml-2">
                                    {s.time}
                                  </Text>
                                </View>

                                {isActive && !isFuture ? (
                                  <TouchableOpacity
                                    onPress={() => logDose(m._id, s.time)}
                                    className="bg-green-600 px-4 py-2 rounded-lg flex-row items-center"
                                    activeOpacity={0.8}
                                  >
                                    <Ionicons name="checkmark-circle" size={16} color="#fff" />
                                    <Text className="text-white font-semibold text-sm ml-1">
                                      Log Dose
                                    </Text>
                                  </TouchableOpacity>
                                ) : (
                                  <View className="bg-gray-400 px-4 py-2 rounded-lg flex-row items-center opacity-50">
                                    <Ionicons name="lock-closed" size={16} color="#fff" />
                                    <Text className="text-white font-semibold text-sm ml-1">
                                      {isEnded ? 'Ended' : 'Not Started'}
                                    </Text>
                                  </View>
                                )}
                              </View>
                            ))}

                            {/* Show logged doses if no schedule or in addition to schedule */}
                            {hasLogs && logsForThisMed.map((log, i) => {
                              const logTime = new Date(log.takenAt || log.scheduledTime || log.createdAt);
                              const timeStr = logTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                              const isScheduled = scheduleTimes.some(s => {
                                const sTime = s.time.toLowerCase();
                                const logTimeLower = timeStr.toLowerCase();
                                return sTime.includes(logTimeLower) || logTimeLower.includes(sTime);
                              });
                              
                              // Don't show if already shown in schedule
                              if (isScheduled && hasSchedule) return null;
                              
                              return (
                                <View
                                  key={`log-${log._id}-${i}`}
                                  className="flex-row justify-between items-center mt-2"
                                >
                                  <View className="flex-row items-center">
                                    <Ionicons 
                                      name={log.status === 'taken' ? 'checkmark-circle' : 'time-outline'} 
                                      size={18} 
                                      color={log.status === 'taken' ? '#10b981' : '#6b7280'} 
                                    />
                                    <Text className="text-gray-600 dark:text-gray-300 ml-2">
                                      {timeStr} {log.status === 'taken' ? '(Logged)' : `(${log.status})`}
                                    </Text>
                                  </View>
                                  {log.status === 'taken' && (
                                    <View className="bg-green-100 dark:bg-green-900/30 px-3 py-1 rounded-lg">
                                      <Text className="text-green-700 dark:text-green-300 text-xs font-semibold">
                                        ✓ Logged
                                      </Text>
                                    </View>
                                  )}
                                </View>
                              );
                            })}

                            {/* Show message if no schedule and no logs */}
                            {!hasSchedule && !hasLogs && (
                              <Text className="text-gray-500 dark:text-gray-400 text-sm mt-2 italic">
                                No schedule or logs for this date
                              </Text>
                            )}
                          </View>
                        );
                      })
                        .filter(item => item !== null)
                    )}
                  </View>
                </View>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      </ScrollView>
    </View>
  );
}

// StatCard Component
interface StatCardProps {
  label: string;
  value: string | number;
  color: string;
  icon?: string;
}

function StatCard({ label, value, color, icon }: StatCardProps) {
  return (
    <View
      className="rounded-2xl p-4 min-w-[110px] shadow-md border dark:bg-gray-700 dark:border-gray-600"
      style={{
        backgroundColor: '#f9fafb',
        borderColor: '#e5e7eb'
      }}
    >
      {icon && (
        <View className="mb-2">
          <Ionicons name={icon as any} size={20} color={color} />
        </View>
      )}
      <Text className="text-2xl font-bold mb-1" style={{ color }}>
        {value}
      </Text>
      <Text className="text-xs font-medium text-gray-600 dark:text-gray-400 leading-tight">
        {label}
      </Text>
    </View>
  );
}

// ActionButton Component
interface ActionButtonProps {
  icon: string;
  title: string;
  description: string;
  onPress: () => void;
  color: string;
}

function ActionButton({
  icon,
  title,
  description,
  onPress,
  color,
}: ActionButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      className="flex-1 min-w-[140px] bg-white dark:bg-gray-800 rounded-3xl p-5 shadow-lg border border-gray-100 dark:border-gray-700"
    >
      <View
        className="w-14 h-14 rounded-2xl items-center justify-center mb-3 shadow-sm"
        style={{ backgroundColor: `${color}15` }}
      >
        <Ionicons name={icon as any} size={28} color={color} />
      </View>
      <Text className="text-lg font-bold text-gray-900 dark:text-white mb-1">
        {title}
      </Text>
      <Text className="text-sm text-gray-600 dark:text-gray-400">
        {description}
      </Text>
      <View className="flex-row items-center mt-3">
        <Text className="text-xs font-semibold" style={{ color }}>
          Open
        </Text>
        <Ionicons
          name="arrow-forward"
          size={16}
          color={color}
          style={{ marginLeft: 4 }}
        />
      </View>
    </TouchableOpacity>
  );
}
