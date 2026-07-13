import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, ActivityIndicator, TouchableOpacity,
  StyleSheet, Alert, Platform, RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import AppLayout from '../components/AppLayout';
import api from '../api/api';



const LocationCard = ({ item, openInMap, router }) => {
  const [expanded, setExpanded] = useState(false);

  return (
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
          {(item.overdueTasks > 0 || item.overdueFollowUps > 0) && (
            <Text style={{ fontSize: 11, color: '#dc2626', fontWeight: '700', marginTop: 3 }}>
              ⚠️ {(item.overdueTasks || 0) + (item.overdueFollowUps || 0)} Overdue Item{((item.overdueTasks || 0) + (item.overdueFollowUps || 0)) > 1 ? 's' : ''}
            </Text>
          )}
        </View>
        <TouchableOpacity
          style={styles.chatBtn}
          onPress={() => router.push(`/ChatScreen?partnerId=${item.executive}&partnerName=${item.executiveName}`)}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={16} color="#0284c7" />
          <Text style={styles.chatBtnText}>Chat</Text>
        </TouchableOpacity>
        <View style={[styles.badge, { backgroundColor: item.latitude ? '#e0f2fe' : '#f1f5f9', borderColor: item.latitude ? '#bae6fd' : '#e2e8f0' }]}>
          <Text style={[styles.badgeText, { color: item.latitude ? '#0284c7' : '#64748b' }]}>
            {item.latitude ? 'Online' : 'No Signal'}
          </Text>
        </View>
      </View>
      
      {item.latitude && (
        <View style={styles.addressBox}>
           <Text style={styles.addressText} numberOfLines={2}>
             <Ionicons name="location-outline" size={13} color="#64748b" /> {item.address || 'Address unavailable'}
           </Text>
        </View>
      )}

      {item.latitude && (
        <View style={{ marginTop: 12 }}>
          {Platform.OS === 'web' ? React.createElement('iframe', {
             width: '100%',
             height: '220',
             style: { border: 0, borderRadius: 12 },
             src: `https://www.openstreetmap.org/export/embed.html?bbox=${item.longitude-0.005},${item.latitude-0.005},${item.longitude+0.005},${item.latitude+0.005}&layer=mapnik&marker=${item.latitude},${item.longitude}`
          }) : (
             <TouchableOpacity style={styles.mapRow} onPress={() => openInMap(item.latitude, item.longitude)}>
               <Ionicons name="map-outline" size={16} color="#0284c7" />
               <Text style={styles.mapText}>Open in Map App</Text>
             </TouchableOpacity>
          )}
        </View>
      )}
      
      {item.timestamp && (
        <View style={styles.timeRow}>
          <Ionicons name="time-outline" size={13} color="#94a3b8" />
          <Text style={styles.timeText}>
            Last updated: {new Date(item.timestamp).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, month: 'short', day: 'numeric' })}
          </Text>
        </View>
      )}

      {item.timeline && item.timeline.length > 0 && (
        <View style={styles.timelineContainer}>
          <TouchableOpacity onPress={() => setExpanded(!expanded)} style={styles.timelineHeader} activeOpacity={0.7}>
            <Text style={styles.timelineTitle}>Today's Timeline ({item.timeline.length})</Text>
            <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={20} color="#64748b" />
          </TouchableOpacity>
          
          {expanded && (
            <View style={{ marginTop: 12 }}>
              {[...item.timeline].reverse().map((t, idx) => (
                <View key={idx} style={styles.timelineItem}>
                  <View style={styles.timelineDot} />
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineTime}>
                      {new Date(t.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - <Text style={styles.timelineType}>{t.type}</Text>
                    </Text>
                    <Text style={styles.timelineDesc}>{t.description}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
};

export default function EmployeeMonitoringScreen() {
  const router = useRouter();
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLiveLocations = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const [res, attRes, tasksRes, followUpsRes] = await Promise.all([
        api.get('/locations/latest'),
        api.get(`/attendance?date=${today}`),
        api.get('/tasks'),
        api.get('/followups')
      ]);
      
      let locData = res.data.data || [];
      const attData = attRes.data.data || [];
      const tasksData = tasksRes.data.data || [];
      const followUpsData = followUpsRes.data.data || [];

      // Merge and Reverse Geocode
      locData = await Promise.all(locData.map(async (loc) => {
        const att = attData.find(a => (a.executive?._id || a.executive) === loc.executive);
        loc.timeline = att ? (att.timeline || []) : [];

        // Calculate overdue tasks for this executive
        loc.overdueTasks = tasksData.filter(t => 
           (t.assignedTo?._id || t.assignedTo) === loc.executive &&
           t.status !== 'Completed' &&
           new Date(t.dueDate) < new Date()
        ).length;

        // Calculate overdue follow-ups
        loc.overdueFollowUps = followUpsData.filter(f =>
           (f.executive?._id || f.executive) === loc.executive &&
           !['Completed', 'Visited', 'Called'].includes(f.status) &&
           new Date(f.followUpDate) < new Date()
        ).length;

        if (loc.latitude && loc.longitude) {
          try {
            if (Platform.OS === 'web') {
              const nominatimRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${loc.latitude}&lon=${loc.longitude}`);
              const json = await nominatimRes.json();
              loc.address = json.display_name;
            } else {
              const geocode = await Location.reverseGeocodeAsync({ latitude: loc.latitude, longitude: loc.longitude });
              if (geocode && geocode.length > 0) {
                const place = geocode[0];
                const addressParts = [];
                if (place.name && !addressParts.includes(place.name)) addressParts.push(place.name);
                if (place.street && !addressParts.includes(place.street)) addressParts.push(place.street);
                if (place.city) addressParts.push(place.city);
                else if (place.subregion) addressParts.push(place.subregion);
                
                loc.address = addressParts.join(', ');
              }
            }
          } catch (e) {
            console.log('Geocoding failed for', loc.executiveName, e);
          }
        }
        return loc;
      }));
      setLocations(locData);
    } catch (e) {
      Alert.alert('Error', 'Unable to load live locations or timeline.');
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

  // Analytics computation
  const totalOnline = locations.filter(l => l.latitude).length;
  const totalCheckedIn = locations.filter(l => l.timeline && l.timeline.some(t => t.type === 'Check-in')).length;
  const totalOverdue = locations.reduce((sum, l) => sum + (l.overdueTasks || 0) + (l.overdueFollowUps || 0), 0);

  return (
    <AppLayout currentScreen="EmployeeMonitoring" role="Admin" scrollable={false}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Track Field Staff</Text>
            <Text style={styles.subtitle}>Live GPS Monitoring & Timeline</Text>
          </View>
          <TouchableOpacity style={styles.refreshBtn} onPress={() => fetchLiveLocations(true)}>
            <Ionicons name="refresh" size={18} color="#0284c7" />
          </TouchableOpacity>
        </View>

        {!loading && locations.length > 0 && (
          <View style={styles.analyticsRow}>
            <View style={[styles.statBox, { borderBottomColor: '#22c55e' }]}>
              <Text style={styles.statLabel}>Online Now</Text>
              <Text style={[styles.statValue, { color: '#22c55e' }]}>{totalOnline}</Text>
            </View>
            <View style={[styles.statBox, { borderBottomColor: '#8b5cf6' }]}>
              <Text style={styles.statLabel}>Checked In</Text>
              <Text style={[styles.statValue, { color: '#8b5cf6' }]}>{totalCheckedIn}</Text>
            </View>
            <View style={[styles.statBox, { borderBottomColor: '#f97316' }]}>
              <Text style={styles.statLabel}>Overdue</Text>
              <Text style={[styles.statValue, { color: '#f97316' }]}>{totalOverdue}</Text>
            </View>
          </View>
        )}

        {loading ? (
          <ActivityIndicator color="#0284c7" size="large" style={{ marginTop: 60 }} />
        ) : (
          <FlatList
            data={locations}
            keyExtractor={(i, idx) => i.executive?.toString() || idx.toString()}
            renderItem={({ item }) => <LocationCard item={item} openInMap={openInMap} router={router} />}
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
  
  analyticsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  statBox: { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#e2e8f0', borderBottomWidth: 4, elevation: 1 },
  statLabel: { fontSize: 11, color: '#64748b', fontWeight: '700', textTransform: 'uppercase' },
  statValue: { fontSize: 24, fontWeight: '900', marginTop: 4 },

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
  
  chatBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#e0f2fe', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  chatBtnText: { color: '#0284c7', fontSize: 12, fontWeight: '700' },

  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99, borderWidth: 1 },
  badgeText: { fontSize: 11, fontWeight: '700' },

  mapRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, backgroundColor: '#f0f9ff', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  mapText: { fontSize: 12, color: '#0284c7', fontWeight: '700' },
  
  addressBox: { marginTop: 12, padding: 8, backgroundColor: '#f8fafc', borderRadius: 8, borderWidth: 1, borderColor: '#f1f5f9' },
  addressText: { fontSize: 13, color: '#475569', lineHeight: 18 },

  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10 },
  timeText: { fontSize: 11, color: '#94a3b8' },

  timelineContainer: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  timelineHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  timelineTitle: { fontSize: 13, fontWeight: '700', color: '#334155' },
  timelineItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  timelineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#0284c7', marginTop: 5 },
  timelineContent: { flex: 1 },
  timelineTime: { fontSize: 11, color: '#64748b' },
  timelineType: { fontWeight: '700', color: '#0f172a' },
  timelineDesc: { fontSize: 12, color: '#475569', marginTop: 2, lineHeight: 16 },
});
