import React from 'react';
import renderer, { act } from 'react-test-renderer';
import MedicationCalendar from '../(patient)/MedicationCalendar';

// Mock external modules
jest.mock('axios');
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('expo-notifications', () => ({}));
jest.mock('expo-constants', () => ({
  expoConfig: { extra: { API_URL: 'http://mock-api' } },
}));
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve('fake-token')),
}));
jest.mock('../utils/notifications', () => ({
  registerForPushNotificationsAsync: jest.fn(),
}));

it('renders MedicationCalendar correctly', async () => {
  let tree;

  await act(async () => {
    tree = renderer.create(<MedicationCalendar />);
  });

  expect(tree.toJSON()).toMatchSnapshot();
});
