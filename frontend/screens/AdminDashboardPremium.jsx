import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { connectSocket, getSocket } from '../utils/socket';
import api from '../api/api';
import AppLayout from '../components/AppLayout';
import Toast from 'react-native-toast-message';

const todayDateStr = new Date().toDateString();

function StatCard({ label, value, icon, color, bg, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={{ width: '48%', backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 }}>
      <View style={{ backgroundColor: color + '22', borderRadius: 10, padding: 8, alignSelf: 'flex-start', marginBottom: 6 }}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={{ fontSize: 28, fontWeight: '900', color: '#0f172a' }}>{value}</Text>
      <Text style={{ fontSize: 10, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4 }}>{label}</Text>
    </TouchableOpacity>
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
      const pendingFollowUps = followUps.filter(f => f.status !== 'Completed' && f.status !== 'Cancelled').length;
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
  }, []);

  useEffect(() => {
    const unsub = navigation.addListener('focus', fetchData);
    fetchData(); // initial fetch
    return unsub;
  }, [navigation]);

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

          {/* ── Top KPI Grid ── */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between', marginBottom: 16 }}>
            <StatCard label="Checked In"    value={metrics.checkedIn}      icon="log-in"   color="#10b981" bg="#dcfce7" onPress={() => navigation.navigate('AdminAttendance')} />
            <StatCard label="Total Staff"   value={metrics.totalEmployees} icon="people"   color="#6366f1" bg="#e0e7ff" onPress={() => navigation.navigate('UserManagement')} />
            <StatCard label="Client Visits" value={metrics.clientVisitsToday} icon="location" color="#0ea5e9" bg="#e0f2fe" onPress={() => navigation.navigate('Reports')} />
            <StatCard label="Open Tasks"    value={metrics.openTasks}      icon="clipboard" color="#f43f5e" bg="#ffe4e6" onPress={() => navigation.navigate('TaskAssignment')} />
          </View>

          {/* ── Pending Approvals (Compact) ── */}
          <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="time" size={16} color="#f59e0b" />
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#0f172a' }}>Pending Approvals</Text>
                {metrics.pendingList.length > 0 && (
                  <View style={{ backgroundColor: '#fef3c7', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                    <Text style={{ color: '#d97706', fontSize: 10, fontWeight: '800' }}>{metrics.pendingList.length}</Text>
                  </View>
                )}
              </View>
              <TouchableOpacity onPress={() => navigation.navigate('AdminAttendance')}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#0284c7' }}>View All</Text>
              </TouchableOpacity>
            </View>

            {metrics.pendingList.length === 0 ? (
              <Text style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', marginVertical: 8 }}>All caught up! No pending requests.</Text>
            ) : (
              <View style={{ gap: 8 }}>
                {metrics.pendingList.slice(0, 3).map(a => (
                  <View key={a._id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ color: '#64748b', fontWeight: '800', fontSize: 12 }}>{(a.executive?.name || 'E')[0].toUpperCase()}</Text>
                      </View>
                      <View>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#1e293b' }}>{a.executive?.name || 'Employee'}</Text>
                        <Text style={{ fontSize: 10, color: '#94a3b8' }}>{a.status}</Text>
                      </View>
                    </View>
                    <TouchableOpacity onPress={() => navigation.navigate('AdminAttendance')} style={{ backgroundColor: '#f1f5f9', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}>
                      <Text style={{ color: '#475569', fontSize: 10, fontWeight: '700' }}>Review</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* ── Active Follow-Ups & Total Clients ── */}
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => navigation.navigate('AdminFollowupManagement')}
              style={{ flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 }}
            >
              <View style={{ backgroundColor: '#fff7ed', borderRadius: 10, padding: 8, alignSelf: 'flex-start', marginBottom: 8 }}>
                <Ionicons name="alarm" size={16} color="#f97316" />
              </View>
              <Text style={{ fontSize: 24, fontWeight: '900', color: '#0f172a', marginBottom: 2 }}>{metrics.pendingFollowUps}</Text>
              <Text style={{ fontSize: 10, fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Open Follow-ups</Text>
            </TouchableOpacity>

            <View style={{ flex: 1, backgroundColor: '#0f172a', borderRadius: 16, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}>
              <View style={{ backgroundColor: '#1e293b', borderRadius: 10, padding: 8, alignSelf: 'flex-start', marginBottom: 8 }}>
                <Ionicons name="briefcase" size={16} color="#38bdf8" />
              </View>
              <Text style={{ fontSize: 24, fontWeight: '900', color: '#fff', marginBottom: 2 }}>{metrics.totalClients}</Text>
              <Text style={{ fontSize: 10, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>Total Clients</Text>
            </View>
          </View>

          {/* ── Client Onboarding Leaderboard ── */}
          <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
              <Ionicons name="trophy" size={16} color="#16a34a" />
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#0f172a' }}>Top Performers</Text>
            </View>

            {!metrics.clientLeaderboard || metrics.clientLeaderboard.length === 0 ? (
              <Text style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', marginVertical: 8 }}>No clients onboarded yet.</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                {metrics.clientLeaderboard.slice(0, 5).map((emp, index) => (
                  <View key={emp.id} style={{ backgroundColor: index === 0 ? '#f0fdf4' : '#f8fafc', borderRadius: 12, padding: 12, minWidth: 130, borderWidth: 1, borderColor: index === 0 ? '#bbf7d0' : '#e2e8f0' }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: index === 0 ? '#16a34a' : '#cbd5e1', alignItems: 'center', justifyContent: 'center' }}>
                        {index === 0 ? <Ionicons name="star" size={12} color="#fff" /> : <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>{index + 1}</Text>}
                      </View>
                      <Text style={{ fontSize: 16, fontWeight: '900', color: index === 0 ? '#16a34a' : '#64748b' }}>{emp.count}</Text>
                    </View>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#1e293b' }} numberOfLines={1}>{emp.name}</Text>
                    <Text style={{ fontSize: 9, color: '#94a3b8', textTransform: 'uppercase' }} numberOfLines={1}>Clients</Text>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>


        </ScrollView>
      )}
    </AppLayout>
  );
}
