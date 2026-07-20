import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppLayout from '../components/AppLayout';
import api from '../api/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function QuotationScreen({ navigation }) {
  const [role, setRole] = useState('Field Executive');
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const stored = await AsyncStorage.getItem('user');
      if (stored) setRole(JSON.parse(stored).role);
      fetchQuotations();
    };
    load();
  }, []);

  const fetchQuotations = async () => {
    try {
      setLoading(true);
      const res = await api.get('/quotations');
      setQuotations(res.data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout currentScreen="Quotation" role={role} scrollable={false}>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Text style={{ fontSize: 24, fontWeight: '900', color: '#0f172a' }}>Quotations</Text>
          <TouchableOpacity style={{ backgroundColor: '#0f172a', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 }}>
             <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>+ Add Quote</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color="#0f172a" /></View>
        ) : quotations.length === 0 ? (
           <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
             <Ionicons name="document-text-outline" size={48} color="#94a3b8" />
             <Text style={{ fontSize: 16, fontWeight: '700', color: '#475569' }}>No quotations created yet.</Text>
           </View>
        ) : (
          <ScrollView contentContainerStyle={{ paddingBottom: 80 }}>
            {quotations.map((quote) => (
              <View key={quote._id} style={{ backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' }}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#0f172a' }}>{quote.project?.name}</Text>
                <Text style={{ fontSize: 14, color: '#64748b', marginBottom: 8 }}>{quote.description}</Text>
                
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                   <Text style={{ fontSize: 16, color: '#0284c7', fontWeight: '900' }}>₹{quote.amount}</Text>
                   <Text style={{ fontSize: 12, color: quote.status === 'Pending' ? '#d97706' : '#16a34a', fontWeight: '700' }}>{quote.status}</Text>
                </View>
              </View>
            ))}
          </ScrollView>
        )}
      </View>
    </AppLayout>
  );
}
