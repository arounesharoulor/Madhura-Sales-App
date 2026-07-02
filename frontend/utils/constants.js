import { Platform } from 'react-native';
import Constants from 'expo-constants';

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
const LOCAL_HOST = WEB_HOST || HOST_FROM_DEBUGGER || '192.168.0.118';

const PRODUCTION_API_URL = 'https://madhura-sales-app.onrender.com/api';
const PRODUCTION_SOCKET_URL = 'https://madhura-sales-app.onrender.com';

// True when running as a deployed web app (not on localhost/emulator)
const isWebProduction = Platform.OS === 'web' &&
  typeof window !== 'undefined' &&
  WEB_HOST !== 'localhost' &&
  WEB_HOST !== '127.0.0.1';

// Detect emulators (not physical devices)
const isAndroidEmulator = Platform.OS === 'android' && !Constants.isDevice;
const isIosSimulator = Platform.OS === 'ios' && !Constants.isDevice;
const isEmulator = isAndroidEmulator || isIosSimulator;

const STATIC_API_URL = process.env.EXPO_PUBLIC_API_URL ||
  Constants.expoConfig?.extra?.EXPO_PUBLIC_API_URL ||
  Constants.manifest?.extra?.EXPO_PUBLIC_API_URL;
const STATIC_SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL ||
  Constants.expoConfig?.extra?.EXPO_PUBLIC_SOCKET_URL ||
  Constants.manifest?.extra?.EXPO_PUBLIC_SOCKET_URL;

// Resolution order:
// 1. Explicit env override (EXPO_PUBLIC_API_URL)
// 2. Android emulator → 10.0.2.2
// 3. iOS simulator → 127.0.0.1
// 4. Web dev (localhost) → local IP
// 5. Everything else (physical device, web prod) → Render production
export const API_URL = STATIC_API_URL ||
  (isAndroidEmulator ? `http://${ANDROID_EMULATOR_HOST}:5005/api` :
   isIosSimulator   ? `http://${IOS_SIMULATOR_HOST}:5005/api` :
   (Platform.OS === 'web' && !isWebProduction) ? `http://${LOCAL_HOST}:5005/api` :
   PRODUCTION_API_URL);

// Fallback is always the live production server
export const API_FALLBACK_URL = PRODUCTION_API_URL;

export const SOCKET_URL = STATIC_SOCKET_URL ||
  (isAndroidEmulator ? `http://${ANDROID_EMULATOR_HOST}:5005` :
   isIosSimulator   ? `http://${IOS_SIMULATOR_HOST}:5005` :
   (Platform.OS === 'web' && !isWebProduction) ? `http://${LOCAL_HOST}:5005` :
   PRODUCTION_SOCKET_URL);

export const THEME = {
  primary: '#0284c7',       // sky-600
  backgroundDark: '#0f172a', // slate-900
  backgroundLight: '#f8fafc', // slate-50
};
