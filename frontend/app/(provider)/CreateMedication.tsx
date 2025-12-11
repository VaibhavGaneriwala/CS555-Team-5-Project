import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, router } from "expo-router";
import ProviderNavbar from '@/components/ProviderNavbar';
import Constants from "expo-constants";

const API_URL = Constants.expoConfig?.extra?.API_URL ?? "http://localhost:3000";

const FREQUENCY_OPTIONS = [
  { value: "once-daily", label: "Once daily" },
  { value: "twice-daily", label: "Twice daily" },
  { value: "three-times-daily", label: "3x daily" },
  { value: "four-times-daily", label: "4x daily" },
  { value: "weekly", label: "Weekly" },
  { value: "as-needed", label: "As needed" },
  { value: "custom", label: "Custom" },
];

export default function CreateMedication() {
  const params = useLocalSearchParams<{ patientId?: string }>();
  const patientId = params?.patientId;

  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [frequency, setFrequency] = useState<string>("once-daily");
  const [scheduleText, setScheduleText] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [instructions, setInstructions] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleCreate() {
    setError(null);
    setSuccess(false);

    if (!name || !dosage || !frequency || !scheduleText || !startDate) {
      const errorMsg = "Please fill all required fields.";
      if (Platform.OS === 'web') {
        setError(errorMsg);
      } else {
        Alert.alert("Missing Required Fields", errorMsg);
      }
      return;
    }

    if (!patientId) {
      const errorMsg = "Patient ID is missing. Please go back and try again.";
      if (Platform.OS === 'web') {
        setError(errorMsg);
      } else {
        Alert.alert("Error", errorMsg);
      }
      return;
    }

    const times = scheduleText
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    if (!times.length) {
      const errorMsg = "Please enter at least one time (e.g. 08:00, 20:00).";
      if (Platform.OS === 'web') {
        setError(errorMsg);
      } else {
        Alert.alert("Invalid Schedule", errorMsg);
      }
      return;
    }

    // Validate date range
    if (endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        const errorMsg = "Please enter valid dates in YYYY-MM-DD format.";
        if (Platform.OS === 'web') {
          setError(errorMsg);
        } else {
          Alert.alert("Invalid Date", errorMsg);
        }
        return;
      }

      if (start > end) {
        const errorMsg = "Start date cannot be later than end date.";
        if (Platform.OS === 'web') {
          setError(errorMsg);
        } else {
          Alert.alert("Invalid Date Range", errorMsg);
        }
        return;
      }
    }

    const schedulePayload = times.map((time) => ({
      time,
      days: [], // you can extend UI later to select days
    }));

    setLoading(true);

    try {
      const token = await AsyncStorage.getItem("token");
      
      if (!token) {
        const errorMsg = "Authentication token missing. Please log in again.";
        if (Platform.OS === 'web') {
          setError(errorMsg);
        } else {
          Alert.alert("Error", errorMsg);
        }
        setLoading(false);
        return;
      }

      const requestBody = {
        patientId,
        name,
        dosage,
        frequency,
        schedule: schedulePayload,
        startDate,
        endDate: endDate || undefined,
        instructions: instructions || undefined,
      };

      const res = await fetch(`${API_URL}/api/medications`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      const data = await res.json();

      if (!res.ok) {
        const errorMsg = data.message || "Failed to create medication";
        if (Platform.OS === 'web') {
          setError(errorMsg);
        } else {
          Alert.alert("Error", errorMsg);
        }
        setLoading(false);
        return;
      }

      if (Platform.OS === 'web') {
        setSuccess(true);
        // Auto-navigate after a short delay
        setTimeout(() => {
          router.push({
            pathname: "/(provider)/ViewMedications",
            params: { patientId },
          });
        }, 1500);
      } else {
        Alert.alert("Success", "Medication created successfully!", [
          {
            text: "OK",
            onPress: () => {
              router.push({
                pathname: "/(provider)/ViewMedications",
                params: { patientId },
              });
            },
          },
        ]);
      }
    } catch (err: any) {
      console.error("Error creating medication:", err);
      const errorMsg = err.message || "Server error. Please try again.";
      if (Platform.OS === 'web') {
        setError(errorMsg);
      } else {
        Alert.alert("Error", errorMsg);
      }
      setLoading(false);
    }
  }

  if (!patientId) {
    return (
      <View className="flex-1 bg-gray-50 dark:bg-gray-900">
        <ProviderNavbar />
        <View className="flex-1 items-center justify-center px-4">
          <Text className="text-red-500 text-lg font-semibold mb-3 text-center">
            Patient ID is missing. Please go back and try again.
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/(provider)/ViewPatients")}
            className="bg-blue-500 px-6 py-3 rounded-xl"
          >
            <Text className="text-white text-lg font-semibold">Back to Patients</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      <ProviderNavbar />
      <ScrollView className="flex-1 px-4 pt-6 pb-6">
      <Text className="text-3xl font-bold text-center mb-6 text-gray-800 dark:text-white">
        Add Medication
      </Text>

      {/* Error Message */}
      {error && (
        <View className="bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 rounded-xl p-4 mb-4">
          <Text className="text-red-700 dark:text-red-300 font-semibold text-center">
            {error}
          </Text>
        </View>
      )}

      {/* Success Message */}
      {success && (
        <View className="bg-green-50 dark:bg-green-900/20 border-2 border-green-300 dark:border-green-700 rounded-xl p-4 mb-4">
          <Text className="text-green-700 dark:text-green-300 font-semibold text-center">
            Medication created successfully! Redirecting...
          </Text>
        </View>
      )}

      <View className="bg-gray-100 dark:bg-gray-800 p-5 rounded-2xl shadow">
        <Text className="text-gray-700 dark:text-gray-300 font-semibold mt-2">Name *</Text>
        <TextInput
          value={name}
          onChangeText={(text) => {
            setName(text);
            if (error) setError(null);
          }}
          className="bg-white dark:bg-gray-700 rounded-xl mt-1 px-4 py-3 text-gray-900 dark:text-white"
          placeholder="Medication Name"
          placeholderTextColor="#aaa"
        />

        <Text className="text-gray-700 dark:text-gray-300 font-semibold mt-4">Dosage *</Text>
        <TextInput
          value={dosage}
          onChangeText={(text) => {
            setDosage(text);
            if (error) setError(null);
          }}
          className="bg-white dark:bg-gray-700 rounded-xl mt-1 px-4 py-3"
          placeholder="e.g. 500mg"
          placeholderTextColor="#aaa"
        />

        <Text className="text-gray-700 dark:text-gray-300 font-semibold mt-4">
          Frequency * (tap to select)
        </Text>
        <View className="flex-row flex-wrap mt-1">
          {FREQUENCY_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              onPress={() => setFrequency(opt.value)}
              className={`px-3 py-2 mr-2 mb-2 rounded-full border ${
                frequency === opt.value
                  ? "bg-blue-600 border-blue-700"
                  : "bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
              }`}
            >
              <Text
                className={`text-xs font-semibold ${
                  frequency === opt.value
                    ? "text-white"
                    : "text-gray-800 dark:text-gray-200"
                }`}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text className="text-gray-700 dark:text-gray-300 font-semibold mt-4">
          Schedule * (comma-separated times)
        </Text>
        <TextInput
          value={scheduleText}
          onChangeText={(text) => {
            setScheduleText(text);
            if (error) setError(null);
          }}
          className="bg-white dark:bg-gray-700 rounded-xl mt-1 px-4 py-3"
          placeholder="e.g. 08:00, 20:00"
          placeholderTextColor="#aaa"
        />

        <Text className="text-gray-700 dark:text-gray-300 font-semibold mt-4">Start Date *</Text>
        <TextInput
          value={startDate}
          onChangeText={(text) => {
            setStartDate(text);
            if (error) setError(null);
          }}
          className="bg-white dark:bg-gray-700 rounded-xl mt-1 px-4 py-3"
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#aaa"
        />

        <Text className="text-gray-700 dark:text-gray-300 font-semibold mt-4">End Date</Text>
        <TextInput
          value={endDate}
          onChangeText={(text) => {
            setEndDate(text);
            if (error) setError(null);
          }}
          className="bg-white dark:bg-gray-700 rounded-xl mt-1 px-4 py-3"
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#aaa"
        />

        <Text className="text-gray-700 dark:text-gray-300 font-semibold mt-4">Instructions</Text>
        <TextInput
          value={instructions}
          onChangeText={setInstructions}
          multiline
          className="bg-white dark:bg-gray-700 rounded-xl mt-1 px-4 py-3 h-28"
          placeholder="Additional instructions"
          placeholderTextColor="#aaa"
        />
      </View>

      <TouchableOpacity
        onPress={handleCreate}
        disabled={loading}
        className={`mt-6 px-6 py-3 rounded-xl ${
          loading ? "bg-blue-300" : "bg-blue-600"
        }`}
      >
        <Text className="text-white text-lg font-semibold text-center">
          {loading ? "Saving..." : "Save Medication"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() =>
          router.push({ pathname: "/(provider)/ViewMedications", params: { patientId } })
        }
        className="bg-gray-500 px-6 py-3 rounded-xl mt-3"
      >
        <Text className="text-white text-lg font-semibold text-center">
          Back to Medications
        </Text>
      </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
