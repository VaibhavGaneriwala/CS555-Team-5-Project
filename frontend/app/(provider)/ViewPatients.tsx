import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Modal,
  TextInput,
  Alert,
  ScrollView,
  Platform,
  Pressable,
  KeyboardAvoidingView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import ProviderNavbar from '@/components/ProviderNavbar';
import { API_URL } from '@/utils/apiConfig';
import DateTimePicker from '@react-native-community/datetimepicker';

const FREQUENCY_OPTIONS = [
  { value: "once-daily", label: "Once daily" },
  { value: "twice-daily", label: "Twice daily" },
  { value: "three-times-daily", label: "3x daily" },
  { value: "four-times-daily", label: "4x daily" },
  { value: "weekly", label: "Weekly" },
  { value: "as-needed", label: "As needed" },
  { value: "custom", label: "Custom" },
];

interface Patient {
  _id: string;
  name: string;
  email: string;
  gender: string;
  dateOfBirth: string;
  adherence: string | number;
  phoneNumber?: string;
  address?: {
    streetAddress: string;
    city: string;
    state: string;
    zipcode: string;
  };
}

interface AvailablePatient {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  isAssigned: boolean;
  isAssignedToAnyProvider: boolean;
  assignedProvider?: {
    firstName: string;
    lastName: string;
    email: string;
  };
}



export default function ViewPatients() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Assign patient modal state
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [availablePatients, setAvailablePatients] = useState<AvailablePatient[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [assigning, setAssigning] = useState(false);
  
  // Unassign confirmation modal state
  const [unassignModalVisible, setUnassignModalVisible] = useState(false);
  const [patientToUnassign, setPatientToUnassign] = useState<{ id: string; name: string } | null>(null);
  const [unassigning, setUnassigning] = useState(false);

  // Create medication modal state
  const [createMedModalVisible, setCreateMedModalVisible] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  
  // Create medication form state
  const [createName, setCreateName] = useState("");
  const [createDosage, setCreateDosage] = useState("");
  const [createFrequency, setCreateFrequency] = useState<string>("once-daily");
  const [createScheduleText, setCreateScheduleText] = useState("");
  const [createStartDate, setCreateStartDate] = useState("");
  const [createEndDate, setCreateEndDate] = useState("");
  const [createInstructions, setCreateInstructions] = useState("");
  const [showCreateStartPicker, setShowCreateStartPicker] = useState(false);
  const [showCreateEndPicker, setShowCreateEndPicker] = useState(false);
  const [createValidationErrors, setCreateValidationErrors] = useState<Record<string, string>>({});
  const [createSaveError, setCreateSaveError] = useState<string | null>(null);
  const createMedScrollViewRef = useRef<ScrollView>(null);


  /* -------------------------------------------------------
      FETCH ASSIGNED PATIENTS
  ------------------------------------------------------- */
  const fetchPatients = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        setError('Authentication token missing. Please log in again.');
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_URL}/api/provider/patients`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Failed to fetch patients');
      } else {
        setPatients(data.patients || []);
      }
    } catch (err) {
      setError('Unable to connect to server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  /* -------------------------------------------------------
      FETCH AVAILABLE PATIENTS FOR ASSIGNMENT
  ------------------------------------------------------- */
  const fetchAvailablePatients = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`${API_URL}/api/provider/available-patients`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      if (response.ok && data.patients) {
        setAvailablePatients(data.patients);
      }
    } catch (err) {
      console.error('Error fetching available patients:', err);
    }
  };

  /* -------------------------------------------------------
      OPEN ASSIGN MODAL
  ------------------------------------------------------- */
  const handleOpenAssignModal = () => {
    setAssignModalVisible(true);
    setSearchQuery('');
    fetchAvailablePatients();
  };

  /* -------------------------------------------------------
      ASSIGN PATIENT BY SELECTION
  ------------------------------------------------------- */
  const assignPatientById = async (patientId: string) => {
    setAssigning(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Error', 'Authentication token missing');
        setAssigning(false);
        return;
      }

      const response = await fetch(`${API_URL}/api/provider/assign`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ patientId }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (Platform.OS !== 'web') {
          Alert.alert('Error', data.message || 'Failed to assign patient');
        } else {
          // On web, show error in console or a toast-like message
          console.error('Failed to assign patient:', data.message);
        }
      } else {
        // Success - refresh lists and close modal
        setAssignModalVisible(false);
        setSearchQuery('');
        fetchPatients();
        fetchAvailablePatients();
        
        // Show success message only on mobile
        if (Platform.OS !== 'web') {
          Alert.alert('Success', data.message || 'Patient assigned successfully');
        }
      }
    } catch (err) {
      if (Platform.OS !== 'web') {
        Alert.alert('Error', 'Unable to connect to server');
      } else {
        console.error('Error assigning patient:', err);
      }
    } finally {
      setAssigning(false);
    }
  };

  /* -------------------------------------------------------
      CALCULATE AGE
  ------------------------------------------------------- */
  const calculateAge = (dateOfBirth: string) => {
    const dob = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  };

  /* -------------------------------------------------------
      UNASSIGN PATIENT
  ------------------------------------------------------- */
  const unassignPatient = async (patientId: string, patientName: string) => {
    // Use web-compatible confirmation
    if (Platform.OS === 'web') {
      setPatientToUnassign({ id: patientId, name: patientName });
      setUnassignModalVisible(true);
    } else {
      Alert.alert(
        'Confirm Unassign',
        `Are you sure you want to unassign ${patientName}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Unassign',
            style: 'destructive',
            onPress: () => handleUnassignConfirm(patientId),
          },
        ]
      );
    }
  };

  /* -------------------------------------------------------
      HANDLE UNASSIGN CONFIRMATION
  ------------------------------------------------------- */
  const handleUnassignConfirm = async (patientId: string) => {
    setUnassigning(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        if (Platform.OS !== 'web') {
          Alert.alert('Error', 'Authentication token missing');
        }
        setUnassigning(false);
        return;
      }

      const response = await fetch(`${API_URL}/api/provider/assign/${patientId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        if (Platform.OS !== 'web') {
          Alert.alert('Error', data.message || 'Failed to unassign patient');
        }
      } else {
        if (Platform.OS !== 'web') {
          Alert.alert('Success', data.message || 'Patient unassigned successfully');
        }
        fetchPatients();
        setUnassignModalVisible(false);
        setPatientToUnassign(null);
      }
    } catch (err) {
      if (Platform.OS !== 'web') {
        Alert.alert('Error', 'Unable to connect to server');
      }
    } finally {
      setUnassigning(false);
    }
  };

  /* -------------------------------------------------------
      LOADING SCREEN
  ------------------------------------------------------- */
  if (loading) {
    return (
      <View className="flex-1 bg-gray-50 dark:bg-gray-900">
        <ProviderNavbar />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2563eb" />
          <Text className="mt-3 text-gray-600 dark:text-gray-300">
            Loading Patients...
          </Text>
        </View>
      </View>
    );
  }

  /* -------------------------------------------------------
      ERROR SCREEN
  ------------------------------------------------------- */
  if (error) {
    return (
      <View className="flex-1 bg-gray-50 dark:bg-gray-900">
        <ProviderNavbar />
        <View className="flex-1 items-center justify-center px-4">
          <Text className="text-red-500 text-lg font-semibold mb-3 text-center">
            {error}
          </Text>

          <TouchableOpacity
            onPress={fetchPatients}
            className="bg-blue-500 px-6 py-3 rounded-xl"
            activeOpacity={0.8}
          >
            <Text className="text-white text-lg font-semibold">Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  /* -------------------------------------------------------
      FILTER AVAILABLE PATIENTS
  ------------------------------------------------------- */
  const filteredAvailablePatients = availablePatients.filter((p) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      p.firstName.toLowerCase().includes(searchLower) ||
      p.lastName.toLowerCase().includes(searchLower) ||
      p.email.toLowerCase().includes(searchLower)
    );
  });

  /* -------------------------------------------------------
      OPEN CREATE MEDICATION MODAL
  ------------------------------------------------------- */
  const openCreateMedModal = (patientId: string) => {
    setSelectedPatientId(patientId);
    setCreateMedModalVisible(true);
    setCreateName("");
    setCreateDosage("");
    setCreateFrequency("once-daily");
    setCreateScheduleText("");
    setCreateStartDate("");
    setCreateEndDate("");
    setCreateInstructions("");
    setShowCreateStartPicker(false);
    setShowCreateEndPicker(false);
    setCreateValidationErrors({});
    setCreateSaveError(null);
  };

  /* -------------------------------------------------------
      CLOSE CREATE MEDICATION MODAL
  ------------------------------------------------------- */
  const closeCreateMedModal = () => {
    setCreateMedModalVisible(false);
    setSelectedPatientId(null);
    setCreateName("");
    setCreateDosage("");
    setCreateFrequency("once-daily");
    setCreateScheduleText("");
    setCreateStartDate("");
    setCreateEndDate("");
    setCreateInstructions("");
    setShowCreateStartPicker(false);
    setShowCreateEndPicker(false);
    setCreateValidationErrors({});
    setCreateSaveError(null);
  };

  /* -------------------------------------------------------
      HANDLE CREATE MEDICATION
  ------------------------------------------------------- */
  const handleCreateMedication = async () => {
    console.log('handleCreateMedication called');
    // Clear previous errors
    setCreateValidationErrors({});
    setCreateSaveError(null);

    if (!selectedPatientId) {
      const errorMsg = "Patient ID is missing.";
      setCreateSaveError(errorMsg);
      if (Platform.OS !== 'web') {
        Alert.alert("Error", errorMsg);
      }
      return;
    }

    const errors: Record<string, string> = {};

    // Validate required fields (only name, dosage, and startDate are required)
    if (!createName || createName.trim() === '') {
      errors.name = 'Medication name is required';
    }

    if (!createDosage || createDosage.trim() === '') {
      errors.dosage = 'Dosage is required';
    }

    if (!createStartDate || createStartDate.trim() === '') {
      errors.startDate = 'Start date is required';
    }

    // Validate schedule format if provided (optional for creation, but validate format if entered)
    let schedulePayload: Array<{ time: string; days: string[] }> = [];
    if (createScheduleText && createScheduleText.trim() !== '') {
      const times = createScheduleText
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
    
    // Backend requires schedule to be present (even if empty array)
    // We'll always send it, but if user didn't provide schedule times,
    // we need to create a default schedule based on frequency
    // For now, we'll send an empty array and let backend handle it
    // But backend validation might fail, so let's ensure we have at least one schedule entry
    if (schedulePayload.length === 0 && !createScheduleText) {
      // If no schedule provided, create a default based on frequency
      // This ensures backend validation passes
      schedulePayload = [{
        time: "08:00", // Default morning time
        days: [],
      }];
    }

    // Validate date range if end date is provided
    if (createEndDate && createEndDate.trim() !== '') {
      const start = new Date(createStartDate);
      const end = new Date(createEndDate);
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        errors.endDate = 'Invalid date format';
      } else if (start > end) {
        errors.endDate = 'End date cannot be earlier than start date';
      }
    }

    // If there are validation errors, show them and return
    if (Object.keys(errors).length > 0) {
      setCreateValidationErrors(errors);
      // Scroll to top to show errors
      if (createMedScrollViewRef.current) {
        createMedScrollViewRef.current.scrollTo({ y: 0, animated: true });
      }
      if (Platform.OS !== 'web') {
        Alert.alert('Validation Error', 'Please fix the errors in the form.');
      }
      return;
    }

    setCreating(true);

    try {
      const token = await AsyncStorage.getItem("token");
      
      if (!token) {
        const errorMsg = "Authentication token missing. Please log in again.";
        setCreateSaveError(errorMsg);
        if (Platform.OS !== 'web') {
          Alert.alert("Error", errorMsg);
        }
        setCreating(false);
        return;
      }

      // Ensure schedule is always provided (backend requires it)
      // If no schedule provided, use a default empty schedule
      const finalSchedule = schedulePayload.length > 0 ? schedulePayload : [];

      const requestBody = {
        patientId: selectedPatientId,
        name: createName,
        dosage: createDosage,
        frequency: createFrequency,
        schedule: finalSchedule,
        startDate: createStartDate,
        ...(createEndDate && createEndDate.trim() !== '' && { endDate: createEndDate }),
        ...(createInstructions && createInstructions.trim() !== '' && { instructions: createInstructions }),
      };

      const res = await fetch(`${API_URL}/api/medications`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      let data;
      try {
        data = await res.json();
      } catch (parseError) {
        // If response is not JSON, use status text
        const errorMsg = res.statusText || "Failed to create medication";
        setCreateSaveError(errorMsg);
        if (Platform.OS !== 'web') {
          Alert.alert("Error", errorMsg);
        }
        setCreating(false);
        return;
      }

      if (!res.ok) {
        // Extract error message from response
        let errorMsg = "Failed to create medication";
        if (data) {
          if (data.message) {
            errorMsg = data.message;
          } else if (data.error) {
            errorMsg = data.error;
          } else if (typeof data === 'string') {
            errorMsg = data;
          }
        }
        
        setCreateSaveError(errorMsg);
        setCreating(false);
        
        // Scroll to top to show error
        if (createMedScrollViewRef.current) {
          createMedScrollViewRef.current.scrollTo({ y: 0, animated: true });
        }
        
        if (Platform.OS !== 'web') {
          Alert.alert("Error", errorMsg);
        }
        return;
      }

      // Success
      setCreating(false);
      setCreateValidationErrors({});
      setCreateSaveError(null);
      
      // Close modal and show success
      closeCreateMedModal();
      if (Platform.OS !== 'web') {
        Alert.alert("Success", "Medication created successfully!");
      }
    } catch (err: any) {
      console.error("Error creating medication:", err);
      const errorMsg = err.message || "Could not connect to server. Please check your connection and try again.";
      setCreateSaveError(errorMsg);
      
      // Scroll to top to show error
      if (createMedScrollViewRef.current) {
        createMedScrollViewRef.current.scrollTo({ y: 0, animated: true });
      }
      
      if (Platform.OS !== 'web') {
        Alert.alert("Error", errorMsg);
      }
      setCreating(false);
    }
  };

  /* -------------------------------------------------------
      MAIN UI
  ------------------------------------------------------- */
  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      <ProviderNavbar />
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-4 pt-6 pb-8">
          {/* Header */}
          <View 
            className="mb-8 rounded-3xl p-6 shadow-2xl"
            style={{ backgroundColor: '#2563eb' }}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <Text className="text-3xl font-bold text-white mb-2">
                  Assigned Patients
                </Text>
                <Text className="text-blue-100 text-base">
                  Manage and monitor your patient roster
                </Text>
              </View>
              <View className="bg-white/20 rounded-full p-4 backdrop-blur">
                <Ionicons name="people" size={32} color="#fff" />
              </View>
            </View>
          </View>

          {/* Assign Button */}
          <TouchableOpacity
            onPress={handleOpenAssignModal}
            activeOpacity={0.9}
            className="bg-green-500 px-6 py-4 rounded-xl shadow-lg flex-row items-center justify-center mb-6"
          >
            <Ionicons name="person-add" size={24} color="#fff" />
            <Text className="text-white font-bold text-lg ml-2">Assign New Patient</Text>
          </TouchableOpacity>

          {patients.length === 0 ? (
            <View className="bg-white dark:bg-gray-800 rounded-3xl p-12 items-center shadow-lg border border-gray-100 dark:border-gray-700">
              <View className="bg-gray-100 dark:bg-gray-700 rounded-full p-6 mb-4">
                <Ionicons name="people-outline" size={64} color="#9ca3af" />
              </View>
              <Text className="text-xl font-bold text-gray-800 dark:text-white mb-2 text-center">
                No Patients Assigned
              </Text>
              <Text className="text-gray-600 dark:text-gray-400 text-center mb-6">
                Start by assigning a patient to begin monitoring their adherence
              </Text>
              <TouchableOpacity
                onPress={handleOpenAssignModal}
                className="bg-blue-500 px-6 py-3 rounded-xl"
              >
                <Text className="text-white font-semibold">Assign Your First Patient</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              {patients.map((item) => (
                <View
                  key={item._id}
                  className="bg-white dark:bg-gray-800 rounded-3xl p-6 mb-4 shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden"
                >
                  <View className="absolute top-0 right-0 w-24 h-24 bg-blue-100 dark:bg-blue-900/20 rounded-full -mr-12 -mt-12 opacity-50" />
                  
                  {/* Patient Header */}
                  <View className="flex-row items-start justify-between mb-4 relative z-10">
                    <View className="flex-1">
                      <View className="flex-row items-center mb-2">
                        <View className="bg-blue-100 dark:bg-blue-900/30 rounded-full p-2 mr-3">
                          <Ionicons name="person-circle" size={24} color="#2563eb" />
                        </View>
                        <Text className="text-2xl font-bold text-gray-900 dark:text-white">
                          {item.name}
                        </Text>
                      </View>
                      
                      <View className="ml-12 flex-row items-center flex-wrap gap-x-4 gap-y-2">
                        <View className="flex-row items-center">
                          <Ionicons name="mail-outline" size={16} color="#6b7280" />
                          <Text className="text-gray-700 dark:text-gray-300 ml-2 text-sm">
                            {item.email}
                          </Text>
                        </View>
                        {(item as any).phoneNumber && (
                          <View className="flex-row items-center">
                            <Ionicons name="call-outline" size={16} color="#6b7280" />
                            <Text className="text-gray-700 dark:text-gray-300 ml-2 text-sm">
                              {(item as any).phoneNumber}
                            </Text>
                          </View>
                        )}
                        <View className="flex-row items-center">
                          <Ionicons name="calendar-outline" size={16} color="#6b7280" />
                          <Text className="text-gray-700 dark:text-gray-300 ml-2 text-sm">
                            {new Date(item.dateOfBirth).toLocaleDateString()} 
                            {` (Age: ${calculateAge(item.dateOfBirth)})`}
                          </Text>
                        </View>
                        <View className="flex-row items-center">
                          <Ionicons name="person-outline" size={16} color="#6b7280" />
                          <Text className="text-gray-700 dark:text-gray-300 ml-2 text-sm capitalize">
                            {item.gender}
                          </Text>
                        </View>
                        {(item as any).address && (
                          <View className="flex-row items-center">
                            <Ionicons name="location-outline" size={16} color="#6b7280" />
                            <Text className="text-gray-700 dark:text-gray-300 ml-2 text-sm">
                              {(() => {
                                const addr = (item as any).address;
                                if (!addr) return 'N/A';
                                const parts = [
                                  addr.streetAddress,
                                  addr.city,
                                  addr.state,
                                  addr.zipcode
                                ].filter(Boolean);
                                return parts.length > 0 ? parts.join(', ') : 'N/A';
                              })()}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                    
                    {/* Adherence Badge */}
                    <View
                      className={
                        item.adherence === 'N/A'
                          ? 'bg-gray-100 dark:bg-gray-700 px-4 py-2 rounded-full'
                          : parseFloat(String(item.adherence)) >= 80
                          ? 'bg-green-100 dark:bg-green-900/30 px-4 py-2 rounded-full'
                          : parseFloat(String(item.adherence)) >= 60
                          ? 'bg-yellow-100 dark:bg-yellow-900/30 px-4 py-2 rounded-full'
                          : 'bg-red-100 dark:bg-red-900/30 px-4 py-2 rounded-full'
                      }
                    >
                      <Text
                        className={
                          item.adherence === 'N/A'
                            ? 'text-gray-700 dark:text-gray-300 font-bold text-sm'
                            : parseFloat(String(item.adherence)) >= 80
                            ? 'text-green-700 dark:text-green-300 font-bold text-sm'
                            : parseFloat(String(item.adherence)) >= 60
                            ? 'text-yellow-700 dark:text-yellow-300 font-bold text-sm'
                            : 'text-red-700 dark:text-red-300 font-bold text-sm'
                        }
                      >
                        {item.adherence === 'N/A' ? 'N/A' : `${item.adherence}%`}
                      </Text>
                    </View>
                  </View>

                  {/* Action Buttons */}
                  <View className="flex-row flex-wrap gap-2 mt-4 relative z-10">
                    <TouchableOpacity
                      onPress={() =>
                        router.push({
                          pathname: '/(provider)/ViewReports',
                          params: { patientId: item._id },
                        })
                      }
                      activeOpacity={0.8}
                      className="bg-green-500 px-4 py-2.5 rounded-xl flex-row items-center flex-1 min-w-[140px]"
                    >
                      <Ionicons name="bar-chart" size={16} color="#fff" />
                      <Text className="text-white text-sm font-semibold ml-2">Reports</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() =>
                        router.push({
                          pathname: '/(provider)/ViewMedications',
                          params: { patientId: item._id },
                        })
                      }
                      activeOpacity={0.8}
                      className="bg-blue-500 px-4 py-2.5 rounded-xl flex-row items-center flex-1 min-w-[140px]"
                    >
                      <Ionicons name="medical" size={16} color="#fff" />
                      <Text className="text-white text-sm font-semibold ml-2">Medications</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => openCreateMedModal(item._id)}
                      activeOpacity={0.8}
                      className="bg-purple-500 px-4 py-2.5 rounded-xl flex-row items-center flex-1 min-w-[140px]"
                    >
                      <Ionicons name="add-circle" size={16} color="#fff" />
                      <Text className="text-white text-sm font-semibold ml-2">Add Med</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => unassignPatient(item._id, item.name)}
                      activeOpacity={0.8}
                      className="bg-red-500 px-4 py-2.5 rounded-xl flex-row items-center flex-1 min-w-[140px]"
                    >
                      <Ionicons name="person-remove" size={16} color="#fff" />
                      <Text className="text-white text-sm font-semibold ml-2">Unassign</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* BACK BUTTON */}
          <TouchableOpacity
            onPress={() => router.push('/(provider)/ProviderHome')}
            activeOpacity={0.8}
            className="bg-blue-500 px-6 py-4 rounded-xl shadow-lg flex-row items-center justify-center mt-6"
          >
            <Ionicons name="arrow-back" size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text className="text-white text-lg font-semibold">
              Back to Provider Home
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ASSIGN PATIENT MODAL */}
      <Modal
        visible={assignModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAssignModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/60">
          <View 
            className="bg-white dark:bg-gray-800 rounded-t-3xl p-6 shadow-2xl" 
            style={Platform.OS === 'web' ? {
              height: '90%',
              maxHeight: '90%',
              maxWidth: 600,
              width: '100%',
              alignSelf: 'center',
            } : {
              height: '85%',
              maxHeight: '90%',
            }}
          >
            <View className="flex-row justify-between items-center mb-6 pb-4 border-b-2 border-gray-200 dark:border-gray-700">
              <View className="flex-row items-center">
                <View className="bg-green-100 dark:bg-green-900/30 rounded-xl p-2 mr-3">
                  <Ionicons name="person-add" size={24} color="#10b981" />
                </View>
                <Text className="text-2xl font-bold text-gray-800 dark:text-white">
                  Assign Patient
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setAssignModalVisible(false);
                  setSearchQuery('');
                }}
                className="bg-gray-100 dark:bg-gray-700 rounded-full p-2"
              >
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <View className="flex-1">
              <Text className="text-gray-700 dark:text-gray-300 font-semibold mb-2">
                Search Patients
              </Text>
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search by name or email..."
                placeholderTextColor="#aaa"
                className="bg-white dark:bg-gray-700 rounded-xl px-4 py-3 mb-4 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
              />
              <ScrollView className="flex-1">
                {filteredAvailablePatients.length === 0 ? (
                  <Text className="text-gray-600 dark:text-gray-400 text-center py-8">
                    {searchQuery ? 'No patients found' : 'No available patients'}
                  </Text>
                ) : (
                  filteredAvailablePatients.map((patient) => (
                    <TouchableOpacity
                      key={patient._id}
                      onPress={() => assignPatientById(patient._id)}
                      disabled={assigning || patient.isAssigned}
                      className={`p-4 rounded-xl mb-2 border-2 ${
                        patient.isAssigned
                          ? 'bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600 opacity-60'
                          : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      <Text className="text-gray-900 dark:text-white font-bold text-base">
                        {patient.firstName} {patient.lastName}
                      </Text>
                      <Text className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                        {patient.email}
                      </Text>
                      {patient.isAssigned && (
                        <Text className="text-blue-600 dark:text-blue-400 text-xs mt-2 font-semibold">
                          {patient.isAssignedToAnyProvider && !patient.isAssigned
                            ? `⚠️ Assigned to ${patient.assignedProvider?.firstName} ${patient.assignedProvider?.lastName}`
                            : '✓ Already assigned to you'}
                        </Text>
                      )}
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>

      {/* UNASSIGN CONFIRMATION MODAL (for web) */}
      <Modal
        visible={unassignModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setUnassignModalVisible(false);
          setPatientToUnassign(null);
        }}
      >
        <View className="flex-1 justify-center items-center bg-black/60">
          <View 
            className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-2xl mx-4 w-full"
            style={Platform.OS === 'web' ? {
              maxWidth: 500,
              width: '100%'
            } : undefined}
          >
            <View className="flex-row items-center mb-4">
              <View className="bg-red-100 dark:bg-red-900/30 rounded-xl p-2 mr-3">
                <Ionicons name="warning" size={24} color="#dc2626" />
              </View>
              <Text className="text-2xl font-bold text-gray-800 dark:text-white">
                Confirm Unassign
              </Text>
            </View>
            
            <Text className="text-gray-700 dark:text-gray-300 text-base mb-6">
              Are you sure you want to unassign {patientToUnassign?.name}? This action cannot be undone.
            </Text>

            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => {
                  setUnassignModalVisible(false);
                  setPatientToUnassign(null);
                }}
                disabled={unassigning}
                className="flex-1 bg-gray-200 dark:bg-gray-700 px-4 py-3 rounded-xl"
              >
                <Text className="text-gray-800 dark:text-white font-semibold text-center">
                  Cancel
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={() => {
                  if (patientToUnassign) {
                    handleUnassignConfirm(patientToUnassign.id);
                  }
                }}
                disabled={unassigning}
                className="flex-1 bg-red-500 px-4 py-3 rounded-xl"
              >
                {unassigning ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text className="text-white font-semibold text-center">
                    Unassign
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* CREATE MEDICATION MODAL */}
      <Modal
        visible={createMedModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={closeCreateMedModal}
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
              onPress={closeCreateMedModal}
            />
            <View
              className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl"
              style={{
                maxHeight: '90%',
                maxWidth: 800,
                width: '90%'
              }}
              onStartShouldSetResponder={() => true}
            >
              <View className="flex-row justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
                <Text className="text-2xl font-bold text-gray-800 dark:text-white">
                  Create Medication
                </Text>
                <TouchableOpacity
                  onPress={closeCreateMedModal}
                  className="bg-gray-200 dark:bg-gray-700 px-4 py-2 rounded-xl"
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text className="text-gray-800 dark:text-white font-semibold">
                    Close
                  </Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                ref={createMedScrollViewRef}
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
                {/* Error Banner */}
                {createSaveError && (
                  <View className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                    <View className="flex-row items-start">
                      <Ionicons name="alert-circle" size={20} color="#ef4444" style={{ marginRight: 8, marginTop: 2 }} />
                      <Text className="text-red-700 dark:text-red-400 flex-1 text-sm font-medium">
                        {createSaveError}
                      </Text>
                      <TouchableOpacity onPress={() => setCreateSaveError(null)}>
                        <Ionicons name="close" size={18} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Validation Errors Banner */}
                {Object.keys(createValidationErrors).length > 0 && (
                  <View className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                    <View className="flex-row items-start">
                      <Ionicons name="alert-circle" size={20} color="#ef4444" style={{ marginRight: 8, marginTop: 2 }} />
                      <View className="flex-1">
                        <Text className="text-red-700 dark:text-red-400 text-sm font-semibold mb-1">
                          Please fix the following errors:
                        </Text>
                        {Object.entries(createValidationErrors).map(([field, message]) => (
                          <Text key={field} className="text-red-600 dark:text-red-400 text-sm">
                            • {message}
                          </Text>
                        ))}
                      </View>
                      <TouchableOpacity onPress={() => setCreateValidationErrors({})}>
                        <Ionicons name="close" size={18} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                <View className="bg-gray-100 dark:bg-gray-800 p-5 rounded-2xl shadow">
                  <Text className="text-gray-700 dark:text-gray-300 font-semibold mt-2">
                    Name <Text className="text-red-500">*</Text>
                  </Text>
                  <TextInput
                    value={createName}
                    onChangeText={(text) => {
                      setCreateName(text);
                      if (createValidationErrors.name) {
                        setCreateValidationErrors({ ...createValidationErrors, name: '' });
                      }
                      if (createSaveError) setCreateSaveError(null);
                    }}
                    className={`bg-white dark:bg-gray-700 rounded-xl mt-1 px-4 py-3 text-gray-900 dark:text-white border ${
                      createValidationErrors.name 
                        ? 'border-red-500 dark:border-red-500' 
                        : 'border-gray-200 dark:border-gray-600'
                    }`}
                    placeholder="Medication Name"
                    placeholderTextColor="#aaa"
                  />
                  {createValidationErrors.name && (
                    <Text className="text-red-500 text-xs mt-1 ml-1">
                      {createValidationErrors.name}
                    </Text>
                  )}

                  <Text className="text-gray-700 dark:text-gray-300 font-semibold mt-4">
                    Dosage <Text className="text-red-500">*</Text>
                  </Text>
                  <TextInput
                    value={createDosage}
                    onChangeText={(text) => {
                      setCreateDosage(text);
                      if (createValidationErrors.dosage) {
                        setCreateValidationErrors({ ...createValidationErrors, dosage: '' });
                      }
                      if (createSaveError) setCreateSaveError(null);
                    }}
                    className={`bg-white dark:bg-gray-700 rounded-xl mt-1 px-4 py-3 text-gray-900 dark:text-white border ${
                      createValidationErrors.dosage 
                        ? 'border-red-500 dark:border-red-500' 
                        : 'border-gray-200 dark:border-gray-600'
                    }`}
                    placeholder="e.g. 500mg"
                    placeholderTextColor="#aaa"
                  />
                  {createValidationErrors.dosage && (
                    <Text className="text-red-500 text-xs mt-1 ml-1">
                      {createValidationErrors.dosage}
                    </Text>
                  )}

                  <Text className="text-gray-700 dark:text-gray-300 font-semibold mt-4">
                    Frequency (tap to select)
                  </Text>
                  <View className="flex-row flex-wrap mt-1">
                    {FREQUENCY_OPTIONS.map((opt) => (
                      <TouchableOpacity
                        key={opt.value}
                        onPress={() => setCreateFrequency(opt.value)}
                        className={`px-4 py-3 mr-2 mb-2 rounded-full border ${
                          createFrequency === opt.value
                            ? "bg-blue-600 border-blue-700"
                            : "bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                        }`}
                        activeOpacity={0.7}
                        hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
                      >
                        <Text
                          className={`text-sm font-semibold ${
                            createFrequency === opt.value
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
                    value={createScheduleText}
                    onChangeText={(text) => {
                      setCreateScheduleText(text);
                      if (createValidationErrors.schedule) {
                        setCreateValidationErrors({ ...createValidationErrors, schedule: '' });
                      }
                      if (createSaveError) setCreateSaveError(null);
                    }}
                    className={`bg-white dark:bg-gray-700 rounded-xl mt-1 px-4 py-3 text-gray-900 dark:text-white border ${
                      createValidationErrors.schedule 
                        ? 'border-red-500 dark:border-red-500' 
                        : 'border-gray-200 dark:border-gray-600'
                    }`}
                    placeholder="e.g. 08:00, 20:00"
                    placeholderTextColor="#aaa"
                  />
                  {createValidationErrors.schedule && (
                    <Text className="text-red-500 text-xs mt-1 ml-1">
                      {createValidationErrors.schedule}
                    </Text>
                  )}

                  <Text className="text-gray-700 dark:text-gray-300 font-semibold mt-4">
                    Start Date <Text className="text-red-500">*</Text>
                  </Text>
                  <input
                    type="date"
                    value={createStartDate}
                    onChange={(e) => {
                      setCreateStartDate(e.target.value);
                      if (createValidationErrors.startDate) {
                        setCreateValidationErrors({ ...createValidationErrors, startDate: '' });
                      }
                      if (createSaveError) setCreateSaveError(null);
                    }}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '12px',
                      border: createValidationErrors.startDate 
                        ? '2px solid #ef4444' 
                        : '2px solid #e5e7eb',
                      fontSize: '16px',
                      backgroundColor: '#fff',
                      color: '#111827',
                      marginTop: '8px',
                    }}
                    className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                  {createValidationErrors.startDate && (
                    <Text className="text-red-500 text-xs mt-1 ml-1">
                      {createValidationErrors.startDate}
                    </Text>
                  )}

                  <Text className="text-gray-700 dark:text-gray-300 font-semibold mt-4">End Date</Text>
                  <input
                    type="date"
                    value={createEndDate}
                    onChange={(e) => {
                      setCreateEndDate(e.target.value);
                      if (createValidationErrors.endDate) {
                        setCreateValidationErrors({ ...createValidationErrors, endDate: '' });
                      }
                      if (createSaveError) setCreateSaveError(null);
                    }}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '12px',
                      border: createValidationErrors.endDate 
                        ? '2px solid #ef4444' 
                        : '2px solid #e5e7eb',
                      fontSize: '16px',
                      backgroundColor: '#fff',
                      color: '#111827',
                      marginTop: '8px',
                    }}
                    className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                  {createValidationErrors.endDate && (
                    <Text className="text-red-500 text-xs mt-1 ml-1">
                      {createValidationErrors.endDate}
                    </Text>
                  )}

                  <Text className="text-gray-700 dark:text-gray-300 font-semibold mt-4">Instructions</Text>
                  <TextInput
                    value={createInstructions}
                    onChangeText={setCreateInstructions}
                    multiline
                    className="bg-white dark:bg-gray-700 rounded-xl mt-1 px-4 py-3 h-24 text-gray-900 dark:text-white"
                    placeholder="Additional instructions"
                    placeholderTextColor="#aaa"
                  />
                </View>
              </ScrollView>

              {/* Action Button - Outside ScrollView for better touch handling */}
              <View 
                className="p-4 border-t border-gray-200 dark:border-gray-700"
                onStartShouldSetResponder={() => true}
              >
                <TouchableOpacity
                  onPress={() => {
                    console.log('Create Medication button pressed (web)');
                    handleCreateMedication();
                  }}
                  disabled={creating || !createName || !createDosage || !createStartDate}
                  className={`px-6 py-4 rounded-xl ${
                    creating || !createName || !createDosage || !createStartDate
                      ? "bg-blue-300 opacity-50" 
                      : "bg-blue-600"
                  }`}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text className="text-white text-lg font-semibold text-center">
                    {creating ? "Creating..." : "Create Medication"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : (
          <Pressable 
            className="flex-1 justify-end bg-black/50"
            onPress={closeCreateMedModal}
          >
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={{ flex: 1, justifyContent: 'flex-end' }}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >
              <View 
                className="bg-white dark:bg-gray-800 rounded-t-3xl"
                style={{ 
                  height: '85%',
                  maxHeight: '90%',
                }}
                onStartShouldSetResponder={() => true}
                onStartShouldSetResponderCapture={() => false}
                onMoveShouldSetResponder={() => true}
              >
                <View className="flex-row justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
                  <Text className="text-2xl font-bold text-gray-800 dark:text-white">
                    Create Medication
                  </Text>
                  <TouchableOpacity
                    onPress={closeCreateMedModal}
                    className="bg-gray-200 dark:bg-gray-700 px-4 py-2 rounded-xl"
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Text className="text-gray-800 dark:text-white font-semibold">
                      Close
                    </Text>
                  </TouchableOpacity>
                </View>

                <ScrollView
                  ref={createMedScrollViewRef}
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
                  {/* Error Banner */}
                  {createSaveError && (
                    <View className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                      <View className="flex-row items-start">
                        <Ionicons name="alert-circle" size={20} color="#ef4444" style={{ marginRight: 8, marginTop: 2 }} />
                        <Text className="text-red-700 dark:text-red-400 flex-1 text-sm font-medium">
                          {createSaveError}
                        </Text>
                        <TouchableOpacity onPress={() => setCreateSaveError(null)}>
                          <Ionicons name="close" size={18} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  {/* Validation Errors Banner */}
                  {Object.keys(createValidationErrors).length > 0 && (
                    <View className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                      <View className="flex-row items-start">
                        <Ionicons name="alert-circle" size={20} color="#ef4444" style={{ marginRight: 8, marginTop: 2 }} />
                        <View className="flex-1">
                          <Text className="text-red-700 dark:text-red-400 text-sm font-semibold mb-1">
                            Please fix the following errors:
                          </Text>
                          {Object.entries(createValidationErrors).map(([field, message]) => (
                            <Text key={field} className="text-red-600 dark:text-red-400 text-sm">
                              • {message}
                            </Text>
                          ))}
                        </View>
                        <TouchableOpacity onPress={() => setCreateValidationErrors({})}>
                          <Ionicons name="close" size={18} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  <View className="bg-gray-100 dark:bg-gray-800 p-5 rounded-2xl shadow">
                    <Text className="text-gray-700 dark:text-gray-300 font-semibold mt-2">
                      Name <Text className="text-red-500">*</Text>
                    </Text>
                    <TextInput
                      value={createName}
                      onChangeText={(text) => {
                        setCreateName(text);
                        if (createValidationErrors.name) {
                          setCreateValidationErrors({ ...createValidationErrors, name: '' });
                        }
                        if (createSaveError) setCreateSaveError(null);
                      }}
                      className={`bg-white dark:bg-gray-700 rounded-xl mt-1 px-4 py-3 text-gray-900 dark:text-white border ${
                        createValidationErrors.name 
                          ? 'border-red-500 dark:border-red-500' 
                          : 'border-gray-200 dark:border-gray-600'
                      }`}
                      placeholder="Medication Name"
                      placeholderTextColor="#aaa"
                    />
                    {createValidationErrors.name && (
                      <Text className="text-red-500 text-xs mt-1 ml-1">
                        {createValidationErrors.name}
                      </Text>
                    )}

                    <Text className="text-gray-700 dark:text-gray-300 font-semibold mt-4">
                      Dosage <Text className="text-red-500">*</Text>
                    </Text>
                    <TextInput
                      value={createDosage}
                      onChangeText={(text) => {
                        setCreateDosage(text);
                        if (createValidationErrors.dosage) {
                          setCreateValidationErrors({ ...createValidationErrors, dosage: '' });
                        }
                        if (createSaveError) setCreateSaveError(null);
                      }}
                      className={`bg-white dark:bg-gray-700 rounded-xl mt-1 px-4 py-3 text-gray-900 dark:text-white border ${
                        createValidationErrors.dosage 
                          ? 'border-red-500 dark:border-red-500' 
                          : 'border-gray-200 dark:border-gray-600'
                      }`}
                      placeholder="e.g. 500mg"
                      placeholderTextColor="#aaa"
                    />
                    {createValidationErrors.dosage && (
                      <Text className="text-red-500 text-xs mt-1 ml-1">
                        {createValidationErrors.dosage}
                      </Text>
                    )}

                    <Text className="text-gray-700 dark:text-gray-300 font-semibold mt-4">
                      Frequency (tap to select)
                    </Text>
                    <View className="flex-row flex-wrap mt-2">
                      {FREQUENCY_OPTIONS.map((opt) => (
                        <TouchableOpacity
                          key={opt.value}
                          onPress={() => setCreateFrequency(opt.value)}
                          className={`px-3 py-2 rounded-xl mr-2 mb-2 ${
                            createFrequency === opt.value ? 'bg-blue-500' : 'bg-gray-200 dark:bg-gray-700'
                          }`}
                        >
                          <Text className={createFrequency === opt.value ? 'text-white' : 'text-gray-800 dark:text-white'}>
                            {opt.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* Schedule */}
                    <Text className="text-gray-700 dark:text-gray-300 font-semibold mt-4">Schedule (time per line)</Text>
                    <TextInput
                      value={createScheduleText}
                      onChangeText={(text) => {
                        setCreateScheduleText(text);
                        if (createValidationErrors.schedule) {
                          setCreateValidationErrors({ ...createValidationErrors, schedule: '' });
                        }
                        if (createSaveError) setCreateSaveError(null);
                      }}
                      multiline
                      numberOfLines={3}
                      className={`bg-white dark:bg-gray-700 rounded-xl mt-1 px-4 py-3 text-gray-900 dark:text-white border ${
                        createValidationErrors.schedule 
                          ? 'border-red-500 dark:border-red-500' 
                          : 'border-gray-200 dark:border-gray-600'
                      }`}
                      placeholder="e.g.\n08:00 AM\n08:00 PM"
                      placeholderTextColor="#aaa"
                    />
                    {createValidationErrors.schedule && (
                      <Text className="text-red-500 text-xs mt-1 ml-1">
                        {createValidationErrors.schedule}
                      </Text>
                    )}

                    {/* Instructions */}
                    <Text className="text-gray-700 dark:text-gray-300 font-semibold mt-4">Instructions</Text>
                    <TextInput
                      value={createInstructions}
                      onChangeText={setCreateInstructions}
                      multiline
                      numberOfLines={3}
                      className="bg-white dark:bg-gray-700 rounded-xl mt-1 px-4 py-3 text-gray-900 dark:text-white"
                      placeholder="Any special instructions"
                      placeholderTextColor="#aaa"
                    />

                    {/* Start/End Dates */}
                    <View className="mt-4">
                      <Text className="text-gray-700 dark:text-gray-300 font-semibold">
                        Start Date <Text className="text-red-500">*</Text>
                      </Text>
                      <TouchableOpacity
                        onPress={() => setShowCreateStartPicker(true)}
                        className={`bg-white dark:bg-gray-700 rounded-xl mt-1 px-4 py-3 border ${
                          createValidationErrors.startDate 
                            ? 'border-red-500 dark:border-red-500' 
                            : 'border-gray-200 dark:border-gray-600'
                        }`}
                      >
                        <Text className="text-gray-900 dark:text-white">
                          {createStartDate ? new Date(createStartDate).toLocaleDateString() : 'Select start date'}
                        </Text>
                      </TouchableOpacity>
                      {createValidationErrors.startDate && (
                        <Text className="text-red-500 text-xs mt-1 ml-1">
                          {createValidationErrors.startDate}
                        </Text>
                      )}
                      {showCreateStartPicker && (
                        <View>
                          {Platform.OS === 'ios' && (
                            <View className="flex-row justify-end gap-2 mt-2 mb-2">
                              <TouchableOpacity
                                onPress={() => setShowCreateStartPicker(false)}
                                className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700"
                              >
                                <Text className="text-gray-700 dark:text-gray-300 font-semibold">Cancel</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                onPress={() => {
                                  setShowCreateStartPicker(false);
                                  if (createValidationErrors.startDate && createStartDate) {
                                    setCreateValidationErrors({ ...createValidationErrors, startDate: '' });
                                  }
                                }}
                                className="px-4 py-2 rounded-lg bg-blue-600"
                              >
                                <Text className="text-white font-semibold">Done</Text>
                              </TouchableOpacity>
                            </View>
                          )}
                          <DateTimePicker
                            value={createStartDate ? new Date(createStartDate) : new Date()}
                            mode="date"
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            onChange={(event, date) => {
                              if (Platform.OS === 'android') {
                                setShowCreateStartPicker(false);
                              }
                              if (date) {
                                setCreateStartDate(date.toISOString().split('T')[0]);
                                if (createValidationErrors.startDate) {
                                  setCreateValidationErrors({ ...createValidationErrors, startDate: '' });
                                }
                              }
                            }}
                          />
                        </View>
                      )}
                    </View>

                    <View className="mt-4">
                      <Text className="text-gray-700 dark:text-gray-300 font-semibold">End Date</Text>
                      <TouchableOpacity
                        onPress={() => setShowCreateEndPicker(true)}
                        className={`bg-white dark:bg-gray-700 rounded-xl mt-1 px-4 py-3 border ${
                          createValidationErrors.endDate 
                            ? 'border-red-500 dark:border-red-500' 
                            : 'border-gray-200 dark:border-gray-600'
                        }`}
                      >
                        <Text className="text-gray-900 dark:text-white">
                          {createEndDate ? new Date(createEndDate).toLocaleDateString() : 'Select end date (optional)'}
                        </Text>
                      </TouchableOpacity>
                      {createValidationErrors.endDate && (
                        <Text className="text-red-500 text-xs mt-1 ml-1">
                          {createValidationErrors.endDate}
                        </Text>
                      )}
                      {showCreateEndPicker && (
                        <View>
                          {Platform.OS === 'ios' && (
                            <View className="flex-row justify-end gap-2 mt-2 mb-2">
                              <TouchableOpacity
                                onPress={() => setShowCreateEndPicker(false)}
                                className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700"
                              >
                                <Text className="text-gray-700 dark:text-gray-300 font-semibold">Cancel</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                onPress={() => {
                                  setShowCreateEndPicker(false);
                                  if (createValidationErrors.endDate && createEndDate) {
                                    setCreateValidationErrors({ ...createValidationErrors, endDate: '' });
                                  }
                                }}
                                className="px-4 py-2 rounded-lg bg-blue-600"
                              >
                                <Text className="text-white font-semibold">Done</Text>
                              </TouchableOpacity>
                            </View>
                          )}
                          <DateTimePicker
                            value={createEndDate ? new Date(createEndDate) : new Date()}
                            mode="date"
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            onChange={(event, date) => {
                              if (Platform.OS === 'android') {
                                setShowCreateEndPicker(false);
                              }
                              if (date) {
                                setCreateEndDate(date.toISOString().split('T')[0]);
                                if (createValidationErrors.endDate) {
                                  setCreateValidationErrors({ ...createValidationErrors, endDate: '' });
                                }
                              }
                            }}
                          />
                        </View>
                      )}
                    </View>
                  </View>
                </ScrollView>

                {/* Action Buttons - Outside ScrollView for better touch handling */}
                <View 
                  className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                  onStartShouldSetResponder={() => true}
                >
                  <View className="flex-row gap-3">
                    <TouchableOpacity
                      onPress={() => {
                        console.log('Create Medication button pressed');
                        handleCreateMedication();
                      }}
                      disabled={creating || !createName || !createDosage || !createStartDate}
                      className={`flex-1 px-6 py-4 rounded-xl ${
                        creating || !createName || !createDosage || !createStartDate
                          ? 'bg-blue-300 opacity-50' 
                          : 'bg-blue-600'
                      }`}
                      activeOpacity={0.7}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Text className="text-white text-lg font-semibold text-center">
                        {creating ? 'Creating...' : 'Create Medication'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={closeCreateMedModal}
                      className="bg-gray-500 px-6 py-4 rounded-xl"
                      activeOpacity={0.7}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Text className="text-white text-lg font-semibold text-center">
                        Cancel
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </KeyboardAvoidingView>
          </Pressable>
        )}
      </Modal>

    </View>
  );
}
