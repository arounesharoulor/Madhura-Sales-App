import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Alert,
  StatusBar,
  Modal,
  Platform,
  KeyboardAvoidingView,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import Toast from 'react-native-toast-message';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/api';
import { useSocketRefresh } from '../hooks/useSocketRefresh';
import AppLayout from '../components/AppLayout';

const LEAVE_TYPES = ['Medical Leave', 'Casual Leave', 'Personal Leave', 'Emergency Leave'];

const LEAVE_CRITERIA = {
  'Medical Leave': ['Fever/Illness', 'Doctor Appointment', 'Hospitalization', 'Other'],
  'Casual Leave': ['Personal Errands', 'Function/Event', 'Travel', 'Other'],
  'Personal Leave': ['Family commitments', 'Urgent work', 'Other'],
  'Emergency Leave': ['Accident', 'Family Emergency', 'Other'],
};

const STATUS_COLORS = {
  'Pending Check-In': '#f59e0b',
  'Checked In': '#22c55e',
  'Pending Check-Out': '#3b82f6',
  'Checked Out': '#94a3b8',
  'Pending Leave': '#a855f7',
  'On Leave': '#8b5cf6',
  'Rejected Check-In': '#ef4444',
  'Rejected Check-Out': '#ef4444',
  'Rejected Leave': '#ef4444',
  Absent: '#ef4444',
  None: '#64748b',
};

const STATUS_ICONS = {
  'Pending Check-In': 'time-outline',
  'Checked In': 'checkmark-circle',
  'Pending Check-Out': 'time-outline',
  'Checked Out': 'log-out-circle',
  'Pending Leave': 'time-outline',
  'On Leave': 'umbrella-outline',
  'Rejected Check-In': 'close-circle-outline',
  'Rejected Check-Out': 'close-circle-outline',
  'Rejected Leave': 'close-circle-outline',
  Absent: 'close-circle-outline',
  None: 'calendar-outline',
};

// Cross-platform DatePicker
function CrossPlatformDatePicker({ value, onChange }) {
  const [showNative, setShowNative] = useState(false);

  if (Platform.OS === 'web') {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 14, minHeight: 48, marginBottom: 12 }}>
        <Ionicons name="calendar-outline" size={20} color="#0284c7" style={{ marginRight: 10 }} />
        <input
          type="date"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 13, color: value ? '#0f172a' : '#94a3b8', fontFamily: 'inherit', cursor: 'pointer' }}
        />
      </View>
    );
  }

  const DateTimePicker = require('@react-native-community/datetimepicker').default;
  return (
    <View style={{ marginBottom: 12 }}>
      <TouchableOpacity
        onPress={() => setShowNative(true)}
        style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 14, minHeight: 48 }}
      >
        <Ionicons name="calendar-outline" size={20} color="#0284c7" style={{ marginRight: 10 }} />
        <Text style={{ flex: 1, fontSize: 13, color: value ? '#0f172a' : '#94a3b8' }}>
          {value ? (() => {
            try {
              const d = new Date(value + 'T00:00:00');
              return isNaN(d.getTime()) ? 'Select Date' : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
            } catch { return 'Select Date'; }
          })() : 'Select Date'}
        </Text>
        <Ionicons name="chevron-down" size={16} color="#64748b" />
      </TouchableOpacity>
      {showNative && (
        <DateTimePicker
          value={value ? new Date(value + 'T00:00:00') : new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_, selectedDate) => {
            setShowNative(false);
            if (selectedDate) onChange(selectedDate.toISOString().split('T')[0]);
          }}
        />
      )}
    </View>
  );
}

export default function AttendanceScreen() {
  const router = useRouter();
  const [todayRecord, setTodayRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [workPlan, setWorkPlan] = useState('');
  const [workSummary, setWorkSummary] = useState('');
  const [earlyCheckoutReason, setEarlyCheckoutReason] = useState('');
  const [showEarlyModal, setShowEarlyModal] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLiveLocationShared, setIsLiveLocationShared] = useState(true);
  const [showTimeline, setShowTimeline] = useState(false);

  // Redirect Admins / Managers to the admin attendance screen on mount
  useEffect(() => {
    AsyncStorage.getItem('user').then((s) => {
      if (!s) return;
      const user = JSON.parse(s);
      if (user.role === 'Admin' || user.role === 'Manager') {
        setIsAdmin(true);
      }
    });
    
    AsyncStorage.getItem('@isLiveLocationShared').then(v => {
      if (v !== null) setIsLiveLocationShared(JSON.parse(v));
    });
  }, []);

  const toggleLiveLocation = async (newVal) => {
    setIsLiveLocationShared(newVal);
    await AsyncStorage.setItem('@isLiveLocationShared', JSON.stringify(newVal));

    try {
      await api.put('/users/profile', { isLiveLocationShared: newVal });
    } catch (e) {
      console.log('Failed to update live location status on server');
    }

    if (!newVal) {
      try {
        const stored = await AsyncStorage.getItem('user');
        const user = stored ? JSON.parse(stored) : { name: 'An employee' };
        
        const { latitude, longitude } = await getCurrentLocation();
        const locStr = latitude && longitude ? `Lat: ${Number(latitude).toFixed(4)}, Lng: ${Number(longitude).toFixed(4)}` : 'Location unavailable';
        
        await api.post('/notifications/admin', {
          title: '🚫 Live Location Disabled',
          message: `${user.name} has turned off their live location tracking.\nLast known location: ${locStr}`,
          type: 'Warning',
        });
      } catch (err) {
        // ignore
      }
    }
  };

  // Tabs & Leave state
  const [activeTab, setActiveTab] = useState('Attendance');
  const [leaveDate, setLeaveDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [leaveType, setLeaveType] = useState('');
  const [leaveCriteria, setLeaveCriteria] = useState('');
  const [leaveReason, setLeaveReason] = useState('');
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const all = await api.get('/attendance/my');
      let records = all.data.data || [];
      records.forEach(r => {
        if (r.status === 'Pending Check-In') r.status = 'Checked In';
        if (r.status === 'Pending Check-Out') r.status = 'Checked Out';
        if (r.checkInStatus === 'Pending') r.checkInStatus = 'Approved';
        if (r.checkOutStatus === 'Pending') r.checkOutStatus = 'Approved';
      });
      setHistory(records);
    } catch {
      try {
        const res = await api.get('/attendance/today');
        setHistory(res.data.data ? [res.data.data] : []);
      } catch { setHistory([]); }
    } finally { setLoadingHistory(false); }
  }, []);

  useEffect(() => {
    if (activeTab === 'History') fetchHistory();
  }, [activeTab]);

  const handleLeaveSubmit = async () => {
    if (!leaveType) { Toast.show({ type: 'error', text1: 'Required', text2: 'Please select a leave type.' }); return; }
    if (!leaveCriteria) { Toast.show({ type: 'error', text1: 'Required', text2: 'Please select a leave criteria option.' }); return; }
    if (!leaveReason.trim()) { Toast.show({ type: 'error', text1: 'Required', text2: 'Please provide a detailed reason for your leave.' }); return; }

    setSubmitting(true);
    try {
      const fullReason = `[${leaveCriteria}] ${leaveReason.trim()}`;
      await api.post('/attendance/leave', { leaveType, leaveReason: fullReason, leaveDate });
      Toast.show({
        type: 'success',
        text1: '☂️ Leave Request Submitted',
        text2: 'Your leave request has been sent to the Admin for approval.',
        visibilityTime: 5000,
      });
      setLeaveType('');
      setLeaveCriteria('');
      setLeaveReason('');
    } catch (e) {
      const msg = e?.response?.data?.message || 'Could not submit leave request.';
      Toast.show({ type: 'error', text1: 'Error', text2: msg });
    } finally { setSubmitting(false); }
  };

  const handleChatWithAdmin = async () => {
    try {
      const res = await api.get('/users?role=Admin');
      const admin = res.data?.data?.[0];
      if (admin) {
        router.push({ pathname: '/Chat', params: { partnerId: admin._id, partnerName: admin.name } });
      } else {
        Toast.show({ type: 'error', text1: 'Unavailable', text2: 'No Admin found in the system to chat with.' });
      }
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Could not connect to Admin chat.' });
    }
  };

  const fetchToday = useCallback(async () => {
    // Don't fetch for admins — they have their own screen
    if (isAdmin) return;
    try {
      setLoading(true);
      const res = await api.get('/attendance/today');
      let record = res.data.data;
      if (record) {
        if (record.status === 'Pending Check-In') record.status = 'Checked In';
        if (record.status === 'Pending Check-Out') record.status = 'Checked Out';
        if (record.checkInStatus === 'Pending') record.checkInStatus = 'Approved';
        if (record.checkOutStatus === 'Pending') record.checkOutStatus = 'Approved';
      }
      setTodayRecord(record);
    } catch (err) {
      // 403 means this user is not a Field Executive — silently ignore
      if (err?.response?.status !== 403) {
        console.error('Attendance fetch error:', err.message);
      }
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchToday();
  }, [fetchToday]);

  // ── Real-time: auto-refresh attendance when any update fires ─────────────────
  useSocketRefresh(() => {
    fetchToday();
    if (activeTab === 'History') fetchHistory();
  }, ['attendance_updated'], [fetchToday, fetchHistory, activeTab]);

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return { latitude: null, longitude: null };
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      return { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
    } catch {
      return { latitude: null, longitude: null };
    }
  };

  const handleCheckIn = async () => {
    if (!workPlan.trim()) {
      Toast.show({ type: 'error', text1: 'Required', text2: 'Please describe your work plan for today.' });
      return;
    }
    setSubmitting(true);
    try {
      const { latitude, longitude } = await getCurrentLocation();
      await api.post('/attendance/checkin', {
        workPlan: workPlan.trim(),
        latitude,
        longitude,
      });
      Toast.show({
        type: 'success',
        text1: '✅ Checked In',
        text2: 'You have successfully checked in for today.',
        visibilityTime: 4000,
      });
      setWorkPlan('');
      fetchToday();
    } catch (err) {
      const msg = err.response?.data?.message || 'Check-in failed. Please try again.';
      Toast.show({ type: 'error', text1: 'Check-In Failed', text2: msg });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckOut = async (earlyReason = null) => {
    if (!workSummary.trim()) {
      Toast.show({ type: 'error', text1: 'Required', text2: "Please summarize today's work before checking out." });
      return;
    }

    // Detect early checkout (before 6 PM IST) using UTC offset — more reliable across environments
    const nowUTC = new Date();
    const nowIST = new Date(nowUTC.getTime() + 5.5 * 60 * 60 * 1000);
    const isEarly = nowIST.getUTCHours() < 18;

    // If early and no reason given yet — show the reason modal
    const validReason = typeof earlyReason === 'string' ? earlyReason.trim() : null;
    
    if (isEarly && !validReason) {
      setShowEarlyModal(true);
      return;
    }

    const doCheckout = async (retrying = false) => {
      if (!retrying) setSubmitting(true);
      try {
        const { latitude, longitude } = await getCurrentLocation();
        await api.put('/attendance/checkout', {
          workSummary: workSummary.trim(),
          latitude,
          longitude,
          earlyCheckoutReason: validReason || '',
        });
        Toast.show({
          type: isEarly ? 'error' : 'info',
          text1: isEarly ? '⚠️ Early Check-Out Submitted' : '👋 Checked Out',
          text2: isEarly
            ? 'Your early checkout has been flagged and notified to admin.'
            : 'Your checkout has been notified to the admin.',
          visibilityTime: 4000,
        });
        setWorkSummary('');
        setEarlyCheckoutReason('');
        setShowEarlyModal(false);
        fetchToday();
      } catch (err) {
        const status = err.response?.status;
        const errData = err.response?.data;
        const errMsg = errData?.message || err.message || 'Check-out failed. Please try again.';

        // Render cold-start — server waking up, retry once after 2.5s
        if (!retrying && (!err.response || status === 404 || status === 503)) {
          Toast.show({
            type: 'info',
            text1: '⏳ Server is waking up…',
            text2: 'Retrying checkout in 3 seconds. Please wait.',
            visibilityTime: 3000,
          });
          setTimeout(() => doCheckout(true), 3000);
          return;
        }

        if (errData?.isEarly) {
          setShowEarlyModal(true);
        } else if (Platform.OS === 'web') {
          window.alert('Check-Out Failed: ' + errMsg);
        } else {
          Toast.show({ type: 'error', text1: 'Check-Out Failed', text2: errMsg });
        }
      } finally {
        if (retrying) setSubmitting(false);
      }
    };

    // On web, Alert.alert buttons don't fire callbacks — call doCheckout directly.
    // On mobile, show native confirmation dialog.
    if (!isEarly) {
      if (Platform.OS === 'web') {
        const confirmed = window.confirm('Are you sure you want to check out? Your location and summary will be sent to the admin.');
        if (confirmed) doCheckout();
      } else {
        Alert.alert(
          'Confirm Check-Out',
          'Are you sure you want to check out? Your location and summary will be sent to the admin.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Check Out', style: 'destructive', onPress: doCheckout },
          ]
        );
      }
    } else {
      doCheckout();
    }
  };

  const [urgentReason, setUrgentReason] = useState('');

  const handleUrgentLeave = async () => {
    if (!urgentReason.trim()) {
      Toast.show({ type: 'error', text1: 'Required', text2: 'Please provide a reason for urgent leave.' });
      return;
    }
    setSubmitting(true);
    try {
      const { latitude, longitude } = await getCurrentLocation();
      const locStr = latitude && longitude ? `Lat: ${Number(latitude).toFixed(4)}, Lng: ${Number(longitude).toFixed(4)}` : 'Location unavailable';
      
      await api.post('/notifications/admin', {
        title: '🚨 Urgent Leave Alert',
        message: `Employee requires urgent leave.\nReason: ${urgentReason}\nLocation: ${locStr}`,
        type: 'Warning',
      });
      Toast.show({
        type: 'success',
        text1: '🚨 Alert Sent',
        text2: 'Admin has been notified of your urgent leave.',
        visibilityTime: 4000,
      });
      setUrgentReason('');
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to send alert. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  const currentStatus = todayRecord ? todayRecord.status : 'None';
  const statusColor = STATUS_COLORS[currentStatus] || '#f59e0b';
  const statusIcon = STATUS_ICONS[currentStatus] || 'time-outline';

  const formatTime = (dateStr, status) => {
    if (!dateStr) return '—';
    if (status === 'Pending' || status === 'Held') return 'Pending Approval';
    if (status === 'Rejected') return 'Rejected';
    return new Date(dateStr).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <AppLayout currentScreen="Attendance" role="Employee" scrollable={false}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

      {/* ── Early Checkout Reason Modal ── */}
      <Modal visible={showEarlyModal} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 24, padding: 24, width: '100%', maxWidth: 400 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <View style={{ backgroundColor: '#fef3c7', borderRadius: 12, padding: 10 }}>
                <Ionicons name="warning" size={24} color="#f59e0b" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '500', color: '#0f172a' }}>Early Check-Out</Text>
                <Text style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Office hours: 9:30 AM – 6:00 PM</Text>
              </View>
            </View>
            <Text style={{ fontSize: 13, color: '#64748b', marginBottom: 16, lineHeight: 20 }}>
              You are checking out before 6:00 PM. Please provide a valid reason for your early departure. This will be flagged and reviewed by the Admin.
            </Text>
            <Text style={{ fontSize: 11, fontWeight: '500', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Reason *</Text>
            <TextInput
              value={earlyCheckoutReason}
              onChangeText={setEarlyCheckoutReason}
              placeholder="E.g. Doctor's appointment, Family emergency..."
              placeholderTextColor="#94a3b8"
              multiline
              style={{ backgroundColor: '#f8fafc', borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#0f172a', minHeight: 80, textAlignVertical: 'top', marginBottom: 20 }}
            />
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                onPress={() => { setShowEarlyModal(false); setEarlyCheckoutReason(''); }}
                style={{ flex: 1, backgroundColor: '#f1f5f9', borderRadius: 14, paddingVertical: 14, alignItems: 'center' }}
              >
                <Text style={{ color: '#64748b', fontWeight: '500' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  if (!earlyCheckoutReason.trim()) {
                    Toast.show({ type: 'error', text1: 'Required', text2: 'Please enter a reason for early checkout.' });
                    return;
                  }
                  setShowEarlyModal(false);
                  handleCheckOut(earlyCheckoutReason.trim());
                }}
                disabled={submitting}
                style={{ flex: 1, backgroundColor: '#f59e0b', borderRadius: 14, paddingVertical: 14, alignItems: 'center' }}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={{ color: '#fff', fontWeight: '500' }}>Submit & Check Out</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Header */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity onPress={() => router.push(['Admin', 'Project Manager', 'Team Lead', 'Managing Director MD'].includes(role) ? '/AdminDashboard' : '/Dashboard')}>
            <Ionicons name="arrow-back" size={24} color="#0f172a" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Attendance & Leave</Text>
            <Text style={styles.headerSub}>
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </Text>
          </View>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {[
          { key: 'Attendance', label: 'Today', icon: 'today-outline' },
          { key: 'Leave', label: 'Leave', icon: 'umbrella-outline' },
          { key: 'History', label: 'History', icon: 'time-outline' },
        ].map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, activeTab === t.key && styles.tabActive]}
            onPress={() => setActiveTab(t.key)}
            activeOpacity={0.8}
          >
            <Ionicons name={t.icon} size={16} color={activeTab === t.key ? '#0284c7' : '#64748b'} />
            <Text style={[styles.tabText, activeTab === t.key && styles.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'Attendance' && (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        {/* Live Location Toggle */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 }}>
          <View>
            <Text style={{ fontSize: 16, fontWeight: '500', color: '#0f172a' }}>Live Location Sharing</Text>
            <Text style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{isLiveLocationShared ? 'Your location is visible to Admin' : 'Location tracking is disabled'}</Text>
          </View>
          <Switch 
            value={isLiveLocationShared} 
            onValueChange={toggleLiveLocation} 
            trackColor={{ false: '#cbd5e1', true: '#6ee7b7' }}
            thumbColor={isLiveLocationShared ? '#059669' : '#f8fafc'}
          />
        </View>

        {/* Status Card */}
        <View style={[styles.statusCard, { borderLeftColor: statusColor }]}>
          {loading ? (
            <ActivityIndicator color="#0284c7" size="small" />
          ) : (
            <View style={styles.statusRow}>
              <View style={[styles.statusIconWrap, { backgroundColor: statusColor + '20' }]}>
                <Ionicons name={statusIcon} size={28} color={statusColor} />
              </View>
              <View style={styles.statusText}>
                <Text style={styles.statusLabel}>Today's Status</Text>
                <Text style={[styles.statusValue, { color: statusColor }]}>
                  {currentStatus === 'None' ? 'Not Checked In' : currentStatus}
                </Text>
              </View>
            </View>
          )}

          {todayRecord && (
            <View style={styles.timeGrid}>
              <View style={styles.timeCell}>
                <Ionicons name="log-in-outline" size={16} color="#64748b" />
                <Text style={styles.timeCellLabel}>Check-In</Text>
                <Text style={styles.timeCellValue}>{formatTime(todayRecord.checkInTime, todayRecord.checkInStatus)}</Text>
              </View>
              <View style={styles.timeDivider} />
              <View style={styles.timeCell}>
                <Ionicons name="log-out-outline" size={16} color="#64748b" />
                <Text style={styles.timeCellLabel}>Check-Out</Text>
                <Text style={styles.timeCellValue}>{formatTime(todayRecord.checkOutTime, todayRecord.checkOutStatus)}</Text>
              </View>
            </View>
          )}
          
          {/* Employee Timeline */}
          {todayRecord && todayRecord.timeline && todayRecord.timeline.length > 0 && (
            <View style={{ marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#e2e8f0', overflow: 'hidden' }}>
              <TouchableOpacity 
                onPress={() => setShowTimeline(!showTimeline)}
                style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: 12, borderRadius: 8 }}
              >
                <Text style={{ fontSize: 13, fontWeight: '500', color: '#475569' }}>🕒 Daily Timeline ({todayRecord.timeline.length})</Text>
                <Ionicons name={showTimeline ? 'chevron-up' : 'chevron-down'} size={18} color="#64748b" />
              </TouchableOpacity>

              {showTimeline && (
                <View style={{ padding: 12 }}>
                  {todayRecord.timeline.map((event, idx) => (
                    <View key={idx} style={{ flexDirection: 'row', marginBottom: 10 }}>
                      <Text style={{ fontSize: 11, fontWeight: '500', color: '#64748b', width: 60, marginTop: 1 }}>
                        {new Date(event.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                      <View style={{ flex: 1, paddingLeft: 10, borderLeftWidth: 2, borderLeftColor: '#cbd5e1' }}>
                        <Text style={{ fontSize: 13, fontWeight: '500', color: '#334155' }}>{event.type}</Text>
                        <Text style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{event.description}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>

        {/* Pending Check-In */}
        {!loading && todayRecord && todayRecord.status === 'Pending Check-In' && (
          <View style={styles.section}>
            <View style={[styles.doneCard, { backgroundColor: '#fffbeb', borderColor: '#fde68a' }]}>
              <Ionicons name="time" size={48} color="#f59e0b" style={{ marginBottom: 12 }} />
              <Text style={[styles.doneTitle, { color: '#b45309' }]}>Awaiting Approval</Text>
              <Text style={[styles.doneText, { color: '#d97706' }]}>Your check-in request has been sent to the admin and is pending approval.</Text>
            </View>
          </View>
        )}

        {/* Pending Check-Out */}
        {!loading && todayRecord && todayRecord.status === 'Pending Check-Out' && (
          <View style={styles.section}>
            <View style={[styles.doneCard, { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' }]}>
              <Ionicons name="time" size={48} color="#3b82f6" style={{ marginBottom: 12 }} />
              <Text style={[styles.doneTitle, { color: '#1d4ed8' }]}>Awaiting Checkout Approval</Text>
              <Text style={[styles.doneText, { color: '#2563eb' }]}>Your check-out request has been sent to the admin and is pending approval.</Text>
            </View>
          </View>
        )}

        {/* Rejected Check-In */}
        {!loading && todayRecord && todayRecord.status === 'Rejected Check-In' && (
          <View style={styles.section}>
            <View style={[styles.doneCard, { backgroundColor: '#fef2f2', borderColor: '#fecaca' }]}>
              <Ionicons name="close-circle" size={48} color="#ef4444" style={{ marginBottom: 12 }} />
              <Text style={[styles.doneTitle, { color: '#b91c1c' }]}>Check-In Rejected</Text>
              <Text style={[styles.doneText, { color: '#dc2626' }]}>Your check-in was rejected by the Admin. Please contact support.</Text>
            </View>
          </View>
        )}

        {/* Pending Leave / On Leave / Rejected Leave */}
        {!loading && todayRecord && ['Pending Leave', 'On Leave', 'Rejected Leave'].includes(todayRecord.status) && (
          <View style={styles.section}>
            <View style={[styles.doneCard, { backgroundColor: '#faf5ff', borderColor: '#e9d5ff' }]}>
              <Ionicons name="umbrella" size={48} color="#8b5cf6" style={{ marginBottom: 12 }} />
              <Text style={[styles.doneTitle, { color: '#6d28d9' }]}>Leave Request</Text>
              <Text style={[styles.doneText, { color: '#7c3aed' }]}>Status: {todayRecord.status}</Text>
            </View>
          </View>
        )}

        {/* Checked In view — show work plan and enable checkout */}
        {!loading && todayRecord && todayRecord.status === 'Checked In' && (
          <>
            {todayRecord.checkOutStatus === 'Rejected' && (
              <View style={[styles.doneCard, { backgroundColor: '#fef2f2', borderColor: '#fecaca', padding: 16, marginBottom: 20 }]}>
                <Ionicons name="warning-outline" size={24} color="#ef4444" style={{ marginBottom: 8 }} />
                <Text style={[styles.doneTitle, { color: '#b91c1c', fontSize: 16 }]}>Check-Out Rejected</Text>
                <Text style={[styles.doneText, { color: '#dc2626' }]}>Your previous check-out was rejected. Please submit a valid end-of-day summary.</Text>
              </View>
            )}
            
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Today's Work Plan</Text>
              <View style={styles.planCard}>
                <Ionicons name="document-text-outline" size={16} color="#0284c7" style={{ marginRight: 8 }} />
                <Text style={styles.planText}>{todayRecord.workPlan}</Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>End-of-Day Summary</Text>
              <Text style={styles.sectionHint}>Describe what you accomplished today before checking out.</Text>
              <TextInput
                style={[styles.textarea, { outlineStyle: 'none' }]}
                value={workSummary}
                onChangeText={setWorkSummary}
                multiline
                numberOfLines={4}
                placeholder="e.g. Visited 5 clients, closed 2 deals, submitted expense report..."
                placeholderTextColor="#94a3b8"
                textAlignVertical="top"
              />
            </View>

            {todayRecord.executive?.earlyCheckoutLocked && (
              <View style={[styles.doneCard, { backgroundColor: '#fef2f2', borderColor: '#fecaca', padding: 16, marginBottom: 20 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <Ionicons name="lock-closed" size={20} color="#ef4444" />
                  <Text style={[styles.doneTitle, { color: '#b91c1c', fontSize: 16, marginTop: 0 }]}>Early Checkout Locked</Text>
                </View>
                <Text style={[styles.doneText, { color: '#dc2626' }]}>
                  Your ability to check out before 6:00 PM has been locked by the Admin. You cannot check out early.
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.actionBtn, styles.checkoutBtn, submitting && styles.btnDisabled]}
              onPress={handleCheckOut}
              disabled={submitting}
              activeOpacity={0.85}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="log-out-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.actionBtnText}>Check-Out Now</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={[styles.section, { marginTop: 32 }]}>
              <Text style={styles.sectionTitle}>Mid-Day Urgent Leave</Text>
              <Text style={styles.sectionHint}>If you need to leave urgently during the day, notify the admin with a reason.</Text>
              <TextInput
                style={[styles.textarea, { minHeight: 80, outlineStyle: 'none' }]}
                value={urgentReason}
                onChangeText={setUrgentReason}
                multiline
                numberOfLines={2}
                placeholder="Reason for urgent leave..."
                placeholderTextColor="#94a3b8"
                textAlignVertical="top"
              />
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#f59e0b', marginTop: 12 }, submitting && styles.btnDisabled]}
                onPress={handleUrgentLeave}
                disabled={submitting}
                activeOpacity={0.85}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="warning-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.actionBtnText}>Send Urgent Alert</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Not yet checked in — show check-in form */}
        {!loading && !todayRecord && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Today's Work Plan</Text>
              <Text style={styles.sectionHint}>
                Describe what you plan to accomplish today. This will be sent to the admin when you check in.
              </Text>
              <TextInput
                style={[styles.textarea, { outlineStyle: 'none' }]}
                value={workPlan}
                onChangeText={setWorkPlan}
                multiline
                numberOfLines={4}
                placeholder="e.g. Visit distributors in the north zone, collect payments from 3 accounts, attend sales meeting at HQ."
                placeholderTextColor="#94a3b8"
                textAlignVertical="top"
              />
            </View>

            <TouchableOpacity
              style={[styles.actionBtn, styles.checkinBtn, submitting && styles.btnDisabled]}
              onPress={handleCheckIn}
              disabled={submitting}
              activeOpacity={0.85}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="log-in-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.actionBtnText}>Check-In Now</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}

        {/* Already checked out */}
        {!loading && todayRecord && todayRecord.status === 'Checked Out' && (
          <View style={styles.section}>
            <View style={styles.doneCard}>
              <Ionicons name="checkmark-done-circle" size={48} color="#22c55e" style={{ marginBottom: 12 }} />
              <Text style={styles.doneTitle}>All Done for Today!</Text>
              <Text style={styles.doneText}>You have completed your attendance for today.</Text>
            </View>

            <Text style={styles.sectionTitle}>Work Plan</Text>
            <View style={styles.planCard}>
              <Text style={styles.planText}>{todayRecord.workPlan}</Text>
            </View>

            <Text style={[styles.sectionTitle, { marginTop: 16 }]}>End-of-Day Summary</Text>
            <View style={styles.planCard}>
              <Text style={styles.planText}>{todayRecord.workSummary || '—'}</Text>
            </View>
          </View>
        )}
      </ScrollView>
      </KeyboardAvoidingView>
      )}

      {/* ── Leave Tab ── */}
      {activeTab === 'Leave' && (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.statusCard, { padding: 14, marginBottom: 16, borderLeftColor: '#0284c7' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Ionicons name="information-circle-outline" size={18} color="#0284c7" />
              <Text style={{ flex: 1, fontSize: 13, color: '#1e40af', lineHeight: 19 }}>
                Leave requests require Admin approval. You will be notified once the Admin takes action.
              </Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Leave Date *</Text>
          <CrossPlatformDatePicker value={leaveDate} onChange={setLeaveDate} />

          <Text style={styles.sectionTitle}>Leave Type *</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            {LEAVE_TYPES.map((lt) => (
              <TouchableOpacity
                key={lt}
                style={[{ paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12, borderWidth: 1.5, borderColor: '#e2e8f0', backgroundColor: '#fff' }, leaveType === lt && { borderColor: '#0284c7', backgroundColor: '#eff6ff' }]}
                onPress={() => setLeaveType(lt)}
                activeOpacity={0.8}
              >
                <Text style={[{ fontSize: 13, color: '#475569', fontWeight: '400' }, leaveType === lt && { color: '#0284c7', fontWeight: '500' }]}>
                  {lt}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {leaveType ? (
            <>
              <Text style={styles.sectionTitle}>Select Option *</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                {LEAVE_CRITERIA[leaveType]?.map((crit) => (
                  <TouchableOpacity
                    key={crit}
                    style={[{ paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12, borderWidth: 1.5, borderColor: '#e2e8f0', backgroundColor: '#fff' }, leaveCriteria === crit && { borderColor: '#0284c7', backgroundColor: '#eff6ff' }]}
                    onPress={() => setLeaveCriteria(crit)}
                    activeOpacity={0.8}
                  >
                    <Text style={[{ fontSize: 13, color: '#475569', fontWeight: '400' }, leaveCriteria === crit && { color: '#0284c7', fontWeight: '500' }]}>
                      {crit}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          ) : null}

          <Text style={[styles.sectionTitle, { marginTop: 8 }]}>Detailed Reason *</Text>
          <TextInput
            style={[styles.textarea, { outlineStyle: 'none' }]}
            value={leaveReason}
            onChangeText={setLeaveReason}
            multiline
            numberOfLines={4}
            placeholder="Briefly explain why you need this leave..."
            placeholderTextColor="#94a3b8"
            textAlignVertical="top"
          />

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#7c3aed' }, submitting && styles.btnDisabled]}
            onPress={handleLeaveSubmit}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="paper-plane-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.actionBtnText}>Submit Leave Request</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
        </KeyboardAvoidingView>
      )}

      {/* ── History Tab ── */}
      {activeTab === 'History' && (
        loadingHistory ? (
          <ActivityIndicator color="#0284c7" size="large" style={{ marginTop: 60 }} />
        ) : history.length === 0 ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 }}>
            <Ionicons name="time-outline" size={56} color="#cbd5e1" />
            <Text style={{ fontSize: 18, fontWeight: '500', color: '#334155', marginTop: 14 }}>No Records Yet</Text>
            <Text style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>Your attendance history will appear here.</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            {history.map((item) => {
              const cfg = STATUS_COLORS[item.status] ? { color: STATUS_COLORS[item.status], label: item.status } : { color: '#94a3b8', label: item.status };
              return (
                <View key={item._id} style={[{ backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 12, borderLeftWidth: 4, borderWidth: 1, borderColor: '#f1f5f9', elevation: 1 }, { borderLeftColor: cfg.color }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <View>
                      <Text style={{ fontSize: 15, fontWeight: '500', color: '#0f172a' }}>{item.date}</Text>
                      {item.leaveType ? <Text style={{ fontSize: 11, color: '#7c3aed', marginTop: 2, fontWeight: '400' }}>{item.leaveType}</Text> : null}
                    </View>
                    <View style={[{ paddingHorizontal: 9, paddingVertical: 3, borderRadius: 99, borderWidth: 1 }, { backgroundColor: cfg.color + '20', borderColor: cfg.color + '50' }]}>
                      <Text style={[{ fontSize: 10, fontWeight: '500' }, { color: cfg.color }]}>{cfg.label}</Text>
                    </View>
                  </View>
                  {item.workPlan ? (
                    <Text style={{ fontSize: 12, color: '#475569', marginBottom: 4, lineHeight: 18 }} numberOfLines={2}>📋 {item.workPlan}</Text>
                  ) : null}
                  {item.leaveReason ? (
                    <Text style={{ fontSize: 12, color: '#475569', marginBottom: 4, lineHeight: 18 }} numberOfLines={2}>🌿 {item.leaveReason}</Text>
                  ) : null}
                  {item.adminFeedback ? (
                    <Text style={[{ fontSize: 12, color: '#475569', marginBottom: 4, lineHeight: 18 }, { color: '#ef4444' }]}>❌ {item.adminFeedback}</Text>
                  ) : null}
                  <View style={{ flexDirection: 'row', gap: 16, marginTop: 6 }}>
                    <Text style={{ fontSize: 12, color: '#64748b', fontWeight: '400' }}>
                      In: {item.checkInTime ? new Date(item.checkInTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '—'}
                    </Text>
                    <Text style={{ fontSize: 12, color: '#64748b', fontWeight: '400' }}>
                      Out: {item.checkOutTime ? new Date(item.checkOutTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '—'}
                    </Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        )
      )}
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scroll: {
    padding: 20,
    paddingBottom: 48,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 20,
    marginTop: 16,
    gap: 14,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 5,
  },
  tabActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 3,
    elevation: 2,
  },
  tabText: {
    fontSize: 11,
    fontWeight: '400',
    color: '#64748b',
  },
  tabTextActive: {
    color: '#0284c7',
    fontWeight: '500',
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '500',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
    marginTop: 2,
  },
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    borderLeftWidth: 5,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  statusText: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  statusValue: {
    fontSize: 20,
    fontWeight: '500',
  },
  timeGrid: {
    flexDirection: 'row',
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  timeCell: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  timeDivider: {
    width: 1,
    backgroundColor: '#e2e8f0',
    marginHorizontal: 12,
  },
  timeCellLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '400',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timeCellValue: {
    fontSize: 18,
    fontWeight: '500',
    color: '#0f172a',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  sectionHint: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 10,
    lineHeight: 18,
  },
  textarea: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    padding: 16,
    color: '#0f172a',
    fontSize: 14,
    minHeight: 120,
    lineHeight: 22,
  },
  planCard: {
    flexDirection: 'row',
    backgroundColor: '#f0f9ff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  planText: {
    flex: 1,
    color: '#0f172a',
    fontSize: 14,
    lineHeight: 22,
  },
  actionBtn: {
    height: 56,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    elevation: 4,
  },
  checkinBtn: {
    backgroundColor: '#0284c7',
  },
  checkoutBtn: {
    backgroundColor: '#ef4444',
  },
  btnDisabled: {
    opacity: 0.65,
  },
  actionBtnText: {
    color: '#fff',
    fontWeight: '500',
    fontSize: 16,
  },
  doneCard: {
    backgroundColor: '#f0fdf4',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  doneTitle: {
    fontSize: 20,
    fontWeight: '500',
    color: '#15803d',
    marginBottom: 6,
  },
  doneText: {
    fontSize: 13,
    color: '#16a34a',
    textAlign: 'center',
  },
});
