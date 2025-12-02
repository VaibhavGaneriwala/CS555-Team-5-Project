import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, router } from "expo-router";
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
  const { patientId } = useLocalSearchParams<{ patientId: string }>();

  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [frequency, setFrequency] = useState<string>("once-daily");
  const [scheduleText, setScheduleText] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [instructions, setInstructions] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    if (!name || !dosage || !frequency || !scheduleText || !startDate) {
      Alert.alert("Missing Required Fields", "Please fill all required fields.");
      return;
    }

    const times = scheduleText
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    if (!times.length) {
      Alert.alert("Invalid Schedule", "Please enter at least one time (e.g. 08:00, 20:00).");
      return;
    }

    const schedulePayload = times.map((time) => ({
      time,
      days: [], // you can extend UI later to select days
    }));

    setLoading(true);

    try {
      const token = await AsyncStorage.getItem("token");

      const res = await fetch(`${API_URL}/api/medications`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          patientId,
          name,
          dosage,
          frequency,       // enum-safe
          schedule: schedulePayload,
          startDate,
          endDate,
          instructions,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        Alert.alert("Error", data.message || "Failed to create medication");
        return;
      }

      Alert.alert("Success", "Medication created successfully!");
      router.push({
        pathname: "/(provider)/ViewMedications",
        params: { patientId },
      });
    } catch (err) {
      Alert.alert("Error", "Server error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView className="flex-1 bg-white dark:bg-gray-900 px-4 pt-10 pb-6">
      <Text className="text-3xl font-bold text-center mb-6 text-gray-800 dark:text-white">
        Add Medication
      </Text>

      <View className="bg-gray-100 dark:bg-gray-800 p-5 rounded-2xl shadow">
        <Text className="text-gray-700 dark:text-gray-300 font-semibold mt-2">Name *</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          className="bg-white dark:bg-gray-700 rounded-xl mt-1 px-4 py-3 text-gray-900 dark:text-white"
          placeholder="Medication Name"
          placeholderTextColor="#aaa"
        />

        <Text className="text-gray-700 dark:text-gray-300 font-semibold mt-4">Dosage *</Text>
        <TextInput
          value={dosage}
          onChangeText={setDosage}
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
          onChangeText={setScheduleText}
          className="bg-white dark:bg-gray-700 rounded-xl mt-1 px-4 py-3"
          placeholder="e.g. 08:00, 20:00"
          placeholderTextColor="#aaa"
        />

        <Text className="text-gray-700 dark:text-gray-300 font-semibold mt-4">Start Date *</Text>
        <TextInput
          value={startDate}
          onChangeText={setStartDate}
          className="bg-white dark:bg-gray-700 rounded-xl mt-1 px-4 py-3"
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#aaa"
        />

        <Text className="text-gray-700 dark:text-gray-300 font-semibold mt-4">End Date</Text>
        <TextInput
          value={endDate}
          onChangeText={setEndDate}
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
  );
}
