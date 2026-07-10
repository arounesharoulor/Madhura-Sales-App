import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, ActivityIndicator, TouchableOpacity,
  StyleSheet, Alert, Platform, RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppLayout from '../components/AppLayout';
import api from '../api/api';

export default function EmployeeMonitoringScreen() {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLiveLocations = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await api.get('/locations/latest');
      setLocations(res.data.data || []);
    } catch (e) {
      Alert.alert('Error', 'Unable to load live locations.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchLiveLocations();
  }, [fetchLiveLocations]);

  const openInMap = (lat, lng) => {
    if (!lat || !lng) { Alert.alert('No coordinates available'); return; }
    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    if (Platform.OS === 'web') window.open(url, '_blank');
    else require('react-native').Linking.openURL(url).catch(() => {});
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(item.executiveName || 'U').charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardName}>{item.executiveName || 'Unknown'}</Text>
          <Text style={styles.cardSub}>
            {item.employeeId ? `#${item.employeeId}  ·  ` : ''}{item.designation || 'Field Executive'}
          </Text>
        </View>
        <View style={[styles.badge, { backgroundColor: item.latitude ? '#e0f2fe' : '#f1f5f9', borderColor: item.latitude ? '#bae6fd' : '#e2e8f0' }]}>
          <Text style={[styles.badgeText, { color: item.latitude ? '#0284c7' : '#64748b' }]}>
            {item.latitude ? 'Online' : 'No Signal'}
          </Text>
        </View>
      </View>
      {item.latitude && (
        <TouchableOpacity style={styles.mapRow} onPress={() => openInMap(item.latitude, item.longitude)}>
          <Ionicons name="location-outline" size={14} color="#0284c7" />
          <Text style={styles.mapText}>
            {item.latitude.toFixed(5)}, {item.longitude.toFixed(5)} · Open in Maps →
          </Text>
        </TouchableOpacity>
      )}
      {item.timestamp && (
        <View style={styles.timeRow}>
          <Ionicons name="time-outline" size={13} color="#94a3b8" />
          <Text style={styles.timeText}>
            Last updated: {new Date(item.timestamp).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, month: 'short', day: 'numeric' })}
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <AppLayout currentScreen="EmployeeMonitoring" role="Admin" scrollable={false}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Track Field Staff</Text>
            <Text style={styles.subtitle}>Live GPS Monitoring</Text>
          </View>
          <TouchableOpacity style={styles.refreshBtn} onPress={() => fetchLiveLocations(true)}>
            <Ionicons name="refresh" size={18} color="#0284c7" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color="#0284c7" size="large" style={{ marginTop: 60 }} />
        ) : (
          <FlatList
            data={locations}
            keyExtractor={(i, idx) => i.executive?.toString() || idx.toString()}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchLiveLocations(true)} tintColor="#0284c7" />}
            ListEmptyComponent={() => (
              <View style={styles.empty}>
                <Ionicons name="location-outline" size={56} color="#cbd5e1" />
                <Text style={styles.emptyTitle}>No Locations Found</Text>
                <Text style={styles.emptyText}>Staff locations will appear here once they are online.</Text>
              </View>
            )}
          />
        )}
      </View>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 16, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  subtitle: { fontSize: 13, color: '#64748b', marginTop: 2 },
  refreshBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#e0f2fe', alignItems: 'center', justifyContent: 'center' },
  
  list: { paddingBottom: 32 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 80 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#334155', marginTop: 14 },
  emptyText: { fontSize: 13, color: '#94a3b8', marginTop: 4, textAlign: 'center' },

  card: {
    backgroundColor: '#fff', borderRadius: 18, padding: 16, marginBottom: 14,
    borderWidth: 1, borderColor: '#f1f5f9', elevation: 2,
    borderLeftColor: '#0284c7', borderLeftWidth: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#e0f2fe', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontWeight: '800', fontSize: 18, color: '#0284c7' },
  cardName: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  cardSub: { fontSize: 12, color: '#64748b', marginTop: 2 },
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99, borderWidth: 1 },
  badgeText: { fontSize: 11, fontWeight: '700' },

  mapRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, backgroundColor: '#f0f9ff', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  mapText: { fontSize: 12, color: '#0284c7', fontWeight: '700' },
  
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10 },
  timeText: { fontSize: 11, color: '#94a3b8' },
});
