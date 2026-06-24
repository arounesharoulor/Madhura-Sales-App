import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, ActivityIndicator, FlatList, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useRouter } from 'expo-router';
import api from '../api/api';

const LEAVE_TYPES = ['Medical Leave', 'Casual Leave', 'Personal Leave', 'Emergency Leave'];

const LEAVE_CRITERIA = {
  'Medical Leave': ['Fever/Illness', 'Doctor Appointment', 'Hospitalization', 'Other'],
  'Casual Leave': ['Personal Errands', 'Function/Event', 'Travel', 'Other'],
  'Personal Leave': ['Family commitments', 'Urgent work', 'Other'],
  'Emergency Leave': ['Accident', 'Family Emergency', 'Other'],
};

const FAQ_ITEMS = [
  {
    q: 'How do I apply for leave?',
    a: 'Go to the "Leave" tab in this Support screen. Select a leave type, write your reason, and submit. The Admin will approve or reject it.',
  },
  {
    q: 'When is my check-in considered approved?',
    a: 'Your check-in is marked "Checked In" only after the Admin approves your request. Until then, it shows "Pending Check-In" in the system.',
  },
  {
    q: 'What if my leave is rejected?',
    a: 'If your leave is rejected, you will receive a notification with the reason. You can re-apply or contact the Admin directly.',
  },
  {
    q: 'How do I update my profile details?',
    a: 'Navigate to the Profile screen from the sidebar menu. You can update your name, phone number, designation, and more.',
  },
  {
    q: 'How do I submit a follow-up for a client?',
    a: 'Go to the Follow-ups screen from the sidebar. You can add a new follow-up with a scheduled date, client name, and notes.',
  },
  {
    q: 'What happens if I forget to check out?',
    a: 'Your status will remain "Checked In" for that day. Please check out the next day before checking in, or contact your Admin to manually update the record.',
  },
  {
    q: 'How are notifications sent to me?',
    a: 'Notifications are delivered in real-time via the Notifications screen. Any admin action on your attendance, tasks, or reports will appear there immediately.',
  },
];

const STATUS_CONFIG = {
  'Pending Check-In':   { color: '#f59e0b', label: 'Pending Check-In' },
  'Checked In':         { color: '#22c55e', label: 'Checked In ✓' },
  'Pending Check-Out':  { color: '#3b82f6', label: 'Pending Check-Out' },
  'Checked Out':        { color: '#64748b', label: 'Checked Out' },
  'Pending Leave':      { color: '#a855f7', label: 'Leave Pending' },
  'On Leave':           { color: '#8b5cf6', label: 'On Leave ✓' },
  'Rejected Check-In':  { color: '#ef4444', label: 'Check-In Rejected' },
  'Rejected Check-Out': { color: '#ef4444', label: 'Check-Out Rejected' },
  'Rejected Leave':     { color: '#ef4444', label: 'Leave Rejected' },
  Absent:               { color: '#ef4444', label: 'Absent' },
};

export default function SupportScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('Leave');
  const [leaveType, setLeaveType] = useState('');
  const [leaveCriteria, setLeaveCriteria] = useState('');
  const [leaveReason, setLeaveReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState(null);

  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await api.get('/attendance/today');
      // Get all attendance using a different endpoint if available, else use today
      // For history we'll request all records
      const all = await api.get('/attendance/my');
      setHistory(all.data.data || []);
    } catch {
      // fallback: fetch today only
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
    if (!leaveType) { Alert.alert('Required', 'Please select a leave type.'); return; }
    if (!leaveCriteria) { Alert.alert('Required', 'Please select a leave criteria option.'); return; }
    if (!leaveReason.trim()) { Alert.alert('Required', 'Please provide a detailed reason for your leave.'); return; }

    setSubmitting(true);
    try {
      const fullReason = `[${leaveCriteria}] ${leaveReason.trim()}`;
      await api.post('/attendance/leave', { leaveType, leaveReason: fullReason });
      Toast.show({
        type: 'success',
        text1: '🌿 Leave Request Submitted',
        text2: 'Your leave request has been sent to the Admin for approval.',
        visibilityTime: 5000,
      });
      setLeaveType('');
      setLeaveCriteria('');
      setLeaveReason('');
    } catch (e) {
      const msg = e?.response?.data?.message || 'Could not submit leave request.';
      Alert.alert('Error', msg);
    } finally { setSubmitting(false); }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router?.canGoBack?.() && router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Support Centre</Text>
          <Text style={styles.headerSub}>Leave requests, history & help</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {[
          { key: 'Leave',   label: 'Leave Mgmt',  icon: 'umbrella-outline' },
          { key: 'History', label: 'My History',  icon: 'time-outline' },
          { key: 'Help',    label: 'FAQ / Help',  icon: 'help-circle-outline' },
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

      {/* ── Leave Tab ── */}
      {activeTab === 'Leave' && (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.infoCard}>
            <Ionicons name="information-circle-outline" size={18} color="#0284c7" />
            <Text style={styles.infoText}>
              Leave requests require Admin approval. You will be notified once the Admin takes action.
            </Text>
          </View>

          <Text style={styles.label}>Leave Type *</Text>
          <View style={styles.leaveTypeGrid}>
            {LEAVE_TYPES.map((lt) => (
              <TouchableOpacity
                key={lt}
                style={[styles.leaveTypeBtn, leaveType === lt && styles.leaveTypeBtnActive]}
                onPress={() => setLeaveType(lt)}
                activeOpacity={0.8}
              >
                <Text style={[styles.leaveTypeBtnText, leaveType === lt && styles.leaveTypeBtnTextActive]}>
                  {lt}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {leaveType ? (
            <>
              <Text style={styles.label}>Select Option *</Text>
              <View style={styles.leaveTypeGrid}>
                {LEAVE_CRITERIA[leaveType]?.map((crit) => (
                  <TouchableOpacity
                    key={crit}
                    style={[styles.leaveTypeBtn, leaveCriteria === crit && styles.leaveTypeBtnActive]}
                    onPress={() => setLeaveCriteria(crit)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.leaveTypeBtnText, leaveCriteria === crit && styles.leaveTypeBtnTextActive]}>
                      {crit}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          ) : null}

          <Text style={[styles.label, { marginTop: 8 }]}>Detailed Reason *</Text>
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
            style={[styles.submitBtn, submitting && { opacity: 0.65 }]}
            onPress={handleLeaveSubmit}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="paper-plane-outline" size={18} color="#fff" />
                <Text style={styles.submitBtnText}>Submit Leave Request</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Contact Admin */}
          <View style={[styles.infoCard, { marginTop: 24, backgroundColor: '#faf5ff', borderColor: '#e9d5ff' }]}>
            <Ionicons name="chatbubble-ellipses-outline" size={18} color="#7c3aed" />
            <View style={{ flex: 1 }}>
              <Text style={[styles.infoText, { color: '#6d28d9', fontWeight: '700' }]}>Need urgent help?</Text>
              <Text style={[styles.infoText, { color: '#7c3aed', marginTop: 2 }]}>
                Use the Chat screen to message your admin directly for emergencies.
              </Text>
            </View>
          </View>
        </ScrollView>
      )}

      {/* ── History Tab ── */}
      {activeTab === 'History' && (
        loadingHistory ? (
          <ActivityIndicator color="#0284c7" size="large" style={{ marginTop: 60 }} />
        ) : history.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="time-outline" size={56} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>No Records Yet</Text>
            <Text style={styles.emptyText}>Your attendance history will appear here.</Text>
          </View>
        ) : (
          <FlatList
            data={history}
            keyExtractor={(i) => i._id}
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const cfg = STATUS_CONFIG[item.status] || { color: '#94a3b8', label: item.status };
              return (
                <View style={[styles.histCard, { borderLeftColor: cfg.color }]}>
                  <View style={styles.histRow}>
                    <View>
                      <Text style={styles.histDate}>{item.date}</Text>
                      {item.leaveType ? <Text style={styles.histLeaveType}>{item.leaveType}</Text> : null}
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: cfg.color + '20', borderColor: cfg.color + '50' }]}>
                      <Text style={[styles.statusBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
                    </View>
                  </View>
                  {item.workPlan ? (
                    <Text style={styles.histDetail} numberOfLines={2}>📋 {item.workPlan}</Text>
                  ) : null}
                  {item.leaveReason ? (
                    <Text style={styles.histDetail} numberOfLines={2}>🌿 {item.leaveReason}</Text>
                  ) : null}
                  {item.adminFeedback ? (
                    <Text style={[styles.histDetail, { color: '#ef4444' }]}>❌ {item.adminFeedback}</Text>
                  ) : null}
                  <View style={styles.histTimeRow}>
                    <Text style={styles.histTime}>
                      In: {item.checkInTime ? new Date(item.checkInTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '—'}
                    </Text>
                    <Text style={styles.histTime}>
                      Out: {item.checkOutTime ? new Date(item.checkOutTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '—'}
                    </Text>
                  </View>
                </View>
              );
            }}
          />
        )
      )}

      {/* ── Help/FAQ Tab ── */}
      {activeTab === 'Help' && (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={[styles.infoCard, { marginBottom: 20 }]}>
            <Ionicons name="shield-checkmark-outline" size={18} color="#16a34a" />
            <Text style={[styles.infoText, { color: '#15803d' }]}>
              Find answers to common questions below. Tap any question to expand the answer.
            </Text>
          </View>

          {FAQ_ITEMS.map((item, i) => (
            <TouchableOpacity
              key={i}
              style={styles.faqCard}
              onPress={() => setExpandedFaq(expandedFaq === i ? null : i)}
              activeOpacity={0.8}
            >
              <View style={styles.faqHeader}>
                <Text style={styles.faqQuestion}>{item.q}</Text>
                <Ionicons
                  name={expandedFaq === i ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color="#64748b"
                />
              </View>
              {expandedFaq === i && (
                <Text style={styles.faqAnswer}>{item.a}</Text>
              )}
            </TouchableOpacity>
          ))}

          {/* Contact info */}
          <View style={[styles.infoCard, { marginTop: 24, backgroundColor: '#f0f9ff', borderColor: '#bae6fd' }]}>
            <Ionicons name="call-outline" size={18} color="#0284c7" />
            <View style={{ flex: 1 }}>
              <Text style={[styles.infoText, { fontWeight: '700', color: '#0369a1' }]}>Need more help?</Text>
              <Text style={[styles.infoText, { color: '#0284c7', marginTop: 2 }]}>
                Contact your Admin or use the Chat screen to raise a concern directly.
              </Text>
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },

  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  backBtn: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  headerSub: { fontSize: 12, color: '#64748b', marginTop: 2 },

  tabs: { flexDirection: 'row', backgroundColor: '#f1f5f9', margin: 16, borderRadius: 16, padding: 4, gap: 4 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 12, gap: 5 },
  tabActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 3, elevation: 2 },
  tabText: { fontSize: 11, fontWeight: '600', color: '#64748b' },
  tabTextActive: { color: '#0284c7', fontWeight: '700' },

  scroll: { paddingHorizontal: 16, paddingBottom: 48 },

  infoCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe', borderRadius: 14, padding: 14, marginBottom: 16 },
  infoText: { flex: 1, fontSize: 13, color: '#1e40af', lineHeight: 19 },

  label: { fontSize: 11, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
  leaveTypeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  leaveTypeBtn: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12, borderWidth: 1.5, borderColor: '#e2e8f0', backgroundColor: '#fff' },
  leaveTypeBtnActive: { borderColor: '#0284c7', backgroundColor: '#eff6ff' },
  leaveTypeBtnText: { fontSize: 13, color: '#475569', fontWeight: '600' },
  leaveTypeBtnTextActive: { color: '#0284c7', fontWeight: '700' },

  textarea: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1.5, borderColor: '#e2e8f0', padding: 14, fontSize: 14, color: '#0f172a', minHeight: 110, lineHeight: 22 },

  submitBtn: { height: 56, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#7c3aed', marginTop: 16, elevation: 4 },
  submitBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#334155', marginTop: 14 },
  emptyText: { fontSize: 13, color: '#94a3b8', marginTop: 4 },

  histCard: { backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 12, borderLeftWidth: 4, borderWidth: 1, borderColor: '#f1f5f9', elevation: 1 },
  histRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  histDate: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  histLeaveType: { fontSize: 11, color: '#7c3aed', marginTop: 2, fontWeight: '600' },
  statusBadge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 99, borderWidth: 1 },
  statusBadgeText: { fontSize: 10, fontWeight: '700' },
  histDetail: { fontSize: 12, color: '#475569', marginBottom: 4, lineHeight: 18 },
  histTimeRow: { flexDirection: 'row', gap: 16, marginTop: 6 },
  histTime: { fontSize: 12, color: '#64748b', fontWeight: '600' },

  faqCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  faqHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  faqQuestion: { flex: 1, fontSize: 14, fontWeight: '700', color: '#0f172a', lineHeight: 20 },
  faqAnswer: { fontSize: 13, color: '#475569', marginTop: 12, lineHeight: 20, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 12 },
});
