import { Platform } from 'react-native';
import Constants from 'expo-constants';

const DEFAULT_LOCAL_HOST = '192.168.0.118';
const ANDROID_EMULATOR_HOST = '10.0.2.2';
const IOS_SIMULATOR_HOST = '127.0.0.1';

const resolveExpoHost = () => {
  const hostFromDebug =
    Constants.manifest?.debuggerHost ||
    Constants.manifest2?.debuggerHost ||
    Constants.expoConfig?.hostUri ||
    Constants.expoConfig?.packagerOpts?.host ||
    Constants.manifest?.packagerOpts?.host;
  return hostFromDebug?.split(':')[0];
};

const WEB_HOST = typeof window !== 'undefined' ? window.location.hostname : null;
const HOST_FROM_DEBUGGER = resolveExpoHost();
const LOCAL_HOST = WEB_HOST || HOST_FROM_DEBUGGER || DEFAULT_LOCAL_HOST;

const API_HOST = Platform.OS === 'web'
  ? LOCAL_HOST
  : Platform.OS === 'android'
    ? LOCAL_HOST          // Physical device on same WiFi → always use LAN IP
    : Platform.OS === 'ios'
      ? !Constants.isDevice
        ? IOS_SIMULATOR_HOST
        : LOCAL_HOST
      : LOCAL_HOST;

const STATIC_API_URL = process.env.EXPO_PUBLIC_API_URL ||
  Constants.expoConfig?.extra?.EXPO_PUBLIC_API_URL ||
  Constants.manifest?.extra?.EXPO_PUBLIC_API_URL;
const STATIC_SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL ||
  Constants.expoConfig?.extra?.EXPO_PUBLIC_SOCKET_URL ||
  Constants.manifest?.extra?.EXPO_PUBLIC_SOCKET_URL;

const FALLBACK_HOST = 'localhost';

export const API_URL = `http://${API_HOST}:5005/api`;
export const API_FALLBACK_URL = `http://${FALLBACK_HOST}:5005/api`;
export const SOCKET_URL = `http://${API_HOST}:5005`;
export const THEME = {
  primary: '#0284c7', // sky-600
  backgroundDark: '#0f172a', // slate-900
  backgroundLight: '#f8fafc', // slate-50
};
