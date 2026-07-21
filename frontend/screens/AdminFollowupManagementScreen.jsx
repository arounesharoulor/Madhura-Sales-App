import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, ActivityIndicator,
  StyleSheet, Modal, ScrollView, Alert, TextInput, Platform, KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import api from '../api/api';
import AppLayout from '../components/AppLayout';
import { connectSocket } from '../utils/socket';

const PRIORITY_CONFIG = {
  High:   { bg: '#fef2f2', text: '#e11d48', border: '#fecdd3', dot: '#e11d48', icon: 'arrow-up-circle' },
  Medium: { bg: '#fffbeb', text: '#d97706', border: '#fde68a', dot: '#d97706', icon: 'remove-circle' },
  Low:    { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0', dot: '#16a34a', icon: 'arrow-down-circle' },
};

const STATUS_CONFIG = {
  Pending:              { bg: '#fff7ed', text: '#ea580c', icon: 'time-outline' },
  Called:               { bg: '#eff6ff', text: '#0284c7', icon: 'call-outline' },
  Visited:              { bg: '#faf5ff', text: '#7c3aed', icon: 'location-outline' },
  'Call Not Picked Up': { bg: '#fffbeb', text: '#d97706', icon: 'call-outline' },
  'Client Busy':        { bg: '#fef2f2', text: '#ef4444', icon: 'time-outline' },
  Other:                { bg: '#f8fafc', text: '#64748b', icon: 'ellipsis-horizontal-outline' },
  Completed:            { bg: '#f0fdf4', text: '#16a34a', icon: 'checkmark-done-circle-outline' },
  Cancelled:            { bg: '#f1f5f9', text: '#64748b', icon: 'ban-outline' },
};

const STATUS_TABS = ['All', 'Pending', 'Called', 'Visited', 'Call Not Picked Up', 'Client Busy', 'Other', 'Completed', 'Cancelled'];

// Cross-platform DatePicker — native modal on iOS/Android, HTML input on web
function CrossPlatformDatePicker({ value, onChange }) {
  const [showNative, setShowNative] = useState(false);

  if (Platform.OS === 'web') {
    return (
      <View style={styles.dateInputWrap}>
        <Ionicons name="calendar-outline" size={20} color="#0284c7" style={styles.dateIcon} />
        <input
          type="date"
          value={value || ''}
          min={new Date().toISOString().split('T')[0]}
          onChange={(e) => onChange(e.target.value)}
          style={{
            flex: 1, border: 'none', outline: 'none', background: 'transparent',
            fontSize: 14, color: value ? '#0f172a' : '#94a3b8', fontFamily: 'inherit', cursor: 'pointer',
          }}
        />
      </View>
    );
  }

  const DateTimePicker = require('@react-native-community/datetimepicker').default;

  return (
    <View>
      <TouchableOpacity onPress={() => setShowNative(true)} style={styles.dateInputWrap}>
        <Ionicons name="calendar-outline" size={20} color="#0284c7" style={styles.dateIcon} />
        <Text style={[styles.dateNativeText, !value && { color: '#94a3b8' }]}>
          {value ? new Date(value + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Select Follow-up Date'}
        </Text>
        <Ionicons name="chevron-down" size={16} color="#64748b" />
      </TouchableOpacity>
      {showNative && (
        <DateTimePicker
          value={value ? new Date(value + 'T00:00:00') : new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          minimumDate={new Date()}
          onChange={(event, selectedDate) => {
            setShowNative(false);
            if (selectedDate) onChange(selectedDate.toISOString().split('T')[0]);
          }}
        />
      )}
    </View>
  );
}

function AssignModal({ visible, followUp, employees, onClose, onSaved }) {
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedPriority, setSelectedPriority] = useState(followUp?.priority || 'Medium');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (followUp) {
      setSelectedPriority(followUp.priority || 'Medium');
      setSelectedEmployee(null);
    }
  }, [followUp]);

  const save = async () => {
    if (!selectedEmployee && !selectedPriority) {
      Alert.alert('Required', 'Please select an employee or set a priority.');
      return;
    }
    setSaving(true);
    try {
      await api.put(`/followups/${followUp._id}/assign`, {
        assignedTo: selectedEmployee?._id,
        priority: selectedPriority,
      });
      Toast.show({
        type: 'success',
        text1: '✅ Follow-up Reassigned',
        text2: `Assigned to ${selectedEmployee?.name || 'employee'} with ${selectedPriority} priority`,
      });
      onSaved();
      onClose();
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Error', text2: e.response?.data?.message || 'Failed to assign follow-up' });
    } finally {
      setSaving(false);
    }
  };

  if (!followUp) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalBox}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Reassign Follow-up</Text>
              <Text style={styles.modalSub}>{followUp.clientName} · {followUp.companyName}</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color="#64748b" />
            </TouchableOpacity>
          </View>

          <Text style={styles.modalLabel}>Set Priority</Text>
          <View style={styles.priorityRow}>
            {['High', 'Medium', 'Low'].map(p => {
              const pc = PRIORITY_CONFIG[p];
              const isSelected = selectedPriority === p;
              return (
                <TouchableOpacity
                  key={p}
                  onPress={() => setSelectedPriority(p)}
                  style={[styles.priorityBtn, { borderColor: isSelected ? pc.text : '#e2e8f0', backgroundColor: isSelected ? pc.text : pc.bg }]}
                >
                  <Ionicons name={pc.icon} size={14} color={isSelected ? '#fff' : pc.text} />
                  <Text style={[styles.priorityBtnText, { color: isSelected ? '#fff' : pc.text }]}>{p}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.modalLabel}>Assign to Employee</Text>
          {employees.length === 0 ? (
            <View style={styles.noEmpWrap}>
              <Ionicons name="people-outline" size={28} color="#cbd5e1" />
              <Text style={styles.noEmpText}>No field executives found</Text>
            </View>
          ) : (
            <ScrollView style={{ maxHeight: 240 }} showsVerticalScrollIndicator={false}>
              {employees.map(emp => {
                const isSelected = selectedEmployee?._id === emp._id;
                return (
                  <TouchableOpacity
                    key={emp._id}
                    onPress={() => setSelectedEmployee(isSelected ? null : emp)}
                    style={[styles.empRow, isSelected && styles.empRowSelected]}
                  >
                    <View style={[styles.empAvatar, isSelected && styles.empAvatarSelected]}>
                      <Text style={[styles.empAvatarText, isSelected && { color: '#fff' }]}>
                        {emp.name?.charAt(0)?.toUpperCase() || '?'}
                      </Text>
                    </View>
                    <View style={styles.empInfo}>
                      <Text style={[styles.empName, isSelected && { color: '#0284c7' }]}>{emp.name}</Text>
                      <Text style={styles.empSub}>{emp.designation || emp.email}</Text>
                      {emp.isCheckedIn ? (
                        <Text style={{ fontSize: 9, color: '#059669', fontWeight: '700', marginTop: 2 }}>✓ Checked In</Text>
                      ) : (
                        <Text style={{ fontSize: 9, color: '#94a3b8', fontWeight: '600', marginTop: 2 }}>Not Checked In</Text>
                      )}
                    </View>
                    {isSelected && <Ionicons name="checkmark-circle" size={20} color="#0284c7" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          <TouchableOpacity onPress={save} disabled={saving} style={[styles.saveBtn, saving && { opacity: 0.7 }]}>
            {saving ? <ActivityIndicator color="#fff" /> : (
              <>
                <Ionicons name="send" size={16} color="#fff" />
                <Text style={styles.saveBtnText}>Save Changes</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export default function AdminFollowupManagementScreen({ navigation, isComponent = false }) {
  const [activeTab, setActiveTab] = useState('assign'); // 'assign' | 'history'
  
  const [followUps, setFollowUps] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // History tab filters
  const [statusFilter, setStatusFilter] = useState('All');
  
  // Assign tab form state
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [notes, setNotes] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [assigning, setAssigning] = useState(false);

  // Modal state
  const [selectedFollowUp, setSelectedFollowUp] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];
      const [fuRes, usersRes, attendRes, clientsRes] = await Promise.all([
        api.get('/followups'),
        api.get('/users', { params: { role: 'Field Executive' } }),
        api.get('/attendance', { params: { date: today } }),
        api.get('/onboarding'),
      ]);

      setFollowUps(fuRes.data.data || []);
      setClients(clientsRes.data.data || []);

      const attendance = attendRes.data.data || [];
      const checkedInIds = new Set(
        attendance
          .filter(a => a.checkInStatus === 'Approved' && a.status !== 'Checked Out')
          .map(a => (a.executive?._id || a.executive)?.toString())
      );
      const allExecs = usersRes.data.data || [];
      // Tag employees with check-in status
      setEmployees(allExecs.map(e => ({
        ...e,
        isCheckedIn: checkedInIds.has(e._id?.toString())
      })));
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to load data' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, []);

  // ── Real-time socket listeners (auto-refresh when any follow-up changes) ──────
  useEffect(() => {
    let mounted = true;
    const setupSocket = async () => {
      const sock = await connectSocket();
      if (!sock || !mounted) return;

      const refresh = () => { if (mounted) fetchData(); };

      sock.on('followup_updated', refresh);
      sock.on('followup_assigned', refresh);

      return () => {
        sock.off('followup_updated', refresh);
        sock.off('followup_assigned', refresh);
      };
    };

    let cleanup;
    setupSocket().then(fn => { cleanup = fn; });

    return () => {
      mounted = false;
      if (cleanup) cleanup();
    };
  }, [fetchData]);

  const handleCreateAndAssign = async () => {
    if (!selectedClient || !dueDate || !selectedEmployee) {
      Alert.alert('Required', 'Please fill all required fields (Select a Client, Due Date, and Select an Employee).');
      return;
    }

    setAssigning(true);
    try {
      await api.post('/followups', {
        clientName: selectedClient.ownerName || selectedClient.clientName,
        companyName: selectedClient.businessName || selectedClient.companyName,
        notes: notes.trim(),
        followUpDate: dueDate,
        priority,
        assignedTo: selectedEmployee._id,
      });

      Toast.show({ type: 'success', text1: '✅ Follow-up Assigned', text2: `Assigned to ${selectedEmployee.name}` });
      
      // Reset form
      setSelectedClient(null);
      setNotes('');
      setDueDate('');
      setPriority('Medium');
      setSelectedEmployee(null);
      
      fetchData();
      setActiveTab('history');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to create and assign follow-up.');
    } finally {
      setAssigning(false);
    }
  };

  const openAssign = (fu) => {
    setSelectedFollowUp(fu);
    setShowModal(true);
  };

  const isOverdue = (item) => {
    if (!item.followUpDate || ['Completed', 'Cancelled'].includes(item.status)) return false;
    return new Date(item.followUpDate) < new Date() &&
      new Date(item.followUpDate).toDateString() !== new Date().toDateString();
  };

  const isDueToday = (item) => {
    if (!item.followUpDate) return false;
    return new Date(item.followUpDate).toDateString() === new Date().toDateString();
  };

  const sortedFollowUps = [...followUps].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  const filtered = statusFilter === 'All' 
    ? sortedFollowUps 
    : sortedFollowUps.filter(f => f.status === statusFilter);

  const statusCounts = STATUS_TABS.reduce((acc, tab) => {
    acc[tab] = tab === 'All' ? followUps.length : followUps.filter(f => f.status === tab).length;
    return acc;
  }, {});

  // All employees shown — admin can assign to anyone; isCheckedIn badge shows availability
  const availableEmployees = employees;

  const content = (
    <>
      <View style={styles.container}>

        {/* Header */}
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View style={styles.pageIconWrap}>
              <Ionicons name="alarm" size={24} color="#f97316" />
            </View>
            <View>
              <Text style={styles.title}>Follow-up Tasks</Text>
              <Text style={styles.subtitle}>Assign follow-ups and monitor status</Text>
            </View>
          </View>
          <TouchableOpacity onPress={fetchData} style={styles.refreshBtn}>
            <Ionicons name="refresh" size={18} color="#0284c7" />
          </TouchableOpacity>
        </View>

        {/* Tab Toggle */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            onPress={() => setActiveTab('assign')}
            style={[styles.tabBtn, activeTab === 'assign' && styles.tabBtnActive]}
          >
            <Ionicons name="add-circle-outline" size={16} color={activeTab === 'assign' ? '#fff' : '#64748b'} />
            <Text style={[styles.tabBtnText, activeTab === 'assign' && styles.tabBtnTextActive]}>
              Assign New
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab('history')}
            style={[styles.tabBtn, activeTab === 'history' && styles.tabBtnActive]}
          >
            <Ionicons name="list-outline" size={16} color={activeTab === 'history' ? '#fff' : '#64748b'} />
            <Text style={[styles.tabBtnText, activeTab === 'history' && styles.tabBtnTextActive]}>
              Monitor Status
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'assign' ? (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 80}
          >
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }} keyboardShouldPersistTaps="handled">
            {/* Create Follow-up Form */}
            <View style={styles.cardBox}>
              <Text style={styles.cardLabel}>NEW FOLLOW-UP DETAILS</Text>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Select Client (Onboarded)</Text>
                {clients.length === 0 ? (
                  <Text style={{ fontSize: 12, color: '#e11d48', marginTop: 4 }}>No onboarded clients available.</Text>
                ) : (
                  <View style={{ borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 14, overflow: 'hidden' }}>
                    <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                      {clients.map(client => {
                        const isSelected = selectedClient?._id === client._id;
                        return (
                          <TouchableOpacity
                            key={client._id}
                          onPress={() => setSelectedClient(isSelected ? null : client)}
                            style={{
                              padding: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
                              backgroundColor: isSelected ? '#eff6ff' : '#fff',
                              flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'
                            }}
                          >
                            <View>
                              <Text style={{ fontSize: 14, fontWeight: '700', color: isSelected ? '#0284c7' : '#0f172a' }}>{client.businessName || client.companyName}</Text>
                            </View>
                            {isSelected && <Ionicons name="checkmark-circle" size={20} color="#0284c7" />}
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Description / Notes</Text>
                <View style={[styles.inputWrap, styles.textAreaWrap]}>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="Context for the follow-up..."
                    placeholderTextColor="#94a3b8"
                    multiline
                    numberOfLines={3}
                  />
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Priority</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                  {['High', 'Medium', 'Low'].map(p => {
                    const pc = PRIORITY_CONFIG[p];
                    return (
                      <TouchableOpacity
                        key={p}
                        onPress={() => setPriority(p)}
                        style={{
                          flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
                          flexDirection: 'row', gap: 5, borderWidth: 1.5,
                          backgroundColor: priority === p ? pc.bg : '#f8fafc',
                          borderColor: priority === p ? pc.text : '#e2e8f0',
                        }}
                      >
                        <Ionicons name={pc.icon} size={14} color={priority === p ? pc.text : '#94a3b8'} />
                        <Text style={{ fontSize: 12, fontWeight: '700', color: priority === p ? pc.text : '#64748b' }}>{p}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Follow-up Date</Text>
                <CrossPlatformDatePicker value={dueDate} onChange={setDueDate} />
              </View>
            </View>

            {/* Employee Selection Card */}
            <View style={styles.cardBox}>
              <Text style={styles.cardLabel}>ASSIGN TO EMPLOYEE</Text>
              
              {employees.length === 0 ? (
                <View style={styles.emptyEmp}>
                  <Ionicons name="people-outline" size={40} color="#cbd5e1" />
                  <Text style={styles.emptyEmpText}>No field executives found.</Text>
                </View>
              ) : (
                employees.map((emp) => {
                  const isSelected = selectedEmployee?._id === emp._id;
                  return (
                    <TouchableOpacity
                      key={emp._id}
                      onPress={() => setSelectedEmployee(isSelected ? null : emp)}
                      style={[styles.empCard, isSelected && styles.empCardSelected]}
                      activeOpacity={0.75}
                    >
                      <View style={[styles.empAvatar, isSelected && styles.empAvatarSelected]}>
                        <Text style={[styles.empAvatarText, isSelected && { color: '#fff' }]}>
                          {emp.name?.charAt(0)?.toUpperCase() || '?'}
                        </Text>
                      </View>
                      <View style={styles.empInfo}>
                        <Text style={[styles.empName, isSelected && styles.empNameSelected]}>{emp.name}</Text>
                        <Text style={styles.empSub2}>{emp.designation || emp.email}</Text>
                        {emp.isCheckedIn ? (
                          <View style={styles.statusBadgeActive}>
                            <Text style={styles.statusTextActive}>✓ Checked In Today</Text>
                          </View>
                        ) : (
                          <View style={[styles.statusBadgeActive, { backgroundColor: '#f1f5f9', borderColor: '#e2e8f0' }]}>
                            <Text style={[styles.statusTextActive, { color: '#94a3b8' }]}>Not Checked In</Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.empRight}>
                        {isSelected && (
                          <View style={styles.empCheck}>
                            <Ionicons name="checkmark" size={16} color="#fff" />
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, assigning && { opacity: 0.7 }]}
              onPress={handleCreateAndAssign}
              disabled={assigning}
              activeOpacity={0.85}
            >
              {assigning ? <ActivityIndicator color="#fff" size="small" /> : (
                <>
                  <Ionicons name="send" size={18} color="#fff" />
                  <Text style={styles.submitBtnText}>Create & Assign Follow-up</Text>
                </>
              )}
            </TouchableOpacity>

          </ScrollView>
          </KeyboardAvoidingView>
        ) : (
          /* History / Monitoring Tab */
          <View style={{ flex: 1 }}>
            
            {/* Professional Underline Tabs for History */}
            <View style={{ marginBottom: 16 }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 4 }}>
                {STATUS_TABS.map(tab => {
                  const isActive = statusFilter === tab;
                  return (
                    <TouchableOpacity
                      key={tab}
                      onPress={() => setStatusFilter(tab)}
                      style={{
                        paddingHorizontal: 16,
                        paddingVertical: 12,
                        borderBottomWidth: 2,
                        borderBottomColor: isActive ? '#0f172a' : 'transparent',
                        flexDirection: 'row', alignItems: 'center', gap: 6,
                      }}
                    >
                      <Text style={{ 
                        fontSize: 13, 
                        fontWeight: isActive ? '800' : '600', 
                        color: isActive ? '#0f172a' : '#64748b' 
                      }}>
                        {tab}
                      </Text>
                      {statusCounts[tab] > 0 && (
                        <View style={{ 
                          backgroundColor: isActive ? '#e2e8f0' : '#f1f5f9', 
                          borderRadius: 12, paddingHorizontal: 6, paddingVertical: 2 
                        }}>
                          <Text style={{ 
                            fontSize: 10, 
                            fontWeight: '800', 
                            color: isActive ? '#0f172a' : '#94a3b8' 
                          }}>{statusCounts[tab]}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <View style={{ height: 1, backgroundColor: '#e2e8f0', width: '100%', marginTop: -2 }} />
            </View>

            {loading ? (
              <View style={styles.center}>
                <ActivityIndicator size="large" color="#0f172a" />
              </View>
            ) : (
              <FlatList
                data={filtered}
                keyExtractor={item => item._id}
                refreshing={loading}
                onRefresh={fetchData}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.list}
                ListEmptyComponent={() => (
                  <View style={styles.empty}>
                    <View style={styles.emptyIcon}><Ionicons name="alarm-outline" size={40} color="#cbd5e1" /></View>
                    <Text style={styles.emptyTitle}>No follow-ups</Text>
                    <Text style={styles.emptyText}>No follow-ups match this status.</Text>
                  </View>
                )}
                renderItem={({ item }) => {
                  const pc = PRIORITY_CONFIG[item.priority] || PRIORITY_CONFIG.Medium;
                  const sc = STATUS_CONFIG[item.status] || STATUS_CONFIG.Pending;
                  const overdue = isOverdue(item);
                  const dueToday = isDueToday(item);
                  const isAssigned = !!item.assignedTo;

                  return (
                    <View style={[styles.card, overdue && styles.cardOverdue, { borderLeftColor: pc.dot }]}>
                      {(overdue || dueToday) && (
                        <View style={[styles.urgencyBanner, { backgroundColor: overdue ? '#fef2f2' : '#fffbeb' }]}>
                          <Ionicons name={overdue ? 'warning' : 'alarm'} size={11} color={overdue ? '#e11d48' : '#d97706'} />
                          <Text style={[styles.urgencyText, { color: overdue ? '#e11d48' : '#d97706' }]}>
                            {overdue ? 'OVERDUE' : 'DUE TODAY'}
                          </Text>
                        </View>
                      )}

                      <View style={styles.cardTop}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                          <Text style={styles.clientName}>{item.clientName}</Text>
                          <Text style={styles.companyName}>{item.companyName}</Text>
                        </View>
                        <View style={[styles.priorityTag, { backgroundColor: pc.bg, borderColor: pc.border }]}>
                          <Ionicons name={pc.icon} size={10} color={pc.text} />
                          <Text style={[styles.priorityTagText, { color: pc.text }]}>{item.priority}</Text>
                        </View>
                      </View>

                      {item.notes ? (
                        <Text style={styles.notes} numberOfLines={2}>"{item.notes}"</Text>
                      ) : null}

                      {/* Monitoring Status Block */}
                      <View style={styles.monitoringBlock}>
                        <View style={styles.metaItem}>
                          <Ionicons name="person-outline" size={13} color="#64748b" />
                          <Text style={styles.metaText}>
                            Employee: <Text style={{ fontWeight: '800', color: '#334155' }}>
                              {item.assignedTo?.name || item.executive?.name || 'Unassigned'}
                            </Text>
                          </Text>
                        </View>
                        
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 }}>
                          <View style={[styles.statusTag, { backgroundColor: sc.bg }]}>
                            <Ionicons name={sc.icon} size={11} color={sc.text} />
                            <Text style={[styles.statusTagText, { color: sc.text }]}>{item.status}</Text>
                          </View>
                          
                          {item.followUpDate && (
                            <View style={styles.metaItem}>
                              <Ionicons name="calendar-outline" size={13} color="#94a3b8" />
                              <Text style={[styles.metaText, overdue && { color: '#e11d48', fontWeight: '700' }]}>
                                {new Date(item.followUpDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                              </Text>
                            </View>
                          )}
                        </View>
                        
                        {item.remarks ? (
                          <View style={{ marginTop: 8, backgroundColor: '#f8fafc', padding: 8, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0' }}>
                            <Text style={{ fontSize: 10, fontWeight: '800', color: '#94a3b8', marginBottom: 2 }}>EMPLOYEE REMARKS</Text>
                            <Text style={{ fontSize: 12, color: '#334155' }}>"{item.remarks}"</Text>
                          </View>
                        ) : null}
                      </View>

                      {!['Completed', 'Cancelled'].includes(item.status) && (
                        <TouchableOpacity onPress={() => openAssign(item)} style={styles.reassignBtn}>
                          <Ionicons name="swap-horizontal-outline" size={14} color="#0284c7" />
                          <Text style={styles.reassignBtnText}>Reassign / Change Priority</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                }}
              />
            )}
          </View>
        )}
      </View>

        <AssignModal
        visible={showModal}
        followUp={selectedFollowUp}
        employees={employees}
        onClose={() => setShowModal(false)}
        onSaved={fetchData}
      />
    </>
  );

  if (isComponent) return content;
  return <AppLayout currentScreen="AdminFollowupManagement" role="Admin" scrollable={false}>{content}</AppLayout>;
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  pageIconWrap: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#ffedd5', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '900', color: '#0f172a' },
  subtitle: { fontSize: 12, color: '#64748b', marginTop: 2 },
  refreshBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#e0f2fe', alignItems: 'center', justifyContent: 'center' },

  tabBar: { flexDirection: 'row', gap: 10, marginBottom: 20, backgroundColor: '#f1f5f9', borderRadius: 20, padding: 4 },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 16 },
  tabBtnActive: { backgroundColor: '#0f172a' },
  tabBtnText: { fontSize: 13, fontWeight: '700', color: '#64748b' },
  tabBtnTextActive: { color: '#fff' },

  cardBox: { backgroundColor: '#fff', borderRadius: 24, borderWidth: 1, borderColor: '#e2e8f0', padding: 20, marginBottom: 16 },
  cardLabel: { fontSize: 10, fontWeight: '800', color: '#94a3b8', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 16 },
  
  fieldGroup: { marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 8 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 14, borderWidth: 1.5, borderColor: '#e2e8f0', paddingHorizontal: 14, minHeight: 50 },
  textAreaWrap: { alignItems: 'flex-start', paddingVertical: 12 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, color: '#0f172a', fontSize: 14 },
  textArea: { height: 70, textAlignVertical: 'top' },
  
  dateInputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 14, borderWidth: 1.5, borderColor: '#e2e8f0', paddingHorizontal: 14, minHeight: 50 },
  dateIcon: { marginRight: 10 },
  dateNativeText: { flex: 1, fontSize: 14, color: '#0f172a' },

  empCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 18, borderWidth: 1.5, borderColor: '#e2e8f0', padding: 14, marginBottom: 10, gap: 12 },
  empCardSelected: { backgroundColor: '#eff6ff', borderColor: '#0284c7' },
  empAvatar: { width: 46, height: 46, borderRadius: 14, backgroundColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' },
  empAvatarSelected: { backgroundColor: '#0284c7' },
  empAvatarText: { fontSize: 18, fontWeight: '800', color: '#475569' },
  empInfo: { flex: 1 },
  empName: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  empNameSelected: { color: '#0284c7' },
  empSub2: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  statusBadgeActive: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, backgroundColor: '#ecfdf5', borderWidth: 1, borderColor: '#a7f3d0', marginTop: 6 },
  statusTextActive: { fontSize: 9, fontWeight: '700', color: '#059669' },
  empRight: { alignItems: 'flex-end', gap: 6 },
  empCheck: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#0284c7', alignItems: 'center', justifyContent: 'center' },
  emptyEmp: { alignItems: 'center', paddingVertical: 32 },
  emptyEmpText: { fontSize: 13, fontWeight: '600', color: '#94a3b8', marginTop: 12 },

  submitBtn: { backgroundColor: '#f97316', borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, height: 56, marginBottom: 32 },
  submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 0.5 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingBottom: 40 },
  empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyIcon: { backgroundColor: '#f1f5f9', borderRadius: 20, padding: 20 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#334155' },
  emptyText: { fontSize: 13, color: '#94a3b8' },

  card: { backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0', borderLeftWidth: 4, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  cardOverdue: { borderColor: '#fecdd3', backgroundColor: '#fff9f9' },
  urgencyBanner: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 10 },
  urgencyText: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  clientName: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  companyName: { fontSize: 12, color: '#64748b', marginTop: 2 },
  priorityTag: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, borderWidth: 1 },
  priorityTagText: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  notes: { fontSize: 12, color: '#475569', lineHeight: 18, marginBottom: 10, fontStyle: 'italic' },
  
  monitoringBlock: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#f1f5f9', marginBottom: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 12, color: '#64748b' },
  statusTag: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  statusTagText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },

  reassignBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, backgroundColor: '#eff6ff', borderRadius: 12, borderWidth: 1, borderColor: '#bfdbfe' },
  reassignBtnText: { color: '#0284c7', fontWeight: '700', fontSize: 12 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  modalSub: { fontSize: 12, color: '#64748b', marginTop: 2 },
  modalLabel: { fontSize: 10, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },
  priorityRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  priorityBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5 },
  priorityBtnText: { fontSize: 12, fontWeight: '700' },
  noEmpWrap: { alignItems: 'center', paddingVertical: 24, gap: 8, marginBottom: 16 },
  noEmpText: { fontSize: 13, color: '#94a3b8', fontWeight: '600' },
  empRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#f8fafc', borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0', padding: 12, marginBottom: 8 },
  empRowSelected: { backgroundColor: '#eff6ff', borderColor: '#0284c7' },
  empAvatar: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' },
  empAvatarSelected: { backgroundColor: '#0284c7' },
  empAvatarText: { fontSize: 17, fontWeight: '800', color: '#475569' },
  empInfo: { flex: 1 },
  empName: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  empSub: { fontSize: 11, color: '#64748b', marginTop: 2 },
  saveBtn: { backgroundColor: '#0f172a', borderRadius: 16, paddingVertical: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16 },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
