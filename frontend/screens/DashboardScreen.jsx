import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import api from '../api/api';
import { connectSocket } from '../utils/socket';
import { useSocketRefresh } from '../hooks/useSocketRefresh';
import * as Location from 'expo-location';
import AppLayout from '../components/AppLayout';

const today = new Date();

function StatCard({ icon, label, value, color, bg, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={{
      flex: 1, backgroundColor: bg || '#eff6ff', borderRadius: 14,
      padding: 10, gap: 2, borderWidth: 1, borderColor: color + '33',
    }}>
      <View style={{ backgroundColor: color + '22', borderRadius: 8, padding: 5, alignSelf: 'flex-start' }}>
        <Ionicons name={icon} size={14} color={color} />
      </View>
      <View>
        <Text style={{ fontSize: 20, fontWeight: '900', color: '#0f172a', marginTop: 3 }}>{value}</Text>
        <Text style={{ fontSize: 9, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.3 }}>{label}</Text>
      </View>
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

      const tasks       = tasksRes.data.data    || [];
      const meetings    = meetingsRes.data.data  || [];
      const followUps   = followUpsRes.data.data || [];
      const attendance  = attendanceRes.data.data || [];

      const todayStr    = today.toDateString();
      const visitsToday = meetings.filter(m => new Date(m.createdAt).toDateString() === todayStr).length;
      // Active follow-ups (including admin-assigned) regardless of just today
      const activeFollowUps = followUps.filter(f => !['Completed', 'Cancelled'].includes(f.status));
      const followUpsCount = activeFollowUps.length;

      let followUpStatuses = [];
      if (followUpsCount > 0) {
        const counts = {};
        activeFollowUps.forEach(f => counts[f.status] = (counts[f.status] || 0) + 1);
        followUpStatuses = Object.entries(counts).map(([status, count]) => `${count} ${status}`);
      }

      const safeAttendance  = Array.isArray(attendance) ? attendance : [];
      const presentDays     = safeAttendance.filter(a => a.checkInStatus === 'Approved').length;
      const totalWorkingDays = safeAttendance.length || 1;
      const attendancePct   = Math.round((presentDays / totalWorkingDays) * 100);

      const todayAttendance = safeAttendance.find(a => new Date(a.createdAt).toDateString() === todayStr);
      setCheckedIn(!!todayAttendance);

      setMetrics({
        pendingTasks:    tasks.filter(t => t.status === 'Pending').length,
        inProgressTasks: tasks.filter(t => t.status === 'In Progress').length,
        completedTasks:  tasks.filter(t => t.status === 'Completed').length,
        visitsToday,
        followUpsCount,
        followUpStatuses: followUpStatuses.length > 0 ? followUpStatuses.join(', ') : '0 Follow-ups',
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
    loadData(); // run on mount
    return unsub;
  }, [navigation]);

  // Real-time updates for dashboard
  useSocketRefresh(loadData, ['task_assigned', 'task_updated', 'followup_assigned', 'followup_updated', 'attendance_updated']);

  useEffect(() => {
    (async () => { await connectSocket(); })();
  }, []);

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
              latitude:  loc.coords.latitude,
              longitude: loc.coords.longitude,
              speed:     loc.coords.speed    || 0,
              heading:   loc.coords.heading  || 0,
              accuracy:  loc.coords.accuracy || 0,
            });
          } catch (_) {}
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
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>

          {/* ── Greeting row ── */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <View>
              <Text style={{ fontSize: 11, color: '#94a3b8', fontWeight: '600' }}>{greeting()},</Text>
              <Text style={{ fontSize: 20, fontWeight: '900', color: '#0f172a', letterSpacing: -0.3 }}>
                {user.name || 'Agent'}
              </Text>
              <View style={{ backgroundColor: '#e0f2fe', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, alignSelf: 'flex-start', marginTop: 3 }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: '#0284c7' }}>
                  {user.designation || 'Field Executive'}
                </Text>
              </View>
            </View>
            <Text style={{ fontSize: 10, color: '#94a3b8', textAlign: 'right' }}>
              {today.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
            </Text>
          </View>

          {/* ── Attendance strip ── */}
          <View style={{
            backgroundColor: checkedIn ? '#f0fdf4' : '#fff7ed',
            borderRadius: 14, borderWidth: 1,
            borderColor: checkedIn ? '#bbf7d0' : '#fed7aa',
            padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14,
          }}>
            <Ionicons
              name={checkedIn ? 'checkmark-circle' : 'time-outline'}
              size={20}
              color={checkedIn ? '#16a34a' : '#ea580c'}
            />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, fontWeight: '800', color: checkedIn ? '#15803d' : '#c2410c' }}>
                {checkedIn ? 'Checked In Today ✓' : 'Not Checked In Yet'}
              </Text>
              <Text style={{ fontSize: 10, color: '#94a3b8' }}>
                {checkedIn ? 'Attendance active' : 'Please mark attendance'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate('Attendance')}
              style={{ backgroundColor: checkedIn ? '#16a34a' : '#ea580c', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 }}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 11 }}>
                {checkedIn ? 'View' : 'Check In'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── Clients slim banner ── */}
          <TouchableOpacity onPress={() => navigation.navigate('ClientOnboarding')} style={{
            backgroundColor: '#0f172a', borderRadius: 16,
            paddingVertical: 12, paddingHorizontal: 16,
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14,
          }}>
            <View>
              <Text style={{ color: '#64748b', fontSize: 9, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 }}>
                Total Clients Onboarded
              </Text>
              <Text style={{ color: '#fff', fontSize: 28, fontWeight: '900', marginTop: 1 }}>
                {metrics.totalClients}
              </Text>
            </View>
            <View style={{ backgroundColor: '#1e293b', borderRadius: 12, padding: 10, borderWidth: 1, borderColor: '#334155' }}>
              <Ionicons name="briefcase" size={20} color="#38bdf8" />
            </View>
          </TouchableOpacity>

          {/* ── Stats 3×2 compact grid ── */}
          <Text style={{ fontSize: 10, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
            Today's Overview
          </Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
            <StatCard icon="location"    label="Visits Today"   value={metrics.visitsToday}         color="#0284c7" bg="#eff6ff" onPress={() => navigation.navigate('Meeting')} />
            <StatCard 
              icon="alarm" 
              label={metrics.followUpStatuses} 
              value={metrics.followUpsCount}      
              color="#d97706" bg="#fffbeb" 
              onPress={() => navigation.navigate('Followup')} 
            />
            <StatCard icon="stats-chart" label="Attendance"     value={`${metrics.attendancePct}%`} color="#0891b2" bg="#ecfeff" onPress={() => navigation.navigate('Attendance')} />
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
            <StatCard icon="clipboard"      label="Pending"     value={metrics.pendingTasks}    color="#e11d48" bg="#fff1f2" onPress={() => navigation.navigate('Task')} />
            <StatCard icon="sync-circle"    label="In Progress" value={metrics.inProgressTasks} color="#0284c7" bg="#eff6ff" onPress={() => navigation.navigate('Task')} />
            <StatCard icon="checkmark-done" label="Completed"   value={metrics.completedTasks}  color="#16a34a" bg="#f0fdf4" onPress={() => navigation.navigate('Task')} />
          </View>

        </ScrollView>
      )}
    </AppLayout>
  );
}
