import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AppLayout from '../components/AppLayout';
import api from '../api/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function PaymentReceiptScreen() {
  const router = useRouter();
  const [role, setRole] = useState('Field Executive');
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const stored = await AsyncStorage.getItem('user');
      if (stored) setRole(JSON.parse(stored).role);
      fetchReceipts();
    };
    load();
  }, []);

  const fetchReceipts = async () => {
    try {
      setLoading(true);
      const res = await api.get('/payment-receipts');
      setReceipts(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout currentScreen="PaymentReceipt" role={role} scrollable={false}>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16, paddingHorizontal: 4 }}>
          <TouchableOpacity onPress={() => router.push(['Admin', 'Project Manager', 'Team Lead', 'Managing Director MD'].includes(role) ? '/AdminDashboard' : '/Dashboard')}>
            <Ionicons name="arrow-back" size={24} color="#0f172a" />
          </TouchableOpacity>
          <Text style={{ fontSize: 24, fontWeight: '500', color: '#0f172a' }}>Payment Receipts</Text>
        </View>

        <View style={{ backgroundColor: '#fff8ec', borderWidth: 1.5, borderColor: '#f5a623', borderRadius: 12, padding: 12, marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Ionicons name="information-circle" size={24} color="#f5a623" />
          <Text style={{ fontSize: 12, color: '#b45309', flex: 1, fontWeight: '500' }}>
            Document creation &amp; PDF sending is optimized for the Madhura CRM Web Client. Mobile view is read-only.
          </Text>
        </View>

        {loading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#0f172a" />
          </View>
        ) : receipts.length === 0 ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <Ionicons name="document-text-outline" size={48} color="#94a3b8" />
            <Text style={{ fontSize: 16, fontWeight: '500', color: '#475569' }}>No payment receipts found.</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={{ paddingBottom: 80 }} showsVerticalScrollIndicator={false}>
            {receipts.map((r) => (
              <View key={r.id} style={{ backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#0f172a' }}>{r.receipt_no}</Text>
                  <Text style={{ fontSize: 12, color: '#64748b' }}>{new Date(r.receipt_date).toLocaleDateString()}</Text>
                </View>
                <Text style={{ fontSize: 14, fontWeight: '500', color: '#334155', marginTop: 6 }}>{r.client_company || r.client_name}</Text>
                <Text style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Invoice No: {r.invoice_no}</Text>
                <Text style={{ fontSize: 12, color: '#64748b', marginTop: 1 }}>Service No: {r.service_no}</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 8 }}>
                  <Text style={{ fontSize: 12, color: '#64748b' }}>{r.payment_method}</Text>
                  <Text style={{ fontSize: 16, color: '#10b981', fontWeight: '700' }}>₹{Number(r.total_amount).toLocaleString()}</Text>
                </View>
              </View>
            ))}
          </ScrollView>
        )}
      </View>
    </AppLayout>
  );
}
