import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppLayout from '../components/AppLayout';
import api from '../api/api';

export default function LiveLocationScreen({ navigation }) {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLiveLocations = async () => {
    try {
      setLoading(true);
      const res = await api.get('/locations/latest');
      setLocations(res.data.data || []);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Unable to load live executive locations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveLocations();
  }, []);

  const openInMap = (latitude, longitude) => {
    if (!latitude || !longitude) {
      Alert.alert('Location Unavailable', 'No GPS coordinates are available for this executive yet.');
      return;
    }
    const url = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Unable to open maps', 'Please open your map app manually.');
    });
  };

  return (
    <AppLayout currentScreen="LiveLocation" role="Admin" scrollable={false}>
      <View style={{ flex: 1, backgroundColor: '#f8fafc', padding: 16 }}>
        <Text style={{ fontSize: 22, fontWeight: '800', color: '#0f172a', marginBottom: 16 }}>Live Locations</Text>

        <View style={{ marginBottom: 16, padding: 16, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0' }}>
          <Text style={{ color: '#475569', fontSize: 13, lineHeight: 18 }}>Live tracking for active field executives. Pull to refresh for the latest GPS coordinates.</Text>
          <TouchableOpacity
            onPress={fetchLiveLocations}
            style={{ marginTop: 12, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#0284c7', borderRadius: 14 }}
          >
            <Text style={{ color: '#fff', fontWeight: '700', textAlign: 'center', fontSize: 14 }}>Refresh Locations</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={locations}
          keyExtractor={(item, index) => item.executive?.toString() || index.toString()}
          refreshing={loading}
          onRefresh={fetchLiveLocations}
          ListEmptyComponent={() => (
            <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 60 }}>
              <Text style={{ color: '#94a3b8', fontSize: 14 }}>No live locations found yet.</Text>
            </View>
          )}
          renderItem={({ item }) => (
            <View style={{ marginBottom: 14, padding: 16, borderRadius: 18, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', elevation: 2 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#0f172a', fontWeight: '800', fontSize: 15 }}>{item.executiveName || 'Unknown Executive'}</Text>
                  <Text style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>{item.executiveEmail || 'No email available'}</Text>
                </View>
                <View style={{ borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: '#e0f2fe', borderWidth: 1, borderColor: '#bae6fd' }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', textTransform: 'uppercase', color: '#0284c7' }}>{item.latitude && item.longitude ? 'Online' : 'No Signal'}</Text>
                </View>
              </View>

              <View style={{ marginBottom: 8 }}>
                <Text style={{ color: '#94a3b8', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>Coordinates</Text>
                <Text style={{ color: '#334155', fontSize: 14, fontWeight: '500', marginTop: 2 }}>{item.latitude ? `${item.latitude.toFixed(5)}, ${item.longitude.toFixed(5)}` : 'Not available yet'}</Text>
              </View>

              <View style={{ marginBottom: 12 }}>
                <Text style={{ color: '#94a3b8', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>Last updated</Text>
                <Text style={{ color: '#334155', fontSize: 14, fontWeight: '500', marginTop: 2 }}>{item.timestamp ? new Date(item.timestamp).toLocaleString() : 'No timestamp'}</Text>
              </View>

              <TouchableOpacity
                onPress={() => openInMap(item.latitude, item.longitude)}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12, backgroundColor: '#0ea5e9' }}
              >
                <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>Open in Google Maps</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      </View>
    </AppLayout>
  );
}
