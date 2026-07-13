import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Image, Alert, RefreshControl,
  ScrollView, Platform, StyleSheet, ActivityIndicator, SafeAreaView as RNSafeAreaView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { Picker } from '@react-native-picker/picker';
import AppLayout from '../components/AppLayout';
import MeetingCard from '../components/MeetingCard';
import api from '../api/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const GOLD = '#F5A623';
const NAVY = '#1B2B4B';

function DateTimePickerField({ label, value, onChange, placeholder }) {
  const [showPicker, setShowPicker] = useState(false);

  const fmt = (v) => {
    if (!v) return null;
    try {
      const d = new Date(v);
      return isNaN(d.getTime()) ? v : d.toLocaleString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true,
      });
    } catch { return v; }
  };

  if (Platform.OS === 'web') {
    return (
      <View style={s.fieldWrap}>
        <Text style={s.label}>{label}</Text>
        <View style={s.inputRow}>
          <Ionicons name="calendar-outline" size={16} color="#64748b" style={{ marginRight: 8 }} />
          <input
            type="datetime-local"
            value={value ? new Date(value).toISOString().slice(0, 16) : ''}
            onChange={(e) => onChange(e.target.value ? new Date(e.target.value).toISOString() : '')}
            min={new Date().toISOString().slice(0, 16)}
            style={{
              flex: 1, border: 'none', outline: 'none', background: 'transparent',
              fontSize: 13, color: '#0f172a',
            }}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={s.fieldWrap}>
      <Text style={s.label}>{label}</Text>
      <TouchableOpacity onPress={() => setShowPicker('date')} style={s.inputRow}>
        <Ionicons name="calendar-outline" size={16} color="#64748b" style={{ marginRight: 8 }} />
        <Text style={[{ flex: 1, fontSize: 13 }, value ? { color: '#0f172a' } : { color: '#94a3b8' }]}>
          {value ? fmt(value) : placeholder}
        </Text>
        <Ionicons name="chevron-down" size={14} color="#94a3b8" />
      </TouchableOpacity>
      {showPicker && (() => {
        const DateTimePicker = require('@react-native-community/datetimepicker').default;
        const current = value ? new Date(value) : new Date();
        return (
          <DateTimePicker
            value={isNaN(current.getTime()) ? new Date() : current}
            mode={Platform.OS === 'ios' ? 'datetime' : showPicker}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            minimumDate={new Date()}
            onChange={(event, selectedDate) => {
              if (Platform.OS === 'android') {
                if (event.type === 'set' && selectedDate) {
                  if (showPicker === 'date') {
                    onChange(selectedDate.toISOString());
                    setShowPicker('time');
                  } else {
                    setShowPicker(false);
                    onChange(selectedDate.toISOString());
                  }
                } else setShowPicker(false);
              } else {
                setShowPicker(false);
                if (selectedDate) onChange(selectedDate.toISOString());
              }
            }}
          />
        );
      })()}
    </View>
  );
}

const INITIAL_FORM = {
  clientName: '', companyName: '', phone: '', notes: '',
  meetingType: 'In-Person', status: 'Completed',
  scheduledAt: '', reminderAt: '', nextFollowUpDate: '',
  meetingFollowUp: '', onlineMeetingLink: '',
};

export default function MeetingScreen({ navigation }) {
  const [meetings, setMeetings] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [imageUri, setImageUri] = useState(null);
  const [locationCoords, setLocationCoords] = useState(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('all'); // 'all' | 'scheduled' | 'completed'
  const [userRole, setUserRole] = useState('');

  const upd = (key, val) => setForm(f => ({ ...f, [key]: val }));

  useEffect(() => {
    AsyncStorage.getItem('user').then(s => {
      if (s) setUserRole(JSON.parse(s).role || '');
    });
    fetchMeetings();
    fetchClients();
    getGPSCoords();
  }, []);

  const fetchMeetings = async () => {
    try {
      setRefreshing(true);
      const res = await api.get('/meetings');
      const data = res.data.data || [];
      setMeetings(data);

      // Check for today's scheduled meetings and show reminder toast
      const today = new Date();
      const todayMeetings = data.filter(m => {
        if (m.status !== 'Scheduled' || !m.scheduledAt) return false;
        const d = new Date(m.scheduledAt);
        return d.getFullYear() === today.getFullYear() &&
               d.getMonth() === today.getMonth() &&
               d.getDate() === today.getDate();
      });
      todayMeetings.forEach(m => {
        const timeStr = new Date(m.scheduledAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
        Toast.show({
          type: 'info',
          text1: `⏰ Meeting Today: ${m.clientName}`,
          text2: `${m.meetingType} meeting with ${m.companyName} at ${timeStr}`,
          visibilityTime: 7000,
        });
      });
    } catch (e) {
      console.error(e);
    } finally {
      setRefreshing(false);
    }
  };

  const fetchClients = async () => {
    try {
      const res = await api.get('/onboarding');
      setClients(res.data.data || []);
    } catch (e) { console.error(e); }
  };

  const getGPSCoords = async () => {
    try {
      setGettingLocation(true);
      if (Platform.OS === 'web') {
        navigator.geolocation?.getCurrentPosition(
          (pos) => { setLocationCoords(pos.coords); setGettingLocation(false); },
          () => setGettingLocation(false)
        );
        return;
      }
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { setGettingLocation(false); return; }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLocationCoords(loc.coords);
    } catch (e) { console.error(e); }
    finally { setGettingLocation(false); }
  };

  const handleCaptureImage = async () => {
    try {
      if (Platform.OS === 'web') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
          const file = e.target.files[0];
          if (file) setImageUri(URL.createObjectURL(file));
        };
        input.click();
        return;
      }
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera permissions required.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.7 });
      if (!result.canceled) setImageUri(result.assets[0].uri);
    } catch (e) { Alert.alert('Camera Error', 'Could not open camera.'); }
  };

  const handleSubmit = async () => {
    const { clientName, companyName, phone, notes, meetingType } = form;
    if (!clientName || !companyName || !phone || !notes) {
      Alert.alert('Validation', 'Please fill in all required fields (*).');
      return;
    }
    if (!locationCoords && Platform.OS !== 'web') {
      Alert.alert('GPS', 'Waiting for GPS coordinates. Please wait.');
      return;
    }

    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v); });
      fd.append('latitude', (locationCoords?.latitude || 0).toString());
      fd.append('longitude', (locationCoords?.longitude || 0).toString());

      if (imageUri) {
        const filename = imageUri.split('/').pop() || 'photo.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        if (Platform.OS === 'web') {
          const blob = await fetch(imageUri).then(r => r.blob());
          fd.append('photo', new File([blob], filename, { type }));
        } else {
          fd.append('photo', { uri: imageUri, name: filename, type });
        }
      }

      // Removed expo-notifications scheduling to prevent Expo Go crash
      // Notifications are handled server-side or via custom dev build


      Toast.show({ type: 'success', text1: '✅ Meeting logged successfully!', visibilityTime: 3000 });
      setForm(INITIAL_FORM);
      setImageUri(null);
      setSelectedClientId('');
      setShowAddForm(false);
      fetchMeetings();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to submit.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = ['Admin', 'Project Manager', 'Team Lead', 'HR', 'Managing Director MD'].includes(userRole);

  const filtered = meetings.filter(m => {
    if (tab === 'scheduled') return m.status === 'Scheduled';
    if (tab === 'completed') return m.status === 'Completed';
    return true;
  });

  return (
    <>
      {showAddForm ? (
        /* ── FORM — standalone full screen ── */
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
          {/* Form Header with back button */}
          <View style={s.formHeader}>
            <TouchableOpacity onPress={() => setShowAddForm(false)} style={s.backBtn} activeOpacity={0.75}>
              <Ionicons name="arrow-back" size={18} color={NAVY} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={s.formTitle}>Log / Schedule Meeting</Text>
              <Text style={s.formSub}>Fill in the details below</Text>
            </View>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
            keyboardShouldPersistTaps="handled"
          >

            {/* GPS Status */}
            <View style={s.gpsBanner}>
              <Ionicons name="location" size={14} color={locationCoords ? '#16a34a' : '#f97316'} />
              {gettingLocation
                ? <Text style={s.gpsText}>Acquiring GPS…</Text>
                : locationCoords
                ? <Text style={[s.gpsText, { color: '#16a34a' }]}>
                    GPS Bound ({locationCoords.latitude.toFixed(4)}, {locationCoords.longitude.toFixed(4)})
                  </Text>
                : <TouchableOpacity onPress={getGPSCoords}>
                    <Text style={[s.gpsText, { color: '#dc2626', textDecorationLine: 'underline' }]}>
                      GPS not found — Retry
                    </Text>
                  </TouchableOpacity>}
            </View>

            {/* Meeting Type Toggle */}
            <View style={s.fieldWrap}>
              <Text style={s.label}>Meeting Type *</Text>
              <View style={s.toggle}>
                {['In-Person', 'Online'].map(t => (
                  <TouchableOpacity
                    key={t}
                    onPress={() => upd('meetingType', t)}
                    style={[s.toggleOption, form.meetingType === t && s.toggleOptionActive]}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={t === 'Online' ? 'videocam-outline' : 'people-outline'}
                      size={14}
                      color={form.meetingType === t ? '#fff' : '#64748b'}
                    />
                    <Text style={[s.toggleText, form.meetingType === t && { color: '#fff' }]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Status Toggle */}
            <View style={s.fieldWrap}>
              <Text style={s.label}>Status *</Text>
              <View style={s.toggle}>
                {['Completed', 'Scheduled'].map(t => (
                  <TouchableOpacity
                    key={t}
                    onPress={() => upd('status', t)}
                    style={[s.toggleOption, form.status === t && s.toggleOptionActive]}
                    activeOpacity={0.8}
                  >
                    <Text style={[s.toggleText, form.status === t && { color: '#fff' }]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Select Client */}
            <View style={s.fieldWrap}>
              <Text style={s.label}>Select Client (Optional)</Text>
              <View style={s.pickerWrap}>
                {Platform.OS === 'web' ? (
                  <select
                    value={selectedClientId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setSelectedClientId(id);
                      const c = clients.find(x => x._id === id);
                      if (c) {
                        upd('clientName', c.ownerName || c.contactPerson || '');
                        upd('companyName', c.businessName || '');
                        upd('phone', c.phone || '');
                      } else {
                        upd('clientName', ''); upd('companyName', ''); upd('phone', '');
                      }
                    }}
                    style={{ width: '100%', height: '100%', border: 'none', outline: 'none', background: 'transparent', paddingLeft: 14, fontSize: 13 }}
                  >
                    <option value="">Select an Onboarded Client…</option>
                    {clients.map(c => <option key={c._id} value={c._id}>{c.businessName} ({c.ownerName})</option>)}
                  </select>
                ) : (
                  <Picker
                    selectedValue={selectedClientId}
                    onValueChange={(id) => {
                      setSelectedClientId(id);
                      const c = clients.find(x => x._id === id);
                      if (c) {
                        upd('clientName', c.ownerName || c.contactPerson || '');
                        upd('companyName', c.businessName || '');
                        upd('phone', c.phone || '');
                      } else {
                        upd('clientName', ''); upd('companyName', ''); upd('phone', '');
                      }
                    }}
                    style={{ height: 50, width: '100%' }}
                  >
                    <Picker.Item label="Select an Onboarded Client…" value="" color="#94a3b8" />
                    {clients.map(c => <Picker.Item key={c._id} label={`${c.businessName} (${c.ownerName})`} value={c._id} />)}
                  </Picker>
                )}
              </View>
            </View>

            {/* Text Fields */}
            {[
              { key: 'clientName', label: 'Client Name *', icon: 'person-outline', placeholder: 'E.g. John Doe' },
              { key: 'companyName', label: 'Company Name *', icon: 'business-outline', placeholder: 'E.g. Acme Corp' },
              { key: 'phone', label: 'Contact Phone *', icon: 'call-outline', placeholder: '10-digit number', keyboard: 'phone-pad' },
            ].map(f => (
              <View key={f.key} style={s.fieldWrap}>
                <Text style={s.label}>{f.label}</Text>
                <View style={s.inputRow}>
                  <Ionicons name={f.icon} size={16} color="#64748b" style={{ marginRight: 8 }} />
                  <TextInput
                    style={s.inputText}
                    value={form[f.key]}
                    onChangeText={v => upd(f.key, v)}
                    placeholder={f.placeholder}
                    placeholderTextColor="#94a3b8"
                    keyboardType={f.keyboard || 'default'}
                  />
                </View>
              </View>
            ))}

            {/* Online meeting link */}
            {form.meetingType === 'Online' && (
              <View style={s.fieldWrap}>
                <Text style={s.label}>Meeting Link (Zoom / Meet)</Text>
                <View style={s.inputRow}>
                  <Ionicons name="link-outline" size={16} color="#64748b" style={{ marginRight: 8 }} />
                  <TextInput
                    style={s.inputText}
                    value={form.onlineMeetingLink}
                    onChangeText={v => upd('onlineMeetingLink', v)}
                    placeholder="https://meet.google.com/..."
                    placeholderTextColor="#94a3b8"
                    keyboardType="url"
                    autoCapitalize="none"
                  />
                </View>
              </View>
            )}

            {/* Scheduled At */}
            {form.status === 'Scheduled' && (
              <DateTimePickerField
                label="Meeting Date & Time *"
                value={form.scheduledAt}
                onChange={v => upd('scheduledAt', v)}
                placeholder="Select meeting date & time"
              />
            )}

            {/* Reminder */}
            <DateTimePickerField
              label="Set Reminder (Optional)"
              value={form.reminderAt}
              onChange={v => upd('reminderAt', v)}
              placeholder="Select reminder time"
            />

            {/* Next Follow-up date */}
            <DateTimePickerField
              label="Next Follow-Up Date (Optional)"
              value={form.nextFollowUpDate}
              onChange={v => upd('nextFollowUpDate', v)}
              placeholder="Select follow-up date"
            />

            {/* Notes */}
            <View style={s.fieldWrap}>
              <Text style={s.label}>Visit Notes / Comments *</Text>
              <TextInput
                style={s.inputArea}
                value={form.notes}
                onChangeText={v => upd('notes', v)}
                placeholder="Discussed product plans, client was interested in..."
                placeholderTextColor="#94a3b8"
                multiline
              />
            </View>

            {/* Follow-up notes */}
            <View style={s.fieldWrap}>
              <Text style={s.label}>Meeting Follow-Up (Optional)</Text>
              <TextInput
                style={[s.inputArea, { minHeight: 60 }]}
                value={form.meetingFollowUp}
                onChangeText={v => upd('meetingFollowUp', v)}
                placeholder="Next steps after this meeting..."
                placeholderTextColor="#94a3b8"
                multiline
              />
            </View>

            {/* Photo */}
            <View style={s.fieldWrap}>
              <Text style={s.label}>Photo Evidence (Optional)</Text>
              {imageUri ? (
                <View style={s.previewWrap}>
                  <Image source={{ uri: imageUri }} style={s.previewImage} resizeMode="cover" />
                  <TouchableOpacity onPress={() => setImageUri(null)} style={s.removeBtn}>
                    <Ionicons name="close" size={14} color="#dc2626" />
                    <Text style={{ color: '#dc2626', fontSize: 10, fontWeight: '700' }}>Remove</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity onPress={handleCaptureImage} style={s.photoBtn} activeOpacity={0.8}>
                  <Ionicons name="camera-outline" size={20} color="#0284c7" />
                  <Text style={s.photoBtnText}>Capture / Upload Photo</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Submit */}
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={loading}
              style={[s.submitBtn, loading && { opacity: 0.6 }]}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color="#fff" size="small" />
                : <>
                    <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
                    <Text style={s.submitBtnText}>
                      {form.status === 'Scheduled' ? 'Schedule Meeting' : 'Log Visit'}
                    </Text>
                  </>}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setShowAddForm(false)} style={s.cancelBtn}>
              <Text style={s.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      ) : (
        /* ── LIST VIEW — inside AppLayout ── */
        <AppLayout currentScreen="Meeting" role={userRole}>
          <View style={s.container}>
            {/* Header */}
            <View style={s.headerBar}>
              <View>
                <Text style={s.pageTitle}>Client Meetings</Text>
                <Text style={s.pageSub}>{meetings.length} total records</Text>
              </View>
              <TouchableOpacity onPress={() => setShowAddForm(true)} style={s.addBtn} activeOpacity={0.85}>
                <Ionicons name="add" size={16} color="#fff" />
                <Text style={s.addBtnText}>Log Meeting</Text>
              </TouchableOpacity>
            </View>

            {/* Tabs */}
            <View style={s.tabs}>
              {[['all', 'All'], ['scheduled', 'Scheduled'], ['completed', 'Completed']].map(([key, label]) => (
                <TouchableOpacity
                  key={key}
                  onPress={() => setTab(key)}
                  style={[s.tab, tab === key && s.tabActive]}
                >
                  <Text style={[s.tabText, tab === key && s.tabTextActive]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 60 }}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={fetchMeetings} tintColor={GOLD} colors={[NAVY]} />
              }
            >
              {filtered.length === 0 ? (
                <View style={s.emptyWrap}>
                  <Ionicons name="calendar-outline" size={40} color="#cbd5e1" />
                  <Text style={s.emptyText}>No meetings found.</Text>
                  <Text style={s.emptySub}>Tap "Log Meeting" to add one.</Text>
                </View>
              ) : (
                filtered.map(item => (
                  <MeetingCard key={item._id} item={item} isAdmin={isAdmin} onUpdated={fetchMeetings} />
                ))
              )}
            </ScrollView>
          </View>
        </AppLayout>
      )}
    </>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  headerBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  pageTitle: { fontSize: 20, fontWeight: '800', color: NAVY },
  pageSub: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: NAVY, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12, elevation: 3 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },

  // Form header
  formHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff',
    paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 4 : 12, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
    elevation: 3, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center', justifyContent: 'center',
  },
  formTitle: { fontSize: 16, fontWeight: '800', color: NAVY },
  formSub: { fontSize: 11, color: '#94a3b8', marginTop: 1 },

  gpsBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f8fafc', borderRadius: 10, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  gpsText: { fontSize: 12, color: '#64748b', fontWeight: '600' },

  fieldWrap: { marginBottom: 14 },
  label: { fontSize: 10, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, borderWidth: 1.5, borderColor: '#e2e8f0', paddingHorizontal: 14, height: 48 },
  inputArea: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1.5, borderColor: '#e2e8f0', paddingHorizontal: 14, paddingTop: 14, paddingBottom: 14, minHeight: 100, textAlignVertical: 'top', color: '#0f172a', fontSize: 13 },
  inputText: { flex: 1, color: '#0f172a', fontSize: 13 },

  toggle: { flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 12, padding: 4 },
  toggleOption: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 9, borderRadius: 8 },
  toggleOptionActive: { backgroundColor: NAVY },
  toggleText: { fontSize: 12, fontWeight: '700', color: '#64748b' },

  pickerWrap: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1.5, borderColor: '#e2e8f0', height: 50, justifyContent: 'center', overflow: 'hidden' },

  previewWrap: { position: 'relative' },
  previewImage: { width: '100%', height: 160, borderRadius: 12 },
  removeBtn: { position: 'absolute', top: 8, right: 8, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: '#fecaca', elevation: 2 },
  photoBtn: { borderWidth: 2, borderStyle: 'dashed', borderColor: '#cbd5e1', borderRadius: 12, paddingVertical: 20, alignItems: 'center', gap: 6 },
  photoBtnText: { color: '#0284c7', fontWeight: '700', fontSize: 12 },

  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: NAVY, borderRadius: 14, paddingVertical: 14, marginBottom: 10, elevation: 4 },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  cancelBtn: { alignItems: 'center', paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, borderColor: '#e2e8f0', backgroundColor: '#fff', marginBottom: 20 },
  cancelBtnText: { color: '#64748b', fontWeight: '600', fontSize: 13 },

  tabs: { flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 12, padding: 4, marginBottom: 14 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  tabActive: { backgroundColor: '#fff', elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4 },
  tabText: { fontSize: 11, fontWeight: '600', color: '#64748b' },
  tabTextActive: { color: NAVY, fontWeight: '800' },

  emptyWrap: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyText: { fontSize: 14, fontWeight: '700', color: '#94a3b8' },
  emptySub: { fontSize: 11, color: '#cbd5e1' },
});
