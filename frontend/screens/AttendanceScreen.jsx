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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import Toast from 'react-native-toast-message';
import { useRouter } from 'expo-router';
import api from '../api/api';

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

export default function AttendanceScreen() {
  const router = useRouter();
  const [todayRecord, setTodayRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [workPlan, setWorkPlan] = useState('');
  const [workSummary, setWorkSummary] = useState('');
  const [earlyCheckoutReason, setEarlyCheckoutReason] = useState('');
  const [showEarlyModal, setShowEarlyModal] = useState(false);

  const fetchToday = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/attendance/today');
      setTodayRecord(res.data.data);
    } catch (err) {
      console.error('Attendance fetch error:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchToday();
  }, [fetchToday]);

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
      Alert.alert('Required', 'Please describe your work plan for today.');
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
        text1: '✅ Attendance Registered',
        text2: 'Your check-in has been notified to the admin.',
        visibilityTime: 4000,
      });
      setWorkPlan('');
      fetchToday();
    } catch (err) {
      const msg = err.response?.data?.message || 'Check-in failed. Please try again.';
      Alert.alert('Check-In Failed', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckOut = async (earlyReason = null) => {
    if (!workSummary.trim()) {
      Alert.alert('Required', "Please summarize today's work before checking out.");
      return;
    }

    // Detect early checkout (before 6 PM IST)
    const nowIST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const isEarly = nowIST.getHours() < 18;

    // If early and no reason given yet — show the reason modal
    if (isEarly && !earlyReason) {
      setShowEarlyModal(true);
      return;
    }

    const doCheckout = async () => {
      setSubmitting(true);
      try {
        const { latitude, longitude } = await getCurrentLocation();
        await api.put('/attendance/checkout', {
          workSummary: workSummary.trim(),
          latitude,
          longitude,
          ...(earlyReason && { earlyCheckoutReason: earlyReason }),
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
        const errData = err.response?.data;
        if (errData?.isEarly) {
          setShowEarlyModal(true);
        } else {
          Alert.alert('Check-Out Failed', errData?.message || 'Check-out failed. Please try again.');
        }
      } finally {
        setSubmitting(false);
      }
    };

    if (!isEarly) {
      Alert.alert(
        'Confirm Check-Out',
        'Are you sure you want to check out? Your location and summary will be sent to the admin.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Check Out', style: 'destructive', onPress: doCheckout },
        ]
      );
    } else {
      doCheckout();
    }
  };

  const [urgentReason, setUrgentReason] = useState('');

  const handleUrgentLeave = async () => {
    if (!urgentReason.trim()) {
      Alert.alert('Required', 'Please provide a reason for urgent leave.');
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
      Alert.alert('Error', 'Failed to send alert. Please try again.');
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
    <SafeAreaView style={styles.safe}>
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
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#0f172a' }}>Early Check-Out</Text>
                <Text style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Office hours: 9:30 AM – 6:00 PM</Text>
              </View>
            </View>
            <Text style={{ fontSize: 13, color: '#64748b', marginBottom: 16, lineHeight: 20 }}>
              You are checking out before 6:00 PM. Please provide a valid reason for your early departure. This will be flagged and reviewed by the Admin.
            </Text>
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Reason *</Text>
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
                <Text style={{ color: '#64748b', fontWeight: '700' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  if (!earlyCheckoutReason.trim()) {
                    Alert.alert('Required', 'Please enter a reason for early checkout.');
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
                  <Text style={{ color: '#fff', fontWeight: '800' }}>Submit & Check Out</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router?.canGoBack?.() && router.back()}
            style={styles.backBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={22} color="#0f172a" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Daily Attendance</Text>
            <Text style={styles.headerSub}>
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </Text>
          </View>
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
                  <Text style={styles.actionBtnText}>Submit Check-Out Request</Text>
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
                  <Text style={styles.actionBtnText}>Submit Check-In Request</Text>
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
    </SafeAreaView>
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
    marginBottom: 24,
    gap: 14,
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
    fontWeight: '800',
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
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  statusValue: {
    fontSize: 20,
    fontWeight: '800',
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
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timeCellValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
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
    fontWeight: '700',
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
    fontWeight: '800',
    color: '#15803d',
    marginBottom: 6,
  },
  doneText: {
    fontSize: 13,
    color: '#16a34a',
    textAlign: 'center',
  },
});
