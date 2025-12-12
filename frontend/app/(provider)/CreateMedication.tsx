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
import { Ionicons } from "@expo/vector-icons";

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
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState<string | null>(null);

  async function handleCreate() {
    // Clear previous errors
    setSuccess(false);
    setValidationErrors({});
    setSaveError(null);

    if (!patientId) {
      const errorMsg = "Patient ID is missing. Please go back and try again.";
      if (Platform.OS === 'web') {
        setSaveError(errorMsg);
      } else {
        Alert.alert("Error", errorMsg);
      }
      return;
    }

    const errors: Record<string, string> = {};

    // Validate required fields (only name, dosage, and startDate are required)
    if (!name || name.trim() === '') {
      errors.name = 'Medication name is required';
    }

    if (!dosage || dosage.trim() === '') {
      errors.dosage = 'Dosage is required';
    }

    if (!startDate || startDate.trim() === '') {
      errors.startDate = 'Start date is required';
    }

    // Validate schedule format if provided (optional for creation, but validate format if entered)
    let schedulePayload: Array<{ time: string; days: string[] }> = [];
    if (scheduleText && scheduleText.trim() !== '') {
      const times = scheduleText
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      if (times.length > 0) {
        // Validate time format (HH:MM)
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        const invalidTimes = times.filter(time => !timeRegex.test(time));
        if (invalidTimes.length > 0) {
          errors.schedule = `Invalid time format. Use HH:MM (e.g., 08:00, 20:30)`;
        } else {
          schedulePayload = times.map((time) => ({
            time,
            days: [],
          }));
        }
      }
    }

    // Validate date range if end date is provided
    if (endDate && endDate.trim() !== '') {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        errors.endDate = 'Invalid date format';
      } else if (start > end) {
        errors.endDate = 'End date cannot be earlier than start date';
      }
    }

    // If there are validation errors, show them and return
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      if (Platform.OS !== 'web') {
        Alert.alert('Validation Error', 'Please fix the errors in the form.');
      }
      return;
    }

    setLoading(true);

    try {
      const token = await AsyncStorage.getItem("token");
      
      if (!token) {
        const errorMsg = "Authentication token missing. Please log in again.";
        setSaveError(errorMsg);
        if (Platform.OS !== 'web') {
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
        ...(schedulePayload.length > 0 && { schedule: schedulePayload }),
        startDate,
        ...(endDate && endDate.trim() !== '' && { endDate }),
        ...(instructions && instructions.trim() !== '' && { instructions }),
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
        setSaveError(errorMsg);
        if (Platform.OS !== 'web') {
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
      const errorMsg = err.message || "Could not connect to server. Please check your connection and try again.";
      setSaveError(errorMsg);
      if (Platform.OS !== 'web') {
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

      {/* Save Error Banner */}
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

      {/* Success Message */}
      {success && (
        <View className="bg-green-50 dark:bg-green-900/20 border-2 border-green-300 dark:border-green-700 rounded-xl p-4 mb-4">
          <Text className="text-green-700 dark:text-green-300 font-semibold text-center">
            Medication created successfully! Redirecting...
          </Text>
        </View>
      )}

      <View className="bg-gray-100 dark:bg-gray-800 p-5 rounded-2xl shadow">
        <Text className="text-gray-700 dark:text-gray-300 font-semibold mt-2">
          Name <Text className="text-red-500">*</Text>
        </Text>
        <TextInput
          value={name}
          onChangeText={(text) => {
            setName(text);
            if (validationErrors.name) {
              setValidationErrors({ ...validationErrors, name: '' });
            }
            if (saveError) setSaveError(null);
          }}
          className={`bg-white dark:bg-gray-700 rounded-xl mt-1 px-4 py-3 text-gray-900 dark:text-white border ${
            validationErrors.name 
              ? 'border-red-500 dark:border-red-500' 
              : 'border-gray-200 dark:border-gray-600'
          }`}
          placeholder="Medication Name"
          placeholderTextColor="#aaa"
        />
        {validationErrors.name && (
          <Text className="text-red-500 text-xs mt-1 ml-1">
            {validationErrors.name}
          </Text>
        )}

        <Text className="text-gray-700 dark:text-gray-300 font-semibold mt-4">
          Dosage <Text className="text-red-500">*</Text>
        </Text>
        <TextInput
          value={dosage}
          onChangeText={(text) => {
            setDosage(text);
            if (validationErrors.dosage) {
              setValidationErrors({ ...validationErrors, dosage: '' });
            }
            if (saveError) setSaveError(null);
          }}
          className={`bg-white dark:bg-gray-700 rounded-xl mt-1 px-4 py-3 text-gray-900 dark:text-white border ${
            validationErrors.dosage 
              ? 'border-red-500 dark:border-red-500' 
              : 'border-gray-200 dark:border-gray-600'
          }`}
          placeholder="e.g. 500mg"
          placeholderTextColor="#aaa"
        />
        {validationErrors.dosage && (
          <Text className="text-red-500 text-xs mt-1 ml-1">
            {validationErrors.dosage}
          </Text>
        )}

        <Text className="text-gray-700 dark:text-gray-300 font-semibold mt-4">
          Frequency (tap to select)
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
          Schedule (comma-separated times)
        </Text>
        <TextInput
          value={scheduleText}
          onChangeText={(text) => {
            setScheduleText(text);
            if (validationErrors.schedule) {
              setValidationErrors({ ...validationErrors, schedule: '' });
            }
            if (saveError) setSaveError(null);
          }}
          className={`bg-white dark:bg-gray-700 rounded-xl mt-1 px-4 py-3 text-gray-900 dark:text-white border ${
            validationErrors.schedule 
              ? 'border-red-500 dark:border-red-500' 
              : 'border-gray-200 dark:border-gray-600'
          }`}
          placeholder="e.g. 08:00, 20:00"
          placeholderTextColor="#aaa"
        />
        {validationErrors.schedule && (
          <Text className="text-red-500 text-xs mt-1 ml-1">
            {validationErrors.schedule}
          </Text>
        )}

        <Text className="text-gray-700 dark:text-gray-300 font-semibold mt-4">
          Start Date <Text className="text-red-500">*</Text>
        </Text>
        {Platform.OS === 'web' ? (
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              if (validationErrors.startDate) {
                setValidationErrors({ ...validationErrors, startDate: '' });
              }
              if (saveError) setSaveError(null);
            }}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '12px',
              border: validationErrors.startDate 
                ? '2px solid #ef4444' 
                : '2px solid #e5e7eb',
              fontSize: '16px',
              backgroundColor: '#fff',
              color: '#111827',
              marginTop: '8px',
            }}
            className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        ) : (
          <TextInput
            value={startDate}
            onChangeText={(text) => {
              setStartDate(text);
              if (validationErrors.startDate) {
                setValidationErrors({ ...validationErrors, startDate: '' });
              }
              if (saveError) setSaveError(null);
            }}
            className={`bg-white dark:bg-gray-700 rounded-xl mt-1 px-4 py-3 text-gray-900 dark:text-white border ${
              validationErrors.startDate 
                ? 'border-red-500 dark:border-red-500' 
                : 'border-gray-200 dark:border-gray-600'
            }`}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#aaa"
          />
        )}
        {validationErrors.startDate && (
          <Text className="text-red-500 text-xs mt-1 ml-1">
            {validationErrors.startDate}
          </Text>
        )}

        <Text className="text-gray-700 dark:text-gray-300 font-semibold mt-4">End Date</Text>
        {Platform.OS === 'web' ? (
          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              if (validationErrors.endDate) {
                setValidationErrors({ ...validationErrors, endDate: '' });
              }
              if (saveError) setSaveError(null);
            }}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '12px',
              border: validationErrors.endDate 
                ? '2px solid #ef4444' 
                : '2px solid #e5e7eb',
              fontSize: '16px',
              backgroundColor: '#fff',
              color: '#111827',
              marginTop: '8px',
            }}
            className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        ) : (
          <TextInput
            value={endDate}
            onChangeText={(text) => {
              setEndDate(text);
              if (validationErrors.endDate) {
                setValidationErrors({ ...validationErrors, endDate: '' });
              }
              if (saveError) setSaveError(null);
            }}
            className={`bg-white dark:bg-gray-700 rounded-xl mt-1 px-4 py-3 text-gray-900 dark:text-white border ${
              validationErrors.endDate 
                ? 'border-red-500 dark:border-red-500' 
                : 'border-gray-200 dark:border-gray-600'
            }`}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#aaa"
          />
        )}
        {validationErrors.endDate && (
          <Text className="text-red-500 text-xs mt-1 ml-1">
            {validationErrors.endDate}
          </Text>
        )}

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
