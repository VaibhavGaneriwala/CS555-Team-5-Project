import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '@/utils/apiConfig';

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'admin' | 'patient' | 'provider';
  phoneNumber?: string;
  dateOfBirth?: string;
  gender?: string;
  address?: {
    streetAddress: string;
    city: string;
    state: string;
    zipcode: string;
  };
  isActive: boolean;
}

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'AS', 'CA', 'CO', 'CT', 'DE', 'DC', 'FL', 'GA',
  'GU', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA',
  'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC',
  'ND', 'MP', 'OH', 'OK', 'OR', 'PA', 'PR', 'RI', 'SC', 'SD', 'TN', 'TX',
  'TT', 'UT', 'VT', 'VA', 'VI', 'WA', 'WV', 'WI', 'WY', 'Other'
];

export default function EditUser() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: 'patient' as 'admin' | 'patient' | 'provider',
    phoneNumber: '',
    dateOfBirth: '',
    gender: 'other' as 'male' | 'female' | 'other',
    streetAddress: '',
    city: '',
    state: 'Other',
    zipcode: '',
    isActive: true,
  });

  useEffect(() => {
    if (userId) {
      fetchUser();
    }
  }, [userId]);

  const fetchUser = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = await AsyncStorage.getItem('token');
      if (!token) {
        setError('Authentication token missing.');
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_URL}/api/auth/users/${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Failed to fetch user.');
      } else {
        const user = data.user;
        setFormData({
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          email: user.email || '',
          role: user.role || 'patient',
          phoneNumber: user.phoneNumber || '',
          dateOfBirth: user.dateOfBirth
            ? new Date(user.dateOfBirth).toISOString().split('T')[0]
            : '',
          gender: user.gender || 'other',
          streetAddress: user.address?.streetAddress || '',
          city: user.address?.city || '',
          state: user.address?.state || 'Other',
          zipcode: user.address?.zipcode || '',
          isActive: user.isActive !== undefined ? user.isActive : true,
        });
      }
    } catch (err) {
      setError('Unable to connect to server.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    // Validation
    if (!formData.firstName || !formData.lastName || !formData.email) {
      Alert.alert('Validation Error', 'Please fill in all required fields.');
      return;
    }

    if (formData.phoneNumber && !/^\d{10}$/.test(formData.phoneNumber)) {
      Alert.alert('Validation Error', 'Phone number must be exactly 10 digits.');
      return;
    }

    if (formData.zipcode && !/^\d{5}$/.test(formData.zipcode)) {
      Alert.alert('Validation Error', 'Zipcode must be exactly 5 digits.');
      return;
    }

    setSaving(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Error', 'Authentication token missing.');
        setSaving(false);
        return;
      }

      const updateData: any = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        role: formData.role,
        phoneNumber: formData.phoneNumber,
        isActive: formData.isActive,
      };

      if (formData.dateOfBirth) {
        updateData.dateOfBirth = formData.dateOfBirth;
      }

      if (formData.gender) {
        updateData.gender = formData.gender;
      }

      if (
        formData.streetAddress &&
        formData.city &&
        formData.state &&
        formData.zipcode
      ) {
        updateData.address = {
          streetAddress: formData.streetAddress,
          city: formData.city,
          state: formData.state,
          zipcode: formData.zipcode,
        };
      }

      const response = await fetch(`${API_URL}/api/auth/users/${userId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      const data = await response.json();

      if (!response.ok) {
        Alert.alert('Error', data.message || 'Failed to update user.');
      } else {
        Alert.alert('Success', 'User updated successfully.', [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]);
      }
    } catch (err) {
      Alert.alert('Error', 'Could not connect to server.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-gray-900">
        <ActivityIndicator size="large" color="#2563eb" />
        <Text className="mt-2 text-gray-700 dark:text-gray-300">
          Loading user...
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
          onPress={fetchUser}
          className="bg-blue-500 px-6 py-3 rounded-xl"
          activeOpacity={0.8}
        >
          <Text className="text-white text-lg font-semibold">Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-gray-50 dark:bg-gray-900">
      <View className="px-4 pt-6 pb-8">
        {/* Back Button */}
        <TouchableOpacity
          onPress={() => router.back()}
          className="mb-4 flex-row items-center"
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={24} color="#2563eb" />
          <Text className="text-blue-500 text-lg font-semibold ml-2">
            Go Back
          </Text>
        </TouchableOpacity>

        {/* Header */}
        <View className="mb-6">
          <Text className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Edit User
          </Text>
          <Text className="text-gray-600 dark:text-gray-400">
            Update user information
          </Text>
        </View>

        {/* Form */}
        <View className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-md border border-gray-200 dark:border-gray-700 mb-4">
          {/* Basic Information */}
          <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Basic Information
          </Text>

          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              First Name *
            </Text>
            <TextInput
              value={formData.firstName}
              onChangeText={(text) =>
                setFormData({ ...formData, firstName: text })
              }
              className="bg-gray-50 dark:bg-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600"
              placeholder="First Name"
              placeholderTextColor="#9ca3af"
            />
          </View>

          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Last Name *
            </Text>
            <TextInput
              value={formData.lastName}
              onChangeText={(text) =>
                setFormData({ ...formData, lastName: text })
              }
              className="bg-gray-50 dark:bg-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600"
              placeholder="Last Name"
              placeholderTextColor="#9ca3af"
            />
          </View>

          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email *
            </Text>
            <TextInput
              value={formData.email}
              onChangeText={(text) => setFormData({ ...formData, email: text })}
              keyboardType="email-address"
              autoCapitalize="none"
              className="bg-gray-50 dark:bg-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600"
              placeholder="Email"
              placeholderTextColor="#9ca3af"
            />
          </View>

          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Role *
            </Text>
            <View className="flex-row gap-2">
              {(['patient', 'provider', 'admin'] as const).map((role) => (
                <TouchableOpacity
                  key={role}
                  onPress={() => setFormData({ ...formData, role })}
                  className={`flex-1 px-4 py-3 rounded-xl ${
                    formData.role === role
                      ? role === 'admin'
                        ? 'bg-purple-500'
                        : role === 'provider'
                        ? 'bg-green-500'
                        : 'bg-red-500'
                      : 'bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600'
                  }`}
                >
                  <Text
                    className={`text-center font-semibold ${
                      formData.role === role
                        ? 'text-white'
                        : 'text-gray-900 dark:text-white'
                    }`}
                  >
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Phone Number
            </Text>
            <TextInput
              value={formData.phoneNumber}
              onChangeText={(text) =>
                setFormData({ ...formData, phoneNumber: text.replace(/\D/g, '') })
              }
              keyboardType="phone-pad"
              maxLength={10}
              className="bg-gray-50 dark:bg-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600"
              placeholder="10 digits"
              placeholderTextColor="#9ca3af"
            />
          </View>

          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Date of Birth
            </Text>
            <TextInput
              value={formData.dateOfBirth}
              onChangeText={(text) =>
                setFormData({ ...formData, dateOfBirth: text })
              }
              className="bg-gray-50 dark:bg-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600"
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#9ca3af"
            />
          </View>

          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Gender
            </Text>
            <View className="flex-row gap-2">
              {(['male', 'female', 'other'] as const).map((gender) => (
                <TouchableOpacity
                  key={gender}
                  onPress={() => setFormData({ ...formData, gender })}
                  className={`flex-1 px-4 py-3 rounded-xl ${
                    formData.gender === gender
                      ? 'bg-blue-500'
                      : 'bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600'
                  }`}
                >
                  <Text
                    className={`text-center font-semibold ${
                      formData.gender === gender
                        ? 'text-white'
                        : 'text-gray-900 dark:text-white'
                    }`}
                  >
                    {gender.charAt(0).toUpperCase() + gender.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Address */}
        <View className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-md border border-gray-200 dark:border-gray-700 mb-4">
          <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Address
          </Text>

          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Street Address
            </Text>
            <TextInput
              value={formData.streetAddress}
              onChangeText={(text) =>
                setFormData({ ...formData, streetAddress: text })
              }
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
              value={formData.city}
              onChangeText={(text) => setFormData({ ...formData, city: text })}
              className="bg-gray-50 dark:bg-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600"
              placeholder="City"
              placeholderTextColor="#9ca3af"
            />
          </View>

          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              State
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mb-2"
            >
              <View className="flex-row gap-2">
                {US_STATES.map((state) => (
                  <TouchableOpacity
                    key={state}
                    onPress={() => setFormData({ ...formData, state })}
                    className={`px-3 py-2 rounded-lg ${
                      formData.state === state
                        ? 'bg-blue-500'
                        : 'bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600'
                    }`}
                  >
                    <Text
                      className={`text-sm font-semibold ${
                        formData.state === state
                          ? 'text-white'
                          : 'text-gray-900 dark:text-white'
                      }`}
                    >
                      {state}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Zipcode
            </Text>
            <TextInput
              value={formData.zipcode}
              onChangeText={(text) =>
                setFormData({ ...formData, zipcode: text.replace(/\D/g, '') })
              }
              keyboardType="number-pad"
              maxLength={5}
              className="bg-gray-50 dark:bg-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600"
              placeholder="5 digits"
              placeholderTextColor="#9ca3af"
            />
          </View>
        </View>

        {/* Status */}
        <View className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-md border border-gray-200 dark:border-gray-700 mb-6">
          <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Account Status
          </Text>

          <TouchableOpacity
            onPress={() =>
              setFormData({ ...formData, isActive: !formData.isActive })
            }
            className={`flex-row items-center justify-between p-4 rounded-xl ${
              formData.isActive
                ? 'bg-green-100 dark:bg-green-900'
                : 'bg-red-100 dark:bg-red-900'
            }`}
          >
            <View>
              <Text className="text-lg font-semibold text-gray-900 dark:text-white">
                Account Status
              </Text>
              <Text className="text-sm text-gray-600 dark:text-gray-400">
                {formData.isActive ? 'Active' : 'Inactive'}
              </Text>
            </View>
            <View
              className={`w-12 h-6 rounded-full ${
                formData.isActive ? 'bg-green-500' : 'bg-red-500'
              }`}
            >
              <View
                className={`w-5 h-5 bg-white rounded-full mt-0.5 ${
                  formData.isActive ? 'ml-6' : 'ml-0.5'
                }`}
              />
            </View>
          </TouchableOpacity>
        </View>

        {/* Action Buttons */}
        <View className="gap-3">
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            className={`bg-blue-500 px-6 py-4 rounded-xl ${
              saving ? 'opacity-50' : ''
            }`}
            activeOpacity={0.8}
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
            onPress={() => router.back()}
            className="bg-gray-500 px-6 py-4 rounded-xl"
            activeOpacity={0.8}
          >
            <Text className="text-white text-lg font-semibold text-center">
              Go Back
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}
