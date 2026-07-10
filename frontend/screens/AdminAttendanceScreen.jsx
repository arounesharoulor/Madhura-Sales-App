import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  FlatList, ActivityIndicator, Alert, Platform, Modal, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AppLayout from '../components/AppLayout';
import api from '../api/api';
import { useSocketRefresh } from '../hooks/useSocketRefresh';

const REJECT_REASONS_ATTENDANCE = [
  'Location not verified',
  'Time discrepancy',
  'Late comer',
  'Not informed',
  'Fraudulent check-in attempt',
  'Other',
];

const REJECT_REASONS_LEAVE = [
  'No leave available',
  'Urgent project ongoing',
  'Inadequate reason',
  'Team short-staffed',
  'Other',
];

const STATUS_CONFIG = {
  'Pending Check-In':  { color: '#f59e0b', bg: '#fffbeb', label: 'Pending Check-In',  icon: 'time-outline' },
  'Checked In':        { color: '#22c55e', bg: '#f0fdf4', label: 'Checked In (Active)', icon: 'checkmark-circle-outline' },
  'Pending Check-Out': { color: '#3b82f6', bg: '#eff6ff', label: 'Pending Check-Out', icon: 'time-outline' },
  'Checked Out':       { color: '#64748b', bg: '#f8fafc', label: 'Checked Out',        icon: 'log-out-outline' },
  'Pending Leave':     { color: '#a855f7', bg: '#faf5ff', label: 'Leave Pending',      icon: 'time-outline' },
  'On Leave':          { color: '#8b5cf6', bg: '#f5f3ff', label: 'On Leave',           icon: 'umbrella-outline' },
  'Rejected Check-In': { color: '#ef4444', bg: '#fef2f2', label: 'Check-In Rejected',  icon: 'close-circle-outline' },
  'Rejected Check-Out':{ color: '#ef4444', bg: '#fef2f2', label: 'Check-Out Rejected', icon: 'close-circle-outline' },
  'Rejected Leave':    { color: '#ef4444', bg: '#fef2f2', label: 'Leave Rejected',     icon: 'close-circle-outline' },
  'Held in Queue':     { color: '#eab308', bg: '#fefce8', label: 'In Queue',           icon: 'pause-circle-outline' },
  'Leave Held in Queue':{color: '#eab308', bg: '#fefce8', label: 'Leave In Queue',     icon: 'pause-circle-outline' },
  Absent:              { color: '#ef4444', bg: '#fef2f2', label: 'Absent',             icon: 'close-circle-outline' },
};

const isPendingStatus = (s) => s === 'Pending Check-In' || s === 'Pending Check-Out' || s === 'Pending Leave';
const isHeld = (r) => r.checkInStatus === 'Held' || r.checkOutStatus === 'Held' || r.leaveStatus === 'Held';
const isPending = (r) => isPendingStatus(r.status) && !isHeld(r);

export default function AdminAttendanceScreen() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchDate, setSearchDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [mainTab, setMainTab] = useState('Queue');   // 'Queue' | 'History' | 'Location'

  // Reject modal state
  const [rejectModal, setRejectModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [actionLoading, setActionLoading] = useState(null); // record id
  const [isExporting, setIsExporting] = useState(false);
  const [userRole, setUserRole] = useState('');
  const [expandedTimelines, setExpandedTimelines] = useState({});

  // Live locations
  const [locations, setLocations] = useState([]);
  const [loadingLocs, setLoadingLocs] = useState(false);

  // Summary Data
  const [summaryData, setSummaryData] = useState([]);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);

  const fetchAttendance = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);
      const params = {};
      if (searchDate) params.date = searchDate;
      const res = await api.get('/attendance', { params });
      setRecords(res.data.data || []);
    } catch {
      Alert.alert('Error', 'Could not load attendance records.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchDate]);

  useEffect(() => {
    fetchAttendance();
    AsyncStorage.getItem('user').then(v => {
      if (v) setUserRole(JSON.parse(v).role || '');
    });
  }, []);
  useEffect(() => {
    fetchAttendance();
  }, [searchDate]);
  
  useSocketRefresh(() => {
    fetchAttendance();
  }, ['attendance_updated']);

  useEffect(() => {
    if (mainTab === 'Location') fetchLiveLocations();
  }, [mainTab]);

  const openSummaryModal = () => {
    setShowSummaryModal(true);
    fetchSummaryData();
  };

  const fetchSummaryData = async () => {
    try {
      setLoadingSummary(true);
      const res = await api.get('/attendance/summary');
      setSummaryData(res.data.data || []);
    } catch {
      Alert.alert('Error', 'Unable to load summary data.');
    } finally {
      setLoadingSummary(false);
    }
  };

  const fetchLiveLocations = async () => {
    try {
      setLoadingLocs(true);
      const res = await api.get('/locations/latest');
      setLocations(res.data.data || []);
    } catch { Alert.alert('Error', 'Unable to load live locations.'); }
    finally { setLoadingLocs(false); }
  };

  const openInMap = (lat, lng) => {
    if (!lat || !lng) { Alert.alert('No coordinates available'); return; }
    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    if (Platform.OS === 'web') window.open(url, '_blank');
    else require('react-native').Linking.openURL(url).catch(() => {});
  };

  const handleExportLog = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const baseUrl = api.defaults?.baseURL || '';
      const url = `${baseUrl}/attendance/export`;

      if (Platform.OS === 'web') {
        const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (!resp.ok) throw new Error('Failed to download log');
        const blob = await resp.blob();
        const a = document.createElement('a');
        const objectUrl = URL.createObjectURL(blob);
        a.href = objectUrl;
        a.setAttribute('download', 'Attendance_Log.xlsx');
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(objectUrl);
      } else {
        const FileSystem = require('expo-file-system/legacy');
        const Sharing = require('expo-sharing');
        const localUri = FileSystem.cacheDirectory + 'Attendance_Log.xlsx';

        const dl = await FileSystem.downloadAsync(url, localUri, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (dl.status === 200) {
          const canShare = await Sharing.isAvailableAsync();
          if (canShare) {
            await Sharing.shareAsync(dl.uri, { mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', dialogTitle: 'Save Attendance Log' });
          } else {
            Alert.alert('Downloaded', `Saved to: ${dl.uri}`);
          }
        } else {
          Alert.alert('Error', `Download failed with status: ${dl.status}`);
        }
      }
    } catch (e) {
      console.error(e);
      // Suppress the "Another share request" error from popping up to the user since it just means they tapped it twice
      if (e.message && !e.message.includes('Another share request')) {
        Alert.alert('Error', `Could not download the attendance log. ${e.message}`);
      }
    } finally {
      setIsExporting(false);
    }
  };

  // --- Approve ---
  const handleApprove = async (record) => {
    setActionLoading(record._id);
    try {
      await api.put(`/attendance/${record._id}/approve`);
      Alert.alert('✅ Approved', `Attendance for ${record.executive?.name} approved successfully.`);
      fetchAttendance();
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.message || 'Could not approve.');
    } finally { setActionLoading(null); }
  };

  // --- Hold ---
  const handleHold = async (record) => {
    setActionLoading(record._id);
    try {
      await api.put(`/attendance/${record._id}/hold`);
      Alert.alert('⏸️ Held in Queue', `Request for ${record.executive?.name} moved to queue.`);
      fetchAttendance();
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.message || 'Could not put on hold.');
    } finally { setActionLoading(null); }
  };

  // --- Reject ---
  const openRejectModal = (record) => {
    setSelectedRecord(record);
    setSelectedReason('');
    setCustomReason('');
    setRejectModal(true);
  };

  const handleReject = async () => {
    const reason = selectedReason === 'Other' ? customReason : selectedReason;
    if (!reason) { Alert.alert('Please select a reason.'); return; }
    setActionLoading(selectedRecord._id);
    setRejectModal(false);
    try {
      await api.put(`/attendance/${selectedRecord._id}/reject`, { feedback: reason });
      Alert.alert('❌ Rejected', `Attendance for ${selectedRecord.executive?.name} rejected.`);
      fetchAttendance();
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.message || 'Could not reject.');
    } finally { setActionLoading(null); }
  };

  const handleToggleLock = async (executiveId, currentLockState) => {
    try {
      const res = await api.put(`/attendance/user/${executiveId}/lock-early-checkout`, { locked: !currentLockState });
      Alert.alert(res.data.message || 'Done');
      fetchAttendance();
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.message || 'Could not update lock status.');
    }
  };

  const formatTime = (d) => d ? new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '—';
  
  const formatDateWithDay = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Derived lists
  const safeRecords = Array.isArray(records) ? records : [];
  const queue   = safeRecords.filter((r) => isPending(r));
  const held    = safeRecords.filter((r) => isHeld(r));
  const history = safeRecords.filter((r) => !isPending(r) && !isHeld(r));

  const isLeaveRecord = (item) => item.status === 'Pending Leave' || item.status === 'On Leave' || item.status === 'Rejected Leave' || !!item.leaveType;

  const renderCard = ({ item }) => {
    let cfg = STATUS_CONFIG[item.status] || { color: '#94a3b8', bg: '#f8fafc', label: item.status, icon: 'help-circle-outline' };
    if (isHeld(item)) {
      cfg = STATUS_CONFIG[isLeaveRecord(item) ? 'Leave Held in Queue' : 'Held in Queue'];
    }
    const isLoading = actionLoading === item._id;
    const isActionable = isPending(item) || isHeld(item);
    const isLeave = isLeaveRecord(item);

    // Employee name fallback chain
    const empName = item.executive?.name || item.executiveName || 'Employee';
    const empId = item.executive?.employeeId || item.executive?.employeeID || '';
    const empDesig = item.executive?.designation || '';
    const empEmail = item.executive?.email || '';

    return (
      <View style={[styles.card, { borderLeftColor: cfg.color, borderLeftWidth: 4 }]}>

        {/* ── Employee Header ── */}
        <View style={styles.cardTop}>
          <View style={[styles.avatar, { backgroundColor: cfg.color + '22' }]}>
            <Text style={[styles.avatarText, { color: cfg.color }]}>
              {empName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardName}>{empName}</Text>
            <Text style={styles.cardSub}>
              {empId ? `ID: ${empId}  ·  ` : ''}{empDesig || empEmail || 'Field Executive'}
            </Text>
          </View>
          <View style={[styles.badge, { backgroundColor: cfg.bg, borderColor: cfg.color + '50' }]}>
            <Ionicons name={cfg.icon} size={11} color={cfg.color} />
            <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* ── Leave Card Content ── */}
        {isLeave ? (
          <View>
            <View style={[styles.infoBox, { backgroundColor: '#faf5ff', borderColor: '#d8b4fe' }]}>
              <Text style={[styles.infoLabel, { color: '#7c3aed' }]}>🌿 Leave Request</Text>
              <View style={{ flexDirection: 'row', gap: 16, marginTop: 4 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.timeLabel}>TYPE</Text>
                  <Text style={[styles.timeVal, { color: '#7c3aed' }]}>{item.leaveType || '—'}</Text>
                </View>
                <View style={{ flex: 1.5 }}>
                  <Text style={styles.timeLabel}>DATE</Text>
                  <Text style={[styles.timeVal, { color: '#7c3aed' }]}>{formatDateWithDay(item.date)}</Text>
                </View>
              </View>
              {item.leaveReason ? (
                <View style={{ marginTop: 10 }}>
                  <Text style={styles.timeLabel}>REASON</Text>
                  <Text style={[styles.infoText, { marginTop: 4 }]}>{item.leaveReason}</Text>
                </View>
              ) : null}
            </View>

            {item.adminFeedback ? (
              <View style={[styles.infoBox, { backgroundColor: '#fef2f2', borderColor: '#fecaca' }]}>
                <Text style={styles.infoLabel}>❌ Rejection Reason</Text>
                <Text style={styles.infoText}>{item.adminFeedback}</Text>
              </View>
            ) : null}

            {/* Leave buttons: Approve + Reject only for HR & Super Admin */}
            {isActionable && (userRole === 'HR' || userRole === 'Super Admin' || userRole === 'Managing Director MD') ? (
              <View style={[styles.actionRow, { marginTop: 12 }]}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.approveBtn]}
                  onPress={() => handleApprove(item)}
                  disabled={isLoading}
                  activeOpacity={0.8}
                >
                  {isLoading ? <ActivityIndicator size="small" color="#fff" /> : (
                    <>
                      <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
                      <Text style={styles.actionBtnText}>Approve</Text>
                    </>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.rejectBtn]}
                  onPress={() => openRejectModal(item)}
                  disabled={isLoading}
                  activeOpacity={0.8}
                >
                  <Ionicons name="close-circle-outline" size={16} color="#fff" />
                  <Text style={styles.actionBtnText}>Reject</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        ) : (
          /* ── Attendance Card Content ── */
          <View>
            {/* Time row */}
            <View style={styles.timeRow}>
              {[
                { label: 'CHECK-IN',  icon: 'log-in-outline',  color: '#0284c7', val: formatTime(item.checkInTime) },
                { label: 'CHECK-OUT', icon: 'log-out-outline', color: '#ef4444', val: formatTime(item.checkOutTime) },
                { label: 'DATE',      icon: 'calendar-outline',color: '#7c3aed', val: formatDateWithDay(item.date) },
              ].map((t) => (
                <View key={t.label} style={styles.timeBlock}>
                  <Ionicons name={t.icon} size={13} color={t.color} />
                  <Text style={styles.timeLabel}>{t.label}</Text>
                  <Text style={styles.timeVal}>{t.val}</Text>
                </View>
              ))}
            </View>

            {item.workPlan ? (
              <View style={[styles.infoBox, { backgroundColor: '#f0f9ff', borderColor: '#bae6fd' }]}>
                <Text style={styles.infoLabel}>📋 Work Plan</Text>
                <Text style={styles.infoText} numberOfLines={2}>{item.workPlan}</Text>
              </View>
            ) : null}

            {item.workSummary ? (
              <View style={[styles.infoBox, { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }]}>
                <Text style={styles.infoLabel}>📝 Work Summary</Text>
                <Text style={styles.infoText} numberOfLines={2}>{item.workSummary}</Text>
              </View>
            ) : null}

            {/* Early Checkout Badge */}
            {item.earlyCheckout && (
              <View style={[styles.infoBox, { backgroundColor: '#fffbeb', borderColor: '#fbbf24' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Ionicons name="warning" size={13} color="#f59e0b" />
                  <Text style={[styles.infoLabel, { color: '#d97706' }]}>⚠️ EARLY CHECKOUT</Text>
                </View>
                <Text style={[styles.infoText, { color: '#92400e' }]}>
                  Reason: {item.earlyCheckoutReason || '—'}
                </Text>
              </View>
            )}

            {/* Lock/Unlock Early Checkout Button */}
            {item.executive?._id && (
              <TouchableOpacity
                onPress={() => handleToggleLock(item.executive._id, item.executive?.earlyCheckoutLocked)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, backgroundColor: item.executive?.earlyCheckoutLocked ? '#fef2f2' : '#f8fafc', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: item.executive?.earlyCheckoutLocked ? '#fecaca' : '#e2e8f0' }}
              >
                <Ionicons name={item.executive?.earlyCheckoutLocked ? 'lock-closed' : 'lock-open'} size={14} color={item.executive?.earlyCheckoutLocked ? '#ef4444' : '#64748b'} />
                <Text style={{ fontSize: 12, fontWeight: '700', color: item.executive?.earlyCheckoutLocked ? '#ef4444' : '#64748b' }}>
                  {item.executive?.earlyCheckoutLocked ? '🔒 Early Checkout Locked' : '🔓 Lock Early Checkout'}
                </Text>
              </TouchableOpacity>
            )}

            {item.adminFeedback ? (
              <View style={[styles.infoBox, { backgroundColor: '#fef2f2', borderColor: '#fecaca' }]}>
                <Text style={styles.infoLabel}>❌ Rejection Reason</Text>
                <Text style={styles.infoText}>{item.adminFeedback}</Text>
              </View>
            ) : null}

            {item.checkInLocation?.latitude ? (
              <TouchableOpacity
                style={styles.mapRow}
                onPress={() => openInMap(item.checkInLocation.latitude, item.checkInLocation.longitude)}
              >
                <Ionicons name="location-outline" size={13} color="#0284c7" />
                <Text style={styles.mapText}>
                  {Number(item.checkInLocation.latitude).toFixed(4)}, {Number(item.checkInLocation.longitude).toFixed(4)} · View Map →
                </Text>
              </TouchableOpacity>
            ) : null}
            
            {/* ── Employee Timeline ── */}
            {item.timeline && item.timeline.length > 0 ? (
              <View style={[styles.infoBox, { backgroundColor: '#f8fafc', borderColor: '#e2e8f0', marginTop: 12, padding: 0, overflow: 'hidden' }]}>
                <TouchableOpacity 
                  onPress={() => setExpandedTimelines(prev => ({ ...prev, [item._id]: !prev[item._id] }))}
                  style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, backgroundColor: '#f1f5f9' }}
                >
                  <Text style={[styles.infoLabel, { marginBottom: 0 }]}>🕒 Daily Timeline ({item.timeline.length})</Text>
                  <Ionicons name={expandedTimelines[item._id] ? 'chevron-up' : 'chevron-down'} size={18} color="#64748b" />
                </TouchableOpacity>

                {expandedTimelines[item._id] && (
                  <View style={{ padding: 12, paddingTop: 4 }}>
                    {item.timeline.map((event, idx) => (
                      <View key={idx} style={{ flexDirection: 'row', marginTop: 8 }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748b', width: 65, marginTop: 1 }}>
                          {new Date(event.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                        <View style={{ flex: 1, paddingLeft: 10, borderLeftWidth: 2, borderLeftColor: '#cbd5e1' }}>
                          <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155' }}>{event.type}</Text>
                          <Text style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{event.description}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ) : null}

            {/* Attendance buttons: Approve + Keep in Queue + Reject */}
            {isActionable ? (
              <View style={[styles.actionRow, { marginTop: 12 }]}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.approveBtn]}
                  onPress={() => handleApprove(item)}
                  disabled={isLoading}
                  activeOpacity={0.8}
                >
                  {isLoading ? <ActivityIndicator size="small" color="#fff" /> : (
                    <>
                      <Ionicons name="checkmark-circle-outline" size={15} color="#fff" />
                      <Text style={styles.actionBtnText}>Approve</Text>
                    </>
                  )}
                </TouchableOpacity>

                {isPending(item) ? (
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#eab308' }]}
                    onPress={() => handleHold(item)}
                    disabled={isLoading}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="pause-circle-outline" size={15} color="#fff" />
                    <Text style={styles.actionBtnText}>Queue</Text>
                  </TouchableOpacity>
                ) : null}

                <TouchableOpacity
                  style={[styles.actionBtn, styles.rejectBtn]}
                  onPress={() => openRejectModal(item)}
                  disabled={isLoading}
                  activeOpacity={0.8}
                >
                  <Ionicons name="close-circle-outline" size={15} color="#fff" />
                  <Text style={styles.actionBtnText}>Reject</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        )}
      </View>
    );
  };


  return (
    <AppLayout currentScreen="AdminAttendance" role="Admin" scrollable={false}>
      <View style={styles.container}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Team Attendance</Text>
            <Text style={styles.subtitle}>{queue.length} pending approval{queue.length !== 1 ? 's' : ''}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={styles.exportBtn} onPress={openSummaryModal} activeOpacity={0.8}>
              <Ionicons name="eye-outline" size={16} color="#0284c7" />
              <Text style={[styles.exportBtnText, { color: '#0284c7' }]}>View</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.exportBtn, isExporting && { opacity: 0.7 }]} onPress={handleExportLog} disabled={isExporting}>
              {isExporting ? (
                <ActivityIndicator size="small" color="#16a34a" />
              ) : (
                <Ionicons name="download-outline" size={16} color="#16a34a" />
              )}
              <Text style={styles.exportBtnText}>{isExporting ? 'Exporting...' : 'Excel'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.refreshBtn} onPress={() => fetchAttendance(true)}>
              <Ionicons name="refresh" size={18} color="#0284c7" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Main Tabs */}
        <View style={styles.tabs}>
          {[
            { key: 'Queue',    label: `Pending (${queue.length})`, icon: 'time-outline' },
            { key: 'Held',     label: `Held (${held.length})`,     icon: 'pause-circle-outline' },
            { key: 'History',  label: 'History',                   icon: 'list-outline' },
            { key: 'Location', label: 'Live GPS',                  icon: 'location-outline' },
          ].map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[styles.tab, mainTab === t.key && styles.tabActive]}
              onPress={() => setMainTab(t.key)}
            >
              <Ionicons name={t.icon} size={13} color={mainTab === t.key ? '#0284c7' : '#64748b'} />
              <Text style={[styles.tabText, mainTab === t.key && styles.tabTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Date Filter (for Queue & History & Held) */}
        {mainTab !== 'Location' && (
          <View style={styles.filterRow}>
            {Platform.OS === 'web' ? (
              // Native HTML date picker on web — shows a calendar on click
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="calendar-outline" size={15} color="#64748b" />
                <input
                  type="date"
                  value={searchDate}
                  onChange={(e) => setSearchDate(e.target.value)}
                  style={{
                    flex: 1,
                    border: 'none',
                    outline: 'none',
                    fontSize: 14,
                    color: searchDate ? '#0f172a' : '#94a3b8',
                    backgroundColor: 'transparent',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                />
              </View>
            ) : (
              <TouchableOpacity
                style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={15} color="#0284c7" />
                <Text style={{ color: searchDate ? '#0f172a' : '#94a3b8', fontSize: 14 }}>
                  {searchDate
                    ? new Date(searchDate + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                    : 'Tap to pick a date'}
                </Text>
              </TouchableOpacity>
            )}
            {searchDate ? (
              <TouchableOpacity onPress={() => setSearchDate('')} style={{ paddingLeft: 4 }}>
                <Ionicons name="close-circle" size={20} color="#94a3b8" />
              </TouchableOpacity>
            ) : null}
          </View>
        )}

        {showDatePicker && Platform.OS !== 'web' && (() => {
          const DateTimePicker = require('@react-native-community/datetimepicker').default;
          return (
            <DateTimePicker
              value={searchDate ? new Date(searchDate + 'T00:00:00') : new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, selectedDate) => {
                setShowDatePicker(false);
                if (selectedDate) setSearchDate(selectedDate.toISOString().split('T')[0]);
              }}
            />
          );
        })()}

        {/* Content */}
        {loading ? (
          <ActivityIndicator color="#0284c7" size="large" style={{ marginTop: 60 }} />
        ) : mainTab === 'Queue' ? (
          queue.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="checkmark-done-circle-outline" size={56} color="#a7f3d0" />
              <Text style={styles.emptyTitle}>All Clear!</Text>
              <Text style={styles.emptyText}>No pending attendance requests.</Text>
            </View>
          ) : (
            <FlatList
              data={queue}
              keyExtractor={(i) => i._id}
              renderItem={renderCard}
              refreshing={refreshing}
              onRefresh={() => fetchAttendance(true)}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
            />
          )
        ) : mainTab === 'Held' ? (
          held.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="pause-circle-outline" size={56} color="#fde047" />
              <Text style={styles.emptyTitle}>No Held Requests</Text>
              <Text style={styles.emptyText}>There are no attendance requests in the queue.</Text>
            </View>
          ) : (
            <FlatList
              data={held}
              keyExtractor={(i) => i._id}
              renderItem={renderCard}
              refreshing={refreshing}
              onRefresh={() => fetchAttendance(true)}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
            />
          )
        ) : mainTab === 'History' ? (
          history.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="calendar-outline" size={56} color="#cbd5e1" />
              <Text style={styles.emptyTitle}>No Records</Text>
              <Text style={styles.emptyText}>No approved/rejected records yet.</Text>
            </View>
          ) : (
            <FlatList
              data={history}
              keyExtractor={(i) => i._id}
              renderItem={renderCard}
              refreshing={refreshing}
              onRefresh={() => fetchAttendance(true)}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
            />
          )
        ) : (
          // Live Location tab
          loadingLocs ? (
            <ActivityIndicator color="#0284c7" size="large" style={{ marginTop: 60 }} />
          ) : (
            <FlatList
              data={locations}
              keyExtractor={(i, idx) => i.executive?.toString() || idx.toString()}
              refreshing={loadingLocs}
              onRefresh={fetchLiveLocations}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={() => (
                <View style={styles.empty}>
                  <Text style={styles.emptyText}>No live locations found.</Text>
                </View>
              )}
              renderItem={({ item }) => (
                <View style={[styles.card, { borderLeftColor: '#0284c7', borderLeftWidth: 4 }]}>
                  <View style={styles.cardTop}>
                    <View style={[styles.avatar, { backgroundColor: '#e0f2fe' }]}>
                      <Text style={[styles.avatarText, { color: '#0284c7' }]}>
                        {(item.executiveName || 'U').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardName}>{item.executiveName || 'Unknown'}</Text>
                      <Text style={styles.cardSub}>{item.employeeId ? `#${item.employeeId}  ·  ` : ''}{item.designation || ''}</Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: '#e0f2fe', borderColor: '#bae6fd' }]}>
                      <Text style={[styles.badgeText, { color: '#0284c7' }]}>
                        {item.latitude ? 'Online' : 'No Signal'}
                      </Text>
                    </View>
                  </View>
                  {item.latitude && (
                    <TouchableOpacity style={styles.mapRow} onPress={() => openInMap(item.latitude, item.longitude)}>
                      <Ionicons name="location-outline" size={13} color="#0284c7" />
                      <Text style={styles.mapText}>
                        {item.latitude.toFixed(5)}, {item.longitude.toFixed(5)} · Open in Maps →
                      </Text>
                    </TouchableOpacity>
                  )}
                  {item.timestamp && (
                    <Text style={styles.cardSub}>Updated: {new Date(item.timestamp).toLocaleString()}</Text>
                  )}
                </View>
              )}
            />
          )
        )}
      </View>

      {/* ── Reject Reason Modal ── */}
      <Modal visible={rejectModal} transparent animationType="slide" onRequestClose={() => setRejectModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Reject Attendance</Text>
            <Text style={styles.modalSubtitle}>
              {selectedRecord?.executive?.name} — {selectedRecord?.status}
            </Text>
            <Text style={styles.modalLabel}>Select a reason:</Text>
            {((selectedRecord?.status || '').includes('Leave') ? REJECT_REASONS_LEAVE : REJECT_REASONS_ATTENDANCE).map((r) => (
              <TouchableOpacity
                key={r}
                style={[styles.reasonBtn, selectedReason === r && styles.reasonBtnActive]}
                onPress={() => setSelectedReason(r)}
              >
                <Ionicons
                  name={selectedReason === r ? 'radio-button-on' : 'radio-button-off'}
                  size={16}
                  color={selectedReason === r ? '#ef4444' : '#94a3b8'}
                />
                <Text style={[styles.reasonText, selectedReason === r && { color: '#ef4444', fontWeight: '700' }]}>
                  {r}
                </Text>
              </TouchableOpacity>
            ))}
            {selectedReason === 'Other' && (
              <TextInput
                style={[styles.customReasonInput, { outlineStyle: 'none' }]}
                placeholder="Specify reason..."
                placeholderTextColor="#94a3b8"
                value={customReason}
                onChangeText={setCustomReason}
                multiline
              />
            )}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setRejectModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmRejectBtn} onPress={handleReject}>
                <Ionicons name="close-circle-outline" size={16} color="#fff" />
                <Text style={styles.confirmRejectText}>Confirm Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Summary View Modal ── */}
      <Modal visible={showSummaryModal} transparent animationType="fade" onRequestClose={() => setShowSummaryModal(false)}>
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.55)',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
        }}>
          <View style={{
            backgroundColor: '#fff',
            borderRadius: 20,
            width: '100%',
            maxWidth: 600,
            height: Platform.OS === 'web' ? '80vh' : '80%',
            overflow: 'hidden',
            flexDirection: 'column',
          }}>
            {/* Modal Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', flexShrink: 0 }}>
              <View>
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#0f172a' }}>Team Attendance Summary</Text>
                <Text style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Live data · {summaryData.length} employees</Text>
              </View>
              <TouchableOpacity onPress={() => setShowSummaryModal(false)} style={{ backgroundColor: '#f1f5f9', borderRadius: 10, padding: 8 }}>
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Column Header */}
            <View style={{ flexDirection: 'row', backgroundColor: '#f8fafc', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#e2e8f0', flexShrink: 0 }}>
              <Text style={{ flex: 2, fontSize: 11, fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>Name / ID</Text>
              <Text style={{ flex: 1, fontSize: 11, fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>Role</Text>
              <Text style={{ width: 65, fontSize: 11, fontWeight: '700', color: '#22c55e', textAlign: 'center', textTransform: 'uppercase' }}>Present</Text>
              <Text style={{ width: 55, fontSize: 11, fontWeight: '700', color: '#8b5cf6', textAlign: 'center', textTransform: 'uppercase' }}>Leave</Text>
              <Text style={{ width: 55, fontSize: 11, fontWeight: '700', color: '#f59e0b', textAlign: 'center', textTransform: 'uppercase' }}>Early</Text>
            </View>

            {/* Content */}
            <View style={{ flex: 1 }}>
              {loadingSummary ? (
                <ActivityIndicator color="#0284c7" size="large" style={{ margin: 40 }} />
              ) : summaryData.length === 0 ? (
                <View style={{ flex: 1, padding: 40, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="people-outline" size={48} color="#e2e8f0" />
                  <Text style={{ color: '#94a3b8', marginTop: 12, fontSize: 14 }}>No employee data found.</Text>
                </View>
              ) : (
                <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={true}>
                  {summaryData.map((s, idx) => (
                    <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', backgroundColor: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                      <View style={{ flex: 2 }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#0f172a' }} numberOfLines={1}>{s.name}</Text>
                        <Text style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }} numberOfLines={1}>
                          {s.employeeId !== 'N/A' ? `ID: ${s.employeeId}` : s.address !== 'N/A' ? s.address : s.role}
                        </Text>
                      </View>
                      <Text style={{ flex: 1, fontSize: 11, color: '#64748b', fontWeight: '600' }} numberOfLines={1}>{s.designation !== 'N/A' ? s.designation : s.role}</Text>
                      <View style={{ width: 65, alignItems: 'center' }}>
                        <Text style={{ fontSize: 16, fontWeight: '800', color: '#22c55e' }}>{s.present}</Text>
                      </View>
                      <View style={{ width: 55, alignItems: 'center' }}>
                        <Text style={{ fontSize: 16, fontWeight: '800', color: '#8b5cf6' }}>{s.leave}</Text>
                      </View>
                      <View style={{ width: 55, alignItems: 'center' }}>
                        <Text style={{ fontSize: 16, fontWeight: '800', color: '#f59e0b' }}>{s.earlyCheckout}</Text>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              )}
            </View>

            {/* Download button at bottom */}
            <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: '#f1f5f9', flexShrink: 0 }}>
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#16a34a', borderRadius: 14, paddingVertical: 12 }}
                onPress={() => { setShowSummaryModal(false); handleExportLog(); }}
                activeOpacity={0.8}
              >
                <Ionicons name="download-outline" size={16} color="#fff" />
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Download as Excel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </AppLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  subtitle: { fontSize: 12, color: '#64748b', marginTop: 2 },
  refreshBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#e0f2fe', alignItems: 'center', justifyContent: 'center' },
  exportBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 40, borderRadius: 12, backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0' },
  exportBtnText: { color: '#16a34a', fontWeight: '700', fontSize: 13 },

  tabs: { flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 14, padding: 4, marginBottom: 14, gap: 4 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 9, borderRadius: 10, gap: 5 },
  tabActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 2 },
  tabText: { fontSize: 11, fontWeight: '600', color: '#64748b' },
  tabTextActive: { color: '#0284c7', fontWeight: '700' },

  filterRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, borderWidth: 1.5, borderColor: '#e2e8f0', paddingHorizontal: 12, height: 44, marginBottom: 14, gap: 8 },
  filterInput: { flex: 1, color: '#0f172a', fontSize: 14 },

  list: { paddingBottom: 32 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 80 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#334155', marginTop: 14 },
  emptyText: { fontSize: 13, color: '#94a3b8', marginTop: 4, textAlign: 'center' },

  card: {
    backgroundColor: '#fff', borderRadius: 18, padding: 16, marginBottom: 14,
    borderWidth: 1, borderColor: '#f1f5f9', elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontWeight: '800', fontSize: 18 },
  cardName: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  cardSub: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 99, borderWidth: 1 },
  badgeText: { fontSize: 10, fontWeight: '700' },

  divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 12 },

  timeRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12 },
  timeBlock: { alignItems: 'center', gap: 3 },
  timeLabel: { fontSize: 9, color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  timeVal: { fontSize: 13, fontWeight: '700', color: '#0f172a' },

  infoBox: { borderRadius: 10, padding: 10, borderWidth: 1, marginBottom: 8 },
  infoLabel: { fontSize: 11, fontWeight: '700', color: '#475569', marginBottom: 4 },
  infoText: { fontSize: 12, color: '#334155', lineHeight: 18 },

  mapRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  mapText: { fontSize: 11, color: '#0284c7', fontWeight: '600' },

  actionRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12 },
  approveBtn: { backgroundColor: '#16a34a' },
  rejectBtn: { backgroundColor: '#ef4444' },
  actionBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a', marginBottom: 4 },
  modalSubtitle: { fontSize: 13, color: '#64748b', marginBottom: 16 },
  modalLabel: { fontSize: 11, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },
  reasonBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 8 },
  reasonBtnActive: { borderColor: '#fca5a5', backgroundColor: '#fef2f2' },
  reasonText: { fontSize: 13, color: '#334155' },
  customReasonInput: { borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 12, padding: 12, marginTop: 8, fontSize: 14, color: '#0f172a', minHeight: 80, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, borderColor: '#e2e8f0', alignItems: 'center' },
  cancelBtnText: { fontWeight: '700', color: '#334155', fontSize: 14 },
  confirmRejectBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, borderRadius: 14, backgroundColor: '#ef4444' },
  confirmRejectText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  modalContent: { backgroundColor: '#fff', borderRadius: 20, padding: 16, overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingBottom: 10 },
});
