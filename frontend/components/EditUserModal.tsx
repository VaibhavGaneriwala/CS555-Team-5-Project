import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';

const API_URL = Constants.expoConfig?.extra?.API_URL ?? 'http://localhost:3000';

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

interface EditUserModalProps {
  visible: boolean;
  userId: string | null;
  currentUserId?: string | null;
  onClose: () => void;
  onSave: () => void;
}

export default function EditUserModal({
  visible,
  userId,
  currentUserId,
  onClose,
  onSave,
}: EditUserModalProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  
  // Check if editing own account
  const isEditingSelf: boolean = Boolean(currentUserId && userId && currentUserId === userId);

  const [formData, setFormData] = useState<{
    firstName: string;
    lastName: string;
    email: string;
    role: 'admin' | 'patient' | 'provider';
    phoneNumber: string;
    dateOfBirth: string;
    gender: 'male' | 'female' | 'other';
    streetAddress: string;
    city: string;
    state: string;
    zipcode: string;
    isActive: boolean;
  }>({
    firstName: '',
    lastName: '',
    email: '',
    role: 'patient',
    phoneNumber: '',
    dateOfBirth: '',
    gender: 'other',
    streetAddress: '',
    city: '',
    state: 'Other',
    zipcode: '',
    isActive: true,
  });

  useEffect(() => {
    if (visible && userId) {
      fetchUser();
    } else {
      // Reset form when modal closes
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        role: 'patient',
        phoneNumber: '',
        dateOfBirth: '',
        gender: 'other',
        streetAddress: '',
        city: '',
        state: 'Other',
        zipcode: '',
        isActive: true,
      });
      setError(null);
      setShowDatePicker(false);
      setValidationErrors({});
      setSaveError(null);
    }
  }, [visible, userId]);

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
          isActive: user.isActive !== undefined ? Boolean(user.isActive) : true,
        });
      }
    } catch (err) {
      console.error('Error fetching user:', err);
      setError('Unable to connect to server.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    // Clear previous errors
    setValidationErrors({});
    setSaveError(null);

    const errors: Record<string, string> = {};

    // Validate required fields
    if (!formData.firstName || formData.firstName.trim() === '') {
      errors.firstName = 'First name is required';
    }

    if (!formData.lastName || formData.lastName.trim() === '') {
      errors.lastName = 'Last name is required';
    }

    if (!formData.email || formData.email.trim() === '') {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!formData.dateOfBirth || formData.dateOfBirth.trim() === '') {
      errors.dateOfBirth = 'Date of birth is required';
    }

    // Validate optional fields if provided
    if (formData.phoneNumber && formData.phoneNumber.trim() !== '') {
      if (!/^\d{10}$/.test(formData.phoneNumber)) {
        errors.phoneNumber = 'Phone number must be exactly 10 digits';
      }
    }

    if (formData.zipcode && formData.zipcode.trim() !== '') {
      if (!/^\d{5}$/.test(formData.zipcode)) {
        errors.zipcode = 'Zipcode must be exactly 5 digits';
      }
    }

    // If there are validation errors, show them and return
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      // Also show alert for mobile users
      if (Platform.OS !== 'web') {
        Alert.alert('Validation Error', 'Please fix the errors in the form.');
      }
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
        role: formData.role,
        phoneNumber: formData.phoneNumber,
      };

      // Prevent admins from changing their own email or account status
      if (!isEditingSelf) {
        updateData.email = formData.email;
        updateData.isActive = Boolean(formData.isActive);
      }

      updateData.dateOfBirth = formData.dateOfBirth;

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
        const errorMessage = data.message || 'Failed to update user.';
        setSaveError(errorMessage);
        if (Platform.OS !== 'web') {
          Alert.alert('Error', errorMessage);
        }
      } else {
        if (Platform.OS === 'web') {
          // On web, show success message inline or use a toast-like notification
          setSaveError(null);
          setValidationErrors({});
        } else {
          Alert.alert('Success', 'User updated successfully.');
        }
        onSave();
        onClose();
      }
    } catch (err) {
      console.error('Error updating user:', err);
      const errorMessage = 'Could not connect to server. Please check your connection and try again.';
      setSaveError(errorMessage);
      if (Platform.OS !== 'web') {
        Alert.alert('Error', errorMessage);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
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
            onPress={onClose}
          />
          <View
            className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl"
            style={{ 
              maxHeight: Platform.OS === 'web' ? '90%' : undefined,
              maxWidth: Platform.OS === 'web' ? 800 : undefined,
              width: Platform.OS === 'web' ? '90%' : undefined
            }}
            onStartShouldSetResponder={() => true}
          >
              {/* Header */}
              <View className="flex-row items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <Text className="text-2xl font-bold text-gray-900 dark:text-white">
                  Edit User
                </Text>
                <TouchableOpacity
                  onPress={onClose}
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
            {loading ? (
              <View className="py-8 items-center">
                <ActivityIndicator size="large" color="#2563eb" />
                <Text className="mt-4 text-gray-700 dark:text-gray-300">
                  Loading user...
                </Text>
              </View>
            ) : error ? (
              <View className="py-8 items-center">
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
            ) : (
              <>
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

                {/* Basic Information */}
                <View className="mb-4">
                  <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Basic Information
                  </Text>

                  <View className="mb-4">
                    <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      First Name <Text className="text-red-500">*</Text>
                    </Text>
                    <TextInput
                      value={formData.firstName}
                      onChangeText={(text) => {
                        setFormData({ ...formData, firstName: text });
                        if (validationErrors.firstName) {
                          setValidationErrors({ ...validationErrors, firstName: '' });
                        }
                      }}
                      className={`bg-gray-50 dark:bg-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white border ${
                        validationErrors.firstName 
                          ? 'border-red-500 dark:border-red-500' 
                          : 'border-gray-200 dark:border-gray-600'
                      }`}
                      placeholder="First Name"
                      placeholderTextColor="#9ca3af"
                    />
                    {validationErrors.firstName && (
                      <Text className="text-red-500 text-xs mt-1 ml-1">
                        {validationErrors.firstName}
                      </Text>
                    )}
                  </View>

                  <View className="mb-4">
                    <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Last Name <Text className="text-red-500">*</Text>
                    </Text>
                    <TextInput
                      value={formData.lastName}
                      onChangeText={(text) => {
                        setFormData({ ...formData, lastName: text });
                        if (validationErrors.lastName) {
                          setValidationErrors({ ...validationErrors, lastName: '' });
                        }
                      }}
                      className={`bg-gray-50 dark:bg-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white border ${
                        validationErrors.lastName 
                          ? 'border-red-500 dark:border-red-500' 
                          : 'border-gray-200 dark:border-gray-600'
                      }`}
                      placeholder="Last Name"
                      placeholderTextColor="#9ca3af"
                    />
                    {validationErrors.lastName && (
                      <Text className="text-red-500 text-xs mt-1 ml-1">
                        {validationErrors.lastName}
                      </Text>
                    )}
                  </View>

                  <View className="mb-4">
                    <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Email <Text className="text-red-500">*</Text>
                    </Text>
                    {isEditingSelf && (
                      <Text className="text-xs text-amber-600 dark:text-amber-400 mb-2">
                        You cannot change your own email address
                      </Text>
                    )}
                    <TextInput
                      value={formData.email}
                      onChangeText={(text) => {
                        setFormData({ ...formData, email: text });
                        if (validationErrors.email) {
                          setValidationErrors({ ...validationErrors, email: '' });
                        }
                      }}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      editable={!isEditingSelf}
                      className={`bg-gray-50 dark:bg-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white border ${
                        validationErrors.email 
                          ? 'border-red-500 dark:border-red-500' 
                          : 'border-gray-200 dark:border-gray-600'
                      } ${isEditingSelf ? 'opacity-60' : ''}`}
                      placeholder="Email"
                      placeholderTextColor="#9ca3af"
                    />
                    {validationErrors.email && (
                      <Text className="text-red-500 text-xs mt-1 ml-1">
                        {validationErrors.email}
                      </Text>
                    )}
                  </View>

                  <View className="mb-4">
                    <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Role <Text className="text-red-500">*</Text>
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
                          activeOpacity={0.7}
                          hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
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
                      onChangeText={(text) => {
                        setFormData({ ...formData, phoneNumber: text.replace(/\D/g, '') });
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

                  <View className="mb-4">
                    <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Date of Birth <Text className="text-red-500">*</Text>
                    </Text>
                    <input
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={(e) => {
                        setFormData({ ...formData, dateOfBirth: e.target.value });
                        if (validationErrors.dateOfBirth) {
                          setValidationErrors({ ...validationErrors, dateOfBirth: '' });
                        }
                      }}
                      max={new Date().toISOString().split('T')[0]}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        borderRadius: '12px',
                        border: validationErrors.dateOfBirth 
                          ? '1px solid #ef4444' 
                          : '1px solid #e5e7eb',
                        backgroundColor: '#f9fafb',
                        fontSize: '16px',
                        color: '#111827',
                      }}
                    />
                    {validationErrors.dateOfBirth && (
                      <Text className="text-red-500 text-xs mt-1 ml-1">
                        {validationErrors.dateOfBirth}
                      </Text>
                    )}
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
                          activeOpacity={0.7}
                          hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
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
                <View className="mb-4">
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
                    <View style={{ zIndex: 1000, elevation: 10 }}>
                      <Dropdown
                        data={US_STATES.map((state) => ({ label: state, value: state }))}
                        labelField="label"
                        valueField="value"
                        placeholder="Select State"
                        value={formData.state}
                        onChange={(item) => setFormData({ ...formData, state: item.value })}
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
                      value={formData.zipcode}
                      onChangeText={(text) => {
                        setFormData({ ...formData, zipcode: text.replace(/\D/g, '') });
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

                {/* Status */}
                <View className="mb-6">
                  <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Account Status
                  </Text>
                  {isEditingSelf && (
                    <Text className="text-xs text-amber-600 dark:text-amber-400 mb-2">
                      You cannot change your own account status
                    </Text>
                  )}

                  <TouchableOpacity
                    onPress={() => {
                      if (!isEditingSelf) {
                        setFormData({ ...formData, isActive: Boolean(!formData.isActive) });
                      }
                    }}
                    disabled={Boolean(isEditingSelf)}
                    className={`flex-row items-center justify-between p-4 rounded-xl ${
                      formData.isActive
                        ? 'bg-green-100 dark:bg-green-900'
                        : 'bg-red-100 dark:bg-red-900'
                    } ${isEditingSelf ? 'opacity-60' : ''}`}
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
                <View className="gap-3 pb-4">
                  <TouchableOpacity
                    onPress={handleSave}
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
                    onPress={onClose}
                    className="bg-gray-500 px-6 py-4 rounded-xl"
                    activeOpacity={0.7}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Text className="text-white text-lg font-semibold text-center">
                      Cancel
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
              </ScrollView>
            </View>
          </View>
        ) : (
          <View className="flex-1 justify-end bg-black/50">
            <Pressable 
              style={{ flex: 1 }}
              onPress={onClose}
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
                    Edit User
                  </Text>
                  <TouchableOpacity
                    onPress={onClose}
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
                  {loading ? (
                    <View className="py-8 items-center">
                      <ActivityIndicator size="large" color="#2563eb" />
                      <Text className="mt-4 text-gray-700 dark:text-gray-300">
                        Loading user...
                      </Text>
                    </View>
                  ) : error ? (
                    <View className="py-8 items-center">
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
                  ) : (
                    <>
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

                      {/* Basic Information */}
                      <View className="mb-4">
                        <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                          Basic Information
                        </Text>

                        <View className="mb-4">
                          <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            First Name <Text className="text-red-500">*</Text>
                          </Text>
                          <TextInput
                            value={formData.firstName}
                            onChangeText={(text) => {
                              setFormData({ ...formData, firstName: text });
                              if (validationErrors.firstName) {
                                setValidationErrors({ ...validationErrors, firstName: '' });
                              }
                            }}
                            className={`bg-gray-50 dark:bg-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white border ${
                              validationErrors.firstName 
                                ? 'border-red-500 dark:border-red-500' 
                                : 'border-gray-200 dark:border-gray-600'
                            }`}
                            placeholder="First Name"
                            placeholderTextColor="#9ca3af"
                          />
                          {validationErrors.firstName && (
                            <Text className="text-red-500 text-xs mt-1 ml-1">
                              {validationErrors.firstName}
                            </Text>
                          )}
                        </View>

                        <View className="mb-4">
                          <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Last Name <Text className="text-red-500">*</Text>
                          </Text>
                          <TextInput
                            value={formData.lastName}
                            onChangeText={(text) => {
                              setFormData({ ...formData, lastName: text });
                              if (validationErrors.lastName) {
                                setValidationErrors({ ...validationErrors, lastName: '' });
                              }
                            }}
                            className={`bg-gray-50 dark:bg-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white border ${
                              validationErrors.lastName 
                                ? 'border-red-500 dark:border-red-500' 
                                : 'border-gray-200 dark:border-gray-600'
                            }`}
                            placeholder="Last Name"
                            placeholderTextColor="#9ca3af"
                          />
                          {validationErrors.lastName && (
                            <Text className="text-red-500 text-xs mt-1 ml-1">
                              {validationErrors.lastName}
                            </Text>
                          )}
                        </View>

                        <View className="mb-4">
                          <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Email <Text className="text-red-500">*</Text>
                          </Text>
                          <TextInput
                            value={formData.email}
                            onChangeText={(text) => {
                              setFormData({ ...formData, email: text });
                              if (validationErrors.email) {
                                setValidationErrors({ ...validationErrors, email: '' });
                              }
                            }}
                            className={`bg-gray-50 dark:bg-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white border ${
                              validationErrors.email 
                                ? 'border-red-500 dark:border-red-500' 
                                : 'border-gray-200 dark:border-gray-600'
                            }`}
                            placeholder="Email"
                            placeholderTextColor="#9ca3af"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            editable={!isEditingSelf}
                          />
                          {validationErrors.email && (
                            <Text className="text-red-500 text-xs mt-1 ml-1">
                              {validationErrors.email}
                            </Text>
                          )}
                        </View>

                        <View className="mb-4">
                          <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Phone Number
                          </Text>
                          <TextInput
                            value={formData.phoneNumber}
                            onChangeText={(text) => {
                              const cleaned = text.replace(/\D/g, '');
                              setFormData({ ...formData, phoneNumber: cleaned });
                              if (validationErrors.phoneNumber) {
                                setValidationErrors({ ...validationErrors, phoneNumber: '' });
                              }
                            }}
                            className={`bg-gray-50 dark:bg-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white border ${
                              validationErrors.phoneNumber 
                                ? 'border-red-500 dark:border-red-500' 
                                : 'border-gray-200 dark:border-gray-600'
                            }`}
                            placeholder="Phone Number"
                            placeholderTextColor="#9ca3af"
                            keyboardType="phone-pad"
                            maxLength={10}
                          />
                          {validationErrors.phoneNumber && (
                            <Text className="text-red-500 text-xs mt-1 ml-1">
                              {validationErrors.phoneNumber}
                            </Text>
                          )}
                        </View>

                        <View className="mb-4">
                          <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Date of Birth <Text className="text-red-500">*</Text>
                          </Text>
                          <TouchableOpacity
                            onPress={() => setShowDatePicker(true)}
                            className={`bg-gray-50 dark:bg-gray-700 rounded-xl px-4 py-3 border ${
                              validationErrors.dateOfBirth 
                                ? 'border-red-500 dark:border-red-500' 
                                : 'border-gray-200 dark:border-gray-600'
                            } flex-row items-center justify-between`}
                          >
                            <Text className={`${formData.dateOfBirth ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>
                              {formData.dateOfBirth 
                                ? new Date(formData.dateOfBirth).toLocaleDateString() 
                                : 'Select Date'}
                            </Text>
                            <Ionicons name="calendar-outline" size={20} color="#6b7280" />
                          </TouchableOpacity>
                          {showDatePicker && (
                            <>
                              {Platform.OS === 'ios' ? (
                                <Modal
                                  visible={showDatePicker}
                                  transparent={true}
                                  animationType="slide"
                                  onRequestClose={() => setShowDatePicker(false)}
                                >
                                  <View className="flex-1 justify-end bg-black/50">
                                    <View className="bg-white dark:bg-gray-800 rounded-t-3xl p-4">
                                      <View className="flex-row justify-between items-center mb-4">
                                        <Text className="text-lg font-bold text-gray-900 dark:text-white">
                                          Select Date of Birth
                                        </Text>
                                        <TouchableOpacity
                                          onPress={() => setShowDatePicker(false)}
                                          className="bg-gray-200 dark:bg-gray-700 rounded-full p-2"
                                        >
                                          <Ionicons name="close" size={20} color="#6b7280" />
                                        </TouchableOpacity>
                                      </View>
                                      <DateTimePicker
                                        value={formData.dateOfBirth ? new Date(formData.dateOfBirth) : new Date()}
                                        mode="date"
                                        display="spinner"
                                        onChange={(event, selectedDate) => {
                                          if (event.type === 'set' && selectedDate) {
                                            const dateString = selectedDate.toISOString().split('T')[0];
                                            setFormData({ ...formData, dateOfBirth: dateString });
                                            if (validationErrors.dateOfBirth) {
                                              setValidationErrors({ ...validationErrors, dateOfBirth: '' });
                                            }
                                          }
                                          if (event.type === 'dismissed') {
                                            setShowDatePicker(false);
                                          }
                                        }}
                                        maximumDate={new Date()}
                                        style={{ height: 200 }}
                                      />
                                      <TouchableOpacity
                                        onPress={() => setShowDatePicker(false)}
                                        className="bg-blue-500 px-6 py-3 rounded-xl mt-4"
                                      >
                                        <Text className="text-white font-semibold text-center">Done</Text>
                                      </TouchableOpacity>
                                    </View>
                                  </View>
                                </Modal>
                              ) : (
                                <DateTimePicker
                                  value={formData.dateOfBirth ? new Date(formData.dateOfBirth) : new Date()}
                                  mode="date"
                                  display="default"
                                  onChange={(event, selectedDate) => {
                                    setShowDatePicker(false);
                                    if (selectedDate) {
                                      const dateString = selectedDate.toISOString().split('T')[0];
                                      setFormData({ ...formData, dateOfBirth: dateString });
                                    }
                                  }}
                                  maximumDate={new Date()}
                                />
                              )}
                            </>
                          )}
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
                                activeOpacity={0.7}
                              >
                                <Text
                                  className={`text-center font-semibold ${
                                    formData.gender === gender
                                      ? 'text-white'
                                      : 'text-gray-700 dark:text-gray-300'
                                  }`}
                                >
                                  {gender.charAt(0).toUpperCase() + gender.slice(1)}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </View>
                      </View>

                      {/* Address Information */}
                      <View className="mb-4">
                        <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                          Address Information
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
                            onChangeText={(text) =>
                              setFormData({ ...formData, city: text })
                            }
                            className="bg-gray-50 dark:bg-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600"
                            placeholder="City"
                            placeholderTextColor="#9ca3af"
                          />
                        </View>

                        <View className="mb-4">
                          <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            State
                          </Text>
                          <TextInput
                            value={formData.state}
                            onChangeText={(text) =>
                              setFormData({ ...formData, state: text })
                            }
                            className="bg-gray-50 dark:bg-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600"
                            placeholder="State"
                            placeholderTextColor="#9ca3af"
                          />
                        </View>

                        <View className="mb-4">
                          <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Zipcode
                          </Text>
                          <TextInput
                            value={formData.zipcode}
                            onChangeText={(text) =>
                              setFormData({ ...formData, zipcode: text })
                            }
                            className="bg-gray-50 dark:bg-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600"
                            placeholder="Zipcode"
                            placeholderTextColor="#9ca3af"
                            keyboardType="numeric"
                          />
                        </View>
                      </View>

                      {/* Role Selection */}
                      <View className="mb-4">
                        <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                          Role
                        </Text>
                        <View className="flex-row gap-2">
                          {(['patient', 'provider', 'admin'] as const).map((role) => (
                            <TouchableOpacity
                              key={role}
                              onPress={() => setFormData({ ...formData, role })}
                              className={`flex-1 px-4 py-3 rounded-xl ${
                                formData.role === role
                                  ? 'bg-blue-500'
                                  : 'bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600'
                              }`}
                              activeOpacity={0.7}
                            >
                              <Text
                                className={`text-center font-semibold ${
                                  formData.role === role
                                    ? 'text-white'
                                    : 'text-gray-700 dark:text-gray-300'
                                }`}
                              >
                                {role.charAt(0).toUpperCase() + role.slice(1)}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>

                      {/* Account Status */}
                      <View className="mb-6">
                        <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                          Account Status
                        </Text>
                        {isEditingSelf && (
                          <Text className="text-xs text-amber-600 dark:text-amber-400 mb-2">
                            You cannot change your own account status
                          </Text>
                        )}
                        <View className={`flex-row items-center justify-between bg-gray-50 dark:bg-gray-700 rounded-xl px-4 py-3 border border-gray-200 dark:border-gray-600 ${isEditingSelf ? 'opacity-60' : ''}`}>
                          <Text className="text-gray-900 dark:text-white font-medium">
                            {formData.isActive ? 'Active' : 'Inactive'}
                          </Text>
                          <TouchableOpacity
                            onPress={() => {
                              if (!isEditingSelf) {
                                setFormData({ ...formData, isActive: Boolean(!formData.isActive) });
                              }
                            }}
                            disabled={Boolean(isEditingSelf)}
                            className={`w-14 h-8 rounded-full ${
                              formData.isActive ? 'bg-green-500' : 'bg-gray-300'
                            }`}
                            activeOpacity={0.7}
                          >
                            <View
                              className={`w-6 h-6 rounded-full bg-white mt-1 ${
                                formData.isActive ? 'ml-7' : 'ml-1'
                              }`}
                              style={{
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.25,
                                shadowRadius: 3.84,
                                elevation: 5,
                              }}
                            />
                          </TouchableOpacity>
                        </View>
                      </View>

                      {/* Action Buttons */}
                      <View className="flex-row gap-3 mb-4">
                        <TouchableOpacity
                          onPress={handleSave}
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
                          onPress={onClose}
                          className="bg-gray-500 px-6 py-4 rounded-xl"
                          activeOpacity={0.7}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <Text className="text-white text-lg font-semibold text-center">
                            Cancel
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                </ScrollView>
              </View>
            </KeyboardAvoidingView>
          </View>
        )}
    </Modal>
  );
}
