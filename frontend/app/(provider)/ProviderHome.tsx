import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl, Modal, TextInput, Alert, Platform, Pressable, KeyboardAvoidingView } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import ProviderNavbar from '@/components/ProviderNavbar';
import { API_URL } from '@/utils/apiConfig';
import { Dropdown } from 'react-native-element-dropdown';

interface Provider {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  phoneNumber?: string;
  address?: {
    streetAddress: string;
    city: string;
    state: string;
    zipcode: string;
  };
}

interface ProviderStats {
  totalPatients: number;
  averageAdherence: number;
  totalMedications: number;
  recentLogs: number;
}

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'AS', 'CA', 'CO', 'CT', 'DE', 'DC', 'FL', 'GA',
  'GU', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA',
  'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC',
  'ND', 'MP', 'OH', 'OK', 'OR', 'PA', 'PR', 'RI', 'SC', 'SD', 'TN', 'TX',
  'TT', 'UT', 'VT', 'VA', 'VI', 'WA', 'WV', 'WI', 'WY', 'Other'
];

export default function ProviderHome() {
  const [provider, setProvider] = useState<Provider | null>(null);
  const [stats, setStats] = useState<ProviderStats | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipcode, setZipcode] = useState('');
  const [isFocusState, setIsFocusState] = useState(false);

  useEffect(() => {
    const loadToken = async () => {
      const storedToken = await AsyncStorage.getItem('token');
      setToken(storedToken);
    };
    loadToken();
  }, []);

  const fetchProvider = async () => {
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        return;
      }

      const data = await res.json();

      const normalized: Provider = {
        firstName: data.firstName ?? "",
        lastName: data.lastName ?? "",
        email: data.email ?? "",
        role: data.role ?? "provider",
        phoneNumber: data.phoneNumber ?? "",
        address: data.address || undefined,
      };

      setProvider(normalized);
    } catch (err) {
      console.error('Error fetching provider:', err);
    }
  };

  const fetchStats = async () => {
    if (!token) return;

    try {
      setError(null);
      
      // Fetch patients
      const patientsRes = await fetch(`${API_URL}/api/provider/patients`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const patientsData = await patientsRes.json();
      
      if (!patientsRes.ok) {
        setError(patientsData.message || 'Failed to fetch statistics');
        return;
      }

      const patients = patientsData.patients || [];
      const totalPatients = patients.length;

      // Calculate average adherence
      let totalAdherence = 0;
      let adherenceCount = 0;
      patients.forEach((p: any) => {
        if (p.adherence !== 'N/A' && typeof p.adherence === 'number') {
          totalAdherence += p.adherence;
          adherenceCount++;
        } else if (typeof p.adherence === 'string' && p.adherence !== 'N/A') {
          const num = parseFloat(p.adherence);
          if (!isNaN(num)) {
            totalAdherence += num;
            adherenceCount++;
          }
        }
      });
      const averageAdherence = adherenceCount > 0 ? Math.round(totalAdherence / adherenceCount) : 0;

      // Fetch medications count for all patients
      let totalMedications = 0;
      const medicationPromises = patients.map(async (p: any) => {
        try {
          const medRes = await fetch(`${API_URL}/api/medications?patientId=${p._id}`, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });
          const medData = await medRes.json();
          return Array.isArray(medData) ? medData.length : 0;
        } catch {
          return 0;
        }
      });
      const medicationCounts = await Promise.all(medicationPromises);
      totalMedications = medicationCounts.reduce((sum, count) => sum + count, 0);

      // Fetch recent adherence logs (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      let recentLogs = 0;
      
      try {
        const logsPromises = patients.map(async (p: any) => {
          try {
            const logsRes = await fetch(
              `${API_URL}/api/adherence?patientId=${p._id}&startDate=${sevenDaysAgo.toISOString()}`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
              }
            );
            const logsData = await logsRes.json();
            return Array.isArray(logsData) ? logsData.length : 0;
          } catch {
            return 0;
          }
        });
        const logCounts = await Promise.all(logsPromises);
        recentLogs = logCounts.reduce((sum, count) => sum + count, 0);
      } catch {
        recentLogs = 0;
      }

      setStats({
        totalPatients,
        averageAdherence,
        totalMedications,
        recentLogs,
      });
    } catch (err) {
      console.error('Error fetching stats:', err);
      setError('Unable to fetch statistics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchProvider();
      fetchStats();
    }
  }, [token]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProvider();
    fetchStats();
  };

  const handleOpenEditModal = () => {
    if (provider) {
      setPhoneNumber(provider.phoneNumber || '');
      setStreetAddress(provider.address?.streetAddress || '');
      setCity(provider.address?.city || '');
      setState(provider.address?.state || '');
      setZipcode(provider.address?.zipcode || '');
      setEditModalVisible(true);
    }
  };

  const handleSaveProviderInfo = async () => {
    // Validation
    if (phoneNumber && !/^\d{10}$/.test(phoneNumber)) {
      Alert.alert('Validation Error', 'Phone number must be exactly 10 digits.');
      return;
    }

    if (zipcode && !/^\d{5}$/.test(zipcode)) {
      Alert.alert('Validation Error', 'Zipcode must be exactly 5 digits.');
      return;
    }

    if (streetAddress || city || state || zipcode) {
      if (!streetAddress || !city || !state || !zipcode) {
        Alert.alert('Validation Error', 'All address fields are required if providing an address.');
        return;
      }
    }

    setSaving(true);
    try {
      if (!token) {
        Alert.alert('Error', 'Authentication token missing.');
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
        Alert.alert('Error', data.message || 'Failed to update provider information.');
      } else {
        Alert.alert('Success', 'Provider information updated successfully.');
        setEditModalVisible(false);
        fetchProvider(); // Refresh provider data
      }
    } catch (err) {
      console.error('Error updating provider:', err);
      Alert.alert('Error', 'Could not connect to server.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-gray-900">
        <ActivityIndicator size="large" color="#2563eb" />
        <Text className="mt-4 text-gray-700 dark:text-gray-300">
          Loading dashboard...
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      <ProviderNavbar />
      <ScrollView
        className="flex-1"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
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
                Provider Dashboard
              </Text>
              {provider ? (
                <Text className="text-blue-100 text-base">
                  Welcome, {provider.firstName} {provider.lastName}
                </Text>
              ) : (
                <Text className="text-blue-100 text-base">
                  System overview and patient management
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
              icon="people"
              title="View Patients"
              description="Manage assigned patients"
              onPress={() => router.push('/(provider)/ViewPatients')}
              color="#2563eb"
            />
            <ActionButton
              icon="bar-chart"
              title="View Reports"
              description="Adherence analytics"
              onPress={() => router.push('/(provider)/ViewReports' as any)}
              color="#10b981"
            />
          </View>
        </View>

        {/* Provider Info Card */}
        {provider && (
          <View className="bg-white dark:bg-gray-800 rounded-3xl p-6 mb-6 shadow-lg border border-gray-100 dark:border-gray-700">
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center">
                <View className="bg-blue-100 dark:bg-blue-900/30 rounded-xl p-3 mr-3">
                  <Ionicons name="person-circle" size={28} color="#2563eb" />
                </View>
                <Text className="text-xl font-bold text-gray-900 dark:text-white">
                  Provider Information
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
                  {provider.firstName} {provider.lastName}
                </Text>
              </View>
              <View className="flex-row items-center">
                <Ionicons name="mail-outline" size={18} color="#6b7280" />
                <Text className="text-gray-700 dark:text-gray-300 ml-2">
                  {provider.email}
                </Text>
              </View>
              {provider.phoneNumber && (
                <View className="flex-row items-center">
                  <Ionicons name="call-outline" size={18} color="#6b7280" />
                  <Text className="text-gray-700 dark:text-gray-300 ml-2">
                    {provider.phoneNumber}
                  </Text>
                </View>
              )}
              {provider.address && (
                <View className="flex-row items-start">
                  <Ionicons name="location-outline" size={18} color="#6b7280" style={{ marginTop: 2 }} />
                  <View className="ml-2 flex-1">
                    <Text className="text-gray-700 dark:text-gray-300">
                      {provider.address.streetAddress}
                    </Text>
                    <Text className="text-gray-700 dark:text-gray-300">
                      {provider.address.city}, {provider.address.state} {provider.address.zipcode}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Edit Provider Info Modal */}
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
                    Edit Provider Information
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
                  {/* Read-only Information */}
                  <View className="mb-4">
                    <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      Account Information
                    </Text>

                    <View className="mb-4">
                      <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Name
                      </Text>
                      <View className="bg-gray-100 dark:bg-gray-700 rounded-xl px-4 py-3 border border-gray-200 dark:border-gray-600">
                        <Text className="text-gray-900 dark:text-white">
                          {provider?.firstName} {provider?.lastName}
                        </Text>
                      </View>
                    </View>

                    <View className="mb-4">
                      <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Email
                      </Text>
                      <View className="bg-gray-100 dark:bg-gray-700 rounded-xl px-4 py-3 border border-gray-200 dark:border-gray-600">
                        <Text className="text-gray-900 dark:text-white">
                          {provider?.email}
                        </Text>
                      </View>
                    </View>

                    <View className="mb-4">
                      <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Role
                      </Text>
                      <View className="bg-gray-100 dark:bg-gray-700 rounded-xl px-4 py-3 border border-gray-200 dark:border-gray-600">
                        <Text className="text-gray-900 dark:text-white capitalize">
                          {provider?.role}
                        </Text>
                      </View>
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
                        onChangeText={setPhoneNumber}
                        keyboardType="phone-pad"
                        maxLength={10}
                        className="bg-gray-50 dark:bg-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600"
                        placeholder="10 digits"
                        placeholderTextColor="#9ca3af"
                      />
                    </View>
                  </View>

                  {/* Address Information */}
                  <View className="mb-4">
                    <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      Address
                    </Text>

                    <View className="mb-4">
                      <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Street Address
                      </Text>
                      <TextInput
                        value={streetAddress}
                        onChangeText={setStreetAddress}
                        className="bg-gray-50 dark:bg-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600"
                        placeholder="Street Address"
                        placeholderTextColor="#9ca3af"
                      />
                    </View>

                    <View className="mb-4">
                      <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        City
                      </Text>
                      <TextInput
                        value={city}
                        onChangeText={setCity}
                        className="bg-gray-50 dark:bg-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600"
                        placeholder="City"
                        placeholderTextColor="#9ca3af"
                      />
                    </View>

                    <View className="mb-4">
                      <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        State
                      </Text>
                      <View style={{ zIndex: 1000, elevation: 10 }}>
                        <Dropdown
                          data={US_STATES.map((s) => ({ label: s, value: s }))}
                          labelField="label"
                          valueField="value"
                          placeholder="Select State"
                          value={state}
                          onChange={(item) => setState(item.value)}
                          style={{
                            backgroundColor: '#f9fafb',
                            borderRadius: 12,
                            paddingHorizontal: 16,
                            paddingVertical: 12,
                            borderWidth: 1,
                            borderColor: '#e5e7eb',
                            minHeight: 50,
                          }}
                          placeholderStyle={{
                            color: '#9ca3af',
                            fontSize: 16,
                          }}
                          selectedTextStyle={{
                            color: '#111827',
                            fontSize: 16,
                          }}
                          itemTextStyle={{
                            color: '#111827',
                            fontSize: 16,
                          }}
                          containerStyle={{
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: '#e5e7eb',
                            maxHeight: 300,
                          }}
                          activeColor="#e0e7ff"
                          search
                          searchPlaceholder="Search states..."
                        />
                      </View>
                    </View>

                    <View className="mb-4">
                      <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Zipcode
                      </Text>
                      <TextInput
                        value={zipcode}
                        onChangeText={setZipcode}
                        keyboardType="number-pad"
                        maxLength={5}
                        className="bg-gray-50 dark:bg-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600"
                        placeholder="5 digits"
                        placeholderTextColor="#9ca3af"
                      />
                    </View>
                  </View>

                  {/* Action Buttons */}
                  <View className="gap-3 pb-4">
                    <TouchableOpacity
                      onPress={handleSaveProviderInfo}
                      disabled={saving}
                      className={`bg-blue-500 px-6 py-4 rounded-xl ${
                        saving ? 'opacity-50' : ''
                      }`}
                      activeOpacity={0.7}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
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
                      Edit Provider Information
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
                    {/* Read-only Information */}
                    <View className="mb-4">
                      <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        Account Information
                      </Text>

                      <View className="mb-4">
                        <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Name
                        </Text>
                        <View className="bg-gray-100 dark:bg-gray-700 rounded-xl px-4 py-3 border border-gray-200 dark:border-gray-600">
                          <Text className="text-gray-900 dark:text-white">
                            {provider?.firstName} {provider?.lastName}
                          </Text>
                        </View>
                      </View>

                      <View className="mb-4">
                        <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Email
                        </Text>
                        <View className="bg-gray-100 dark:bg-gray-700 rounded-xl px-4 py-3 border border-gray-200 dark:border-gray-600">
                          <Text className="text-gray-900 dark:text-white">
                            {provider?.email}
                          </Text>
                        </View>
                      </View>

                      <View className="mb-4">
                        <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Role
                        </Text>
                        <View className="bg-gray-100 dark:bg-gray-700 rounded-xl px-4 py-3 border border-gray-200 dark:border-gray-600">
                          <Text className="text-gray-900 dark:text-white capitalize">
                            {provider?.role}
                          </Text>
                        </View>
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
                          onChangeText={setPhoneNumber}
                          keyboardType="phone-pad"
                          maxLength={10}
                          className="bg-gray-50 dark:bg-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600"
                          placeholder="10 digits"
                          placeholderTextColor="#9ca3af"
                        />
                      </View>
                    </View>

                    {/* Address Information */}
                    <View className="mb-4">
                      <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        Address
                      </Text>

                      <View className="mb-4">
                        <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Street Address
                        </Text>
                        <TextInput
                          value={streetAddress}
                          onChangeText={setStreetAddress}
                          className="bg-gray-50 dark:bg-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600"
                          placeholder="Street Address"
                          placeholderTextColor="#9ca3af"
                        />
                      </View>

                      <View className="mb-4">
                        <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          City
                        </Text>
                        <TextInput
                          value={city}
                          onChangeText={setCity}
                          className="bg-gray-50 dark:bg-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600"
                          placeholder="City"
                          placeholderTextColor="#9ca3af"
                        />
                      </View>

                      <View className="mb-4">
                        <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          State
                        </Text>
                        <View style={{ zIndex: 999, elevation: 9 }}>
                          <Dropdown
                            data={US_STATES.map((s) => ({ label: s, value: s }))}
                            labelField="label"
                            valueField="value"
                            placeholder="Select State"
                            value={state}
                            onChange={(item) => setState(item.value)}
                            style={{
                              backgroundColor: '#f9fafb',
                              borderRadius: 12,
                              paddingHorizontal: 16,
                              paddingVertical: 12,
                              borderWidth: 1,
                              borderColor: '#e5e7eb',
                              minHeight: 50,
                            }}
                            placeholderStyle={{
                              color: '#9ca3af',
                              fontSize: 16,
                            }}
                            selectedTextStyle={{
                              color: '#111827',
                              fontSize: 16,
                            }}
                            itemTextStyle={{
                              color: '#111827',
                              fontSize: 16,
                            }}
                            containerStyle={{
                              borderRadius: 12,
                              borderWidth: 1,
                              borderColor: '#e5e7eb',
                              maxHeight: 300,
                            }}
                            activeColor="#e0e7ff"
                            search
                            searchPlaceholder="Search states..."
                          />
                        </View>
                      </View>

                      <View className="mb-4">
                        <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Zipcode
                        </Text>
                        <TextInput
                          value={zipcode}
                          onChangeText={setZipcode}
                          keyboardType="number-pad"
                          maxLength={5}
                          className="bg-gray-50 dark:bg-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600"
                          placeholder="5 digits"
                          placeholderTextColor="#9ca3af"
                        />
                      </View>
                    </View>

                    {/* Action Buttons */}
                    <View className="flex-row gap-3 mb-4">
                      <TouchableOpacity
                        onPress={handleSaveProviderInfo}
                        disabled={saving}
                        className={`flex-1 px-6 py-4 rounded-xl ${
                          saving ? 'bg-blue-300' : 'bg-blue-600'
                        }`}
                        activeOpacity={0.7}
                      >
                        <Text className="text-white text-lg font-semibold text-center">
                          {saving ? 'Saving...' : 'Save Changes'}
                        </Text>
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

        {/* Statistics */}
        {stats && (
          <View className="mb-6">
            <View className="flex-row items-center mb-5">
              <View className="h-1 w-12 bg-blue-500 rounded-full mr-3" />
              <Text className="text-xl font-bold text-gray-900 dark:text-white">
                Statistics
              </Text>
            </View>

            <View className="flex-row flex-wrap gap-4">
              <StatCard
                label="Total Patients"
                value={stats.totalPatients}
                color="#2563eb"
                icon="people-outline"
              />
              <StatCard
                label="Avg Adherence"
                value={`${stats.averageAdherence}%`}
                color={stats.averageAdherence >= 80 ? '#16a34a' : '#dc2626'}
                icon="trending-up-outline"
              />
              <StatCard
                label="Total Medications"
                value={stats.totalMedications}
                color="#059669"
                icon="medical-outline"
              />
              <StatCard
                label="Recent Logs (7d)"
                value={stats.recentLogs}
                color="#7c3aed"
                icon="document-text-outline"
              />
            </View>
          </View>
        )}

        {/* Error Message */}
        {error && (
          <View className="bg-red-100 dark:bg-red-900/40 border border-red-300 dark:border-red-700 rounded-2xl p-4 mb-6">
            <Text className="text-red-700 dark:text-red-300 font-semibold">
              {error}
            </Text>
          </View>
        )}
        </View>
      </ScrollView>
    </View>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  color: string;
  icon?: string;
}

function StatCard({ label, value, color, icon }: StatCardProps) {
  return (
    <View 
      className="rounded-2xl p-4 flex-1 min-w-[140px] shadow-md border dark:bg-gray-700 dark:border-gray-600"
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
