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
          
          <View style={{ marginBottom: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={{ fontSize: 13, color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>{getGreeting()},</Text>
              <Text style={{ fontSize: 26, fontWeight: '900', color: '#0f172a', letterSpacing: -0.5 }}>{adminName}</Text>
              <Text style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>System Overview Dashboard</Text>
            </View>
            <TouchableOpacity onPress={fetchData} style={{ backgroundColor: '#eff6ff', borderRadius: 12, padding: 10 }}>
              <Ionicons name="refresh" size={20} color="#0284c7" />
            </TouchableOpacity>
          </View>

          {/* New Professional Clients Banner */}
          <View style={{ backgroundColor: '#0f172a', borderRadius: 24, padding: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, shadowColor: '#000', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.15, shadowRadius: 12, elevation: 5 }}>
            <View>
              <Text style={{ color: '#94a3b8', fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.2 }}>Total Clients Onboarded</Text>
              <Text style={{ color: '#fff', fontSize: 36, fontWeight: '900', marginTop: 4 }}>{metrics.totalClients}</Text>
            </View>
            <View style={{ backgroundColor: '#1e293b', borderRadius: 18, padding: 14, borderWidth: 1, borderColor: '#334155' }}>
              <Ionicons name="briefcase" size={28} color="#38bdf8" />
            </View>
          </View>

          <Text style={{ fontSize: 12, fontWeight: '800', color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Employee Tracking (Today)</Text>
          <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap', justifyContent: 'space-between' }}>
            <StatCard label="Total Field Staff" value={metrics.totalEmployees} icon="people" color="#6366f1" bg="#eef2ff" />
            <StatCard label="Checked In" value={metrics.checkedIn} icon="log-in" color="#10b981" bg="#d1fae5" />
            <StatCard label="Checked Out" value={metrics.checkedOut} icon="log-out" color="#f59e0b" bg="#fef3c7" />
            <StatCard label="Attendance %" value={`${metrics.attendancePct}%`} icon="pie-chart" color="#8b5cf6" bg="#f3e8ff" />
          </View>

          <Text style={{ fontSize: 12, fontWeight: '800', color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 10, marginBottom: 10 }}>Sales & Operations (Today)</Text>
          <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap', justifyContent: 'space-between' }}>
            <StatCard label="Client Visits" value={metrics.clientVisitsToday} icon="location" color="#0ea5e9" bg="#e0f2fe" />
            <StatCard label="Pending Tasks" value={metrics.openTasks} icon="clipboard" color="#f43f5e" bg="#ffe4e6" />
            {/* Follow-ups card is tappable → goes to admin follow-up management */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => navigation.navigate('AdminFollowupManagement')}
              style={{ flex: 1, backgroundColor: '#ffedd5', borderRadius: 18, padding: 14, minWidth: '45%', marginBottom: 12, borderWidth: 1, borderColor: '#f97316' + '44' }}
            >
              <View style={{ backgroundColor: '#f97316' + '22', borderRadius: 10, padding: 8, alignSelf: 'flex-start', marginBottom: 6 }}>
                <Ionicons name="alarm" size={18} color="#f97316" />
              </View>
              <Text style={{ fontSize: 28, fontWeight: '900', color: '#0f172a' }}>{metrics.pendingFollowUps}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>Open Follow-ups</Text>
                <Ionicons name="chevron-forward" size={11} color="#f97316" />
              </View>
            </TouchableOpacity>
          </View>

          <View style={{ backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0', padding: 20, marginTop: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 15, fontWeight: '800', color: '#0f172a' }}>Pending Approvals</Text>
              <TouchableOpacity onPress={() => navigation.navigate('AdminAttendance')}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#0284c7' }}>View All</Text>
              </TouchableOpacity>
            </View>
            
            {metrics.pendingList.length === 0 ? (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <Ionicons name="checkmark-done-circle" size={40} color="#10b981" />
                <Text style={{ marginTop: 10, fontSize: 13, color: '#64748b', fontWeight: '600' }}>All caught up! No pending approvals.</Text>
              </View>
            ) : (
              <View style={{ gap: 12 }}>
                {metrics.pendingList.map(a => (
                  <View key={a._id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, backgroundColor: '#f8fafc', borderRadius: 12, borderWidth: 1, borderColor: '#f1f5f9' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <View style={{ backgroundColor: '#eef2ff', padding: 8, borderRadius: 10 }}>
                        <Ionicons name="time" size={16} color="#6366f1" />
                      </View>
                      <View>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#1e293b' }}>{a.executive?.name || 'Employee'}</Text>
                        <Text style={{ fontSize: 11, color: '#64748b' }}>{a.status}</Text>
                      </View>
                    </View>
                    <TouchableOpacity onPress={() => navigation.navigate('AdminAttendance')} style={{ backgroundColor: '#0284c7', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}>
                      <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>Review</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Client Onboarding Leaderboard */}
          <View style={{ backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0', padding: 20, marginTop: 20 }}>
            <Text style={{ fontSize: 15, fontWeight: '800', color: '#0f172a', marginBottom: 16 }}>Client Onboarding Leaderboard</Text>
            {!metrics.clientLeaderboard || metrics.clientLeaderboard.length === 0 ? (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <Ionicons name="briefcase-outline" size={40} color="#cbd5e1" />
                <Text style={{ marginTop: 10, fontSize: 13, color: '#64748b', fontWeight: '600' }}>No clients onboarded yet.</Text>
              </View>
            ) : (
              <View style={{ gap: 12 }}>
                {metrics.clientLeaderboard.map((emp, index) => (
                  <View key={emp.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, backgroundColor: '#f8fafc', borderRadius: 12, borderWidth: 1, borderColor: '#f1f5f9' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#e0f2fe', alignItems: 'center', justifyContent: 'center' }}>
                         <Text style={{ color: '#0284c7', fontWeight: '800', fontSize: 14 }}>{index + 1}</Text>
                      </View>
                      <View>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#1e293b' }}>{emp.name}</Text>
                        <Text style={{ fontSize: 11, color: '#64748b' }}>{emp.designation}</Text>
                      </View>
                    </View>
                    <View style={{ backgroundColor: '#dcfce7', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}>
                      <Text style={{ color: '#16a34a', fontSize: 12, fontWeight: '800' }}>{emp.count} Clients</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </AppLayout>
  );
}
