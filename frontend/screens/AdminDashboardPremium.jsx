import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { connectSocket, getSocket } from '../utils/socket';
import api from '../api/api';
import AppLayout from '../components/AppLayout';
import Toast from 'react-native-toast-message';

const todayDateStr = new Date().toDateString();

function StatCard({ label, value, icon, color, bg }) {
  return (
    <View style={{ flex: 1, backgroundColor: bg || '#fff', borderRadius: 18, padding: 14, minWidth: '45%', marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 6, elevation: 1 }}>
      <View style={{ backgroundColor: color + '22', borderRadius: 10, padding: 8, alignSelf: 'flex-start', marginBottom: 6 }}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={{ fontSize: 28, fontWeight: '900', color: '#0f172a' }}>{value}</Text>
      <Text style={{ fontSize: 10, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4 }}>{label}</Text>
    </View>
  );
}

export default function AdminDashboardPremium({ navigation }) {
  const [adminName, setAdminName] = useState('Admin');
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    totalEmployees: 0, checkedIn: 0, checkedOut: 0,
    clientVisitsToday: 0, newClientsToday: 0, totalClients: 0,
    pendingFollowUps: 0, openTasks: 0,
    attendancePct: 0, pendingList: []
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [userRes, taskRes, meetingRes, followUpRes, onboardingRes, attendanceRes] = await Promise.all([
        api.get('/users').catch(() => ({ data: { data: [] } })),
        api.get('/tasks').catch(() => ({ data: { data: [] } })),
        api.get('/meetings').catch(() => ({ data: { data: [] } })),
        api.get('/followups').catch(() => ({ data: { data: [] } })),
        api.get('/onboarding').catch(() => ({ data: { data: [] } })),
        api.get('/attendance').catch(() => ({ data: { data: [] } })), // admin get all
      ]);

      const users = (userRes.data.data || []).filter(u => u.role === 'Field Executive');
      const tasks = taskRes.data.data || [];
      const meetings = meetingRes.data.data || [];
      const followUps = followUpRes.data.data || [];
      const onboardings = onboardingRes.data.data || [];
      const attendance = attendanceRes.data.data || [];

      // Calculate today's metrics
      const visitsToday = meetings.filter(m => new Date(m.createdAt).toDateString() === todayDateStr).length;
      const newClientsToday = onboardings.filter(o => new Date(o.createdAt).toDateString() === todayDateStr).length;
      const pendingFollowUps = followUps.filter(f => f.status !== 'Completed' && f.status !== 'Converted' && f.status !== 'Not Interested').length;
      const openTasks = tasks.filter(t => t.status === 'Pending' || t.status === 'In Progress').length;
      
      const attendanceToday = attendance.filter(a => new Date(a.date).toDateString() === todayDateStr);
      const checkedIn = attendanceToday.filter(a => a.checkInStatus === 'Approved' && a.status !== 'Checked Out').length;
      const checkedOut = attendanceToday.filter(a => a.status === 'Checked Out').length;
      
      const totalEmployees = users.length;
      const attendancePct = totalEmployees ? Math.round(((checkedIn + checkedOut) / totalEmployees) * 100) : 0;
      const pendingList = attendance.filter(a => a.status === 'Pending Check-In' || a.status === 'Pending Check-Out' || a.status === 'Pending Leave').slice(0, 5);

      // Client Onboarding Leaderboard
      const lbMap = {};
      onboardings.forEach(o => {
        if (!o.executive) return;
        const eId = o.executive._id?.toString() || o.executive.toString();
        if (!lbMap[eId]) {
          lbMap[eId] = {
            id: eId,
            name: o.executive.name || 'Unknown',
            designation: o.executive.designation || 'Field Executive',
            count: 0
          };
        }
        lbMap[eId].count++;
      });
      const clientLeaderboard = Object.values(lbMap).sort((a, b) => b.count - a.count);

      setMetrics({
        totalEmployees, checkedIn, checkedOut,
        clientVisitsToday: visitsToday, newClientsToday, totalClients: onboardings.length,
        pendingFollowUps, openTasks, attendancePct,
        pendingList, clientLeaderboard
      });

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    AsyncStorage.getItem('user').then(s => { if (s) setAdminName(JSON.parse(s).name); });
    fetchData();

    let mounted = true;
    (async () => {
      const sock = await connectSocket();
      if (!mounted || !sock) return;
      sock.on('notification', (n) => Toast.show({ type: 'info', text1: n.title, text2: n.message, visibilityTime: 5000 }));
    })();
    return () => { mounted = false; const s = getSocket(); if (s) s.off('notification'); };
  }, []);

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <AppLayout currentScreen="AdminDashboard" role="Admin">
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#0284c7" />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>

          {/* ── Greeting ── */}
          <View style={{ marginBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={{ fontSize: 11, color: '#94a3b8', fontWeight: '600' }}>{getGreeting()},</Text>
              <Text style={{ fontSize: 20, fontWeight: '900', color: '#0f172a', letterSpacing: -0.3 }}>{adminName}</Text>
              <Text style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>System Overview Dashboard</Text>
            </View>
            <TouchableOpacity onPress={fetchData} style={{ backgroundColor: '#eff6ff', borderRadius: 12, padding: 10 }}>
              <Ionicons name="refresh" size={18} color="#0284c7" />
            </TouchableOpacity>
          </View>

          {/* ── 1. Pending Approvals ── */}
          <View style={{ backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: '#e2e8f0', padding: 16, marginBottom: 14 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ backgroundColor: '#eef2ff', padding: 6, borderRadius: 8 }}>
                  <Ionicons name="time" size={16} color="#6366f1" />
                </View>
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#0f172a' }}>Pending Approvals</Text>
                {metrics.pendingList.length > 0 && (
                  <View style={{ backgroundColor: '#f43f5e', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 }}>
                    <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>{metrics.pendingList.length}</Text>
                  </View>
                )}
              </View>
              <TouchableOpacity onPress={() => navigation.navigate('AdminAttendance')}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#0284c7' }}>View All</Text>
              </TouchableOpacity>
            </View>

            {metrics.pendingList.length === 0 ? (
              <View style={{ paddingVertical: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
                <Ionicons name="checkmark-done-circle" size={22} color="#10b981" />
                <Text style={{ fontSize: 12, color: '#64748b', fontWeight: '600' }}>All caught up! No pending approvals.</Text>
              </View>
            ) : (
              <View style={{ gap: 8 }}>
                {metrics.pendingList.map(a => (
                  <View key={a._id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 10, backgroundColor: '#f8fafc', borderRadius: 10, borderWidth: 1, borderColor: '#f1f5f9' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <View style={{ backgroundColor: '#eef2ff', padding: 6, borderRadius: 8 }}>
                        <Ionicons name="person" size={14} color="#6366f1" />
                      </View>
                      <View>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#1e293b' }}>{a.executive?.name || 'Employee'}</Text>
                        <Text style={{ fontSize: 10, color: '#64748b' }}>{a.status}</Text>
                      </View>
                    </View>
                    <TouchableOpacity onPress={() => navigation.navigate('AdminAttendance')} style={{ backgroundColor: '#6366f1', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 7 }}>
                      <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>Review</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* ── 2. Client Onboarding Leaderboard ── */}
          <View style={{ backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: '#e2e8f0', padding: 16, marginBottom: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <View style={{ backgroundColor: '#dcfce7', padding: 6, borderRadius: 8 }}>
                <Ionicons name="trophy" size={16} color="#16a34a" />
              </View>
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#0f172a' }}>Client Onboarding Leaderboard</Text>
            </View>

            {!metrics.clientLeaderboard || metrics.clientLeaderboard.length === 0 ? (
              <View style={{ paddingVertical: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
                <Ionicons name="briefcase-outline" size={22} color="#cbd5e1" />
                <Text style={{ fontSize: 12, color: '#64748b', fontWeight: '600' }}>No clients onboarded yet.</Text>
              </View>
            ) : (
              <View style={{ gap: 8 }}>
                {metrics.clientLeaderboard.map((emp, index) => (
                  <View key={emp.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 10, backgroundColor: index === 0 ? '#f0fdf4' : '#f8fafc', borderRadius: 10, borderWidth: 1, borderColor: index === 0 ? '#bbf7d0' : '#f1f5f9' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: index === 0 ? '#16a34a' : '#e0f2fe', alignItems: 'center', justifyContent: 'center' }}>
                        {index === 0
                          ? <Ionicons name="trophy" size={13} color="#fff" />
                          : <Text style={{ color: '#0284c7', fontWeight: '800', fontSize: 12 }}>{index + 1}</Text>
                        }
                      </View>
                      <View>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#1e293b' }}>{emp.name}</Text>
                        <Text style={{ fontSize: 10, color: '#64748b' }}>{emp.designation}</Text>
                      </View>
                    </View>
                    <View style={{ backgroundColor: index === 0 ? '#dcfce7' : '#e0f2fe', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 7 }}>
                      <Text style={{ color: index === 0 ? '#16a34a' : '#0284c7', fontSize: 11, fontWeight: '800' }}>{emp.count} Clients</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* ── 3. Clients Banner ── */}
          <View style={{ backgroundColor: '#0f172a', borderRadius: 16, paddingVertical: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <View>
              <Text style={{ color: '#64748b', fontSize: 9, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 }}>Total Clients Onboarded</Text>
              <Text style={{ color: '#fff', fontSize: 28, fontWeight: '900', marginTop: 1 }}>{metrics.totalClients}</Text>
            </View>
            <View style={{ backgroundColor: '#1e293b', borderRadius: 12, padding: 10, borderWidth: 1, borderColor: '#334155' }}>
              <Ionicons name="briefcase" size={20} color="#38bdf8" />
            </View>
          </View>

          {/* ── 4. Employee Tracking ── */}
          <Text style={{ fontSize: 11, fontWeight: '800', color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Employee Tracking (Today)</Text>
          <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 4 }}>
            <StatCard label="Total Field Staff" value={metrics.totalEmployees} icon="people"    color="#6366f1" bg="#eef2ff" />
            <StatCard label="Checked In"        value={metrics.checkedIn}      icon="log-in"   color="#10b981" bg="#d1fae5" />
            <StatCard label="Checked Out"       value={metrics.checkedOut}     icon="log-out"  color="#f59e0b" bg="#fef3c7" />
            <StatCard label="Attendance %"      value={`${metrics.attendancePct}%`} icon="pie-chart" color="#8b5cf6" bg="#f3e8ff" />
          </View>

          {/* ── 5. Sales & Operations ── */}
          <Text style={{ fontSize: 11, fontWeight: '800', color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 10, marginBottom: 10 }}>Sales & Operations (Today)</Text>
          <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap', justifyContent: 'space-between' }}>
            <StatCard label="Client Visits" value={metrics.clientVisitsToday} icon="location"  color="#0ea5e9" bg="#e0f2fe" />
            <StatCard label="Pending Tasks" value={metrics.openTasks}         icon="clipboard" color="#f43f5e" bg="#ffe4e6" />
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => navigation.navigate('AdminFollowupManagement')}
              style={{ flex: 1, backgroundColor: '#ffedd5', borderRadius: 18, padding: 14, minWidth: '45%', marginBottom: 12, borderWidth: 1, borderColor: '#f9731644' }}
            >
              <View style={{ backgroundColor: '#f9731622', borderRadius: 10, padding: 8, alignSelf: 'flex-start', marginBottom: 6 }}>
                <Ionicons name="alarm" size={18} color="#f97316" />
              </View>
              <Text style={{ fontSize: 28, fontWeight: '900', color: '#0f172a' }}>{metrics.pendingFollowUps}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>Open Follow-ups</Text>
                <Ionicons name="chevron-forward" size={11} color="#f97316" />
              </View>
            </TouchableOpacity>
          </View>

        </ScrollView>
      )}
    </AppLayout>
  );
}
