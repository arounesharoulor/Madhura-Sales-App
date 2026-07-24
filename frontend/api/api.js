import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL, API_FALLBACK_URL } from '../utils/constants';

const api = axios.create({
  baseURL: API_URL,
  timeout: 60000, // 60s — enough for Render free tier cold start
});

console.log('API_URL:', API_URL, '| Fallback:', API_FALLBACK_URL);

// ── Request Interceptor: attach auth token ──────────────────────────────────
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

// ── Response Interceptor: handle network failures ───────────────────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;

    // Only retry on network errors (no HTTP response received)
    if (!error.response && config && config.url) {
      // First retry: try the production fallback URL (handles emulator→physical
      // switch or Render cold-start on the first call)
      if (!config._retried && config.baseURL !== API_FALLBACK_URL) {
        config._retried = true;
        
        // Axios might have made config.url absolute during the first try.
        // We need to strip the old baseURL so the new API_FALLBACK_URL is applied.
        if (config.url.startsWith('http')) {
          const relativeUrl = config.url.replace(config.baseURL, '');
          config.url = relativeUrl.startsWith('/') ? relativeUrl : `/${relativeUrl}`;
        }
        
        config.baseURL = API_FALLBACK_URL;
        api.defaults.baseURL = API_FALLBACK_URL; // Update globally so future requests don't fail!
        console.warn(`Network error — retrying against production: ${API_FALLBACK_URL}${config.url}`);

        // Small delay to let Render wake up if it was cold
        await new Promise((r) => setTimeout(r, 500));
        return api(config);
      }

      // All retries exhausted — surface a clean error
      console.error('API unreachable after retry. Check your internet connection.', {
        url: config.url,
        method: config.method,
        baseURL: config.baseURL,
      });
    }

    // Auto-logout on 401
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      const { router } = require('expo-router');
      if (router) {
        try {
          router.replace('/Login');
        } catch (e) {}
      }
    }

    return Promise.reject(error);
  }
);

export default api;
