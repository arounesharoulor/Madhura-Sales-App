import { router } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CustomInput from '../components/CustomInput';
import CustomButton from '../components/CustomButton';
import api from '../api/api';
import { disconnectSocket } from '../utils/socket';
import { Ionicons } from '@expo/vector-icons';

export default function AdminDashboardScreen() {
  const router = useRouter();
  const [adminName, setAdminName] = useState('');
  const [stats, setStats] = useState({ users: 0, pendingTasks: 0, completedTasks: 0, meetings: 0, clients: 0 });
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showNotifyForm, setShowNotifyForm] = useState(false);

  // Task Form State
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [assignedToEmail, setAssignedToEmail] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [taskLoading, setTaskLoading] = useState(false);

  // Notification Broadcast Form State
  const [notifyTitle, setNotifyTitle] = useState('');
  const [notifyMessage, setNotifyMessage] = useState('');
  const [notifyLoading, setNotifyLoading] = useState(false);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const [userRes, taskRes, meetingRes, clientRes, notifRes] = await Promise.all([
        api.get('/users'),
        api.get('/tasks'),
        api.get('/meetings'),
        api.get('/onboarding').catch(() => ({ data: { data: [] } })),
        api.get('/notifications').catch(() => ({ data: { data: [] } }))
      ]);
      
      const tasks = taskRes.data.data;
      const pending = tasks.filter(t => t.status === 'Pending' || t.status === 'In Progress').length;
      const completed = tasks.filter(t => t.status === 'Completed').length;

      setStats({
        users: userRes.data.count,
        pendingTasks: pending,
        completedTasks: completed,
        meetings: meetingRes.data.data.length,
        clients: clientRes.data.data ? clientRes.data.data.length : 0,
      });

      const notifs = notifRes.data.data || [];
      setUnreadCount(notifs.filter(n => !n.isRead).length);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadProfile = async () => {
      const storedUser = await AsyncStorage.getItem('user');
      if (storedUser) {
        setAdminName(JSON.parse(storedUser).name);
      }
    };
    loadProfile();

    
      fetchStats();
    
    
  }, []);

  const handleLogout = async () => {
    Alert.alert('Confirm Logout', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.removeItem('token');
          await AsyncStorage.removeItem('user');
          disconnectSocket();
          router.replace('Login');
        },
      },
    ]);
  };

  const handleAssignTask = async () => {
    if (!taskTitle || !taskDesc || !assignedToEmail || !dueDate) {
      Alert.alert('Validation Error', 'Please fill in all fields.');
      return;
    }
    setTaskLoading(true);
    try {
      // Find the user ID by email
      const usersRes = await api.get('/users');
      const targetUser = usersRes.data.data.find(u => u.email.toLowerCase() === assignedToEmail.toLowerCase());
      
      if (!targetUser) {
        Alert.alert('Error', 'User with this email not found.');
        setTaskLoading(false);
        return;
      }

      await api.post('/tasks', {
        title: taskTitle,
        description: taskDesc,
        assignedTo: targetUser._id,
        dueDate,
      });

      Alert.alert('Success', 'Task successfully assigned to ' + targetUser.name);
      setTaskTitle('');
      setTaskDesc('');
      setAssignedToEmail('');
      setDueDate('');
      setShowTaskForm(false);
      fetchStats();
    } catch (e) {
      Alert.alert('Error', 'Failed to assign task');
    } finally {
      setTaskLoading(false);
    }
  };

  const handleBroadcastNotification = async () => {
    if (!notifyTitle || !notifyMessage) {
      Alert.alert('Validation Error', 'Please complete the title and message fields.');
      return;
    }
    setNotifyLoading(true);
    try {
      // Post broadcast notification
      await api.post('/notifications', {
        title: notifyTitle,
        message: notifyMessage,
        type: 'Broadcast',
      });
      Alert.alert('Success', 'Notification broadcasted to all executives.');
      setNotifyTitle('');
      setNotifyMessage('');
      setShowNotifyForm(false);
    } catch (e) {
      Alert.alert('Error', 'Failed to broadcast notification');
    } finally {
      setNotifyLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 24 }}>
        {/* Header */}
        <View className="flex-row justify-between items-center mb-6 pt-4">
          <View>
            <Text className="text-xs uppercase tracking-widest text-slate-400">
              Control Panel
            </Text>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 12}}>

              <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.push('/')}>

                <Ionicons name="arrow-back" size={24} color="#0f172a" />

              </TouchableOpacity>

              <Text className="text-2xl font-black text-slate-900 mt-1">
              {adminName || 'Super Admin'}
            </Text>

            </View>
          </View>
          <View className="flex-row items-center space-x-3">
            <TouchableOpacity
              onPress={() => { setUnreadCount(0); router.push('/Notification'); }}
              className="w-10 h-10 rounded-xl bg-white border border-slate-200 items-center justify-center shadow-sm"
              activeOpacity={0.8}
            >
              <Ionicons name={unreadCount > 0 ? 'notifications' : 'notifications-outline'} size={20} color={unreadCount > 0 ? '#d4af37' : '#64748b'} />
              {unreadCount > 0 && (
                <View className="absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full bg-red-500 items-center justify-center border border-white px-0.5">
                  <Text className="text-white text-[8px] font-black">{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={handleLogout} className="bg-white border border-slate-200 px-4 py-2.5 rounded-xl shadow-sm">
              <Text className="text-rose-600 font-bold text-xs">Logout</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* New Professional Clients Banner */}
        <View className="bg-slate-900 rounded-3xl p-6 flex-row items-center justify-between mb-6 shadow-sm">
          <View>
            <Text className="text-slate-400 text-xs font-medium uppercase tracking-widest">Total Clients Onboarded</Text>
            <Text className="text-white text-3xl font-bold mt-1">{stats.clients}</Text>
          </View>
          <View className="bg-slate-800 rounded-2xl p-4 border border-slate-700">
            <Ionicons name="briefcase" size={32} color="#38bdf8" />
          </View>
        </View>

        {/* Stats Grid */}
        <View className="flex-row flex-wrap justify-between mb-6">
          <View className="w-[48%] bg-white border border-slate-100 p-5 rounded-2xl mb-4 shadow-sm">
            <Text className="text-3xl font-semibold text-sky-600">{stats.users}</Text>
            <Text className="text-xs font-medium mt-1 text-slate-500">Total Users</Text>
          </View>
          <View className="w-[48%] bg-white border border-slate-100 p-5 rounded-2xl mb-4 shadow-sm">
            <Text className="text-3xl font-semibold text-amber-600">{stats.pendingTasks}</Text>
            <Text className="text-xs font-medium mt-1 text-slate-500">Pending Tasks</Text>
          </View>
          <View className="w-[48%] bg-white border border-slate-100 p-5 rounded-2xl mb-4 shadow-sm">
            <Text className="text-3xl font-semibold text-emerald-600">{stats.completedTasks}</Text>
            <Text className="text-xs font-medium mt-1 text-slate-500">Completed Tasks</Text>
          </View>
          <View className="w-[48%] bg-white border border-slate-100 p-5 rounded-2xl mb-4 shadow-sm">
            <Text className="text-3xl font-semibold text-indigo-600">{stats.meetings}</Text>
            <Text className="text-xs font-medium mt-1 text-slate-500">Logged Meetings</Text>
          </View>
        </View>

        {/* Actions section */}
        <Text className="text-xs font-bold uppercase tracking-wider mb-4 text-slate-500">
          Management Controls
        </Text>

        <View className="space-y-3 mb-6">
          <TouchableOpacity onPress={() => router.push('/UserManagement')} className="p-4 bg-white border border-slate-100 rounded-2xl flex-row justify-between items-center shadow-sm">
            <Text className="text-slate-800 font-medium text-sm">User Management & Roster</Text>
            <Text className="text-sky-500 font-medium text-xs">GO →</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/Reports')} className="p-4 bg-white border border-slate-100 rounded-2xl flex-row justify-between items-center shadow-sm">
            <Text className="text-slate-800 font-medium text-sm">Activity & Visit Reports</Text>
            <Text className="text-sky-500 font-medium text-xs">GO →</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/Chat')} className="p-4 bg-white border border-slate-100 rounded-2xl flex-row justify-between items-center shadow-sm">
            <Text className="text-slate-800 font-medium text-sm">Live Team Chat Room</Text>
            <Text className="text-sky-500 font-medium text-xs">GO →</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/AdminAttendance')} className="p-4 bg-white border border-slate-100 rounded-2xl flex-row justify-between items-center shadow-sm">
            <Text className="text-slate-800 font-medium text-sm">View Attendance Log</Text>
            <Text className="text-sky-500 font-medium text-xs">GO →</Text>
          </TouchableOpacity>
        </View>

        {/* Task Assigning Form Panel */}
        <TouchableOpacity
          onPress={() => setShowTaskForm(!showTaskForm)}
          className="bg-white border border-slate-100 p-4 rounded-2xl mb-4 flex-row justify-between items-center shadow-sm"
        >
          <Text className="text-sm font-medium text-slate-800">Create & Assign Task</Text>
          <Text className="text-sky-500 font-medium text-xs">{showTaskForm ? 'Collapse' : 'Expand'}</Text>
        </TouchableOpacity>

        {showTaskForm && (
          <View className="p-5 bg-white border border-slate-100 rounded-2xl mb-4 space-y-4 shadow-sm">
            <CustomInput label="Task Title" value={taskTitle} onChangeText={setTaskTitle} placeholder="E.g. Meet client in Chennai" />
            <CustomInput label="Task Description" value={taskDesc} onChangeText={setTaskDesc} placeholder="Details on items to be discussed..." />
            <CustomInput label="Assignee User Email" value={assignedToEmail} onChangeText={setAssignedToEmail} placeholder="executive@fieldstaff.com" keyboardType="email-address" autoCapitalize="none" />
            <CustomInput label="Due Date (YYYY-MM-DD)" value={dueDate} onChangeText={setDueDate} placeholder="E.g. 2026-06-15" />
            <CustomButton title="Assign Task" loading={taskLoading} onPress={handleAssignTask} />
          </View>
        )}

        {/* Broadcast Notification Panel */}
        <TouchableOpacity
          onPress={() => setShowNotifyForm(!showNotifyForm)}
          className="bg-white border border-slate-100 p-4 rounded-2xl mb-4 flex-row justify-between items-center shadow-sm"
        >
          <Text className="text-sm font-medium text-slate-800">Broadcast Alerts to Staff</Text>
          <Text className="text-sky-500 font-medium text-xs">{showNotifyForm ? 'Collapse' : 'Expand'}</Text>
        </TouchableOpacity>

        {showNotifyForm && (
          <View className="p-5 bg-white border border-slate-100 rounded-2xl mb-4 space-y-4 shadow-sm">
            <CustomInput label="Alert Title" value={notifyTitle} onChangeText={setNotifyTitle} placeholder="E.g. Emergency System Maintenance" />
            <CustomInput label="Alert Message" value={notifyMessage} onChangeText={setNotifyMessage} placeholder="Dear Staff, please sync your tasks..." />
            <CustomButton title="Broadcast Alert" loading={notifyLoading} onPress={handleBroadcastNotification} style="bg-rose-600" />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
