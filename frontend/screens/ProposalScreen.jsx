import React, { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppLayout from '../components/AppLayout';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ProposalScreen() {
  const [role, setRole] = useState('Field Executive');

  useEffect(() => {
    const load = async () => {
      const stored = await AsyncStorage.getItem('user');
      if (stored) setRole(JSON.parse(stored).role);
    };
    load();
  }, []);

  return (
    <AppLayout currentScreen="Proposal" role={role} scrollable={true}>
      <View style={{ flex: 1, minHeight: 400 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24, paddingHorizontal: 16 }}>
          <TouchableOpacity onPress={() => router.push(['Admin', 'Project Manager', 'Team Lead', 'Managing Director MD'].includes(role) ? '/AdminDashboard' : '/Dashboard')}>
            <Ionicons name="arrow-back" size={24} color="#0f172a" />
          </TouchableOpacity>
          <Text style={{ fontSize: 20, fontWeight: '500', color: '#0f172a' }}>Proposal Generation</Text>
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <Ionicons name="briefcase-outline" size={48} color="#94a3b8" />
          <Text style={{ fontSize: 14, color: '#64748b', textAlign: 'center' }}>
            Proposal document generation and tracking will be implemented here.
          </Text>
        </View>
      </View>
    </AppLayout>
  );
}
