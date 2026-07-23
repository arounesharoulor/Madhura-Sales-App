import { router } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/api';
import { useSocketRefresh } from '../hooks/useSocketRefresh';
import AppLayout from '../components/AppLayout';

const todayDateStr = new Date().toDateString();

function StatCard({ label, value, icon, color, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={{ width: '48%', backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 }}>
      <View style={{ backgroundColor: color + '22', borderRadius: 10, padding: 8, alignSelf: 'flex-start', marginBottom: 6 }}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={{ fontSize: 28, fontWeight: '900', color: '#0f172a' }}>{value}</Text>
      <Text style={{ fontSize: 10, fontWeight: '900', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4 }}>{label}</Text>
    </TouchableOpacity>
  );
}


export default function AdminDashboardPremium() {
  const [adminName, setAdminName] = useState('Admin');
  const [userRole, setUserRole] = useState('Admin');
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    totalEmployees: 0, checkedIn: 0, checkedOut: 0,
    clientVisitsToday: 0, totalClients: 0,
    pendingFollowUps: 0, openTasks: 0,
    pendingList: [], clientLeaderboard: []
  });

  const fetchData = async (role) => {
    try {
      setLoading(true);
      const isHR = role === 'HR';

      const [meetingRes, onboardingRes, attendanceRes, taskRes, followUpRes, userRes] = await Promise.all([
        api.get('/meetings').catch(() => ({ data: { data: [] } })),
        api.get('/onboarding').catch(() => ({ data: { data: [] } })),
        api.get('/attendance').catch(() => ({ data: { data: [] } })),
        isHR ? Promise.resolve({ data: { data: [] } }) : api.get('/tasks').catch(() => ({ data: { data: [] } })),
        isHR ? Promise.resolve({ data: { data: [] } }) : api.get('/followups').catch(() => ({ data: { data: [] } })),
        isHR ? Promise.resolve({ data: { data: [], count: 0 } }) : api.get('/users').catch(() => ({ data: { data: [], count: 0 } })),
      ]);

      const meetings = meetingRes.data.data || [];
      const onboardings = onboardingRes.data.data || [];
      const attendance = attendanceRes.data.data || [];
      const tasks = taskRes.data.data || [];
      const followUps = followUpRes.data.data || [];
      const users = (userRes.data.data || []).filter(u => u.role === 'Field Executive');

      const visitsToday = meetings.filter(m => new Date(m.createdAt).toDateString() === todayDateStr).length;
      const attendanceToday = attendance.filter(a => new Date(a.date).toDateString() === todayDateStr);
      const checkedIn = attendanceToday.filter(a => a.checkInStatus === 'Approved' && a.status !== 'Checked Out').length;
      const checkedOut = attendanceToday.filter(a => a.status === 'Checked Out').length;
      const pendingList = attendance.filter(a => ['Pending Check-In', 'Pending Check-Out', 'Pending Leave'].includes(a.status)).slice(0, 5);
      const pendingFollowUps = followUps.filter(f => f.status !== 'Completed' && f.status !== 'Cancelled').length;
      const openTasks = tasks.filter(t => t.status === 'Pending' || t.status === 'In Progress').length;
      const totalEmployees = users.length;

      // Client Leaderboard
      const lbMap = {};
      onboardings.forEach(o => {
        if (!o.executive) return;
        const eId = o.executive._id?.toString() || o.executive.toString();
        if (!lbMap[eId]) lbMap[eId] = { id: eId, name: o.executive.name || 'Unknown', count: 0 };
        lbMap[eId].count++;
      });

      setMetrics({
        totalEmployees, checkedIn, checkedOut,
        clientVisitsToday: visitsToday, totalClients: onboardings.length,
        pendingFollowUps, openTasks, pendingList,
        clientLeaderboard: Object.values(lbMap).sort((a, b) => b.count - a.count),
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    AsyncStorage.getItem('user').then(s => {
      if (s) {
        const u = JSON.parse(s);
        setAdminName(u.name || 'Admin');
        setUserRole(u.role || 'Admin');
        fetchData(u.role || 'Admin');
      } else {
        fetchData('Admin');
      }
    });
  }, []);

  useEffect(() => {
    
      AsyncStorage.getItem('user').then(s => {
        const role = s ? JSON.parse(s).role : 'Admin';
        fetchData(role);
      
    });
    
  }, []);

  useSocketRefresh(() => fetchData(userRole), ['attendance_updated', 'task_assigned', 'followup_assigned']);

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const isHR = userRole === 'HR';
  const isMD = userRole === 'Managing Director MD';
  const isAdmin = !isHR; // PM, TL, Admin, MD all get admin-level cards

  // Role label shown in header
  const roleLabel = isMD ? 'Super Admin · MD' : isHR ? 'HR Manager' : userRole;


  return (
    <AppLayout currentScreen="AdminDashboard" role={userRole}>
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#0284c7" />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>

          {/* ── Greeting ── */}
          <View style={{ marginBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={{ fontSize: 11, color: '#94a3b8', fontWeight: '600' }}>{getGreeting()},</Text>
              <Text style={{ fontSize: 22, fontWeight: '900', color: '#0f172a', letterSpacing: -0.3 }}>{adminName}</Text>
              <Text style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>{roleLabel}</Text>
            </View>
            <TouchableOpacity onPress={() => fetchData(userRole)} style={{ backgroundColor: '#eff6ff', borderRadius: 12, padding: 10 }}>
              <Ionicons name="refresh" size={18} color="#0284c7" />
            </TouchableOpacity>
          </View>

          {/* ── KPI Stats (HR only sees attendance stats; others see all) ── */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between', marginBottom: 20 }}>
            {(isHR || isMD) && (
              <StatCard label="Checked In Today" value={metrics.checkedIn} icon="log-in" color="#10b981" onPress={() => router.push('/AdminAttendance')} />
            )}
            {(isHR || isMD) && (
              <StatCard label="Checked Out Today" value={metrics.checkedOut} icon="log-out" color="#6366f1" onPress={() => router.push('/AdminAttendance')} />
            )}
            {!isHR && (
              <StatCard label="Total Staff" value={metrics.totalEmployees} icon="people" color="#6366f1" onPress={() => router.push('/UserManagement')} />
            )}
            {!isHR && (
              <StatCard label="Open Tasks" value={metrics.openTasks} icon="clipboard" color="#f43f5e" onPress={() => router.push('/TaskAssignment')} />
            )}
            <StatCard label="Total Clients" value={metrics.totalClients} icon="briefcase" color="#7c3aed" onPress={() => router.push('/ClientOnboarding')} />
            <StatCard label="Visits Today" value={metrics.clientVisitsToday} icon="location" color="#0ea5e9" onPress={() => router.push('/Meeting')} />
          </View>

          {/* ── HR Pending Approvals ── */}
          {(isHR || isMD) && (
            <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 20, borderWidth: 1, borderColor: '#e2e8f0', elevation: 2 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="time" size={16} color="#f59e0b" />
                  <Text style={{ fontSize: 13, fontWeight: '900', color: '#0f172a' }}>Pending Approvals</Text>
                  {metrics.pendingList.length > 0 && (
                    <View style={{ backgroundColor: '#fef3c7', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                      <Text style={{ color: '#d97706', fontSize: 10, fontWeight: '900' }}>{metrics.pendingList.length}</Text>
                    </View>
                  )}
                </View>
                <TouchableOpacity onPress={() => router.push('/AdminAttendance')}>
                  <Text style={{ fontSize: 11, fontWeight: '900', color: '#0284c7' }}>View All</Text>
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
                          <Text style={{ color: '#64748b', fontWeight: '900', fontSize: 12 }}>{(a.executive?.name || 'E')[0].toUpperCase()}</Text>
                        </View>
                        <View>
                          <Text style={{ fontSize: 12, fontWeight: '900', color: '#1e293b' }}>{a.executive?.name || 'Employee'}</Text>
                          <Text style={{ fontSize: 10, color: '#94a3b8' }}>{a.status}</Text>
                        </View>
                      </View>
                      <TouchableOpacity onPress={() => router.push('/AdminAttendance')} style={{ backgroundColor: '#f1f5f9', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}>
                        <Text style={{ color: '#475569', fontSize: 10, fontWeight: '900' }}>Review</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}


          {/* ── Leaderboard (non-HR only) ── */}
          {!isHR && metrics.clientLeaderboard?.length > 0 && (
            <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#e2e8f0', elevation: 2 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                <Ionicons name="trophy" size={16} color="#16a34a" />
                <Text style={{ fontSize: 13, fontWeight: '900', color: '#0f172a' }}>Top Performers</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                {metrics.clientLeaderboard.slice(0, 5).map((emp, index) => (
                  <View key={emp.id} style={{ backgroundColor: index === 0 ? '#f0fdf4' : '#f8fafc', borderRadius: 12, padding: 12, minWidth: 130, borderWidth: 1, borderColor: index === 0 ? '#bbf7d0' : '#e2e8f0' }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: index === 0 ? '#16a34a' : '#cbd5e1', alignItems: 'center', justifyContent: 'center' }}>
                        {index === 0 ? <Ionicons name="star" size={12} color="#fff" /> : <Text style={{ color: '#fff', fontSize: 10, fontWeight: '900' }}>{index + 1}</Text>}
                      </View>
                      <Text style={{ fontSize: 16, fontWeight: '900', color: index === 0 ? '#16a34a' : '#64748b' }}>{emp.count}</Text>
                    </View>
                    <Text style={{ fontSize: 12, fontWeight: '900', color: '#1e293b' }} numberOfLines={1}>{emp.name}</Text>
                    <Text style={{ fontSize: 9, color: '#94a3b8', textTransform: 'uppercase' }}>Clients</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

        </ScrollView>
      )}
    </AppLayout>
  );
}


