import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, ScrollView, Alert, TextInput, ActivityIndicator, Modal, Platform, StyleSheet, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Location from 'expo-location';
import Toast from 'react-native-toast-message';
import api from '../api/api';
import AppLayout from '../components/AppLayout';

const STATUS_TABS = ['All', 'Pending', 'Called', 'Visited', 'Converted', 'Not Interested'];

const STATUS_CONFIG = {
  'Pending':       { bg: '#fff7ed', text: '#ea580c', border: '#fed7aa', icon: 'time-outline' },
  'Called':        { bg: '#eff6ff', text: '#0284c7', border: '#bfdbfe', icon: 'call-outline' },
  'Visited':       { bg: '#faf5ff', text: '#7c3aed', border: '#e9d5ff', icon: 'location-outline' },
  'Converted':     { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0', icon: 'checkmark-circle-outline' },
  'Not Interested':{ bg: '#fef2f2', text: '#e11d48', border: '#fecdd3', icon: 'close-circle-outline' },
};



function UpdateModal({ visible, item, onClose, onSaved }) {
  const [status, setStatus] = useState(item?.status || 'Pending');
  const [remarks, setRemarks] = useState('');
  const [saving, setSaving] = useState(false);
  const [attachment, setAttachment] = useState(null);
  const [location, setLocation] = useState(null);
  const [fetchingLoc, setFetchingLoc] = useState(false);

  useEffect(() => {
    if (item) { setStatus(item.status); setRemarks(''); setAttachment(null); setLocation(null); }
  }, [item]);

  const handlePickCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission needed', 'Camera access is required.'); return; }
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.7 });
    if (!result.canceled) setAttachment(result.assets[0]);
  };

  const handlePickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
    if (!result.canceled) setAttachment(result.assets[0]);
  };

  const handleCaptureLocation = async () => {
    setFetchingLoc(true);
    try {
      const { status: ps } = await Location.requestForegroundPermissionsAsync();
      if (ps !== 'granted') {
        Alert.alert('Permission Denied', 'Location access is required to log a visit.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const [geo] = await Location.reverseGeocodeAsync(loc.coords);
      const address = geo
        ? [geo.street, geo.district, geo.city, geo.region].filter(Boolean).join(', ')
        : '';
      setLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude, address });
    } catch (e) {
      Alert.alert('Error', 'Failed to get location. Please try again.');
    } finally {
      setFetchingLoc(false);
    }
  };

  const save = async () => {
    if (status === 'Visited') {
      if (!location) { Alert.alert('Required', 'Please capture your live location to log this visit.'); return; }
      if (!attachment) { Alert.alert('Required', 'Please upload photo or document proof for the visit.'); return; }
    }
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('status', status);
      formData.append('remarks', remarks);
      if (location) {
        formData.append('latitude', String(location.latitude));
        formData.append('longitude', String(location.longitude));
        formData.append('address', location.address || '');
      }
      if (attachment) {
        const filename = attachment.name || attachment.fileName || attachment.uri.split('/').pop() || 'attachment.file';
        const type = attachment.mimeType || attachment.type || 'application/octet-stream';
        formData.append('attachment', {
          uri: Platform.OS === 'ios' ? attachment.uri.replace('file://', '') : attachment.uri,
          name: filename,
          type,
        });
      }
      await api.put(`/followups/${item._id}/status`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      Toast.show({ type: 'success', text1: 'Follow-up Updated', text2: `Marked as ${status}` });
      onSaved();
      onClose();
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to update follow-up' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
        <ScrollView style={{ backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28 }} contentContainerStyle={{ padding: 24, paddingBottom: 48 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <Text style={{ fontSize: 17, fontWeight: '800', color: '#0f172a' }}>Update Follow-up</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={22} color="#64748b" /></TouchableOpacity>
          </View>

          <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Update Status</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
            {['Called', 'Visited', 'Converted', 'Not Interested'].map(s => {
              const sc = STATUS_CONFIG[s];
              return (
                <TouchableOpacity key={s} onPress={() => setStatus(s)}
                  style={{ paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, borderWidth: 1.5,
                    backgroundColor: status === s ? sc.text : sc.bg, borderColor: status === s ? sc.text : sc.border,
                    flexDirection: 'row', alignItems: 'center', gap: 6 }}
                >
                  <Ionicons name={sc.icon} size={13} color={status === s ? '#fff' : sc.text} />
                  <Text style={{ fontSize: 11, fontWeight: '700', color: status === s ? '#fff' : sc.text }}>{s}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Visit Proof — shown only when Visited is selected */}
          {status === 'Visited' && (
            <View style={{ backgroundColor: '#faf5ff', borderRadius: 16, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#e9d5ff' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                <Ionicons name="shield-checkmark-outline" size={15} color="#7c3aed" />
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#7c3aed' }}>Visit Proof Required</Text>
              </View>

              {/* Live Location */}
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748b', marginBottom: 6 }}>📍 Live Location <Text style={{ color: '#ef4444' }}>*</Text></Text>
              {location ? (
                <View style={{ backgroundColor: '#fff', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#e9d5ff', marginBottom: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#16a34a' }}>Location Captured</Text>
                    <TouchableOpacity onPress={() => setLocation(null)} style={{ marginLeft: 'auto' }}>
                      <Ionicons name="close-circle" size={18} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                  <Text style={{ fontSize: 10, color: '#64748b', marginTop: 4 }}>{location.address || `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`}</Text>
                  <TouchableOpacity onPress={() => Linking.openURL(`https://maps.google.com/?q=${location.latitude},${location.longitude}`)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 }}>
                    <Ionicons name="map-outline" size={12} color="#0284c7" />
                    <Text style={{ fontSize: 10, color: '#0284c7', fontWeight: '600' }}>View on Map</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity onPress={handleCaptureLocation} disabled={fetchingLoc}
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                    backgroundColor: '#7c3aed', borderRadius: 10, paddingVertical: 10, marginBottom: 12, opacity: fetchingLoc ? 0.6 : 1 }}>
                  {fetchingLoc ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="location" size={16} color="#fff" />}
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#fff' }}>{fetchingLoc ? 'Detecting...' : 'Capture Live Location'}</Text>
                </TouchableOpacity>
              )}

              {/* Proof Upload */}
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748b', marginBottom: 6 }}>📎 Photo / Document Proof <Text style={{ color: '#ef4444' }}>*</Text></Text>
              {attachment ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#e9d5ff' }}>
                  <Ionicons name={attachment.mimeType?.startsWith('image') ? 'image' : 'document-text'} size={20} color="#7c3aed" />
                  <Text style={{ flex: 1, fontSize: 11, color: '#334155', fontWeight: '600' }} numberOfLines={1}>{attachment.name || 'File Attached'}</Text>
                  <TouchableOpacity onPress={() => setAttachment(null)}><Ionicons name="close-circle" size={20} color="#ef4444" /></TouchableOpacity>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity onPress={handlePickCamera}
                    style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#fff', paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#e9d5ff' }}>
                    <Ionicons name="camera-outline" size={16} color="#7c3aed" />
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#7c3aed' }}>Camera</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handlePickDocument}
                    style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#fff', paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#e9d5ff' }}>
                    <Ionicons name="document-attach-outline" size={16} color="#7c3aed" />
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#7c3aed' }}>Document</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Remarks</Text>
          <TextInput value={remarks} onChangeText={setRemarks} placeholder="Add remarks or notes..."
            placeholderTextColor="#94a3b8" multiline
            style={{ backgroundColor: '#f8fafc', borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 14,
              padding: 14, fontSize: 14, color: '#0f172a', minHeight: 80, textAlignVertical: 'top', marginBottom: 16 }}
          />

          {/* Generic attachment for non-Visited statuses */}
          {status !== 'Visited' && (
            <>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Attachment (Optional)</Text>
              {attachment ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16, backgroundColor: '#f8fafc', padding: 10, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' }}>
                  <Ionicons name={attachment.mimeType?.startsWith('image') ? 'image' : 'document-text'} size={20} color="#64748b" />
                  <Text style={{ flex: 1, fontSize: 11, color: '#334155', fontWeight: '600' }} numberOfLines={1}>{attachment.name || 'File Attached'}</Text>
                  <TouchableOpacity onPress={() => setAttachment(null)}><Ionicons name="close-circle" size={20} color="#ef4444" /></TouchableOpacity>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                  <TouchableOpacity onPress={handlePickCamera} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#f1f5f9', paddingVertical: 10, borderRadius: 12 }}>
                    <Ionicons name="camera-outline" size={16} color="#64748b" />
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748b' }}>Camera</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handlePickDocument} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#f1f5f9', paddingVertical: 10, borderRadius: 12 }}>
                    <Ionicons name="document-attach-outline" size={16} color="#64748b" />
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748b' }}>Document</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}

          <TouchableOpacity onPress={save} disabled={saving}
            style={{ backgroundColor: status === 'Visited' ? '#7c3aed' : '#0284c7', borderRadius: 16, paddingVertical: 15, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
            {saving ? <ActivityIndicator color="#fff" /> : (
              <>
                <Ionicons name={status === 'Visited' ? 'location' : 'checkmark-circle'} size={16} color="#fff" />
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>Save Update</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}

export default function FollowupScreen({ navigation }) {
  const [followUps, setFollowUps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [selectedItem, setSelectedItem] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/followups');
      setFollowUps(res.data.data || []);
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to load data' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = filter === 'All' ? followUps : followUps.filter(f => f.status === filter);
  const counts = STATUS_TABS.reduce((acc, t) => {
    acc[t] = t === 'All' ? followUps.length : followUps.filter(f => f.status === t).length;
    return acc;
  }, {});

  const isDueToday = (item) => {
    if (!item.followUpDate) return false;
    return new Date(item.followUpDate).toDateString() === new Date().toDateString();
  };

  const isOverdue = (item) => {
    if (!item.followUpDate || ['Converted', 'Completed', 'Cancelled', 'Not Interested'].includes(item.status)) return false;
    return new Date(item.followUpDate) < new Date() && new Date(item.followUpDate).toDateString() !== new Date().toDateString();
  };

  return (
    <AppLayout currentScreen="Followup" role="Employee" scrollable={false}>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Text style={{ fontSize: 22, fontWeight: '900', color: '#0f172a' }}>Follow-ups</Text>
          <TouchableOpacity onPress={fetchData} style={{ backgroundColor: '#eff6ff', borderRadius: 12, padding: 8 }}>
            <Ionicons name="refresh" size={18} color="#0284c7" />
          </TouchableOpacity>
        </View>

        {/* Filter Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }} contentContainerStyle={{ gap: 8, paddingRight: 8 }}>
          {STATUS_TABS.map(tab => (
            <TouchableOpacity
              key={tab}
              onPress={() => setFilter(tab)}
              style={{
                paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
                backgroundColor: filter === tab ? '#0284c7' : '#f1f5f9',
                flexDirection: 'row', alignItems: 'center', gap: 6,
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: '700', color: filter === tab ? '#fff' : '#64748b' }}>{tab}</Text>
              {counts[tab] > 0 && (
                <View style={{ backgroundColor: filter === tab ? 'rgba(255,255,255,0.3)' : '#e2e8f0', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1 }}>
                  <Text style={{ fontSize: 9, fontWeight: '800', color: filter === tab ? '#fff' : '#64748b' }}>{counts[tab]}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>

        {loading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color="#0284c7" />
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={item => item._id}
            refreshing={loading}
            onRefresh={fetchData}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 60 }}
            ListEmptyComponent={() => (
              <View style={{ flex: 1, alignItems: 'center', paddingTop: 80, gap: 12 }}>
                <View style={{ backgroundColor: '#f1f5f9', borderRadius: 20, padding: 20 }}>
                  <Ionicons name="alarm-outline" size={40} color="#cbd5e1" />
                </View>
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#94a3b8' }}>No follow-ups found</Text>
              </View>
            )}
            renderItem={({ item }) => {
              const sc = STATUS_CONFIG[item.status] || STATUS_CONFIG['Pending'];
              const dueToday = isDueToday(item);
              const overdue = isOverdue(item);
              return (
                <View style={{
                  backgroundColor: '#fff', borderRadius: 20, borderWidth: 1,
                  borderColor: overdue ? '#fecdd3' : dueToday ? '#fde68a' : '#e2e8f0',
                  padding: 16, marginBottom: 12,
                  shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
                }}>
                  {(dueToday || overdue) && (
                    <View style={{
                      flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8,
                      backgroundColor: overdue ? '#fef2f2' : '#fffbeb', borderRadius: 8,
                      paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start',
                    }}>
                      <Ionicons name={overdue ? 'warning' : 'alarm'} size={11} color={overdue ? '#e11d48' : '#d97706'} />
                      <Text style={{ fontSize: 10, fontWeight: '700', color: overdue ? '#e11d48' : '#d97706' }}>
                        {overdue ? 'OVERDUE' : 'DUE TODAY'}
                      </Text>
                    </View>
                  )}

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={{ fontSize: 15, fontWeight: '800', color: '#0f172a' }}>{item.clientName}</Text>
                      {item.companyName ? <Text style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{item.companyName}</Text> : null}
                    </View>
                    <View style={{ backgroundColor: sc.bg, borderRadius: 10, borderWidth: 1, borderColor: sc.border, paddingHorizontal: 8, paddingVertical: 4, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Ionicons name={sc.icon} size={10} color={sc.text} />
                      <Text style={{ fontSize: 9, fontWeight: '700', color: sc.text, textTransform: 'uppercase' }}>{item.status}</Text>
                    </View>
                  </View>

                  <View style={{ gap: 6, marginBottom: 12 }}>
                    {item.notes ? <Text style={{ fontSize: 12, color: '#64748b', lineHeight: 18 }} numberOfLines={2}>"{item.notes}"</Text> : null}
                    {item.followUpDate && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name="calendar-outline" size={13} color="#0284c7" />
                        <Text style={{ fontSize: 11, fontWeight: '600', color: '#0284c7' }}>
                          Follow-up: {new Date(item.followUpDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </Text>
                      </View>
                    )}
                    {item.visitLocation?.latitude ? (
                      <TouchableOpacity
                        onPress={() => Linking.openURL(`https://maps.google.com/?q=${item.visitLocation.latitude},${item.visitLocation.longitude}`)}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#faf5ff', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5, alignSelf: 'flex-start' }}>
                        <Ionicons name="location" size={12} color="#7c3aed" />
                        <Text style={{ fontSize: 10, fontWeight: '700', color: '#7c3aed' }}>
                          {item.visitLocation.address ? item.visitLocation.address.substring(0, 40) + '…' : 'Visit Location Logged'}
                        </Text>
                        <Ionicons name="open-outline" size={10} color="#7c3aed" />
                      </TouchableOpacity>
                    ) : null}
                  </View>

                  {item.status !== 'Converted' && item.status !== 'Not Interested' && item.status !== 'Completed' && item.status !== 'Cancelled' && (
                    <View style={{ borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 12 }}>
                      <TouchableOpacity
                        onPress={() => { setSelectedItem(item); setShowModal(true); }}
                        style={{ backgroundColor: '#eff6ff', borderRadius: 12, paddingVertical: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}
                      >
                        <Ionicons name="create-outline" size={14} color="#0284c7" />
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#0284c7' }}>Update Status</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            }}
          />
        )}
      </View>

      <UpdateModal
        visible={showModal}
        item={selectedItem}
        onClose={() => setShowModal(false)}
        onSaved={fetchData}
      />
    </AppLayout>
  );
}

const styles = StyleSheet.create({});
