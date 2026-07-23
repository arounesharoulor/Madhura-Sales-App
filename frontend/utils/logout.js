import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { disconnectSocket } from './socket';
import api from '../api/api';

/**
 * Centralized logout utility.
 * Calls the backend to clear the active session token, then clears local storage.
 */
export const performLogout = async (navigation) => {
  try {
    // Tell backend to clear the active session token for this user
    await api.post('/auth/logout');
  } catch (_) {
    // Even if the API call fails (e.g. no network), we still clear local state
  }
  disconnectSocket();
  await AsyncStorage.clear();
  router.replace('/Login');
};
