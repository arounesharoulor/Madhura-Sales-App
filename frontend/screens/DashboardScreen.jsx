import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import api from '../api/api';
import { connectSocket } from '../utils/socket';
import * as Location from 'expo-location';
import AppLayout from '../components/AppLayout';

const today = new Date();

function StatCard({ icon, label, value, color, bg }) {
  return (
    <View style={{
      flex: 1, backgroundColor: bg || '#eff6ff', borderRadius: 18,
      padding: 14, gap: 4, borderWidth: 1, borderColor: color + '33',
    }}>
      <View style={{ backgroundColor: color + '22', borderRadius: 10, padding: 7, alignSelf: 'flex-start' }}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={{ fontSize: 26, fontWeight: '900', color: '#0f172a', marginTop: 4 }}>{value}</Text>
      <Text style={{ fontSize: 10, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</Text>
    </View>
  );
}

function QuickAction({ icon, label, color, bg, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={{
        width: '48%', backgroundColor: '#fff', borderRadius: 18, borderWidth: 1,
        borderColor: '#e2e8f0', padding: 16, flexDirection: 'row', alignItems: 'center',
        gap: 12, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 6, elevation: 1,
      }}
    >
      <View style={{ backgroundColor: bg, borderRadius: 12, padding: 10 }}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={{ fontSize: 12, fontWeight: '700', color: '#0f172a', flex: 1, flexWrap: 'wrap' }}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function DashboardScreen({ navigation }) {
  const [user, setUser] = useState({});
  const [loading, setLoading] = useState(true);
  const [checkedIn, setCheckedIn] = useState(false);
  const [metrics, setMetrics] = useState({
    pendingTasks: 0, inProgressTasks: 0, completedTasks: 0,
    visitsToday: 0, followUpsToday: 0,
    totalClients: 0, attendancePct: 0,
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const stored = await AsyncStorage.getItem('user');
      if (stored) setUser(JSON.parse(stored));

      const [tasksRes, meetingsRes, followUpsRes, attendanceRes, onboardingRes] = await Promise.all([
        api.get('/tasks').catch(() => ({ data: { data: [] } })),
        api.get('/meetings').catch(() => ({ data: { data: [] } })),
        api.get('/followups').catch(() => ({ data: { data: [] } })),
        api.get('/attendance/my').catch(() => ({ data: { data: [] } })),
        api.get('/onboarding').catch(() => ({ data: { data: [] } })),
      ]);

      const tasks = tasksRes.data.data || [];
      const meetings = meetingsRes.data.data || [];
      const followUps = followUpsRes.data.data || [];
      const attendance = attendanceRes.data.data || [];

      const todayStr = today.toDateString();
      const visitsToday = meetings.filter(m => new Date(m.createdAt).toDateString() === todayStr).length;
      const followUpsToday = followUps.filter(f => {
        const fDate = f.followUpDate ? new Date(f.followUpDate).toDateString() : '';
        return fDate === todayStr && f.status !== 'Completed';
      }).length;

      const safeAttendance = Array.isArray(attendance) ? attendance : [];
      
      const presentDays = safeAttendance.filter(a => a.checkInStatus === 'Approved').length;
      const totalWorkingDays = safeAttendance.length || 1;
      const attendancePct = Math.round((presentDays / totalWorkingDays) * 100);

      // Check today's attendance
      const todayAttendance = safeAttendance.find(a => new Date(a.createdAt).toDateString() === todayStr);
      setCheckedIn(!!todayAttendance);

      setMetrics({
        pendingTasks: tasks.filter(t => t.status === 'Pending').length,
        inProgressTasks: tasks.filter(t => t.status === 'In Progress').length,
        completedTasks: tasks.filter(t => t.status === 'Completed').length,
        visitsToday,
        followUpsToday,
        totalClients: onboardingRes.data.data?.length || 0,
        attendancePct,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsub = navigation.addListener('focus', loadData);
    return unsub;
  }, [navigation]);

  // Socket connection for task_assigned events (notification toasts are handled by AppLayout)
  useEffect(() => {
    let sock = null;
    (async () => {
      sock = await connectSocket();
      // Note: 'notification' toasts+sound are handled centrally in AppLayout
      // We only need socket here for reloading data on key events
    })();
    return () => {};
  }, []);

  // Live location tracking
  useEffect(() => {
    let watcher = null;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      watcher = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 30000, distanceInterval: 10 },
        async (loc) => {
          try {
            await api.post('/locations', {
              latitude: loc.coords.latitude, longitude: loc.coords.longitude,
              speed: loc.coords.speed || 0, heading: loc.coords.heading || 0, accuracy: loc.coords.accuracy || 0,
            });
          } catch (e) {}
        }
      );
    })();
    return () => { if (watcher) watcher.remove(); };
  }, []);

  const greeting = () => {
    const h = today.getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <AppLayout currentScreen="Dashboard" role="Employee">
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#0284c7" />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>

          {/* Greeting */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 13, color: '#94a3b8', fontWeight: '600' }}>{greeting()},</Text>
            <Text style={{ fontSize: 26, fontWeight: '900', color: '#0f172a', letterSpacing: -0.5 }}>{user.name || 'Agent'}</Text>
            <Text style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
              {today.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </Text>
          </View>

          {/* Attendance & Location Status */}
          <View style={{ backgroundColor: checkedIn ? '#f0fdf4' : '#fff7ed', borderRadius: 18, borderWidth: 1, borderColor: checkedIn ? '#bbf7d0' : '#fed7aa', padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 }}>
            <View style={{ backgroundColor: checkedIn ? '#dcfce7' : '#ffedd5', borderRadius: 12, padding: 10 }}>
              <Ionicons name={checkedIn ? 'checkmark-circle' : 'time-outline'} size={22} color={checkedIn ? '#16a34a' : '#ea580c'} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: checkedIn ? '#15803d' : '#c2410c' }}>
                {checkedIn ? 'Checked In Today ✓' : 'Not Checked In Yet'}
              </Text>
              <Text style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                {checkedIn ? 'Attendance is active' : 'Please mark your attendance'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate('Attendance')}
              style={{ backgroundColor: checkedIn ? '#16a34a' : '#ea580c', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 }}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 11 }}>
                {checkedIn ? 'View' : 'Check In'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Stats Grid */}
          <Text style={{ fontSize: 11, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Today's Overview</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
            <StatCard icon="location" label="Visits Today" value={metrics.visitsToday} color="#0284c7" bg="#eff6ff" />
            <StatCard icon="alarm" label="Follow-ups Due" value={metrics.followUpsToday} color="#d97706" bg="#fffbeb" />
          </View>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
            {/* Task cards: dynamically reflect status */}
            {metrics.inProgressTasks > 0 ? (
              <StatCard
                icon="sync-circle"
                label="In Progress"
                value={metrics.inProgressTasks}
                color="#0284c7"
                bg="#eff6ff"
              />
            ) : (
              <StatCard
                icon="clipboard"
                label="Pending Tasks"
                value={metrics.pendingTasks}
                color="#e11d48"
                bg="#fff1f2"
              />
            )}
            <StatCard icon="checkmark-done" label="Completed" value={metrics.completedTasks} color="#16a34a" bg="#f0fdf4" />
          </View>
          {/* Show both pending and in-progress when both exist */}
          {metrics.inProgressTasks > 0 && metrics.pendingTasks > 0 && (
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
              <StatCard icon="clipboard" label="Pending Tasks" value={metrics.pendingTasks} color="#e11d48" bg="#fff1f2" />
              <View style={{ flex: 1 }} />
            </View>
          )}
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
            <StatCard icon="briefcase" label="Clients Added" value={metrics.totalClients} color="#7c3aed" bg="#faf5ff" />
            <StatCard icon="stats-chart" label="Attendance %" value={`${metrics.attendancePct}%`} color="#0891b2" bg="#ecfeff" />
          </View>



        </ScrollView>
      )}
    </AppLayout>
  );
}
