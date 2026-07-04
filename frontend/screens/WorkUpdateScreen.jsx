import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, ScrollView, StyleSheet, ActivityIndicator, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AppLayout from '../components/AppLayout';
import CustomInput from '../components/CustomInput';
import CustomButton from '../components/CustomButton';
import api from '../api/api';

export default function WorkUpdateScreen({ navigation }) {
  const [role, setRole] = useState('Employee');
  const [activeTab, setActiveTab] = useState('history'); // 'new' | 'history'
  
  const [updates, setUpdates] = useState([]);
  const [clients, setClients] = useState([]);
  
  // Form State
  const [selectedClient, setSelectedClient] = useState(null);
  const [notes, setNotes] = useState('');
  const [hoursWorked, setHoursWorked] = useState('');
  const [meetingsCount, setMeetingsCount] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  const loadUser = async () => {
    try {
      const userStr = await AsyncStorage.getItem('user');
      if (userStr) {
        const u = JSON.parse(userStr);
        setRole(u.role || 'Employee');
        // Admins go straight to history
        if (u.role === 'Admin') setActiveTab('history');
        else setActiveTab('new');
      }
    } catch (e) {}
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [updatesRes, clientsRes] = await Promise.all([
        api.get('/workupdates'),
        api.get('/onboarding')
      ]);
      setUpdates(updatesRes.data.data || []);
      setClients(clientsRes.data.data || []);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to retrieve data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
    fetchData();
  }, []);

  const handleSubmit = async () => {
    if (!notes || !hoursWorked) {
      Alert.alert('Validation Error', 'Notes and Hours Worked are required.');
      return;
    }

    const payload = {
      notes,
      hoursWorked: Number(hoursWorked),
      meetingsCount: meetingsCount ? Number(meetingsCount) : 0,
      client: selectedClient ? selectedClient._id : null
    };

    setSubmitting(true);
    try {
      await api.post('/workupdates', payload);
      Alert.alert('Success', 'Daily report submitted successfully');
      setNotes('');
      setHoursWorked('');
      setMeetingsCount('');
      setSelectedClient(null);
      fetchData();
      setActiveTab('history');
    } catch (err) {
      Alert.alert('Error', 'Failed to submit report.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppLayout currentScreen="WorkUpdate" role={role} scrollable={false}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View style={styles.pageIconWrap}>
              <Ionicons name="document-text" size={24} color="#0ea5e9" />
            </View>
            <View>
              <Text style={styles.title}>Work Updates</Text>
              <Text style={styles.subtitle}>Daily activity & client follow-ups</Text>
            </View>
          </View>
          <TouchableOpacity onPress={fetchData} style={styles.refreshBtn}>
            <Ionicons name="refresh" size={18} color="#0284c7" />
          </TouchableOpacity>
        </View>

        {/* Tabs (Hidden for Admin) */}
        {role !== 'Admin' && (
          <View style={styles.tabBar}>
            <TouchableOpacity
              onPress={() => setActiveTab('new')}
              style={[styles.tabBtn, activeTab === 'new' && styles.tabBtnActive]}
            >
              <Ionicons name="add-circle-outline" size={16} color={activeTab === 'new' ? '#fff' : '#64748b'} />
              <Text style={[styles.tabBtnText, activeTab === 'new' && styles.tabBtnTextActive]}>
                New Update
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setActiveTab('history')}
              style={[styles.tabBtn, activeTab === 'history' && styles.tabBtnActive]}
            >
              <Ionicons name="time-outline" size={16} color={activeTab === 'history' ? '#fff' : '#64748b'} />
              <Text style={[styles.tabBtnText, activeTab === 'history' && styles.tabBtnTextActive]}>
                Update History
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Tab Content */}
        {activeTab === 'new' && role !== 'Admin' ? (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
            <View style={styles.cardBox}>
              <Text style={styles.cardLabel}>SELECT CLIENT (OPTIONAL)</Text>
              
              {clients.length === 0 ? (
                <Text style={{ fontSize: 12, color: '#e11d48', marginTop: 4 }}>No onboarded clients available.</Text>
              ) : (
                <View style={{ borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 14, overflow: 'hidden', marginBottom: 20 }}>
                  <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                    <TouchableOpacity
                      onPress={() => setSelectedClient(null)}
                      style={[styles.clientRow, !selectedClient && styles.clientRowSelected]}
                    >
                      <Text style={{ fontSize: 14, fontWeight: '700', color: !selectedClient ? '#0284c7' : '#0f172a' }}>General Update (No Client)</Text>
                      {!selectedClient && <Ionicons name="checkmark-circle" size={20} color="#0284c7" />}
                    </TouchableOpacity>
                    {clients.map(client => {
                      const isSelected = selectedClient?._id === client._id;
                      return (
                        <TouchableOpacity
                          key={client._id}
                          onPress={() => setSelectedClient(client)}
                          style={[styles.clientRow, isSelected && styles.clientRowSelected]}
                        >
                          <View>
                            <Text style={{ fontSize: 14, fontWeight: '700', color: isSelected ? '#0284c7' : '#0f172a' }}>{client.businessName || client.companyName}</Text>
                            <Text style={{ fontSize: 12, color: '#64748b' }}>{client.ownerName || client.clientName}</Text>
                          </View>
                          {isSelected && <Ionicons name="checkmark-circle" size={20} color="#0284c7" />}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}
              
              <Text style={styles.cardLabel}>WORK DETAILS</Text>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Estimated Hours Worked *</Text>
                <View style={styles.inputWrap}>
                  <TextInput
                    style={styles.input}
                    value={hoursWorked}
                    onChangeText={setHoursWorked}
                    keyboardType="numeric"
                    placeholder="E.g. 8"
                    placeholderTextColor="#94a3b8"
                  />
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Visits Conducted Today</Text>
                <View style={styles.inputWrap}>
                  <TextInput
                    style={styles.input}
                    value={meetingsCount}
                    onChangeText={setMeetingsCount}
                    keyboardType="numeric"
                    placeholder="E.g. 5"
                    placeholderTextColor="#94a3b8"
                  />
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Activity Notes / Summary *</Text>
                <View style={[styles.inputWrap, styles.textAreaWrap]}>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={notes}
                    onChangeText={setNotes}
                    multiline
                    numberOfLines={4}
                    placeholder="Describe daily tasks completed, customer responses, and general notes..."
                    placeholderTextColor="#94a3b8"
                  />
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.85}
            >
              {submitting ? <ActivityIndicator color="#fff" size="small" /> : (
                <>
                  <Ionicons name="cloud-upload" size={18} color="#fff" />
                  <Text style={styles.submitBtnText}>Submit Work Update</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        ) : (
          <View style={{ flex: 1 }}>
            {loading ? (
              <View style={styles.center}>
                <ActivityIndicator size="large" color="#0f172a" />
              </View>
            ) : (
              <FlatList
                data={updates}
                keyExtractor={(item) => item._id}
                refreshing={loading}
                onRefresh={fetchData}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.list}
                ListEmptyComponent={() => (
                  <View style={styles.empty}>
                    <View style={styles.emptyIcon}><Ionicons name="document-text-outline" size={40} color="#cbd5e1" /></View>
                    <Text style={styles.emptyTitle}>No work updates</Text>
                    <Text style={styles.emptyText}>There are no work updates to display.</Text>
                  </View>
                )}
                renderItem={({ item }) => {
                  const isExpanded = expandedId === item._id;
                  const dateObj = new Date(item.createdAt);
                  return (
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => setExpandedId(isExpanded ? null : item._id)}
                      style={[styles.card, isExpanded && styles.cardExpanded]}
                    >
                      <View style={styles.cardHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.empName}>{item.executive?.name || 'Unknown Employee'}</Text>
                          <Text style={styles.timestamp}>
                            {dateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} at {dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                          </Text>
                        </View>
                        <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={20} color="#94a3b8" />
                      </View>
                      
                      {item.client && (
                        <View style={styles.clientTag}>
                          <Ionicons name="briefcase-outline" size={12} color="#0284c7" />
                          <Text style={styles.clientTagText}>Client: {item.client.businessName || item.client.ownerName}</Text>
                        </View>
                      )}

                      <View style={styles.statsRow}>
                        <View style={styles.statBox}>
                          <Ionicons name="time-outline" size={14} color="#64748b" />
                          <Text style={styles.statText}>{item.hoursWorked} hrs</Text>
                        </View>
                        <View style={styles.statBox}>
                          <Ionicons name="location-outline" size={14} color="#64748b" />
                          <Text style={styles.statText}>{item.meetingsCount || 0} visits</Text>
                        </View>
                      </View>

                      {isExpanded ? (
                        <View style={styles.notesBox}>
                          <Text style={styles.notesLabel}>ACTIVITY NOTES</Text>
                          <Text style={styles.notesText}>{item.notes}</Text>
                          
                          {item.client && item.client.location && (
                            <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e2e8f0' }}>
                              <Text style={styles.notesLabel}>CLIENT DETAILS</Text>
                              <Text style={styles.notesText}>Company: {item.client.businessName}</Text>
                              <Text style={styles.notesText}>Owner: {item.client.ownerName}</Text>
                              <Text style={styles.notesText}>Phone: {item.client.phone}</Text>
                              <Text style={styles.notesText}>Location: {item.client.location.city}, {item.client.location.state}</Text>
                            </View>
                          )}
                        </View>
                      ) : (
                        <Text style={styles.notesPreview} numberOfLines={2}>{item.notes}</Text>
                      )}
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>
        )}
      </View>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  pageIconWrap: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#e0f2fe', alignItems: 'center', justifyContent: 'center' },
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
  input: { flex: 1, color: '#0f172a', fontSize: 14 },
  textArea: { height: 70, textAlignVertical: 'top' },

  clientRow: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  clientRowSelected: { backgroundColor: '#eff6ff' },

  submitBtn: { backgroundColor: '#0ea5e9', borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, height: 56, marginBottom: 32 },
  submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 0.5 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingBottom: 40 },
  empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyIcon: { backgroundColor: '#f1f5f9', borderRadius: 20, padding: 20 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#334155' },
  emptyText: { fontSize: 13, color: '#94a3b8' },

  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  cardExpanded: { borderColor: '#bae6fd', backgroundColor: '#f0f9ff' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  empName: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  timestamp: { fontSize: 11, color: '#64748b', marginTop: 2 },
  
  clientTag: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#e0f2fe', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginBottom: 10 },
  clientTagText: { fontSize: 10, fontWeight: '700', color: '#0284c7' },

  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 10 },
  statBox: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statText: { fontSize: 11, fontWeight: '600', color: '#475569' },

  notesPreview: { fontSize: 13, color: '#64748b', fontStyle: 'italic', lineHeight: 18 },
  notesBox: { backgroundColor: '#fff', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', marginTop: 4 },
  notesLabel: { fontSize: 10, fontWeight: '800', color: '#94a3b8', letterSpacing: 1, marginBottom: 6 },
  notesText: { fontSize: 13, color: '#334155', lineHeight: 20 },
});
