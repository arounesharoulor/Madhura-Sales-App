import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CustomInput from '../components/CustomInput';
import CustomButton from '../components/CustomButton';
import AppLayout from '../components/AppLayout';
import api from '../api/api';

// Cross-platform DatePicker — native modal on iOS/Android, HTML input on web
function CrossPlatformDatePicker({ value, onChange }) {
  const [showNative, setShowNative] = useState(false);

  if (Platform.OS === 'web') {
    return (
      <View className="flex-row items-center bg-slate-50 border-[1.5px] border-slate-200 rounded-xl px-4 min-h-[50px] mb-4">
        <Ionicons name="calendar-outline" size={20} color="#0284c7" style={{ marginRight: 10 }} />
        <input
          type="date"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontSize: 14,
            color: value ? '#0f172a' : '#94a3b8',
            fontFamily: 'inherit',
            cursor: 'pointer',
          }}
        />
      </View>
    );
  }

  // Native: use DateTimePicker
  const DateTimePicker = require('@react-native-community/datetimepicker').default;

  return (
    <View className="mb-4">
      <TouchableOpacity
        onPress={() => setShowNative(true)}
        className="flex-row items-center bg-slate-50 border-[1.5px] border-slate-200 rounded-xl px-4 min-h-[50px]"
      >
        <Ionicons name="calendar-outline" size={20} color="#0284c7" style={{ marginRight: 10 }} />
        <Text className="flex-1 text-sm" style={{ color: value ? '#0f172a' : '#94a3b8' }}>
          {value
            ? (() => {
                try {
                  const d = new Date(value + 'T00:00:00');
                  return isNaN(d.getTime()) ? 'Select Date' : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
                } catch { return 'Select Date'; }
              })()
            : 'Select Date'}
        </Text>
        <Ionicons name="chevron-down" size={16} color="#64748b" />
      </TouchableOpacity>
      {showNative && (
        <DateTimePicker
          value={value ? new Date(value + 'T00:00:00') : new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, selectedDate) => {
            setShowNative(false);
            if (selectedDate) {
              onChange(selectedDate.toISOString().split('T')[0]);
            }
          }}
        />
      )}
    </View>
  );
}

export default function ReportsScreen({ navigation }) {
  const [role, setRole] = useState('Field Executive');
  const [reports, setReports] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('user').then(s => { if (s) setRole(JSON.parse(s).role); });
  }, []);
  const [expandedReportId, setExpandedReportId] = useState(null);

  // Generate Report Form Details
  const [title, setTitle] = useState('');
  const [type, setType] = useState('Weekly');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);

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

  useEffect(() => {
    fetchReports();
  }, []);

  const handleGenerateReport = async () => {
    if (!title || !startDate || !endDate) {
      Alert.alert('Validation Error', 'Please complete all fields.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/reports', { title, type, startDate, endDate });
      Alert.alert('Success', 'Report successfully generated!');
      setTitle('');
      setStartDate('');
      setEndDate('');
      setType('Weekly');
      setShowAddForm(false);
      fetchReports();
    } catch (e) {
      Alert.alert('Error', 'Failed to generate report.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout currentScreen="Reports" role={role} scrollable={false}>
      <View className="flex-1">
        <Text className="text-2xl font-bold text-slate-900 mb-6">Activity Reports</Text>

        {showAddForm ? (
          <ScrollView showsVerticalScrollIndicator={false} className="mt-4 pb-20">
            <View className="space-y-4 bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
              <CustomInput label="Report Title *" value={title} onChangeText={setTitle} placeholder="E.g. Q2 Sales Executive Activity Summary" />
              
              <Text className="text-[10px] font-bold uppercase tracking-wider mb-1 text-slate-500 mt-2">Report Frequency *</Text>
              <View className="flex-row bg-slate-100 p-1 rounded-2xl mb-4">
                {['Weekly', 'Monthly', 'Closure'].map((t) => (
                  <TouchableOpacity
                    key={t}
                    onPress={() => setType(t)}
                    className={`flex-1 py-3 rounded-xl ${
                      type === t ? 'bg-sky-600' : ''
                    }`}
                  >
                    <Text className={`text-center text-xs font-bold ${
                      type === t ? 'text-white' : 'text-slate-500'
                    }`}>
                      {t}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text className="text-[10px] font-bold uppercase tracking-wider mb-1 text-slate-500 mt-2">Start Date *</Text>
              <CrossPlatformDatePicker value={startDate} onChange={setStartDate} />

              <Text className="text-[10px] font-bold uppercase tracking-wider mb-1 text-slate-500 mt-2">End Date *</Text>
              <CrossPlatformDatePicker value={endDate} onChange={setEndDate} />

              <View className="mt-4">
                <CustomButton title="Generate Summary Report" loading={loading} onPress={handleGenerateReport} />
              </View>
              
              <TouchableOpacity onPress={() => setShowAddForm(false)} className="mt-4 py-3 border border-slate-200 rounded-2xl bg-white shadow-sm">
                <Text className="text-center text-slate-900 font-bold text-xs">Cancel</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        ) : (
          <View className="flex-1">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Generated Reports
              </Text>
              <TouchableOpacity onPress={() => setShowAddForm(true)} className="bg-sky-600 px-4 py-2 rounded-xl shadow-sm">
                <Text className="text-white font-bold text-xs">+ Generate</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={reports}
              keyExtractor={(item) => item._id}
              refreshing={refreshing}
              onRefresh={fetchReports}
              contentContainerStyle={{ paddingBottom: 60 }}
              ListEmptyComponent={() => (
                <View className="flex-1 items-center justify-center pt-20">
                  <Text className="text-xs text-slate-500">
                    No reports found. Tap "+ Generate" to create a new one.
                  </Text>
                </View>
              )}
              renderItem={({ item }) => {
                const isExpanded = expandedReportId === item._id;
                return (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setExpandedReportId(isExpanded ? null : item._id)}
                    className="mb-4 bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden"
                  >
                    <View className="p-5">
                      <View className="flex-row justify-between items-start mb-2">
                        <Text className="font-bold text-sm text-slate-900 flex-1 mr-2">{item.title}</Text>
                        <Text className="text-[10px] bg-sky-100 text-sky-700 px-2 py-1 rounded-full font-bold uppercase">{item.type}</Text>
                      </View>
                      
                      <Text className="text-xs text-slate-500 mb-3">
                        Period: {new Date(item.startDate).toLocaleDateString()} - {new Date(item.endDate).toLocaleDateString()}
                      </Text>

                      <View className="pt-3 border-t border-slate-100 flex-row flex-wrap justify-between text-[10px] text-slate-500">
                        <Text className="w-1/2 mb-1">🤝 Meetings: {item.summary?.totalMeetings || 0}</Text>
                        <Text className="w-1/2 mb-1">📞 Follow-Ups: {item.summary?.totalFollowUps || 0}</Text>
                        <Text className="w-1/2 mb-1">✅ Completed Tasks: {item.summary?.completedTasks || 0}</Text>
                        <Text className="w-1/2 mb-1">👥 Active Execs: {item.summary?.totalExecutivesActive || 0}</Text>
                      </View>
                      
                      <View className="flex-row justify-between items-center mt-3 pt-2 border-t border-slate-100">
                        <Text className="text-[9px] text-slate-400">
                          By: {item.generatedBy?.name || 'Admin'}
                        </Text>
                        <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={16} color="#94a3b8" />
                      </View>
                    </View>

                    {isExpanded && (
                      <View className="bg-slate-50 px-5 py-4 border-t border-slate-200">
                        <Text className="text-xs font-bold text-slate-700 mb-3 uppercase tracking-wide">Activity Details</Text>
                        {!item.activities || item.activities.length === 0 ? (
                          <Text className="text-xs text-slate-400 italic">No activities recorded during this period.</Text>
                        ) : (
                          item.activities.map((act, i) => (
                            <View key={i} className="mb-3 pb-3 border-b border-slate-200">
                              <View className="flex-row justify-between items-start mb-1">
                                <Text className="font-bold text-xs text-slate-800">
                                  {act.activityType === 'Meeting' ? '🤝 Meeting' : '📞 Follow-Up'}: {act.clientName}
                                </Text>
                                <Text className="text-[10px] text-slate-500">
                                  {new Date(act.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                </Text>
                              </View>
                              <Text className="text-[11px] text-slate-600 mb-1">
                                <Text className="font-semibold">Exec:</Text> {act.executiveName} | <Text className="font-semibold">Company:</Text> {act.companyName}
                              </Text>
                              <Text className="text-[10px] text-slate-500 italic">
                                "{act.notes || act.status}"
                              </Text>
                            </View>
                          ))
                        )}
                      </View>
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        )}
      </View>
    </AppLayout>
  );
}
