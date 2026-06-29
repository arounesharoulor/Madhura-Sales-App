import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL, API_FALLBACK_URL } from '../utils/constants';

const api = axios.create({
  baseURL: API_URL,
  timeout: 60000, // Increased to 60s to allow Render free tier to wake up
});
console.log('API_URL:', API_URL, 'API_FALLBACK_URL:', API_FALLBACK_URL);

// Request Interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor to handle network errors globally
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config || {};
    const fallbackUrls = [API_FALLBACK_URL];

    if (!error.response) {
      config._retryCount = (config._retryCount || 0) + 1;
      const nextFallback = fallbackUrls.find((url) => url !== config.baseURL && url !== API_URL);
      if (config._retryCount === 1 && nextFallback) {
        config.baseURL = nextFallback;
        console.warn('Primary API host failed, retrying with fallback host:', nextFallback);
        return api(config);
      }

      console.error('API request failed without response. Check network and host:', config.baseURL || API_URL, {
        message: error.message,
        baseURL: config.baseURL,
        url: config.url,
        method: config.method,
      });
    }

    if (error.response && error.response.status === 401) {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
    }

    return Promise.reject(error);
  }
);

export default api;
