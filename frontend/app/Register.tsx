import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal
} from 'react-native';
import { router } from 'expo-router';
import { Dropdown } from 'react-native-element-dropdown';
import AsyncStorage from '@react-native-async-storage/async-storage';

import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.API_URL ?? 'http://localhost:3000';

export default function LoginScreen() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipcode, setZipcode] = useState('');
  const [validationError, setValidationError] = useState('');
  
  const [isFocusRole, setIsFocusRole] = useState(false);
  const [isFocusGender, setIsFocusGender] = useState(false);
  const [isFocusState, setIsFocusState] = useState(false);
  const [showStateModal, setShowStateModal] = useState(false);
  const [stateSearch, setStateSearch] = useState('');

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
  // ISSUE: page is not scrollable when in list, so you can only see a few entries at a time
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

  const handleRegister = async () => {
    // Validation for empty fields
    if (!firstName || !lastName || !role || !email || !password || !phoneNumber 
      || !dateOfBirth || !gender || !streetAddress || !city || !state || !zipcode) {
      setValidationError('Please fill out all fields before proceeding.');
      return;
    } else {
      setValidationError('');
    }

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
        // Will set the validation error to the message return from registration validation
        setValidationError(data.message);
        return;
      }
      // Save the token in Async storage to keep the user logged in
      await AsyncStorage.setItem('token', data.token);
      // Role based redirection
      if (data.role === 'admin') {
        router.push('/(admin)/AdminHome');
      } else if (data.role === 'provider') {
        router.push('/(provider)/ProviderHome');
      } else {
        router.push('/(patient)/PatientHome');
      }
    } catch (error) {
      console.error('Registration error', error);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 px-6 bg-white dark:bg-gray-900 transition-colors duration-300"
      style={{ flex: 1 }}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled={true}
      >
      <View className="w-full max-w-sm">
        <Text className="text-3xl font-bold mb-8 text-center text-gray-800 dark:text-white">
          Register
        </Text>

        {/* First Name & Last Name */}
        <TextInput placeholder="First Name" value={firstName} onChangeText={setFirstName} className="mb-4 rounded-xl px-4 py-3 bg-gray-100" />
        <TextInput placeholder="Last Name" value={lastName} onChangeText={setLastName} className="mb-4 rounded-xl px-4 py-3 bg-gray-100" />

        {/* Role Dropdown */}
        <View style={{ zIndex: 1000, elevation: 10 }}>
          <Dropdown
            style={{ marginBottom: 4, borderWidth: 1, borderColor: isFocusRole ? '#3b82f6' : '#e5e7eb', borderRadius: 10, padding: 10 }}
            data={roleDropdown}
            labelField="label"
            valueField="value"
            placeholder={!isFocusRole ? 'Select Role' : ' '}
            value={role}
            onFocus={() => setIsFocusRole(true)}
            onBlur={() => setIsFocusRole(false)}
            onChange={item => { setRole(item.value); setIsFocusRole(false); }}
          />
        </View>

        {/* Email & Password */}
        <TextInput placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" className="mb-4 rounded-xl px-4 py-3 bg-gray-100" />
        <TextInput placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry className="mb-4 rounded-xl px-4 py-3 bg-gray-100" />

        {/* Phone Number & Date of Birth */}
        <TextInput placeholder="Phone Number" value={phoneNumber} onChangeText={setPhoneNumber} keyboardType="number-pad" className="mb-4 rounded-xl px-4 py-3 bg-gray-100" />
        <TextInput placeholder="Date of Birth (YYYY-MM-DD)" value={dateOfBirth} onChangeText={setDateOfBirth} className="mb-4 rounded-xl px-4 py-3 bg-gray-100" />

        {/* Gender Dropdown */}
        <View style={{ zIndex: 1000, elevation: 10 }}>
          <Dropdown
            style={{ marginBottom: 4, borderWidth: 1, borderColor: isFocusGender ? '#3b82f6' : '#e5e7eb', borderRadius: 10, padding: 10 }}
            data={genderDropdown}
            labelField="label"
            valueField="value"
            placeholder={!isFocusGender ? 'Select Gender' : ' '}
            value={gender}
            onFocus={() => setIsFocusGender(true)}
            onBlur={() => setIsFocusGender(false)}
            onChange={item => { setGender(item.value); setIsFocusGender(false); }}
          />
        </View>

        {/* Address inputs */}
        <TextInput placeholder="Street Address" value={streetAddress} onChangeText={setStreetAddress} className="mb-4 rounded-xl px-4 py-3 bg-gray-100" />
        <TextInput placeholder="City" value={city} onChangeText={setCity} className="mb-4 rounded-xl px-4 py-3 bg-gray-100" />

        {/* State Dropdown */}
        <TouchableOpacity
          onPress={() => { setShowStateModal(true); setIsFocusState(true); }}
          activeOpacity={0.8}
          className={`mb-4 rounded-xl px-4 py-3 bg-white-100 w-full`}
          style={{ borderWidth: 1, borderColor: isFocusState ? '#3b82f6' : '#e5e7eb' }}
        >
          <Text className={`${state ? 'text-black-900' : 'text-black-400'}`}>
            {state ? state : 'Select State'}
          </Text>
        </TouchableOpacity>

        <Modal visible={showStateModal} animationType="slide" transparent>
          <View className="flex-1 justify-center items-center bg-black/50">
            <View className="bg-white dark:bg-gray-800 rounded-xl p-4 w-11/12 max-h-[80%]">
              <Text className="text-lg font-semibold mb-2 text-gray-800 dark:text-white">Select State</Text>
              <TextInput
                value={stateSearch}
                onChangeText={setStateSearch}
                placeholder="Search states..."
                className="mb-3 rounded-md px-3 py-2 bg-gray-100"
              />
              <View style={{ maxHeight: 320 }}>
                <ScrollView nestedScrollEnabled>
                  {stateDropdown
                    .filter(s => s.label.toLowerCase().includes(stateSearch.toLowerCase()))
                    .map((s) => (
                      <TouchableOpacity
                        key={s.value}
                        onPress={() => {
                          setState(s.value);
                          setShowStateModal(false);
                          setStateSearch('');
                          setIsFocusState(false);
                        }}
                        className="py-2 border-b border-gray-200"
                      >
                        <Text className="text-gray-800 px-2">{s.label}</Text>
                      </TouchableOpacity>
                    ))}
                </ScrollView>
              </View>
              <View className="mt-4 flex-row justify-end">
                <TouchableOpacity onPress={() => { setShowStateModal(false); setStateSearch(''); setIsFocusState(false); }} className="px-4 py-2 bg-red-500 rounded-md">
                  <Text className="text-white">Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <TextInput placeholder="Zipcode" value={zipcode} onChangeText={setZipcode} keyboardType="number-pad" className="mb-6 rounded-xl px-4 py-3 bg-gray-100" />
        {validationError && <Text className="text-red-500 mb-4">{validationError}</Text>}

        <TouchableOpacity onPress={handleRegister} className="w-full bg-blue-500 py-3 rounded-xl mb-4">
          <Text className="text-white text-center font-semibold">Register</Text>
        </TouchableOpacity>

        <Text className="text-center">
          Already have an account?{' '}
          <Text className="text-blue-400" onPress={() => router.push('/')}>Log in here</Text>
        </Text>
      </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
