import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, router } from "expo-router";
import AdminNavbar from "@/components/AdminNavbar";
import { API_URL } from '@/utils/apiConfig';

const FREQUENCY_OPTIONS = [
  { value: "once-daily", label: "Once daily" },
  { value: "twice-daily", label: "Twice daily" },
  { value: "three-times-daily", label: "3x daily" },
  { value: "four-times-daily", label: "4x daily" },
  { value: "weekly", label: "Weekly" },
  { value: "as-needed", label: "As needed" },
  { value: "custom", label: "Custom" },
];

interface ScheduleEntry {
  time: string;
  days?: string[];
}

export default function EditMedication() {
  const { medicationId, patientId } = useLocalSearchParams<{
    medicationId: string;
    patientId: string;
  }>();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [frequency, setFrequency] = useState<string>("once-daily");
  const [scheduleText, setScheduleText] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [instructions, setInstructions] = useState("");

  const loadMedication = async () => {
    try {
      const token = await AsyncStorage.getItem("token");

      const res = await fetch(`${API_URL}/api/medications/${medicationId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (!res.ok) {
        if (Platform.OS === 'web') {
          window.alert(data.message || "Failed to load medication");
        } else {
          Alert.alert("Error", data.message || "Failed to load medication");
        }
        return;
      }

      setName(data.name);
      setDosage(data.dosage);
      setFrequency(data.frequency || "once-daily");

      const schedule: ScheduleEntry[] = data.schedule || [];
      const times = schedule.map((s) => s.time).join(", ");
      setScheduleText(times);

      setStartDate(data.startDate?.slice(0, 10) || "");
      setEndDate(data.endDate?.slice(0, 10) || "");
      setInstructions(data.instructions || "");
    } catch (err) {
      if (Platform.OS === 'web') {
        window.alert("Unable to load medication");
      } else {
        Alert.alert("Error", "Unable to load medication");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMedication();
  }, []);

  const saveChanges = async () => {
    if (!name || !dosage || !frequency || !scheduleText || !startDate) {
      if (Platform.OS === 'web') {
        window.alert("Please fill all required fields.");
      } else {
        Alert.alert("Missing Required Fields", "Please fill all required fields.");
      }
      return;
    }

    const times = scheduleText
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    if (!times.length) {
      if (Platform.OS === 'web') {
        window.alert("Please enter at least one time.");
      } else {
        Alert.alert("Invalid Schedule", "Please enter at least one time.");
      }
      return;
    }

    const schedulePayload = times.map((time) => ({
      time,
      days: [],
    }));

    setSaving(true);

    try {
      const token = await AsyncStorage.getItem("token");

      const res = await fetch(`${API_URL}/api/medications/${medicationId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          dosage,
          frequency,
          schedule: schedulePayload,
          startDate,
          endDate,
          instructions,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (Platform.OS === 'web') {
          window.alert(data.message || "Failed to update medication");
        } else {
          Alert.alert("Error", data.message || "Failed to update medication");
        }
        return;
      }

      if (Platform.OS === 'web') {
        window.alert("Medication updated successfully!");
      } else {
        Alert.alert("Success", "Medication updated successfully!");
      }
      router.push("/(admin)/ViewMedications");
    } catch (err) {
      if (Platform.OS === 'web') {
        window.alert("Server error while saving.");
      } else {
        Alert.alert("Error", "Server error while saving.");
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-gray-50 dark:bg-gray-900">
        <AdminNavbar />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2563eb" />
          <Text className="mt-4 text-gray-700 dark:text-gray-300">
            Loading medication...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      <AdminNavbar />
      <ScrollView className="flex-1 px-4 pt-6 pb-8">
        <View
          className="mb-6 rounded-3xl p-6 shadow-2xl"
          style={{ backgroundColor: '#059669' }}
        >
          <Text className="text-3xl font-bold text-white text-center">
            Edit Medication
          </Text>
        </View>

        <View className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700">
          <Text className="text-gray-700 dark:text-gray-300 font-semibold mt-2">Name *</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            className="bg-gray-50 dark:bg-gray-700 rounded-xl mt-1 px-4 py-3 text-gray-900 dark:text-white border-2 border-gray-200 dark:border-gray-600"
            style={{ fontSize: 16 }}
          />

          <Text className="text-gray-700 dark:text-gray-300 font-semibold mt-4">Dosage *</Text>
          <TextInput
            value={dosage}
            onChangeText={setDosage}
            className="bg-gray-50 dark:bg-gray-700 rounded-xl mt-1 px-4 py-3 text-gray-900 dark:text-white border-2 border-gray-200 dark:border-gray-600"
            style={{ fontSize: 16 }}
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
                activeOpacity={0.7}
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
            className="bg-gray-50 dark:bg-gray-700 rounded-xl mt-1 px-4 py-3 text-gray-900 dark:text-white border-2 border-gray-200 dark:border-gray-600"
            style={{ fontSize: 16 }}
            placeholder="e.g., 08:00, 20:00"
            placeholderTextColor="#9CA3AF"
          />

          <Text className="text-gray-700 dark:text-gray-300 font-semibold mt-4">Start Date *</Text>
          <TextInput
            value={startDate}
            onChangeText={setStartDate}
            className="bg-gray-50 dark:bg-gray-700 rounded-xl mt-1 px-4 py-3 text-gray-900 dark:text-white border-2 border-gray-200 dark:border-gray-600"
            style={{ fontSize: 16 }}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#9CA3AF"
          />

          <Text className="text-gray-700 dark:text-gray-300 font-semibold mt-4">End Date</Text>
          <TextInput
            value={endDate}
            onChangeText={setEndDate}
            className="bg-gray-50 dark:bg-gray-700 rounded-xl mt-1 px-4 py-3 text-gray-900 dark:text-white border-2 border-gray-200 dark:border-gray-600"
            style={{ fontSize: 16 }}
            placeholder="YYYY-MM-DD (optional)"
            placeholderTextColor="#9CA3AF"
          />

          <Text className="text-gray-700 dark:text-gray-300 font-semibold mt-4">Instructions</Text>
          <TextInput
            value={instructions}
            onChangeText={setInstructions}
            multiline
            className="bg-gray-50 dark:bg-gray-700 rounded-xl mt-1 px-4 py-3 text-gray-900 dark:text-white border-2 border-gray-200 dark:border-gray-600"
            style={{ fontSize: 16, minHeight: 80 }}
            placeholder="Optional instructions..."
            placeholderTextColor="#9CA3AF"
          />
        </View>

        <TouchableOpacity
          onPress={saveChanges}
          disabled={saving}
          className={`mt-6 px-6 py-3 rounded-xl ${
            saving ? "bg-blue-300" : "bg-blue-600"
          }`}
          activeOpacity={0.8}
        >
          <Text className="text-white text-lg font-semibold text-center">
            {saving ? "Saving..." : "Save Changes"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push("/(admin)/ViewMedications")}
          className="bg-gray-500 px-6 py-3 rounded-xl mt-3"
          activeOpacity={0.8}
        >
          <Text className="text-white text-lg font-semibold text-center">
            Back to Medications
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
