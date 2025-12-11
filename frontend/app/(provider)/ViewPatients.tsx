import React, { useEffect, useState } from 'react';
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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import ProviderNavbar from '@/components/ProviderNavbar';
import { API_URL } from '@/utils/apiConfig';

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
        Alert.alert('Error', data.message || 'Failed to assign patient');
      } else {
        Alert.alert('Success', data.message || 'Patient assigned successfully', [
          {
            text: 'OK',
            onPress: () => {
              setAssignModalVisible(false);
              setSearchQuery('');
              fetchPatients();
              fetchAvailablePatients();
            },
          },
        ]);
      }
    } catch (err) {
      Alert.alert('Error', 'Unable to connect to server');
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
                      onPress={() => {
                        try {
                          router.push({
                            pathname: '/(provider)/CreateMedication',
                            params: { patientId: item._id },
                          });
                        } catch (err) {
                          console.error('Navigation error:', err);
                          if (Platform.OS === 'web') {
                            window.location.href = `/(provider)/CreateMedication?patientId=${item._id}`;
                          } else {
                            Alert.alert('Error', 'Failed to navigate. Please try again.');
                          }
                        }
                      }}
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
            style={{ 
              height: Platform.OS === 'web' ? '90%' : '85%',
              maxHeight: '90%',
              ...(Platform.OS === 'web' && {
                maxWidth: '600px',
                width: '100%',
                alignSelf: 'center',
                marginHorizontal: 'auto'
              })
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
            style={{
              ...(Platform.OS === 'web' && {
                maxWidth: '500px',
                width: '100%'
              })
            }}
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

    </View>
  );
}
