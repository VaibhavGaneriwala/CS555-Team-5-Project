import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import ProviderNavbar from '@/components/ProviderNavbar';
import Constants from 'expo-constants';

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

interface ScheduleEntry {
  time: string;
  days?: string[];
}

interface Medication {
  _id: string;
  name: string;
  dosage: string;
  frequency: string;
  schedule: ScheduleEntry[];
  startDate: string;
  endDate?: string;
  instructions?: string;
  prescribedBy?: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

export default function ViewMedications() {
  const { patientId } = useLocalSearchParams<{ patientId: string }>();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Edit modal state
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingMedication, setEditingMedication] = useState<Medication | null>(null);
  const [loadingMedication, setLoadingMedication] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Delete confirmation modal state
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [medicationToDelete, setMedicationToDelete] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  
  // Edit form state
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [frequency, setFrequency] = useState<string>("once-daily");
  const [scheduleText, setScheduleText] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [instructions, setInstructions] = useState("");

  const fetchMedications = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      setError(null);
      
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        setError("Authentication token missing.");
        if (showLoading) {
          setLoading(false);
        }
        return;
      }

      const res = await fetch(`${API_URL}/api/medications?patientId=${patientId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Failed to fetch medications");
      } else {
        setMedications(data || []);
      }
    } catch (err) {
      setError("Unable to connect to server.");
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchMedications();
  }, []);

  // Refresh medications when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchMedications();
    }, [patientId])
  );

  const openEditModal = async (medication: Medication) => {
    setEditingMedication(medication);
    setLoadingMedication(true);
    setEditModalVisible(true);
    
    try {
      const token = await AsyncStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/medications/${medication._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (!res.ok) {
        Alert.alert("Error", data.message || "Failed to load medication");
        setEditModalVisible(false);
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
      Alert.alert("Error", "Unable to load medication");
      setEditModalVisible(false);
    } finally {
      setLoadingMedication(false);
    }
  };

  const closeEditModal = () => {
    setEditModalVisible(false);
    setEditingMedication(null);
    setName("");
    setDosage("");
    setFrequency("once-daily");
    setScheduleText("");
    setStartDate("");
    setEndDate("");
    setInstructions("");
  };

  const saveMedicationChanges = async () => {
    if (!editingMedication) return;
    
    if (!name || !dosage || !frequency || !scheduleText || !startDate) {
      Alert.alert("Missing Required Fields", "Please fill all required fields.");
      return;
    }

    const times = scheduleText
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    if (!times.length) {
      Alert.alert("Invalid Schedule", "Please enter at least one time.");
      return;
    }

    // Validate date range
    if (endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        Alert.alert("Invalid Date", "Please enter valid dates in YYYY-MM-DD format.");
        return;
      }

      if (start > end) {
        Alert.alert("Invalid Date Range", "Start date cannot be later than end date.");
        return;
      }
    }

    const schedulePayload = times.map((time) => ({
      time,
      days: [],
    }));

    setSaving(true);

    try {
      const token = await AsyncStorage.getItem("token");
      
      if (!token) {
        Alert.alert("Error", "Authentication token missing. Please log in again.");
        setSaving(false);
        return;
      }

      const res = await fetch(`${API_URL}/api/medications/${editingMedication._id}`, {
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
          endDate: endDate || undefined,
          instructions: instructions || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        Alert.alert("Error", data.message || "Failed to update medication");
        setSaving(false);
        return;
      }

      setSaving(false);
      
      // Immediately refresh the medications list (without showing loading spinner)
      await fetchMedications(false);
      
      // Close modal and show success
      closeEditModal();
      Alert.alert("Success", "Medication updated successfully!");
    } catch (err: any) {
      console.error("Error updating medication:", err);
      Alert.alert("Error", err.message || "Server error while saving.");
      setSaving(false);
    }
  };

  const deleteMedication = async (id: string, medicationName: string) => {
    // Use web-compatible confirmation
    if (Platform.OS === 'web') {
      setMedicationToDelete({ id, name: medicationName });
      setDeleteModalVisible(true);
    } else {
      Alert.alert(
        "Confirm Delete",
        "Are you sure you want to delete this medication?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => handleDeleteConfirm(id),
          },
        ]
      );
    }
  };

  const handleDeleteConfirm = async (id: string) => {
    setDeleting(true);
    try {
      const token = await AsyncStorage.getItem("token");

      if (!token) {
        if (Platform.OS !== 'web') {
          Alert.alert("Error", "Authentication token missing");
        }
        setDeleting(false);
        return;
      }

      const res = await fetch(`${API_URL}/api/medications/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await res.json();

      if (!res.ok) {
        if (Platform.OS !== 'web') {
          Alert.alert("Error", data.message || "Failed to delete medication");
        }
        setDeleting(false);
        return;
      }

      // Refresh the list immediately
      await fetchMedications(false);
      setDeleteModalVisible(false);
      setMedicationToDelete(null);
      
      if (Platform.OS !== 'web') {
        Alert.alert("Success", "Medication deleted");
      }
    } catch (err) {
      if (Platform.OS !== 'web') {
        Alert.alert("Error", "Server error. Try again.");
      }
    } finally {
      setDeleting(false);
    }
  };

  const formatSchedule = (schedule: ScheduleEntry[] | undefined) => {
    if (!schedule || schedule.length === 0) return "No schedule set";

    return schedule
      .map((entry) => {
        const time = entry.time;
        const days = entry.days && entry.days.length
          ? ` (${entry.days.join(", ")})`
          : "";
        return `${time}${days}`;
      })
      .join(", ");
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-gray-900">
        <ActivityIndicator size="large" color="#2563eb" />
        <Text className="mt-3 text-gray-600 dark:text-gray-300">
          Loading Medications...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-gray-900 px-4">
        <Text className="text-red-500 text-lg font-semibold mb-3 text-center">
          {error}
        </Text>

        <TouchableOpacity
          onPress={fetchMedications}
          className="bg-blue-500 px-6 py-3 rounded-xl"
        >
          <Text className="text-white text-lg font-semibold text-center">Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      <ProviderNavbar />
      <ScrollView className="flex-1 px-4 pt-6 pb-6">
      <Text className="text-3xl font-bold mb-6 text-gray-800 dark:text-white text-center">
        Patient Medications
      </Text>

      {medications.length === 0 ? (
        <Text className="text-gray-600 dark:text-gray-300 text-center mt-8">
          This patient has no medications.
        </Text>
      ) : (
        medications.map((med) => (
          <View
            key={med._id}
            className="bg-gray-100 dark:bg-gray-800 p-4 mb-4 rounded-2xl shadow"
          >
            <Text className="text-xl font-bold text-gray-900 dark:text-white">
              {med.name}
            </Text>

            <Text className="text-gray-700 dark:text-gray-300">
              Dosage: {med.dosage}
            </Text>
            <Text className="text-gray-700 dark:text-gray-300">
              Frequency: {med.frequency}
            </Text>
            <Text className="text-gray-700 dark:text-gray-300">
              Schedule: {formatSchedule(med.schedule)}
            </Text>

            <Text className="text-gray-700 dark:text-gray-300">
              Start: {new Date(med.startDate).toLocaleDateString()}
            </Text>

            {med.endDate ? (
              <Text className="text-gray-700 dark:text-gray-300">
                End: {new Date(med.endDate).toLocaleDateString()}
              </Text>
            ) : (
              <Text className="text-gray-500 dark:text-gray-400">
                End: No end date
              </Text>
            )}

            {med.instructions ? (
              <Text className="text-gray-700 dark:text-gray-300 mt-1">
                Instructions: {med.instructions}
              </Text>
            ) : null}

            <View className="flex-row flex-wrap gap-2 mt-3">
              <TouchableOpacity
                onPress={() => openEditModal(med)}
                className="bg-blue-500 px-4 py-2 rounded-xl"
              >
                <Text className="text-white font-semibold text-sm">
                  Edit
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => deleteMedication(med._id, med.name)}
                className="bg-red-500 px-4 py-2 rounded-xl"
              >
                <Text className="text-white font-semibold text-sm">
                  Delete
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}

      <TouchableOpacity
        onPress={() => router.push("/(provider)/ViewPatients")}
        className="bg-blue-500 px-6 py-3 rounded-xl mt-8"
      >
        <Text className="text-white text-lg font-semibold text-center">
          Back to Patients
        </Text>
      </TouchableOpacity>
      </ScrollView>

      {/* Edit Medication Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={closeEditModal}
      >
        <Pressable 
          className="flex-1 justify-end bg-black/50"
          onPress={closeEditModal}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1, justifyContent: 'flex-end' }}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
          >
            <View 
              className="bg-white dark:bg-gray-800 rounded-t-3xl"
              style={{ 
                height: Platform.OS === 'web' ? '90%' : '85%',
                maxHeight: '90%',
                ...(Platform.OS === 'web' && {
                  maxWidth: '800px',
                  width: '100%',
                  alignSelf: 'center',
                  marginHorizontal: 'auto'
                })
              }}
            >
              <View className="flex-row justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
                <Text className="text-2xl font-bold text-gray-800 dark:text-white">
                  Edit Medication
                </Text>
                <TouchableOpacity
                  onPress={closeEditModal}
                  className="bg-gray-200 dark:bg-gray-700 px-4 py-2 rounded-xl"
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text className="text-gray-800 dark:text-white font-semibold">
                    Close
                  </Text>
                </TouchableOpacity>
              </View>

              {loadingMedication ? (
                <View className="p-8 items-center" style={{ minHeight: 200 }}>
                  <ActivityIndicator size="large" color="#2563eb" />
                  <Text className="mt-3 text-gray-600 dark:text-gray-300">
                    Loading Medication...
                  </Text>
                </View>
              ) : (
                <ScrollView
                  style={{ flex: 1 }}
                  contentContainerStyle={{ 
                    padding: 16, 
                    paddingBottom: 40
                  }}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={true}
                  nestedScrollEnabled={true}
                  bounces={true}
                >
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
                    className="bg-white dark:bg-gray-700 rounded-xl mt-1 px-4 py-3 text-gray-900 dark:text-white"
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
                        className={`px-4 py-3 mr-2 mb-2 rounded-full border ${
                          frequency === opt.value
                            ? "bg-blue-600 border-blue-700"
                            : "bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                        }`}
                        activeOpacity={0.7}
                        hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
                      >
                        <Text
                          className={`text-sm font-semibold ${
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
                    className="bg-white dark:bg-gray-700 rounded-xl mt-1 px-4 py-3 text-gray-900 dark:text-white"
                    placeholder="e.g. 08:00, 20:00"
                    placeholderTextColor="#aaa"
                  />

                  <Text className="text-gray-700 dark:text-gray-300 font-semibold mt-4">Start Date *</Text>
                  <TextInput
                    value={startDate}
                    onChangeText={setStartDate}
                    className="bg-white dark:bg-gray-700 rounded-xl mt-1 px-4 py-3 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600"
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#aaa"
                    keyboardType="default"
                    returnKeyType="next"
                    blurOnSubmit={false}
                  />

                  <Text className="text-gray-700 dark:text-gray-300 font-semibold mt-4">End Date</Text>
                  <TextInput
                    value={endDate}
                    onChangeText={setEndDate}
                    className="bg-white dark:bg-gray-700 rounded-xl mt-1 px-4 py-3 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600"
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#aaa"
                    keyboardType="default"
                    returnKeyType="done"
                  />

                  <Text className="text-gray-700 dark:text-gray-300 font-semibold mt-4">Instructions</Text>
                  <TextInput
                    value={instructions}
                    onChangeText={setInstructions}
                    multiline
                    className="bg-white dark:bg-gray-700 rounded-xl mt-1 px-4 py-3 h-24 text-gray-900 dark:text-white"
                    placeholder="Additional instructions"
                    placeholderTextColor="#aaa"
                  />
                </View>

                  <TouchableOpacity
                    onPress={saveMedicationChanges}
                    disabled={saving}
                    className={`mt-6 px-6 py-4 rounded-xl ${
                      saving ? "bg-blue-300" : "bg-blue-600"
                    }`}
                    activeOpacity={0.7}
                  >
                    <Text className="text-white text-lg font-semibold text-center">
                      {saving ? "Saving..." : "Save Changes"}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={closeEditModal}
                    className="bg-gray-500 px-6 py-4 rounded-xl mt-3"
                    activeOpacity={0.7}
                  >
                    <Text className="text-white text-lg font-semibold text-center">
                      Cancel
                    </Text>
                  </TouchableOpacity>
                </ScrollView>
              )}
            </View>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>

      {/* DELETE CONFIRMATION MODAL (for web) */}
      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setDeleteModalVisible(false);
          setMedicationToDelete(null);
        }}
      >
        <View className="flex-1 justify-center items-center bg-black/60">
          <View 
            className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-2xl mx-4 w-full"
            style={{
              ...(Platform.OS === 'web' && {
                maxWidth: '500px',
                width: '100%'
              })
            }}
          >
            <View className="flex-row items-center mb-4">
              <View className="bg-red-100 dark:bg-red-900/30 rounded-xl p-2 mr-3">
                <Text className="text-2xl">⚠️</Text>
              </View>
              <Text className="text-2xl font-bold text-gray-800 dark:text-white">
                Confirm Delete
              </Text>
            </View>
            
            <Text className="text-gray-700 dark:text-gray-300 text-base mb-6">
              Are you sure you want to delete <Text className="font-bold">{medicationToDelete?.name}</Text>? This action cannot be undone.
            </Text>

            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => {
                  setDeleteModalVisible(false);
                  setMedicationToDelete(null);
                }}
                disabled={deleting}
                className="flex-1 bg-gray-200 dark:bg-gray-700 px-4 py-3 rounded-xl"
              >
                <Text className="text-gray-800 dark:text-white font-semibold text-center">
                  Cancel
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={() => {
                  if (medicationToDelete) {
                    handleDeleteConfirm(medicationToDelete.id);
                  }
                }}
                disabled={deleting}
                className="flex-1 bg-red-500 px-4 py-3 rounded-xl"
              >
                {deleting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text className="text-white font-semibold text-center">
                    Delete
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
