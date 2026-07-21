import React, { useState, useEffect } from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppLayout from '../components/AppLayout';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function InvoiceScreen({ navigation }) {
  const [role, setRole] = useState('Field Executive');

  useEffect(() => {
    const load = async () => {
      const stored = await AsyncStorage.getItem('user');
      if (stored) setRole(JSON.parse(stored).role);
    };
    load();
  }, []);

  return (
    <AppLayout currentScreen="Invoice" role={role} scrollable={true}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 12 }}>
        <Ionicons name="receipt-outline" size={48} color="#94a3b8" />
        <Text style={{ fontSize: 20, fontWeight: '800', color: '#0f172a' }}>Invoice Management</Text>
        <Text style={{ fontSize: 14, color: '#64748b', textAlign: 'center' }}>
          Billing and invoice generation functionality will be integrated here.
        </Text>
      </View>
    </AppLayout>
  );
}
