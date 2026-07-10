import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Image, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppLayout from '../components/AppLayout';
import api from '../api/api';

const { width } = Dimensions.get('window');

const NAVY = '#1B2B4B';
const GOLD = '#F5A623';

export default function EmployeeMonitoringScreen() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [activeTab, setActiveTab] = useState('Overview'); // Overview, Timeline, Map, Performance, Tasks, Route, Report

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      // Dummy data for now, you should replace this with a real API call
      // const res = await api.get('/users?role=Employee');
      // setEmployees(res.data.data || []);
      const dummyEmployees = [
        { _id: '1', name: 'Arun', role: 'BDE', status: 'Online', battery: '72%', internet: '4G', lastUpdated: '10 seconds ago', currentTask: 'Visit ABC Pvt Ltd', location: 'Anna Nagar', attendance: 95, tasksCompleted: 30, totalTasks: 32 },
        { _id: '2', name: 'Rahul', role: 'Sales Executive', status: 'Offline', battery: '15%', internet: '3G', lastUpdated: '2 hours ago', currentTask: 'Meeting with XYZ', location: 'T Nagar', attendance: 80, tasksCompleted: 15, totalTasks: 20 },
      ];
      setEmployees(dummyEmployees);
    } catch (error) {
      console.log('Error fetching employees', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredEmployees = employees.filter(emp => emp.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const presentCount = employees.filter(e => e.attendance > 0).length; // simple logic
  const absentCount = employees.length - presentCount;
  const onlineCount = employees.filter(e => e.status === 'Online').length;
  const offlineCount = employees.length - onlineCount;

  const renderDashboard = () => (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Employee Monitoring</Text>
      
      {/* Stats Cards */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{presentCount}</Text>
          <Text style={styles.statLabel}>Present</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{absentCount}</Text>
          <Text style={styles.statLabel}>Absent</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{onlineCount}</Text>
          <Text style={styles.statLabel}>Online</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{offlineCount}</Text>
          <Text style={styles.statLabel}>Offline</Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#64748b" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search Employee..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#94a3b8"
        />
      </View>

      {/* List */}
      {loading ? (
        <ActivityIndicator size="large" color={GOLD} style={{ marginTop: 20 }} />
      ) : (
        <ScrollView style={styles.listContainer}>
          {filteredEmployees.map(emp => (
            <View key={emp._id} style={styles.employeeCard}>
              <View style={styles.empHeader}>
                <View style={styles.empInfo}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{emp.name.charAt(0)}</Text>
                  </View>
                  <View>
                    <Text style={styles.empName}>{emp.name}</Text>
                    <Text style={styles.empRole}>{emp.role}</Text>
                  </View>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: emp.status === 'Online' ? '#dcfce7' : '#fee2e2' }]}>
                  <View style={[styles.statusDot, { backgroundColor: emp.status === 'Online' ? '#22c55e' : '#ef4444' }]} />
                  <Text style={[styles.statusText, { color: emp.status === 'Online' ? '#166534' : '#991b1b' }]}>{emp.status}</Text>
                </View>
              </View>

              <View style={styles.empDetailsGrid}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Current Task</Text>
                  <Text style={styles.detailValue}>{emp.currentTask}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Location</Text>
                  <Text style={styles.detailValue}>{emp.location}</Text>
                </View>
              </View>

              <View style={styles.empFooter}>
                <View style={styles.footerInfo}>
                  <Ionicons name="battery-half" size={14} color="#64748b" />
                  <Text style={styles.footerText}>{emp.battery}</Text>
                  <Ionicons name="wifi" size={14} color="#64748b" style={{ marginLeft: 10 }} />
                  <Text style={styles.footerText}>{emp.internet}</Text>
                  <Ionicons name="time-outline" size={14} color="#64748b" style={{ marginLeft: 10 }} />
                  <Text style={styles.footerText}>{emp.lastUpdated}</Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedEmployee(emp)} style={styles.viewBtn}>
                  <Text style={styles.viewBtnText}>View Details</Text>
                  <Ionicons name="chevron-forward" size={16} color={GOLD} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );

  const renderDetails = () => (
    <View style={styles.detailsContainer}>
      <TouchableOpacity onPress={() => setSelectedEmployee(null)} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={20} color="#475569" />
        <Text style={styles.backBtnText}>Back to List</Text>
      </TouchableOpacity>

      <View style={styles.profileHeader}>
        <View style={styles.avatarLarge}>
          <Text style={styles.avatarTextLarge}>{selectedEmployee.name.charAt(0)}</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{selectedEmployee.name}</Text>
          <Text style={styles.profileRole}>{selectedEmployee.role}</Text>
          <Text style={styles.profileId}>Emp ID: {selectedEmployee._id}</Text>
        </View>
      </View>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsContainer} contentContainerStyle={{ paddingHorizontal: 16 }}>
        {['Overview', 'Timeline', 'Map', 'Performance', 'Tasks', 'Route History', 'Daily Report'].map(tab => (
          <TouchableOpacity 
            key={tab} 
            onPress={() => setActiveTab(tab)} 
            style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Tab Content */}
      <ScrollView style={styles.tabContent}>
        {activeTab === 'Overview' && (
          <View style={styles.overviewCard}>
            <Text style={styles.sectionTitle}>Today's Snapshot</Text>
            <View style={styles.snapshotGrid}>
              <View style={styles.snapItem}><Text style={styles.snapLabel}>Attendance</Text><Text style={styles.snapVal}>{selectedEmployee.attendance}%</Text></View>
              <View style={styles.snapItem}><Text style={styles.snapLabel}>Tasks</Text><Text style={styles.snapVal}>{selectedEmployee.tasksCompleted}/{selectedEmployee.totalTasks}</Text></View>
              <View style={styles.snapItem}><Text style={styles.snapLabel}>Meetings</Text><Text style={styles.snapVal}>4</Text></View>
              <View style={styles.snapItem}><Text style={styles.snapLabel}>Visits</Text><Text style={styles.snapVal}>3</Text></View>
            </View>
          </View>
        )}

        {activeTab === 'Timeline' && (
          <View style={styles.timelineCard}>
            <Text style={styles.sectionTitle}>Activity Timeline</Text>
            {[
              { time: '09:00', event: 'Login' },
              { time: '09:02', event: 'Attendance Marked' },
              { time: '09:15', event: 'Started Travelling' },
              { time: '10:05', event: 'Client Visit' }
            ].map((t, i) => (
              <View key={i} style={styles.timelineItem}>
                <View style={styles.timelineDot} />
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineTime}>{t.time}</Text>
                  <Text style={styles.timelineEvent}>{t.event}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {activeTab === 'Performance' && (
          <View style={styles.performanceCard}>
             <Text style={styles.sectionTitle}>Performance Metrics</Text>
             <View style={styles.perfRow}>
                <Text style={styles.perfLabel}>Overall Score</Text>
                <View style={styles.progressBarBg}><View style={[styles.progressBarFill, { width: '92%' }]} /></View>
                <Text style={styles.perfVal}>92%</Text>
             </View>
             {/* Add more metrics */}
          </View>
        )}
        
        {/* Mock other tabs */}
        {activeTab === 'Map' && (
          <View style={styles.mapCard}>
            <View style={styles.mapPlaceholder}>
              <Ionicons name="map-outline" size={40} color={GOLD} />
              <Text style={{ marginTop: 10, color: '#64748b' }}>Live Tracking Active</Text>
            </View>
            <View style={styles.mapActions}>
              <TouchableOpacity style={styles.actionBtn}><Ionicons name="navigate-outline" size={16} color="#fff" /><Text style={styles.actionText}>Navigate</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, {backgroundColor: '#22c55e'}]}><Ionicons name="call-outline" size={16} color="#fff" /><Text style={styles.actionText}>Call Employee</Text></TouchableOpacity>
            </View>
          </View>
        )}

        {activeTab === 'Tasks' && (
          <View style={styles.tasksCard}>
            <Text style={styles.sectionTitle}>Task Monitoring</Text>
            {[
              { title: 'Visit ABC Pvt Ltd', assignedBy: 'Project Manager', deadline: 'Today, 2:00 PM', priority: 'High', progress: 80, status: 'In Progress' }
            ].map((t, i) => (
              <View key={i} style={styles.taskItem}>
                <View style={styles.taskHeader}>
                  <Text style={styles.taskTitle}>{t.title}</Text>
                  <Text style={[styles.taskStatus, { color: '#0284c7' }]}>{t.status}</Text>
                </View>
                <Text style={styles.taskSub}>Assigned By: {t.assignedBy}  •  Deadline: {t.deadline}</Text>
                <View style={styles.taskProgressRow}>
                  <View style={styles.progressBarBg}><View style={[styles.progressBarFill, { width: `${t.progress}%`, backgroundColor: '#3b82f6' }]} /></View>
                  <Text style={styles.taskProgressText}>{t.progress}%</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {activeTab === 'Route History' && (
          <View style={styles.routeCard}>
             <Text style={styles.sectionTitle}>Route Log - Today</Text>
             <View style={styles.routeStats}>
                <View style={styles.routeStat}><Text style={styles.routeStatVal}>12 km</Text><Text style={styles.routeStatLabel}>Distance</Text></View>
                <View style={styles.routeStat}><Text style={styles.routeStatVal}>45 min</Text><Text style={styles.routeStatLabel}>Travel Time</Text></View>
                <View style={styles.routeStat}><Text style={styles.routeStatVal}>3</Text><Text style={styles.routeStatLabel}>Stops</Text></View>
             </View>
             <TouchableOpacity style={styles.replayBtn}>
               <Ionicons name="play-circle-outline" size={20} color="#fff" />
               <Text style={styles.replayText}>Replay Route</Text>
             </TouchableOpacity>
          </View>
        )}

        {activeTab === 'Daily Report' && (
          <View style={styles.reportCard}>
            <Text style={styles.sectionTitle}>Daily Work Report</Text>
            <View style={styles.reportGrid}>
              <View style={styles.reportRow}><Text style={styles.reportLabel}>Working Hours</Text><Text style={styles.reportVal}>8h 15m</Text></View>
              <View style={styles.reportRow}><Text style={styles.reportLabel}>Client Visits</Text><Text style={styles.reportVal}>4</Text></View>
              <View style={styles.reportRow}><Text style={styles.reportLabel}>Follow-ups</Text><Text style={styles.reportVal}>12</Text></View>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );

  return (
    <AppLayout currentScreen="EmployeeMonitoring">
      {selectedEmployee ? renderDetails() : renderDashboard()}
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: NAVY, marginBottom: 20 },
  
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, gap: 10 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 15, alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 },
  statValue: { fontSize: 22, fontWeight: '800', color: NAVY },
  statLabel: { fontSize: 12, color: '#64748b', marginTop: 4, fontWeight: '600' },
  
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 15, height: 50, marginBottom: 20, borderWidth: 1, borderColor: '#e2e8f0' },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 15, color: '#334155' },
  
  listContainer: { flex: 1 },
  employeeCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 15, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, borderWidth: 1, borderColor: '#f1f5f9' },
  empHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  empInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: NAVY, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: GOLD, fontSize: 18, fontWeight: 'bold' },
  empName: { fontSize: 16, fontWeight: '700', color: NAVY },
  empRole: { fontSize: 12, color: '#64748b', marginTop: 2 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: '700' },
  
  empDetailsGrid: { flexDirection: 'row', backgroundColor: '#f8fafc', borderRadius: 12, padding: 12, marginBottom: 15 },
  detailItem: { flex: 1 },
  detailLabel: { fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700', marginBottom: 4 },
  detailValue: { fontSize: 13, color: '#334155', fontWeight: '600' },
  
  empFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 12 },
  footerInfo: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  footerText: { fontSize: 11, color: '#64748b' },
  viewBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fff8ec', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  viewBtnText: { fontSize: 12, fontWeight: '700', color: GOLD },

  // Details
  detailsContainer: { flex: 1 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20, backgroundColor: '#fff', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, elevation: 1 },
  backBtnText: { fontSize: 14, fontWeight: '600', color: '#475569' },
  
  profileHeader: { flexDirection: 'row', alignItems: 'center', gap: 20, marginBottom: 20, backgroundColor: '#fff', padding: 20, borderRadius: 16, elevation: 2 },
  avatarLarge: { width: 70, height: 70, borderRadius: 35, backgroundColor: NAVY, alignItems: 'center', justifyContent: 'center' },
  avatarTextLarge: { color: GOLD, fontSize: 28, fontWeight: 'bold' },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 22, fontWeight: '800', color: NAVY },
  profileRole: { fontSize: 14, color: '#64748b', marginTop: 2, fontWeight: '600' },
  profileId: { fontSize: 12, color: '#94a3b8', marginTop: 4 },

  tabsContainer: { flexGrow: 0, marginBottom: 15, marginHorizontal: -16 },
  tabBtn: { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: 'transparent', marginRight: 10 },
  tabBtnActive: { borderBottomColor: GOLD },
  tabText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  tabTextActive: { color: NAVY, fontWeight: '800' },

  tabContent: { flex: 1 },
  overviewCard: { backgroundColor: '#fff', padding: 20, borderRadius: 16, elevation: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: NAVY, marginBottom: 15 },
  snapshotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 15 },
  snapItem: { width: '47%', backgroundColor: '#f8fafc', padding: 15, borderRadius: 12 },
  snapLabel: { fontSize: 12, color: '#64748b', fontWeight: '600', marginBottom: 5 },
  snapVal: { fontSize: 18, fontWeight: '800', color: NAVY },

  timelineCard: { backgroundColor: '#fff', padding: 20, borderRadius: 16, elevation: 2 },
  timelineItem: { flexDirection: 'row', marginBottom: 20 },
  timelineDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: GOLD, marginTop: 4, marginRight: 15 },
  timelineContent: { flex: 1 },
  timelineTime: { fontSize: 12, color: '#94a3b8', fontWeight: '700' },
  timelineEvent: { fontSize: 14, color: '#334155', fontWeight: '600', marginTop: 2 },

  performanceCard: { backgroundColor: '#fff', padding: 20, borderRadius: 16, elevation: 2 },
  perfRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  perfLabel: { width: 100, fontSize: 13, color: '#64748b', fontWeight: '600' },
  progressBarBg: { flex: 1, height: 8, backgroundColor: '#f1f5f9', borderRadius: 4, marginHorizontal: 10 },
  progressBarFill: { height: 8, backgroundColor: '#22c55e', borderRadius: 4 },
  perfVal: { width: 40, fontSize: 13, fontWeight: '700', color: NAVY, textAlign: 'right' },

  mapCard: { backgroundColor: '#fff', padding: 20, borderRadius: 16, elevation: 2 },
  mapPlaceholder: { height: 200, backgroundColor: '#f8fafc', borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 15 },
  mapActions: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#3b82f6', paddingVertical: 12, borderRadius: 10 },
  actionText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  tasksCard: { backgroundColor: '#fff', padding: 20, borderRadius: 16, elevation: 2 },
  taskItem: { backgroundColor: '#f8fafc', padding: 15, borderRadius: 12, marginBottom: 15 },
  taskHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  taskTitle: { fontSize: 15, fontWeight: '700', color: NAVY },
  taskStatus: { fontSize: 12, fontWeight: '700' },
  taskSub: { fontSize: 12, color: '#64748b', marginBottom: 10 },
  taskProgressRow: { flexDirection: 'row', alignItems: 'center' },
  taskProgressText: { width: 40, fontSize: 12, fontWeight: '700', color: NAVY, textAlign: 'right' },

  routeCard: { backgroundColor: '#fff', padding: 20, borderRadius: 16, elevation: 2 },
  routeStats: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  routeStat: { flex: 1, alignItems: 'center', backgroundColor: '#f8fafc', paddingVertical: 15, borderRadius: 12, marginHorizontal: 5 },
  routeStatVal: { fontSize: 18, fontWeight: '800', color: NAVY },
  routeStatLabel: { fontSize: 11, color: '#64748b', marginTop: 4, fontWeight: '600' },
  replayBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: NAVY, paddingVertical: 12, borderRadius: 10 },
  replayText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  reportCard: { backgroundColor: '#fff', padding: 20, borderRadius: 16, elevation: 2 },
  reportGrid: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 15 },
  reportRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  reportLabel: { fontSize: 14, color: '#64748b', fontWeight: '600' },
  reportVal: { fontSize: 15, fontWeight: '800', color: NAVY },
});
