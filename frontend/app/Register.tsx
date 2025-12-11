import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
  ActivityIndicator,
  Alert,
  Pressable,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { Dropdown } from 'react-native-element-dropdown';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '@/utils/apiConfig';

export default function RegisterScreen() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [dateOfBirthValue, setDateOfBirthValue] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [gender, setGender] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipcode, setZipcode] = useState('');
  const [validationError, setValidationError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  
  const [isFocusRole, setIsFocusRole] = useState(false);
  const [isFocusGender, setIsFocusGender] = useState(false);
  const [isFocusState, setIsFocusState] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      const { width } = Dimensions.get('window');
      // Consider desktop if web platform AND width > 768px
      setIsDesktop(Platform.OS === 'web' && width > 768);
    };

    checkScreenSize();
    const subscription = Dimensions.addEventListener('change', checkScreenSize);
    
    return () => {
      subscription?.remove();
    };
  }, []);

  const roleDropdown = [
    { label: 'Admin', value: 'admin' },
    { label: 'Patient', value: 'patient' },
    { label: 'Provider', value: 'provider' },
  ];

  const genderDropdown = [
    { label: 'Male', value: 'male' },
    { label: 'Female', value: 'female' },
    { label: 'Other', value: 'other' },
  ];

  const stateDropdown = [
    { label: 'AL', value: 'AL' }, { label: 'AK', value: 'AK' }, { label: 'AZ', value: 'AZ' },
    { label: 'AR', value: 'AR' }, { label: 'CA', value: 'CA' }, { label: 'CO', value: 'CO' },
    { label: 'CT', value: 'CT' }, { label: 'DE', value: 'DE' }, { label: 'DC', value: 'DC' },
    { label: 'FL', value: 'FL' }, { label: 'GA', value: 'GA' }, { label: 'HI', value: 'HI' },
    { label: 'ID', value: 'ID' }, { label: 'IL', value: 'IL' }, { label: 'IN', value: 'IN' },
    { label: 'IA', value: 'IA' }, { label: 'KS', value: 'KS' }, { label: 'KY', value: 'KY' },
    { label: 'LA', value: 'LA' }, { label: 'ME', value: 'ME' }, { label: 'MD', value: 'MD' },
    { label: 'MA', value: 'MA' }, { label: 'MI', value: 'MI' }, { label: 'MN', value: 'MN' },
    { label: 'MS', value: 'MS' }, { label: 'MO', value: 'MO' }, { label: 'MT', value: 'MT' },
    { label: 'NE', value: 'NE' }, { label: 'NV', value: 'NV' }, { label: 'NH', value: 'NH' },
    { label: 'NJ', value: 'NJ' }, { label: 'NM', value: 'NM' }, { label: 'NY', value: 'NY' },
    { label: 'NC', value: 'NC' }, { label: 'ND', value: 'ND' }, { label: 'OH', value: 'OH' },
    { label: 'OK', value: 'OK' }, { label: 'OR', value: 'OR' }, { label: 'PA', value: 'PA' },
    { label: 'RI', value: 'RI' }, { label: 'SC', value: 'SC' }, { label: 'SD', value: 'SD' },
    { label: 'TN', value: 'TN' }, { label: 'TX', value: 'TX' }, { label: 'UT', value: 'UT' },
    { label: 'VT', value: 'VT' }, { label: 'VA', value: 'VA' }, { label: 'WA', value: 'WA' },
    { label: 'WV', value: 'WV' }, { label: 'WI', value: 'WI' }, { label: 'WY', value: 'WY' },
  ];

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setDateOfBirthValue(selectedDate);
      setDateOfBirth(selectedDate.toISOString().slice(0, 10));
    }
  };

  const handleDateConfirm = () => {
    setShowDatePicker(false);
    if (dateOfBirthValue) {
      setDateOfBirth(dateOfBirthValue.toISOString().slice(0, 10));
    }
  };

  const handleRegister = async () => {
    // Validation for empty fields
    if (!firstName || !lastName || !role || !email || !password || !phoneNumber 
      || !dateOfBirth || !gender || !streetAddress || !city || !state || !zipcode) {
      setValidationError('Please fill out all fields before proceeding.');
      return;
    } else {
      setValidationError('');
    }

    setLoading(true);

    const body = {
      firstName,
      lastName,
      email,
      password,
      role,
      phoneNumber,
      dateOfBirth,
      gender,
      address: {
        streetAddress,
        city,
        state,
        zipcode
      }
    };

    try {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      const data = await response.json();
      if (!response.ok) {
        setValidationError(data.message || 'Registration failed. Please try again.');
        setLoading(false);
        return;
      }
      
      // Save the token in Async storage to keep the user logged in
      await AsyncStorage.setItem('token', data.token);
      
      // Role based redirection
      if (data.role === 'admin') {
        router.replace('/(admin)/AdminHome');
      } else if (data.role === 'provider') {
        router.replace('/(provider)/ProviderHome');
      } else {
        router.replace('/(patient)/PatientHome');
      }
    } catch (error: any) {
      setLoading(false);
      let errorMessage = 'Unable to connect to the server.';
      
      if (error.message?.includes('timeout') || error.message?.includes('Request timeout')) {
        errorMessage = `Request timed out. Server at ${API_URL} is not responding.\n\nPlease check:\n1. Backend server is running\n2. Correct IP address is configured\n3. Firewall allows connections on port 3000\n4. Device and computer are on same network`;
      } else if (error.message?.includes('Network request failed') || error.message?.includes('Failed to fetch')) {
        errorMessage = `Cannot connect to server at ${API_URL}.\n\nOn mobile, make sure:\n1. Your device and computer are on the same Wi-Fi network\n2. The backend server is running and listening on 0.0.0.0:3000\n3. API_URL is set to your computer's IP (not localhost)\n\nCurrent API_URL: ${API_URL}`;
      } else if (error.message) {
        errorMessage = `Connection error: ${error.message}\n\nTrying to connect to: ${API_URL}`;
      }
      
      Alert.alert('Registration Error', errorMessage);
      setValidationError(errorMessage);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-blue-50 dark:bg-gray-900" edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        {isDesktop ? (
          <View className="flex-1 justify-center items-center bg-blue-50 dark:bg-gray-900" style={{ paddingHorizontal: 32 }}>
            <View
              className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl"
              style={{ 
                maxHeight: '90%',
                maxWidth: 1200,
                width: '100%',
                flexDirection: 'row',
                overflow: 'hidden'
              }}
            >
              {/* Left Side - Logo, Title, Subtitle */}
              <View style={{ 
                width: '50%', 
                justifyContent: 'center', 
                alignItems: 'center', 
                padding: 32,
                backgroundColor: '#3b82f6'
              }}>
                <View style={{ alignItems: 'center' }}>
                  <View style={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.2)', 
                    borderRadius: 24, 
                    padding: 24, 
                    marginBottom: 24,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: 8
                  }}>
                    <Ionicons name="person-add" size={64} color="#fff" />
                  </View>
                  <Text className="text-5xl font-bold mb-4 text-white text-center">
                    Create Account
                  </Text>
                  <Text style={{ 
                    fontSize: 20, 
                    color: 'rgba(255, 255, 255, 0.9)', 
                    textAlign: 'center',
                    maxWidth: 400
                  }}>
                    Sign up to get started with your healthcare journey
                  </Text>
                </View>
              </View>

              {/* Right Side - Form */}
              <View style={{ width: '50%', flex: 1 }}>
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
                <View className="px-2">
              {validationError ? (
                <View className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex-row items-center">
                  <Ionicons name="alert-circle" size={20} color="#ef4444" />
                  <Text className="text-red-600 dark:text-red-400 ml-2 flex-1 text-sm">
                    {validationError}
                  </Text>
                </View>
              ) : null}

              {/* First Name */}
              <View className="mb-3 sm:mb-4">
                <Text className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  First Name
                </Text>
                <View className="relative">
                  <View 
                    className="absolute left-3 sm:left-4 z-10"
                    style={{ top: Platform.OS === 'web' ? 16 : 14, height: 20 }}
                  >
                    <Ionicons name="person-outline" size={Platform.OS === 'web' ? 20 : 18} color="#9ca3af" />
                  </View>
                  <TextInput
                    value={firstName}
                    onChangeText={(text) => {
                      setFirstName(text);
                      setValidationError('');
                    }}
                    placeholder="Enter your first name"
                    placeholderTextColor="#9CA3AF"
                    autoCapitalize="words"
                    className="w-full rounded-xl px-10 sm:px-12 py-3 sm:py-4 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-2 border-gray-200 dark:border-gray-600"
                    style={{ fontSize: Platform.OS === 'web' ? 16 : 14 }}
                  />
                </View>
              </View>

              {/* Last Name */}
              <View className="mb-3 sm:mb-4">
                <Text className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Last Name
                </Text>
                <View className="relative">
                  <View 
                    className="absolute left-3 sm:left-4 z-10"
                    style={{ top: Platform.OS === 'web' ? 16 : 14, height: 20 }}
                  >
                    <Ionicons name="person-outline" size={Platform.OS === 'web' ? 20 : 18} color="#9ca3af" />
                  </View>
                  <TextInput
                    value={lastName}
                    onChangeText={(text) => {
                      setLastName(text);
                      setValidationError('');
                    }}
                    placeholder="Enter your last name"
                    placeholderTextColor="#9CA3AF"
                    autoCapitalize="words"
                    className="w-full rounded-xl px-10 sm:px-12 py-3 sm:py-4 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-2 border-gray-200 dark:border-gray-600"
                    style={{ fontSize: Platform.OS === 'web' ? 16 : 14 }}
                  />
                </View>
              </View>

              {/* Role Dropdown */}
              <View className="mb-3 sm:mb-4">
                <Text className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Role
                </Text>
                <View style={{ zIndex: 1000, elevation: 10 }}>
                  <Dropdown
                    style={{
                      marginBottom: 4,
                      borderWidth: 2,
                      borderColor: isFocusRole ? '#3b82f6' : '#e5e7eb',
                      borderRadius: 12,
                      padding: Platform.OS === 'web' ? 12 : 10,
                      backgroundColor: '#f9fafb',
                      minHeight: Platform.OS === 'web' ? 56 : 48,
                    }}
                    containerStyle={{
                      borderRadius: 12,
                      borderWidth: 2,
                      borderColor: '#e5e7eb',
                    }}
                    itemContainerStyle={{
                      padding: 12,
                    }}
                    selectedTextStyle={{
                      fontSize: 16,
                      color: '#111827',
                    }}
                    placeholderStyle={{
                      fontSize: 16,
                      color: '#9CA3AF',
                    }}
                    data={roleDropdown}
                    labelField="label"
                    valueField="value"
                    placeholder={!isFocusRole ? 'Select Role' : ' '}
                    value={role}
                    onFocus={() => setIsFocusRole(true)}
                    onBlur={() => setIsFocusRole(false)}
                    onChange={item => {
                      setRole(item.value);
                      setIsFocusRole(false);
                      setValidationError('');
                    }}
                    renderLeftIcon={() => (
                      <View className="mr-3">
                        <Ionicons name="shield-outline" size={20} color="#9ca3af" />
                      </View>
                    )}
                  />
                </View>
              </View>

              {/* Email */}
              <View className="mb-3 sm:mb-4">
                <Text className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Email Address
                </Text>
                <View className="relative">
                  <View 
                    className="absolute left-3 sm:left-4 z-10"
                    style={{ top: Platform.OS === 'web' ? 16 : 14, height: 20 }}
                  >
                    <Ionicons name="mail-outline" size={Platform.OS === 'web' ? 20 : 18} color="#9ca3af" />
                  </View>
                  <TextInput
                    value={email}
                    onChangeText={(text) => {
                      setEmail(text);
                      setValidationError('');
                    }}
                    placeholder="Enter your email"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    className="w-full rounded-xl px-10 sm:px-12 py-3 sm:py-4 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-2 border-gray-200 dark:border-gray-600"
                    style={{ fontSize: Platform.OS === 'web' ? 16 : 14 }}
                  />
                </View>
              </View>

              {/* Password */}
              <View className="mb-3 sm:mb-4">
                <Text className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Password
                </Text>
                <View className="relative">
                  <View 
                    className="absolute left-3 sm:left-4 z-10"
                    style={{ top: Platform.OS === 'web' ? 16 : 14, height: 20 }}
                  >
                    <Ionicons name="lock-closed-outline" size={Platform.OS === 'web' ? 20 : 18} color="#9ca3af" />
                  </View>
                  <TextInput
                    value={password}
                    onChangeText={(text) => {
                      setPassword(text);
                      setValidationError('');
                    }}
                    placeholder="Enter your password"
                    placeholderTextColor="#9CA3AF"
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    className="w-full rounded-xl px-10 sm:px-12 py-3 sm:py-4 pr-10 sm:pr-12 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-2 border-gray-200 dark:border-gray-600"
                    style={{ fontSize: Platform.OS === 'web' ? 16 : 14 }}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    className="absolute right-3 sm:right-4 z-10 p-2"
                    style={{ top: Platform.OS === 'web' ? 8 : 6 }}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={Platform.OS === 'web' ? 20 : 18}
                      color="#9ca3af"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Phone Number */}
              <View className="mb-3 sm:mb-4">
                <Text className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Phone Number
                </Text>
                <View className="relative">
                  <View 
                    className="absolute left-3 sm:left-4 z-10"
                    style={{ top: Platform.OS === 'web' ? 16 : 14, height: 20 }}
                  >
                    <Ionicons name="call-outline" size={Platform.OS === 'web' ? 20 : 18} color="#9ca3af" />
                  </View>
                  <TextInput
                    value={phoneNumber}
                    onChangeText={(text) => {
                      setPhoneNumber(text);
                      setValidationError('');
                    }}
                    placeholder="Enter your phone number"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="phone-pad"
                    className="w-full rounded-xl px-10 sm:px-12 py-3 sm:py-4 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-2 border-gray-200 dark:border-gray-600"
                    style={{ fontSize: Platform.OS === 'web' ? 16 : 14 }}
                  />
                </View>
              </View>

              {/* Date of Birth */}
              <View className="mb-3 sm:mb-4">
                <Text className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Date of Birth
                </Text>
                <input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => {
                    setDateOfBirth(e.target.value);
                    if (e.target.value) {
                      setDateOfBirthValue(new Date(e.target.value));
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '16px 12px',
                    borderRadius: '12px',
                    border: '2px solid #e5e7eb',
                    fontSize: '16px',
                    backgroundColor: '#f9fafb',
                    color: '#111827',
                  }}
                  className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </View>

              {/* Gender Dropdown */}
              <View className="mb-4">
                <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Gender
                </Text>
                <View style={{ zIndex: 999, elevation: 9 }}>
                  <Dropdown
                    style={{
                      marginBottom: 4,
                      borderWidth: 2,
                      borderColor: isFocusGender ? '#3b82f6' : '#e5e7eb',
                      borderRadius: 12,
                      padding: 12,
                      backgroundColor: '#f9fafb',
                      minHeight: 56,
                    }}
                    containerStyle={{
                      borderRadius: 12,
                      borderWidth: 2,
                      borderColor: '#e5e7eb',
                    }}
                    itemContainerStyle={{
                      padding: 12,
                    }}
                    selectedTextStyle={{
                      fontSize: 16,
                      color: '#111827',
                    }}
                    placeholderStyle={{
                      fontSize: 16,
                      color: '#9CA3AF',
                    }}
                    data={genderDropdown}
                    labelField="label"
                    valueField="value"
                    placeholder={!isFocusGender ? 'Select Gender' : ' '}
                    value={gender}
                    onFocus={() => setIsFocusGender(true)}
                    onBlur={() => setIsFocusGender(false)}
                    onChange={item => {
                      setGender(item.value);
                      setIsFocusGender(false);
                      setValidationError('');
                    }}
                    renderLeftIcon={() => (
                      <View className="mr-3">
                        <Ionicons name="people-outline" size={20} color="#9ca3af" />
                      </View>
                    )}
                  />
                </View>
              </View>

              {/* Street Address */}
              <View className="mb-3 sm:mb-4">
                <Text className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Street Address
                </Text>
                <View className="relative">
                  <View 
                    className="absolute left-3 sm:left-4 z-10"
                    style={{ top: Platform.OS === 'web' ? 16 : 14, height: 20 }}
                  >
                    <Ionicons name="home-outline" size={Platform.OS === 'web' ? 20 : 18} color="#9ca3af" />
                  </View>
                  <TextInput
                    value={streetAddress}
                    onChangeText={(text) => {
                      setStreetAddress(text);
                      setValidationError('');
                    }}
                    placeholder="Enter your street address"
                    placeholderTextColor="#9CA3AF"
                    autoCapitalize="words"
                    className="w-full rounded-xl px-10 sm:px-12 py-3 sm:py-4 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-2 border-gray-200 dark:border-gray-600"
                    style={{ fontSize: Platform.OS === 'web' ? 16 : 14 }}
                  />
                </View>
              </View>

              {/* City */}
              <View className="mb-3 sm:mb-4">
                <Text className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  City
                </Text>
                <View className="relative">
                  <View 
                    className="absolute left-3 sm:left-4 z-10"
                    style={{ top: Platform.OS === 'web' ? 16 : 14, height: 20 }}
                  >
                    <Ionicons name="location-outline" size={Platform.OS === 'web' ? 20 : 18} color="#9ca3af" />
                  </View>
                  <TextInput
                    value={city}
                    onChangeText={(text) => {
                      setCity(text);
                      setValidationError('');
                    }}
                    placeholder="Enter your city"
                    placeholderTextColor="#9CA3AF"
                    autoCapitalize="words"
                    className="w-full rounded-xl px-10 sm:px-12 py-3 sm:py-4 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-2 border-gray-200 dark:border-gray-600"
                    style={{ fontSize: Platform.OS === 'web' ? 16 : 14 }}
                  />
                </View>
              </View>

              {/* State */}
              <View className="mb-3 sm:mb-4">
                <Text className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  State
                </Text>
                <View style={{ zIndex: 998, elevation: 8 }}>
                  <Dropdown
                    style={{
                      marginBottom: 4,
                      borderWidth: 2,
                      borderColor: isFocusState ? '#3b82f6' : '#e5e7eb',
                      borderRadius: 12,
                      padding: Platform.OS === 'web' ? 12 : 10,
                      backgroundColor: '#f9fafb',
                      minHeight: Platform.OS === 'web' ? 56 : 48,
                    }}
                    containerStyle={{
                      borderRadius: 12,
                      borderWidth: 2,
                      borderColor: '#e5e7eb',
                    }}
                    itemContainerStyle={{
                      padding: 12,
                    }}
                    selectedTextStyle={{
                      fontSize: Platform.OS === 'web' ? 16 : 14,
                      color: '#111827',
                    }}
                    placeholderStyle={{
                      fontSize: Platform.OS === 'web' ? 16 : 14,
                      color: '#9CA3AF',
                    }}
                    data={stateDropdown}
                    labelField="label"
                    valueField="value"
                    placeholder={!isFocusState ? 'Select State' : ' '}
                    value={state}
                    onFocus={() => setIsFocusState(true)}
                    onBlur={() => setIsFocusState(false)}
                    onChange={item => {
                      setState(item.value);
                      setIsFocusState(false);
                      setValidationError('');
                    }}
                    renderLeftIcon={() => (
                      <View className="mr-3">
                        <Ionicons name="map-outline" size={Platform.OS === 'web' ? 20 : 18} color="#9ca3af" />
                      </View>
                    )}
                    search
                    searchPlaceholder="Search states..."
                  />
                </View>
              </View>

              {/* Zipcode */}
              <View className="mb-4 sm:mb-6">
                <Text className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Zipcode
                </Text>
                <View className="relative">
                  <View 
                    className="absolute left-3 sm:left-4 z-10"
                    style={{ top: Platform.OS === 'web' ? 16 : 14, height: 20 }}
                  >
                    <Ionicons name="mail-outline" size={Platform.OS === 'web' ? 20 : 18} color="#9ca3af" />
                  </View>
                  <TextInput
                    value={zipcode}
                    onChangeText={(text) => {
                      setZipcode(text);
                      setValidationError('');
                    }}
                    placeholder="Enter your zipcode"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="number-pad"
                    className="w-full rounded-xl px-10 sm:px-12 py-3 sm:py-4 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-2 border-gray-200 dark:border-gray-600"
                    style={{ fontSize: Platform.OS === 'web' ? 16 : 14 }}
                  />
                </View>
              </View>

              {/* Register Button */}
              <TouchableOpacity
                onPress={handleRegister}
                disabled={loading}
                activeOpacity={0.8}
                className="w-full py-3 sm:py-4 rounded-xl shadow-lg mb-4 sm:mb-6"
                style={{
                  backgroundColor: loading ? '#9ca3af' : '#3b82f6',
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? (
                  <View className="flex-row items-center justify-center">
                    <ActivityIndicator size="small" color="#fff" />
                    <Text className="text-white text-center text-base sm:text-lg font-semibold ml-2">
                      Creating account...
                    </Text>
                  </View>
                ) : (
                  <View className="flex-row items-center justify-center">
                    <Text className="text-white text-center text-base sm:text-lg font-semibold mr-2">
                      Create Account
                    </Text>
                    <Ionicons name="arrow-forward" size={Platform.OS === 'web' ? 20 : 18} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>

                  {/* Login Link */}
                  <View className="flex-row justify-center items-center pt-4 border-t border-gray-200 dark:border-gray-700">
                    <Text className="text-gray-600 dark:text-gray-400 text-base">
                      Already have an account?{' '}
                    </Text>
                    <TouchableOpacity
                      onPress={() => router.push('/')}
                      activeOpacity={0.7}
                    >
                      <Text className="text-blue-500 dark:text-blue-400 text-base font-semibold">
                        Sign in
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>
              </View>
            </View>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={{ 
              flexGrow: 1,
              paddingVertical: 24,
              paddingHorizontal: 16,
            }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View className="flex-1 justify-center items-center px-4 py-6">
              {/* Logo/Icon Section - Outside Card */}
              <View className="mb-6 items-center">
                <View className="bg-blue-500 dark:bg-blue-600 rounded-3xl p-4 mb-3 shadow-2xl">
                  <Ionicons name="person-add" size={40} color="#fff" />
                </View>
                <Text className="text-3xl font-bold mb-2 text-gray-900 dark:text-white text-center">
                  Create Account
                </Text>
                <Text className="text-sm text-gray-600 dark:text-gray-400 text-center px-4">
                  Sign up to get started
                </Text>
              </View>

              <View className="w-full bg-white dark:bg-gray-800 rounded-3xl p-4 shadow-2xl border border-gray-100 dark:border-gray-700">
                {validationError ? (
                  <View className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex-row items-center">
                    <Ionicons name="alert-circle" size={20} color="#ef4444" />
                    <Text className="text-red-600 dark:text-red-400 ml-2 flex-1 text-sm">
                      {validationError}
                    </Text>
                  </View>
                ) : null}

                {/* First Name */}
                <View className="mb-3">
                  <Text className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    First Name
                  </Text>
                  <View className="relative">
                    <View 
                      className="absolute left-3 z-10"
                      style={{ top: 14, height: 20 }}
                    >
                      <Ionicons name="person-outline" size={18} color="#9ca3af" />
                    </View>
                    <TextInput
                      value={firstName}
                      onChangeText={(text) => {
                        setFirstName(text);
                        setValidationError('');
                      }}
                      placeholder="Enter your first name"
                      placeholderTextColor="#9CA3AF"
                      autoCapitalize="words"
                      className="w-full rounded-xl px-10 py-3 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-2 border-gray-200 dark:border-gray-600"
                      style={{ fontSize: 14 }}
                    />
                  </View>
                </View>

                {/* Last Name */}
                <View className="mb-3">
                  <Text className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Last Name
                  </Text>
                  <View className="relative">
                    <View 
                      className="absolute left-3 z-10"
                      style={{ top: 14, height: 20 }}
                    >
                      <Ionicons name="person-outline" size={18} color="#9ca3af" />
                    </View>
                    <TextInput
                      value={lastName}
                      onChangeText={(text) => {
                        setLastName(text);
                        setValidationError('');
                      }}
                      placeholder="Enter your last name"
                      placeholderTextColor="#9CA3AF"
                      autoCapitalize="words"
                      className="w-full rounded-xl px-10 py-3 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-2 border-gray-200 dark:border-gray-600"
                      style={{ fontSize: 14 }}
                    />
                  </View>
                </View>

                {/* Role Dropdown */}
                <View className="mb-3">
                  <Text className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Role
                  </Text>
                  <View style={{ zIndex: 1000, elevation: 10 }}>
                    <Dropdown
                      style={{
                        marginBottom: 4,
                        borderWidth: 2,
                        borderColor: isFocusRole ? '#3b82f6' : '#e5e7eb',
                        borderRadius: 12,
                        padding: 10,
                        backgroundColor: '#f9fafb',
                        minHeight: 48,
                      }}
                      containerStyle={{
                        borderRadius: 12,
                        borderWidth: 2,
                        borderColor: '#e5e7eb',
                      }}
                      itemContainerStyle={{
                        padding: 12,
                      }}
                      selectedTextStyle={{
                        fontSize: 14,
                        color: '#111827',
                      }}
                      placeholderStyle={{
                        fontSize: 14,
                        color: '#9CA3AF',
                      }}
                      data={roleDropdown}
                      labelField="label"
                      valueField="value"
                      placeholder={!isFocusRole ? 'Select Role' : ' '}
                      value={role}
                      onFocus={() => setIsFocusRole(true)}
                      onBlur={() => setIsFocusRole(false)}
                      onChange={item => {
                        setRole(item.value);
                        setIsFocusRole(false);
                        setValidationError('');
                      }}
                      renderLeftIcon={() => (
                        <View className="mr-3">
                          <Ionicons name="person-outline" size={18} color="#9ca3af" />
                        </View>
                      )}
                    />
                  </View>
                </View>

                {/* Email */}
                <View className="mb-3">
                  <Text className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Email Address
                  </Text>
                  <View className="relative">
                    <View 
                      className="absolute left-3 z-10"
                      style={{ top: 14, height: 20 }}
                    >
                      <Ionicons name="mail-outline" size={18} color="#9ca3af" />
                    </View>
                    <TextInput
                      value={email}
                      onChangeText={(text) => {
                        setEmail(text);
                        setValidationError('');
                      }}
                      placeholder="Enter your email"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      className="w-full rounded-xl px-10 py-3 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-2 border-gray-200 dark:border-gray-600"
                      style={{ fontSize: 14 }}
                    />
                  </View>
                </View>

                {/* Password */}
                <View className="mb-3">
                  <Text className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Password
                  </Text>
                  <View className="relative">
                    <View 
                      className="absolute left-3 z-10"
                      style={{ top: 14, height: 20 }}
                    >
                      <Ionicons name="lock-closed-outline" size={18} color="#9ca3af" />
                    </View>
                    <TextInput
                      value={password}
                      onChangeText={(text) => {
                        setPassword(text);
                        setValidationError('');
                      }}
                      placeholder="Enter your password"
                      placeholderTextColor="#9CA3AF"
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      className="w-full rounded-xl px-10 py-3 pr-10 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-2 border-gray-200 dark:border-gray-600"
                      style={{ fontSize: 14 }}
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      className="absolute right-3 z-10 p-2"
                      style={{ top: 6 }}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={18}
                        color="#9ca3af"
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Phone Number */}
                <View className="mb-3">
                  <Text className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Phone Number
                  </Text>
                  <View className="relative">
                    <View 
                      className="absolute left-3 z-10"
                      style={{ top: 14, height: 20 }}
                    >
                      <Ionicons name="call-outline" size={18} color="#9ca3af" />
                    </View>
                    <TextInput
                      value={phoneNumber}
                      onChangeText={(text) => {
                        setPhoneNumber(text);
                        setValidationError('');
                      }}
                      placeholder="Enter your phone number"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="phone-pad"
                      className="w-full rounded-xl px-10 py-3 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-2 border-gray-200 dark:border-gray-600"
                      style={{ fontSize: 14 }}
                    />
                  </View>
                </View>

                {/* Date of Birth */}
                <View className="mb-3">
                  <Text className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Date of Birth
                  </Text>
                  <View className="relative">
                    <View 
                      className="absolute left-3 z-10"
                      style={{ top: 14, height: 20 }}
                    >
                      <Ionicons name="calendar-outline" size={18} color="#9ca3af" />
                    </View>
                    <TouchableOpacity
                      onPress={() => setShowDatePicker(true)}
                      className="bg-gray-50 dark:bg-gray-700 rounded-xl px-10 py-3 border-2 border-gray-200 dark:border-gray-600"
                      activeOpacity={0.7}
                    >
                      <Text className="text-gray-900 dark:text-white" style={{ fontSize: 14, marginLeft: 32 }}>
                        {dateOfBirth || 'Select date of birth'}
                      </Text>
                    </TouchableOpacity>
                    {showDatePicker && (
                      <View style={{ marginTop: 8 }}>
                        {Platform.OS === 'ios' && (
                          <View className="flex-row justify-end gap-2 mb-2">
                            <TouchableOpacity
                              onPress={() => setShowDatePicker(false)}
                              className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700"
                              activeOpacity={0.7}
                            >
                              <Text className="text-gray-700 dark:text-gray-300 font-semibold">Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={handleDateConfirm}
                              className="px-4 py-2 rounded-lg bg-blue-600"
                              activeOpacity={0.7}
                            >
                              <Text className="text-white font-semibold">Done</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                        <DateTimePicker
                          value={dateOfBirthValue || new Date(2000, 0, 1)}
                          mode="date"
                          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                          onChange={handleDateChange}
                          maximumDate={new Date()}
                        />
                      </View>
                    )}
                  </View>
                </View>

                {/* Gender Dropdown */}
                <View className="mb-3">
                  <Text className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Gender
                  </Text>
                  <View style={{ zIndex: 999, elevation: 9 }}>
                    <Dropdown
                      style={{
                        marginBottom: 4,
                        borderWidth: 2,
                        borderColor: isFocusGender ? '#3b82f6' : '#e5e7eb',
                        borderRadius: 12,
                        padding: 10,
                        backgroundColor: '#f9fafb',
                        minHeight: 48,
                      }}
                      containerStyle={{
                        borderRadius: 12,
                        borderWidth: 2,
                        borderColor: '#e5e7eb',
                      }}
                      itemContainerStyle={{
                        padding: 12,
                      }}
                      selectedTextStyle={{
                        fontSize: 14,
                        color: '#111827',
                      }}
                      placeholderStyle={{
                        fontSize: 14,
                        color: '#9CA3AF',
                      }}
                      data={genderDropdown}
                      labelField="label"
                      valueField="value"
                      placeholder={!isFocusGender ? 'Select Gender' : ' '}
                      value={gender}
                      onFocus={() => setIsFocusGender(true)}
                      onBlur={() => setIsFocusGender(false)}
                      onChange={item => {
                        setGender(item.value);
                        setIsFocusGender(false);
                        setValidationError('');
                      }}
                      renderLeftIcon={() => (
                        <View className="mr-3">
                          <Ionicons name="people-outline" size={18} color="#9ca3af" />
                        </View>
                      )}
                    />
                  </View>
                </View>

                {/* Street Address */}
                <View className="mb-3">
                  <Text className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Street Address
                  </Text>
                  <View className="relative">
                    <View 
                      className="absolute left-3 z-10"
                      style={{ top: 14, height: 20 }}
                    >
                      <Ionicons name="home-outline" size={18} color="#9ca3af" />
                    </View>
                    <TextInput
                      value={streetAddress}
                      onChangeText={(text) => {
                        setStreetAddress(text);
                        setValidationError('');
                      }}
                      placeholder="Enter your street address"
                      placeholderTextColor="#9CA3AF"
                      autoCapitalize="words"
                      className="w-full rounded-xl px-10 py-3 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-2 border-gray-200 dark:border-gray-600"
                      style={{ fontSize: 14 }}
                    />
                  </View>
                </View>

                {/* City */}
                <View className="mb-3">
                  <Text className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    City
                  </Text>
                  <View className="relative">
                    <View 
                      className="absolute left-3 z-10"
                      style={{ top: 14, height: 20 }}
                    >
                      <Ionicons name="location-outline" size={18} color="#9ca3af" />
                    </View>
                    <TextInput
                      value={city}
                      onChangeText={(text) => {
                        setCity(text);
                        setValidationError('');
                      }}
                      placeholder="Enter your city"
                      placeholderTextColor="#9CA3AF"
                      autoCapitalize="words"
                      className="w-full rounded-xl px-10 py-3 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-2 border-gray-200 dark:border-gray-600"
                      style={{ fontSize: 14 }}
                    />
                  </View>
                </View>

                {/* State */}
                <View className="mb-3">
                  <Text className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    State
                  </Text>
                  <View style={{ zIndex: 998, elevation: 8 }}>
                    <Dropdown
                      style={{
                        marginBottom: 4,
                        borderWidth: 2,
                        borderColor: isFocusState ? '#3b82f6' : '#e5e7eb',
                        borderRadius: 12,
                        padding: 10,
                        backgroundColor: '#f9fafb',
                        minHeight: 48,
                      }}
                      containerStyle={{
                        borderRadius: 12,
                        borderWidth: 2,
                        borderColor: '#e5e7eb',
                      }}
                      itemContainerStyle={{
                        padding: 12,
                      }}
                      selectedTextStyle={{
                        fontSize: 14,
                        color: '#111827',
                      }}
                      placeholderStyle={{
                        fontSize: 14,
                        color: '#9CA3AF',
                      }}
                      data={stateDropdown}
                      labelField="label"
                      valueField="value"
                      placeholder={!isFocusState ? 'Select State' : ' '}
                      value={state}
                      onFocus={() => setIsFocusState(true)}
                      onBlur={() => setIsFocusState(false)}
                      onChange={item => {
                        setState(item.value);
                        setIsFocusState(false);
                        setValidationError('');
                      }}
                      renderLeftIcon={() => (
                        <View className="mr-3">
                          <Ionicons name="map-outline" size={18} color="#9ca3af" />
                        </View>
                      )}
                      search
                      searchPlaceholder="Search states..."
                    />
                  </View>
                </View>

                {/* Zipcode */}
                <View className="mb-4">
                  <Text className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Zipcode
                  </Text>
                  <View className="relative">
                    <View 
                      className="absolute left-3 z-10"
                      style={{ top: 14, height: 20 }}
                    >
                      <Ionicons name="mail-outline" size={18} color="#9ca3af" />
                    </View>
                    <TextInput
                      value={zipcode}
                      onChangeText={(text) => {
                        setZipcode(text);
                        setValidationError('');
                      }}
                      placeholder="Enter your zipcode"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="number-pad"
                      className="w-full rounded-xl px-10 py-3 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-2 border-gray-200 dark:border-gray-600"
                      style={{ fontSize: 14 }}
                    />
                  </View>
                </View>

                {/* Register Button */}
                <TouchableOpacity
                  onPress={handleRegister}
                  disabled={loading}
                  activeOpacity={0.8}
                  className="w-full py-3 rounded-xl shadow-lg mb-4"
                  style={{
                    backgroundColor: loading ? '#9ca3af' : '#3b82f6',
                    opacity: loading ? 0.7 : 1,
                  }}
                >
                  {loading ? (
                    <View className="flex-row items-center justify-center">
                      <ActivityIndicator size="small" color="#fff" />
                      <Text className="text-white text-center text-base font-semibold ml-2">
                        Creating account...
                      </Text>
                    </View>
                  ) : (
                    <View className="flex-row items-center justify-center">
                      <Text className="text-white text-center text-base font-semibold mr-2">
                        Create Account
                      </Text>
                      <Ionicons name="arrow-forward" size={18} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>

                {/* Login Link */}
                <View className="flex-row justify-center items-center pt-4 border-t border-gray-200 dark:border-gray-700">
                  <Text className="text-gray-600 dark:text-gray-400 text-base">
                    Already have an account?{' '}
                  </Text>
                  <TouchableOpacity
                    onPress={() => router.push('/')}
                    activeOpacity={0.7}
                  >
                    <Text className="text-blue-500 dark:text-blue-400 text-base font-semibold">
                      Sign in
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
