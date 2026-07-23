import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, ScrollView, StyleSheet, ActivityIndicator, RefreshControl, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import CustomInput from '../components/CustomInput';
import CustomButton from '../components/CustomButton';
import AppLayout from '../components/AppLayout';
import api from '../api/api';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';

export default function UserManagementScreen() {
  const [users, setUsers] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [userRole, setUserRole] = useState('Admin');

  useEffect(() => {
    AsyncStorage.getItem('user').then(s => {
      if (s) {
        const parsed = JSON.parse(s);
        setUserRole(parsed.role || 'Admin');
      }
    });
  }, []);

  // User form details
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('Field Executive'); // default
  const [designation, setDesignation] = useState('');
  const [loading, setLoading] = useState(false);

  const safeGet = async (url, config) => {
    try {
      return await api.get(url, config);
    } catch (e) {
      console.warn(`API call failed: ${url}`, e);
      return { data: { data: [] } };
    }
  };

  const fetchUsers = async () => {
    try {
      setRefreshing(true);
      const today = new Date().toISOString().split('T')[0];
      const [usersRes, attendanceRes] = await Promise.all([
        safeGet('/users'),
        safeGet('/attendance', { params: { date: today } }),
      ]);

      const attendanceByExec = (attendanceRes.data.data || []).reduce((acc, rec) => {
        const execId = rec.executive?._id?.toString() || rec.executive?.toString();
        if (execId) acc[execId] = rec;
        return acc;
      }, {});

      const usersWithStatus = (usersRes.data.data || []).map((user) => {
        const id = user._id?.toString() || user.id?.toString();
        const attendance = attendanceByExec[id] || null;
        return {
          ...user,
          todayAttendanceStatus: attendance?.status || 'No Attendance',
        };
      });

      setUsers(usersWithStatus);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to retrieve team members list.');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async () => {
    if (!name || !email || !password || !phone || !designation) {
      Alert.alert('Validation Error', 'Please complete all required fields.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/users', { name, email, password, phone, role, designation });
      Alert.alert('Success', `${role} user successfully added!`);
      setName('');
      setEmail('');
      setPassword('');
      setPhone('');
      setRole('Field Executive');
      setDesignation('');
      setShowAddForm(false);
      fetchUsers();
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (userId, currentStatus) => {
    Alert.alert(
      'Toggle Status',
      `Are you sure you want to ${currentStatus ? 'Deactivate' : 'Activate'} this user?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Change Status',
          onPress: async () => {
            try {
              await api.delete(`/users/${userId}`);
              fetchUsers();
            } catch (e) {
              Alert.alert('Error', 'Failed to change user status');
            }
          },
        },
      ]
    );
  };

  return (
    <AppLayout currentScreen="UserManagement" role="Admin" scrollable={false}>
      <View className="flex-1">
        
        {/* Header with Back Arrow and Title */}
        <View className="flex-row justify-between items-center mb-6">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <TouchableOpacity onPress={() => router.push('/AdminDashboard')}>
              <Ionicons name="arrow-back" size={24} color="#0f172a" />
            </TouchableOpacity>
            <Text className="text-2xl font-black text-slate-900">Field Staff</Text>
          </View>
          {!showAddForm && (
            <TouchableOpacity onPress={() => setShowAddForm(true)} className="bg-sky-600 px-4 py-2 rounded-xl shadow-sm">
              <Text className="text-white font-bold text-xs">+ Add Member</Text>
            </TouchableOpacity>
          )}
        </View>

        {showAddForm ? (
          <ScrollView showsVerticalScrollIndicator={false} className="mt-4">
            <View className="space-y-4 bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
              <CustomInput label="Full Name *" value={name} onChangeText={setName} placeholder="E.g. John Doe" />
              <CustomInput label="Email Address *" value={email} onChangeText={setEmail} placeholder="executive@fieldstaff.com" keyboardType="email-address" autoCapitalize="none" />
              <CustomInput label="Password *" value={password} onChangeText={setPassword} placeholder="••••••••" secureTextEntry />
              <CustomInput label="Phone Number *" value={phone} onChangeText={setPhone} placeholder="1234567890" keyboardType="phone-pad" />
              
              <Text className="text-[10px] font-bold uppercase tracking-wider mb-1 text-slate-500">Designation *</Text>
              <View className="flex-row flex-wrap gap-2 mb-4">
                {['BDE', 'BDM', 'Pre Sales', 'Manager', 'Other'].map((d) => (
                  <TouchableOpacity
                    key={d}
                    onPress={() => setDesignation(d)}
                    className={`px-4 py-2 rounded-xl border ${designation === d ? 'bg-sky-600 border-sky-600' : 'bg-slate-50 border-slate-200'}`}
                  >
                    <Text className={`text-xs font-bold ${designation === d ? 'text-white' : 'text-slate-600'}`}>{d}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              <Text className="text-[10px] font-bold uppercase tracking-wider mb-1 text-slate-500">User Role *</Text>
              <View className="flex-row bg-slate-100 p-1 rounded-2xl mb-4">
                {['Field Executive', 'Manager', 'Admin'].map((r) => (
                  <TouchableOpacity
                    key={r}
                    onPress={() => setRole(r)}
                    className={`flex-1 py-3 rounded-xl ${
                      role === r ? 'bg-sky-600' : ''
                    }`}
                  >
                    <Text className={`text-center text-xs font-bold ${
                      role === r ? 'text-white' : 'text-slate-500'
                    }`}>
                      {r}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <CustomButton title="Add User Member" loading={loading} onPress={handleCreateUser} />
              
              <TouchableOpacity onPress={() => setShowAddForm(false)} className="mt-4 py-3 border border-slate-200 rounded-2xl bg-white shadow-sm">
                <Text className="text-center text-slate-900 font-bold text-xs">Cancel</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        ) : (
          <View className="flex-1">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Staff Members
              </Text>
              <TouchableOpacity onPress={() => setShowAddForm(true)} className="bg-sky-600 px-4 py-2 rounded-xl shadow-sm">
                <Text className="text-white font-bold text-xs">+ Add Member</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={users}
              keyExtractor={(item) => item._id}
              refreshing={refreshing}
              onRefresh={fetchUsers}
              ListEmptyComponent={() => (
                <View className="flex-1 items-center justify-center pt-20">
                  <Text className="text-xs text-slate-500">
                    No users found. Tap "+ Add Member" to register one.
                  </Text>
                </View>
              )}
              renderItem={({ item }) => {
                const attendanceBadgeClass = item.todayAttendanceStatus === 'Checked In'
                  ? 'bg-emerald-50 border-emerald-200'
                  : item.todayAttendanceStatus === 'Checked Out'
                    ? 'bg-rose-50 border-rose-200'
                    : 'bg-slate-100 border-slate-200';
                const attendanceTextClass = item.todayAttendanceStatus === 'Checked In'
                  ? 'text-emerald-600'
                  : item.todayAttendanceStatus === 'Checked Out'
                    ? 'text-rose-600'
                    : 'text-slate-500';
                const attendanceLabel = item.todayAttendanceStatus === 'Checked In'
                  ? 'Active'
                  : item.todayAttendanceStatus === 'Checked Out'
                    ? 'Inactive'
                    : 'No Attendance';
                return (
                  <View className="mb-4 p-5 bg-white border border-slate-200 rounded-3xl shadow-sm">
                    <View className="flex-row justify-between items-start">
                      <View className="flex-1 pr-3">
                        <Text className="font-bold text-sm text-slate-900">{item.name}</Text>
                        <Text className="text-xs text-slate-500">{item.email}</Text>
                        <Text className="text-xs text-slate-500 mt-1">Role: {item.role} | Desig: {item.designation || 'N/A'} | Phone: {item.phone}</Text>
                      </View>
                      <View className="flex-row items-center gap-2">
                        {item.role === 'Field Executive' ? (
                          <View className={`px-3 py-1.5 rounded-lg border ${attendanceBadgeClass}`}>
                            <Text className={`text-[10px] font-bold ${attendanceTextClass}`}>
                              {attendanceLabel}
                            </Text>
                          </View>
                        ) : null}
                        <TouchableOpacity
                          onPress={() => handleToggleStatus(item._id, item.isActive)}
                          className={`px-3 py-1.5 rounded-lg border ${
                            item.isActive
                              ? 'bg-emerald-50 border-emerald-200'
                              : 'bg-rose-50 border-rose-200'
                          }`}
                        >
                          <Text className={`text-[10px] font-bold ${
                            item.isActive ? 'text-emerald-600' : 'text-rose-600'
                          }`}>
                            {item.isActive ? 'Active' : 'Suspended'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                    <View className="flex-row items-center gap-2 mt-3 pt-3 border-t border-slate-100 justify-end">
                      <TouchableOpacity
                        onPress={() => router.push({
                          pathname: '/Chat',
                          params: { partnerId: item._id, partnerName: item.name }
                        })}
                        className="bg-sky-50 px-3 py-1.5 rounded-lg border border-sky-100 flex-row items-center"
                      >
                        <Ionicons name="chatbubbles-outline" size={14} color="#0284c7" style={{ marginRight: 4 }} />
                        <Text className="text-[10px] text-sky-600 font-bold">Message</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              }}
            />
          </View>
        )}
      </View>
    </AppLayout>
  );
}
