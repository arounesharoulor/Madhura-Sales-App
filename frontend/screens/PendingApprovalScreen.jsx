import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, StatusBar, ActivityIndicator, Image, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

export default function PendingApprovalScreen() {
  const router = useRouter();
  const [error, setError] = useState('');

  useEffect(() => {
    let intervalId;

    const checkApprovalStatus = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (!token) {
          router.replace('/Login');
          return;
        }

        const res = await api.get('/users/profile');
        const user = res.data.data;
        
        if (user.isApproved) {
          // Clear interval if they are approved
          clearInterval(intervalId);
          await AsyncStorage.setItem('user', JSON.stringify(user));
          
          // Route to appropriate dashboard
          if (['Admin', 'Project Manager', 'Team Lead', 'HR', 'Managing Director MD'].includes(user.role)) {
            router.replace('/AdminDashboard');
          } else {
            router.replace('/Dashboard');
          }
        }
      } catch (err) {
        // If auth fails completely, boot to login
        if (err.response?.status === 401) {
          clearInterval(intervalId);
          await AsyncStorage.removeItem('token');
          await AsyncStorage.removeItem('user');
          router.replace('/Login');
        } else {
          console.log('Error checking approval status:', err.message);
        }
      }
    };

    // Check immediately, then poll every 5 seconds
    checkApprovalStatus();
    intervalId = setInterval(checkApprovalStatus, 5000);

    return () => clearInterval(intervalId);
  }, []);

  const handleLogout = async () => {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');
    router.replace('/Login');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      <View style={styles.container}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Ionicons name="time-outline" size={40} color="#F5A623" />
          </View>
          
          <Text style={styles.title}>Account Pending</Text>
          <Text style={styles.subtitle}>
            Your account has been created successfully, but it requires Admin approval before you can access the dashboard.
          </Text>
          
          <View style={styles.loaderBox}>
            <ActivityIndicator size="small" color="#2563eb" />
            <Text style={styles.loaderText}>Checking status automatically...</Text>
          </View>

          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn} activeOpacity={0.8}>
            <Text style={styles.logoutBtnText}>Sign Out for Now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF8EC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  loaderBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 32,
    gap: 10,
  },
  loaderText: {
    color: '#1d4ed8',
    fontSize: 13,
    fontWeight: '500',
  },
  logoutBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    width: '100%',
    alignItems: 'center',
  },
  logoutBtnText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '500',
  },
});
