import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

export default function PendingApprovalScreen() {
  const pollInterval = useRef(null);

  useEffect(() => {
    const checkApprovalStatus = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        const userStr = await AsyncStorage.getItem('user');
        if (!token || !userStr) {
          router.replace('/Login');
          return;
        }

        const userObj = JSON.parse(userStr);
        const userId = userObj._id || userObj.id;
        const res = await api.get(`/users/${userId}`);
        if (res.data?.data?.isApproved) {
          // User is approved, stop polling and navigate to Dashboard
          clearInterval(pollInterval.current);
          
          // Update local storage just in case
          await AsyncStorage.setItem('user', JSON.stringify(res.data.data));
          
          router.replace('/Dashboard');
        }
      } catch (err) {
        console.error('Polling error:', err);
        // If unauthorized or deleted, boot them to login
        if (err.response && (err.response.status === 401 || err.response.status === 404)) {
          clearInterval(pollInterval.current);
          await AsyncStorage.removeItem('token');
          await AsyncStorage.removeItem('user');
          router.replace('/Login');
        }
      }
    };

    // Initial check
    checkApprovalStatus();

    // Set up polling every 5 seconds
    pollInterval.current = setInterval(checkApprovalStatus, 5000);

    return () => {
      if (pollInterval.current) {
        clearInterval(pollInterval.current);
      }
    };
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="time-outline" size={80} color="#0ea5e9" />
        </View>
        <Text style={styles.title}>Account Under Review</Text>
        <Text style={styles.subtitle}>
          Your account has been successfully created and is waiting for administrator approval.
        </Text>
        <Text style={styles.subtext}>
          Please wait on this screen. You will be automatically logged in once the Super Admin approves your account.
        </Text>
        
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#0ea5e9" />
          <Text style={styles.loadingText}>Checking status...</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: '100%',
    maxWidth: 400,
    padding: 24,
    alignItems: 'center',
  },
  iconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#e0f2fe',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 16,
  },
  subtext: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 40,
  },
  loaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  loadingText: {
    marginLeft: 12,
    fontSize: 15,
    fontWeight: '600',
    color: '#0ea5e9',
  }
});
