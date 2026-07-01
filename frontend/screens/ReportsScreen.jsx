import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Alert, ScrollView,
  Platform, Modal, TextInput, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import CustomInput from '../components/CustomInput';
import CustomButton from '../components/CustomButton';
import AppLayout from '../components/AppLayout';
import api from '../api/api';

// Cross-platform DatePicker
function CrossPlatformDatePicker({ value, onChange }) {
  const [showNative, setShowNative] = useState(false);

  if (Platform.OS === 'web') {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 14, paddingHorizontal: 14, minHeight: 50, marginBottom: 12 }}>
        <Ionicons name="calendar-outline" size={20} color="#0284c7" style={{ marginRight: 10 }} />
        <input
          type="date"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 14, color: value ? '#0f172a' : '#94a3b8', fontFamily: 'inherit', cursor: 'pointer' }}
        />
      </View>
    );
  }

  const DateTimePicker = require('@react-native-community/datetimepicker').default;
  return (
    <View style={{ marginBottom: 12 }}>
      <TouchableOpacity
        onPress={() => setShowNative(true)}
        style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 14, paddingHorizontal: 14, minHeight: 50 }}
      >
        <Ionicons name="calendar-outline" size={20} color="#0284c7" style={{ marginRight: 10 }} />
        <Text style={{ flex: 1, fontSize: 14, color: value ? '#0f172a' : '#94a3b8' }}>
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

// Send Email Modal (Admin only)
function SendEmailModal({ visible, onClose, report, onSent }) {
  const [clientEmail, setClientEmail] = useState('');
  const [clientName, setClientName] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!clientEmail) { Alert.alert('Required', 'Please enter client email'); return; }
    setSending(true);
    try {
      await api.post(`/reports/${report._id}/send-email`, { clientEmail, clientName, message });
      Alert.alert('Sent!', `Report emailed to ${clientEmail}`);
      setClientEmail(''); setClientName(''); setMessage('');
      onSent();
      onClose();
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to send email');
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: '#fff', borderRadius: 24, padding: 24, paddingBottom: 40 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: '#0f172a' }}>Send Report to Client</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={22} color="#64748b" /></TouchableOpacity>
          </View>

          {report && (
            <View style={{ backgroundColor: '#eff6ff', borderRadius: 12, padding: 12, marginBottom: 16 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#0284c7' }}>{report.title}</Text>
              <Text style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                {report.startDate ? new Date(report.startDate).toLocaleDateString('en-IN') : ''} – {report.endDate ? new Date(report.endDate).toLocaleDateString('en-IN') : ''}
              </Text>
            </View>
          )}

          <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>Client Email *</Text>
          <TextInput
            value={clientEmail}
            onChangeText={setClientEmail}
            placeholder="client@example.com"
            placeholderTextColor="#94a3b8"
            keyboardType="email-address"
            style={{ backgroundColor: '#f8fafc', borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 14, paddingHorizontal: 14, height: 50, fontSize: 14, color: '#0f172a', marginBottom: 12 }}
          />

          <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>Client Name</Text>
          <TextInput
            value={clientName}
            onChangeText={setClientName}
            placeholder="E.g. Rajesh Sharma"
            placeholderTextColor="#94a3b8"
            style={{ backgroundColor: '#f8fafc', borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 14, paddingHorizontal: 14, height: 50, fontSize: 14, color: '#0f172a', marginBottom: 12 }}
          />

          <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>Custom Message (optional)</Text>
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder="Add a personal note..."
            placeholderTextColor="#94a3b8"
            multiline
            style={{ backgroundColor: '#f8fafc', borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#0f172a', minHeight: 80, textAlignVertical: 'top', marginBottom: 20 }}
          />

          <TouchableOpacity
            onPress={handleSend}
            disabled={sending}
            style={{ backgroundColor: sending ? '#93c5fd' : '#0284c7', borderRadius: 14, paddingVertical: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            {sending ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="mail" size={18} color="#fff" />}
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>{sending ? 'Sending...' : 'Send Excel Report'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export default function ReportsScreen({ navigation }) {
  const [role, setRole] = useState('Field Executive');
  const [reports, setReports] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedReportId, setExpandedReportId] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const [emailModalReport, setEmailModalReport] = useState(null);

  const [title, setTitle] = useState('');
  const [type, setType] = useState('Weekly');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('user').then(s => { if (s) setRole(JSON.parse(s).role); });
  }, []);

  const fetchReports = async () => {
    try {
      setRefreshing(true);
      const res = await api.get('/reports');
      setReports(res.data.data);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to retrieve generated reports.');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchReports(); }, []);

  const handleGenerateReport = async () => {
    if (!title || !startDate || !endDate) {
      Alert.alert('Validation Error', 'Please complete all fields.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/reports', { title, type, startDate, endDate });
      Alert.alert('Success', 'Report successfully generated!');
      setTitle(''); setStartDate(''); setEndDate(''); setType('Weekly');
      setShowAddForm(false);
      fetchReports();
    } catch (e) {
      Alert.alert('Error', 'Failed to generate report.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (item) => {
    setDownloadingId(item._id);
    try {
      // For web: direct link download
      if (Platform.OS === 'web') {
        const baseUrl = api.defaults?.baseURL || '';
        const token = await AsyncStorage.getItem('token');
        const url = `${baseUrl}/reports/${item._id}/download`;
        const a = document.createElement('a');
        a.href = url;
        a.setAttribute('download', `report_${item.title}.xlsx`);
        // Add auth header via fetch + blob
        const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        const blob = await resp.blob();
        const objectUrl = URL.createObjectURL(blob);
        a.href = objectUrl;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(objectUrl);
      } else {
        // Mobile: download to cache dir then share
        const token = await AsyncStorage.getItem('token');
        const baseUrl = api.defaults?.baseURL || '';
        const url = `${baseUrl}/reports/${item._id}/download`;
        const filename = `report_${item.title.replace(/\s+/g, '_')}.xlsx`;
        const localUri = FileSystem.cacheDirectory + filename;

        const dl = await FileSystem.downloadAsync(url, localUri, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (dl.status === 200) {
          const canShare = await Sharing.isAvailableAsync();
          if (canShare) {
            await Sharing.shareAsync(dl.uri, { mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', dialogTitle: 'Save Report' });
          } else {
            Alert.alert('Downloaded', `Saved to: ${dl.uri}`);
          }
        } else {
          Alert.alert('Error', 'Download failed');
        }
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Could not download the report. Make sure the local server is running.');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <AppLayout currentScreen="Reports" role={role} scrollable={false}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 22, fontWeight: '900', color: '#0f172a', marginBottom: 16 }}>Activity Reports</Text>

        {showAddForm ? (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 80 }}>
            <View style={{ backgroundColor: '#fff', borderRadius: 24, borderWidth: 1, borderColor: '#e2e8f0', padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 }}>
              
              <View style={{ backgroundColor: '#f8fafc', borderRadius: 16, padding: 16, marginBottom: 24, borderLeftWidth: 4, borderLeftColor: '#0284c7' }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#0f172a', marginBottom: 6 }}>Automated Report Generation</Text>
                <Text style={{ fontSize: 12, color: '#64748b', lineHeight: 18 }}>
                  This tool instantly compiles all executive activities, client meetings, follow-ups, and task completions within the selected date range.
                </Text>
              </View>

              <CustomInput label="Report Title *" value={title} onChangeText={setTitle} placeholder="E.g. Q2 Sales Executive Activity Summary" />

              <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginTop: 12 }}>Report Frequency *</Text>
              <View style={{ flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 16, padding: 4, marginBottom: 20 }}>
                {['Weekly', 'Monthly', 'Closure'].map((t) => (
                  <TouchableOpacity
                    key={t}
                    onPress={() => setType(t)}
                    style={{ flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: type === t ? '#0284c7' : 'transparent', alignItems: 'center' }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '800', color: type === t ? '#fff' : '#64748b' }}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={{ flexDirection: 'row', gap: 16, marginBottom: 20 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Start Date *</Text>
                  <CrossPlatformDatePicker value={startDate} onChange={setStartDate} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>End Date *</Text>
                  <CrossPlatformDatePicker value={endDate} onChange={setEndDate} />
                </View>
              </View>

              <View style={{ backgroundColor: '#f0fdf4', borderRadius: 16, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: '#bbf7d0' }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#16a34a', marginBottom: 8 }}>Included Data Points:</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {['Client Meetings', 'Follow-ups', 'Task Progress', 'Executive Stats'].map(item => (
                    <View key={item} style={{ backgroundColor: '#dcfce7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: '#15803d' }}>✓ {item}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <View style={{ marginTop: 8 }}>
                <CustomButton title="Generate Summary Report" loading={loading} onPress={handleGenerateReport} />
              </View>
              <TouchableOpacity onPress={() => setShowAddForm(false)} style={{ marginTop: 12, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, borderColor: '#e2e8f0', alignItems: 'center' }}>
                <Text style={{ color: '#64748b', fontWeight: '800', fontSize: 13 }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        ) : (
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {reports.length} Report{reports.length !== 1 ? 's' : ''}
              </Text>
              <TouchableOpacity onPress={() => setShowAddForm(true)} style={{ backgroundColor: '#0284c7', paddingHorizontal: 16, paddingVertical: 9, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="add" size={16} color="#fff" />
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>Generate</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={reports}
              keyExtractor={(item) => item._id}
              refreshing={refreshing}
              onRefresh={fetchReports}
              contentContainerStyle={{ paddingBottom: 60 }}
              ListEmptyComponent={() => (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 12 }}>
                  <View style={{ backgroundColor: '#eff6ff', borderRadius: 20, padding: 20 }}>
                    <Ionicons name="document-text-outline" size={40} color="#0284c7" />
                  </View>
                  <Text style={{ fontSize: 14, color: '#64748b', fontWeight: '600' }}>No reports yet</Text>
                  <Text style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>Tap "Generate" to create your first report</Text>
                </View>
              )}
              renderItem={({ item }) => {
                const isExpanded = expandedReportId === item._id;
                const isDownloading = downloadingId === item._id;
                return (
                  <View style={{ marginBottom: 14, backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOpacity: 0.04, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, elevation: 2, overflow: 'hidden' }}>
                    <TouchableOpacity activeOpacity={0.8} onPress={() => setExpandedReportId(isExpanded ? null : item._id)} style={{ padding: 16 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                        <Text style={{ fontWeight: '800', fontSize: 14, color: '#0f172a', flex: 1, marginRight: 8 }}>{item.title}</Text>
                        <View style={{ backgroundColor: '#eff6ff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
                          <Text style={{ fontSize: 10, fontWeight: '700', color: '#0284c7', textTransform: 'uppercase' }}>{item.type}</Text>
                        </View>
                      </View>

                      <Text style={{ fontSize: 12, color: '#64748b', marginBottom: 10 }}>
                        📅 {new Date(item.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} – {new Date(item.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </Text>

                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                        {[
                          { icon: '🤝', label: 'Meetings', val: item.summary?.totalMeetings || 0 },
                          { icon: '📞', label: 'Follow-Ups', val: item.summary?.totalFollowUps || 0 },
                          { icon: '✅', label: 'Tasks Done', val: item.summary?.completedTasks || 0 },
                          { icon: '👥', label: 'Executives', val: item.summary?.totalExecutivesActive || 0 },
                        ].map(stat => (
                          <View key={stat.label} style={{ backgroundColor: '#f8fafc', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: '#e2e8f0' }}>
                            <Text style={{ fontSize: 11, color: '#475569', fontWeight: '600' }}>{stat.icon} {stat.label}: <Text style={{ fontWeight: '800', color: '#0284c7' }}>{stat.val}</Text></Text>
                          </View>
                        ))}
                      </View>

                      {/* Action buttons row */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9' }}>
                        <Text style={{ fontSize: 10, color: '#94a3b8' }}>By: {item.generatedBy?.name || 'System'}</Text>

                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          {/* Download Excel */}
                          <TouchableOpacity
                            onPress={(e) => { e.stopPropagation?.(); handleDownload(item); }}
                            disabled={isDownloading}
                            style={{ backgroundColor: '#f0fdf4', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#bbf7d0' }}
                          >
                            {isDownloading ? <ActivityIndicator size="small" color="#16a34a" /> : <Ionicons name="download-outline" size={14} color="#16a34a" />}
                            <Text style={{ fontSize: 11, fontWeight: '700', color: '#16a34a' }}>Excel</Text>
                          </TouchableOpacity>

                          {/* Send to Client (Admin only) */}
                          {role === 'Admin' && (
                            <TouchableOpacity
                              onPress={(e) => { e.stopPropagation?.(); setEmailModalReport(item); }}
                              style={{ backgroundColor: '#eff6ff', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#bfdbfe' }}
                            >
                              <Ionicons name="mail-outline" size={14} color="#0284c7" />
                              <Text style={{ fontSize: 11, fontWeight: '700', color: '#0284c7' }}>Send</Text>
                            </TouchableOpacity>
                          )}

                          {/* Report Issue (Admin) */}
                          {role === 'Admin' && item.generatedBy?._id && (
                            <TouchableOpacity
                              onPress={(e) => { e.stopPropagation?.(); navigation.navigate('Chat', { partnerId: item.generatedBy._id, partnerName: item.generatedBy.name }); }}
                              style={{ backgroundColor: '#fef2f2', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#fecdd3' }}
                            >
                              <Ionicons name="chatbubble-ellipses-outline" size={14} color="#ef4444" />
                              <Text style={{ fontSize: 11, fontWeight: '700', color: '#ef4444' }}>Issue</Text>
                            </TouchableOpacity>
                          )}

                          <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={16} color="#94a3b8" />
                        </View>
                      </View>
                    </TouchableOpacity>

                    {/* Expanded activity details */}
                    {isExpanded && (
                      <View style={{ backgroundColor: '#f8fafc', paddingHorizontal: 16, paddingVertical: 14, borderTopWidth: 1, borderTopColor: '#e2e8f0' }}>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>Activity Details</Text>
                        {!item.activities || item.activities.length === 0 ? (
                          <Text style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>No activities recorded during this period.</Text>
                        ) : (
                          item.activities.map((act, i) => (
                            <View key={i} style={{ marginBottom: 12, paddingBottom: 12, borderBottomWidth: i < item.activities.length - 1 ? 1 : 0, borderBottomColor: '#e2e8f0' }}>
                              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                                <Text style={{ fontWeight: '700', fontSize: 12, color: '#0f172a', flex: 1 }}>
                                  {act.activityType === 'Meeting' ? '🤝 Meeting' : '📞 Follow-Up'}: {act.clientName}
                                </Text>
                                <Text style={{ fontSize: 10, color: '#64748b' }}>
                                  {new Date(act.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                </Text>
                              </View>
                              <Text style={{ fontSize: 11, color: '#475569', marginBottom: 2 }}>
                                <Text style={{ fontWeight: '600' }}>Exec:</Text> {act.executiveName} · <Text style={{ fontWeight: '600' }}>Co.:</Text> {act.companyName}
                              </Text>
                              {act.notes || act.status ? (
                                <Text style={{ fontSize: 10, color: '#64748b', fontStyle: 'italic' }}>"{act.notes || act.status}"</Text>
                              ) : null}
                            </View>
                          ))
                        )}
                      </View>
                    )}
                  </View>
                );
              }}
            />
          </View>
        )}
      </View>

      {/* Send Email Modal */}
      <SendEmailModal
        visible={!!emailModalReport}
        onClose={() => setEmailModalReport(null)}
        report={emailModalReport}
        onSent={fetchReports}
      />
    </AppLayout>
  );
}
