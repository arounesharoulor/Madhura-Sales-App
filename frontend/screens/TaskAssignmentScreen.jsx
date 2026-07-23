import React, { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  Alert,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import api from '../api/api';
import AppLayout from '../components/AppLayout';
import { EvidenceImage } from '../components/TaskCard';
import { useSocketRefresh } from '../hooks/useSocketRefresh';

// Cross-platform DatePicker — native modal on iOS/Android, HTML input on web
function CrossPlatformDatePicker({ value, onChange }) {
  const [showNative, setShowNative] = useState(false);

  if (Platform.OS === 'web') {
    // Use a native HTML date input on web — clicking calendar icon opens it
    return (
      <View style={styles.dateInputWrap}>
        <Ionicons name="calendar-outline" size={20} color="#0284c7" style={styles.dateIcon} />
        <input
          type="date"
          value={value || ''}
          min={new Date().toISOString().split('T')[0]}
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
    <View>
      <TouchableOpacity
        onPress={() => setShowNative(true)}
        style={styles.dateInputWrap}
      >
        <Ionicons name="calendar-outline" size={20} color="#0284c7" style={styles.dateIcon} />
        <Text style={[styles.dateNativeText, !value && { color: '#94a3b8' }]}>
          {value
            ? (() => {
                try {
                  const d = new Date(value + 'T00:00:00');
                  return isNaN(d.getTime()) ? 'Select Due Date' : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
                } catch { return 'Select Due Date'; }
              })()
            : 'Select Due Date'}
        </Text>
        <Ionicons name="chevron-down" size={16} color="#64748b" />
      </TouchableOpacity>
      {showNative && (
        <DateTimePicker
          value={value ? new Date(value + 'T00:00:00') : new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          minimumDate={new Date()}
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

export default function TaskAssignmentScreen({ isComponent = false }) {
  const [employees, setEmployees] = useState([]);
  const [availableEmployees, setAvailableEmployees] = useState([]);
  const [attendanceMap, setAttendanceMap] = useState({});
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskPriority, setTaskPriority] = useState('Medium');
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [activeTab, setActiveTab] = useState('assign'); // 'assign' | 'history'
  const [taskFilter, setTaskFilter] = useState('All');
  const [expandedTaskId, setExpandedTaskId] = useState(null);
  const [editingTaskId, setEditingTaskId] = useState(null);

  const fetchAvailableEmployees = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const [usersRes, attendanceRes] = await Promise.all([
        api.get('/users', { params: { role: 'Field Executive' } }),
        api.get('/attendance', { params: { date: today } }),
      ]);

      const fieldExecs = usersRes.data.data || [];
      const attendanceRecords = attendanceRes.data.data || [];
      const attendanceByExec = attendanceRecords.reduce((acc, rec) => {
        const execId = rec.executive?._id?.toString() || rec.executive?.toString();
        if (execId) acc[execId] = rec;
        return acc;
      }, {});

      const enrichedEmployees = fieldExecs.map((emp) => {
        const id = emp._id?.toString() || emp.id?.toString();
        const attendance = attendanceByExec[id];
        return {
          ...emp,
          todayAttendance: attendance || null,
          todayAttendanceStatus: attendance?.status || 'No Attendance',
        };
      });

      setEmployees(enrichedEmployees);
      setAttendanceMap(attendanceByExec);
      // Show all employees — admin can assign to anyone
      setAvailableEmployees(enrichedEmployees);

      if (selectedEmployee) {
        const selId = selectedEmployee._id?.toString() || selectedEmployee.id?.toString();
        if (attendanceByExec[selId]?.status !== 'Checked In') {
          setSelectedEmployee(null);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTasks = async () => {
    try {
      const res = await api.get('/tasks');
      setTasks(res.data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await api.get('/projects');
      setProjects(res.data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchClients = async () => {
    try {
      const res = await api.get('/onboarding');
      setClients(res.data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    Promise.all([fetchAvailableEmployees(), fetchTasks(), fetchProjects(), fetchClients()]).finally(() => setFetching(false));
  }, []);

  useSocketRefresh(() => {
    fetchAvailableEmployees();
    fetchTasks();
  }, ['task_assigned', 'task_updated', 'attendance_updated']);

  const handleAssign = async () => {
    if (!taskTitle.trim()) {
      Alert.alert('Required', 'Please enter a task title.'); return;
    }
    if (!taskDesc.trim()) {
      Alert.alert('Required', 'Please enter a task description.'); return;
    }
    if (!selectedEmployee) {
      Alert.alert('Required', 'Please select an employee to assign the task.'); return;
    }
    if (!dueDate) {
      Alert.alert('Required', 'Please select a due date for the task.'); return;
    }

    // Validate date format
    const isoDate = /^\d{4}-\d{2}-\d{2}$/;
    if (!isoDate.test(dueDate)) {
      Alert.alert('Invalid Date', 'Please enter date in YYYY-MM-DD format (e.g. 2026-07-15).');
      return;
    }

    setLoading(true);
    try {
      await api.post('/tasks', {
        title: taskTitle.trim(),
        description: taskDesc.trim(),
        assignedTo: selectedEmployee._id,
        project: selectedProject || undefined,
        client: selectedClient || undefined,
        dueDate,
        priority: taskPriority,
      });
      Toast.show({
        type: 'success',
        text1: '✅ Task Assigned',
        text2: `"${taskTitle}" assigned to ${selectedEmployee.name}`,
        visibilityTime: 4000,
      });
      setTaskTitle('');
      setTaskDesc('');
      setTaskPriority('Medium');
      setDueDate('');
      setSelectedProject('');
      setSelectedClient('');
      setSelectedEmployee(null);
      fetchTasks();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to assign task. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const startEditTask = (task) => {
    setTaskTitle(task.title || '');
    setTaskDesc(task.description || '');
    setDueDate(task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '');
    setTaskPriority(task.priority || 'Medium');
    setSelectedProject(task.project?._id || task.project || '');
    setSelectedClient(task.client?._id || task.client || '');
    const empId = task.assignedTo?._id?.toString() || task.assignedTo?.toString();
    const emp = employees.find(e => (e._id?.toString() || e.id?.toString()) === empId);
    setSelectedEmployee(emp || null);
    setEditingTaskId(task._id);
    setActiveTab('assign');
  };

  const cancelEdit = () => {
    setTaskTitle('');
    setTaskDesc('');
    setDueDate('');
    setTaskPriority('Medium');
    setSelectedProject('');
    setSelectedClient('');
    setSelectedEmployee(null);
    setEditingTaskId(null);
  };

  const handleUpdateTask = async () => {
    const title = taskTitle || '';
    const desc = taskDesc || '';
    if (!title.trim() || !desc.trim() || !selectedEmployee || !dueDate) {
      Alert.alert('Required', 'Please fill all required fields.'); return;
    }
    setLoading(true);
    try {
      await api.put(`/tasks/${editingTaskId}`, {
        title: title.trim(),
        description: desc.trim(),
        assignedTo: selectedEmployee._id,
        project: selectedProject || undefined,
        dueDate,
        priority: taskPriority,
      });
      Toast.show({ type: 'success', text1: '✅ Task Updated' });
      cancelEdit();
      fetchTasks();
    } catch (err) {
      Alert.alert('Error', 'Failed to update task.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusStyle = (status) => {
    if (status === 'Completed') return { bg: '#dcfce7', text: '#16a34a', dot: '#16a34a' };
    if (status === 'In Progress') return { bg: '#fef3c7', text: '#d97706', dot: '#d97706' };
    return { bg: '#fee2e2', text: '#dc2626', dot: '#dc2626' };
  };

  const filteredTasks = taskFilter === 'All' ? tasks : tasks.filter(t => t.status === taskFilter);

  if (fetching) {
    const loadingView = (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 }}>
        <ActivityIndicator size="large" color="#0284c7" />
        <Text style={{ color: '#64748b', marginTop: 16, fontSize: 14 }}>Loading task data...</Text>
      </View>
    );
    if (isComponent) return loadingView;
    return <AppLayout currentScreen="TaskAssignment" role="Admin">{loadingView}</AppLayout>;
  }

  const content = (
    <View style={styles.container}>

        {/* Page Header */}
        <View style={styles.pageHeader}>
          <View style={styles.pageHeaderLeft}>
            <View style={styles.pageIconWrap}>
              <Ionicons name="clipboard" size={24} color="#0284c7" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.pageTitle} numberOfLines={2}>Task Assignment</Text>
              <Text style={styles.pageSubtitle}>Assign tasks with deadlines to your field team</Text>
            </View>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statPill}>
              <Text style={styles.statPillNum}>{tasks.filter(t => t.status !== 'Completed').length}</Text>
              <Text style={styles.statPillLabel}>Active</Text>
            </View>
            <View style={[styles.statPill, { backgroundColor: '#dcfce7' }]}>
              <Text style={[styles.statPillNum, { color: '#16a34a' }]}>{tasks.filter(t => t.status === 'Completed').length}</Text>
              <Text style={[styles.statPillLabel, { color: '#15803d' }]}>Done</Text>
            </View>
          </View>
        </View>

        {/* Tab Toggle */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            onPress={() => setActiveTab('assign')}
            style={[styles.tabBtn, activeTab === 'assign' && styles.tabBtnActive]}
          >
            <Ionicons name="add-circle-outline" size={16} color={activeTab === 'assign' ? '#fff' : '#64748b'} />
            <Text style={[styles.tabBtnText, activeTab === 'assign' && styles.tabBtnTextActive]}>
              {editingTaskId ? 'Edit Task' : 'Assign New Task'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab('history')}
            style={[styles.tabBtn, activeTab === 'history' && styles.tabBtnActive]}
          >
            <Ionicons name="list-outline" size={16} color={activeTab === 'history' ? '#fff' : '#64748b'} />
            <Text style={[styles.tabBtnText, activeTab === 'history' && styles.tabBtnTextActive]}>
              Task History
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'assign' ? (
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Task Details Card */}
            <View style={styles.card}>
              <Text style={styles.cardLabel}>{editingTaskId ? 'EDIT TASK DETAILS' : 'TASK DETAILS'}</Text>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Task Title</Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="create-outline" size={18} color="#94a3b8" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={taskTitle}
                    onChangeText={setTaskTitle}
                    placeholder="e.g. Meet client in Chennai"
                    placeholderTextColor="#94a3b8"
                  />
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Select Project (Optional)</Text>
                <View style={[styles.inputWrap, { paddingHorizontal: 0, paddingVertical: 0 }]}>
                  {Platform.OS === 'web' ? (
                    <select
                      value={selectedProject}
                      onChange={(e) => setSelectedProject(e.target.value)}
                      style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', padding: '0 12px', fontSize: 14, color: selectedProject ? '#0f172a' : '#94a3b8' }}
                    >
                      <option value="">No Project Linked</option>
                      {projects.map(p => (
                        <option key={p._id} value={p._id}>{p.name} {p.client?.businessName ? `(${p.client.businessName})` : ''}</option>
                      ))}
                    </select>
                  ) : (
                    <Picker
                      selectedValue={selectedProject}
                      onValueChange={setSelectedProject}
                      style={{ flex: 1, height: 48, color: selectedProject ? '#0f172a' : '#94a3b8' }}
                    >
                      <Picker.Item label="No Project Linked" value="" color="#94a3b8" />
                      {projects.map(p => (
                        <Picker.Item key={p._id} label={`${p.name} ${p.client?.businessName ? `(${p.client.businessName})` : ''}`} value={p._id} />
                      ))}
                    </Picker>
                  )}
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Select Client (Optional)</Text>
                <View style={[styles.inputWrap, { paddingHorizontal: 0, paddingVertical: 0 }]}>
                  {Platform.OS === 'web' ? (
                    <select
                      value={selectedClient}
                      onChange={(e) => setSelectedClient(e.target.value)}
                      style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', padding: '0 12px', fontSize: 14, color: selectedClient ? '#0f172a' : '#94a3b8' }}
                    >
                      <option value="">No Client Linked</option>
                      {clients.map(c => (
                        <option key={c._id} value={c._id}>{c.businessName}</option>
                      ))}
                    </select>
                  ) : (
                    <Picker
                      selectedValue={selectedClient}
                      onValueChange={setSelectedClient}
                      style={{ flex: 1, height: 48, color: selectedClient ? '#0f172a' : '#94a3b8' }}
                    >
                      <Picker.Item label="No Client Linked" value="" color="#94a3b8" />
                      {clients.map(c => (
                        <Picker.Item key={c._id} label={c.businessName} value={c._id} />
                      ))}
                    </Picker>
                  )}
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Task Description</Text>
                <View style={[styles.inputWrap, styles.textAreaWrap]}>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={taskDesc}
                    onChangeText={setTaskDesc}
                    placeholder="Describe the task details, goals and instructions..."
                    placeholderTextColor="#94a3b8"
                    multiline
                    numberOfLines={4}
                  />
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Priority</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                  {[
                    { label: 'High',   val: 'High',   icon: 'arrow-up-circle',   color: '#ef4444', bg: '#fef2f2' },
                    { label: 'Medium', val: 'Medium', icon: 'remove-circle',     color: '#d97706', bg: '#fffbeb' },
                    { label: 'Low',    val: 'Low',    icon: 'arrow-down-circle', color: '#16a34a', bg: '#f0fdf4' },
                  ].map(p => (
                    <TouchableOpacity
                      key={p.val}
                      onPress={() => setTaskPriority(p.val)}
                      style={{
                        flex: 1, paddingVertical: 10, borderRadius: 12,
                        alignItems: 'center', justifyContent: 'center',
                        flexDirection: 'row', gap: 5,
                        borderWidth: 1.5,
                        backgroundColor: taskPriority === p.val ? p.color : '#f8fafc',
                        borderColor: taskPriority === p.val ? p.color : '#e2e8f0',
                      }}
                    >
                      <Ionicons
                        name={p.icon}
                        size={14}
                        color={taskPriority === p.val ? '#fff' : p.color}
                      />
                      <Text style={{ fontSize: 12, fontWeight: '900', color: taskPriority === p.val ? '#fff' : '#64748b' }}>
                        {p.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Due Date</Text>
                <CrossPlatformDatePicker value={dueDate} onChange={setDueDate} />
              </View>
            </View>

            {/* Employee Selection Card */}
            <View style={styles.card}>
              <Text style={styles.cardLabel}>SELECT EMPLOYEE</Text>
              <Text style={styles.cardSubLabel}>
                {employees.length} field executive{employees.length !== 1 ? 's' : ''} · {availableEmployees.filter(e => e.todayAttendanceStatus === 'Checked In').length} checked in today
              </Text>

              {availableEmployees.length === 0 ? (
                <View style={styles.emptyEmp}>
                  <Ionicons name="people-outline" size={40} color="#cbd5e1" />
                  <Text style={styles.emptyEmpText}>No field executives found.</Text>
                  <Text style={styles.emptyEmpSub}>Add employees from the HR / Admin panel.</Text>
                </View>
              ) : (
                availableEmployees.map((emp) => {
                  const isSelected = selectedEmployee?._id === emp._id;
                  const empTasks = tasks.filter(t => t.assignedTo?._id === emp._id || t.assignedTo === emp._id);
                  const activeTasks = empTasks.filter(t => t.status !== 'Completed').length;
                  const attendance = emp.todayAttendance;
                  const isCheckedIn = attendance?.status === 'Checked In';
                  const statusLabel = isCheckedIn ? 'Active' : 'Inactive';
                  return (
                    <TouchableOpacity
                      key={emp._id}
                      onPress={() => setSelectedEmployee(isSelected ? null : emp)}
                      style={[styles.empCard, isSelected && styles.empCardSelected]}
                      activeOpacity={0.75}
                    >
                      <View style={[styles.empAvatar, isSelected && styles.empAvatarSelected]}>
                        <Text style={[styles.empAvatarText, isSelected && { color: '#fff' }]}>
                          {emp.name?.charAt(0)?.toUpperCase() || '?'}
                        </Text>
                      </View>
                      <View style={styles.empInfo}>
                        <Text style={[styles.empName, isSelected && styles.empNameSelected]}>{emp.name}</Text>
                        <Text style={styles.empEmail}>{emp.email}</Text>
                        {emp.employeeId ? <Text style={styles.empPhone}>ID: {emp.employeeId}</Text> : null}
                        {emp.designation ? <Text style={styles.empPhone}>{emp.designation}</Text> : null}
                        <View style={[styles.statusBadge, isCheckedIn ? styles.statusBadgeActive : styles.statusBadgeInactive]}>
                          <Text style={[styles.statusText, isCheckedIn ? styles.statusTextActive : styles.statusTextInactive]}>{statusLabel}</Text>
                        </View>
                      </View>
                      <View style={styles.empRight}>
                        <View style={styles.empTaskBadge}>
                          <Text style={styles.empTaskBadgeText}>{activeTasks} active</Text>
                        </View>
                        {isSelected && (
                          <View style={styles.empCheck}>
                            <Ionicons name="checkmark" size={16} color="#fff" />
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </View>

            {/* Selected Summary */}
            {selectedEmployee && (
              <View style={styles.summaryCard}>
                <Ionicons name="information-circle-outline" size={20} color="#0284c7" />
                <Text style={styles.summaryText}>
                  Assigning to <Text style={styles.summaryBold}>{selectedEmployee.name}</Text>
                  {dueDate ? ` — Due ${(() => {
                    try {
                      const d = new Date(dueDate + 'T00:00:00');
                      return isNaN(d.getTime()) ? dueDate : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
                    } catch { return dueDate; }
                  })()}` : ''}
                </Text>
              </View>
            )}

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.assignBtn, loading && styles.assignBtnDisabled]}
              onPress={editingTaskId ? handleUpdateTask : handleAssign}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name={editingTaskId ? "save" : "send"} size={18} color="#fff" />
                  <Text style={styles.assignBtnText}>{editingTaskId ? 'Save Changes' : 'Assign Task'}</Text>
                </>
              )}
            </TouchableOpacity>

            {editingTaskId && (
              <TouchableOpacity onPress={cancelEdit} style={[styles.assignBtn, { backgroundColor: '#f1f5f9', marginTop: 12, borderColor: '#e2e8f0', borderWidth: 1 }]} activeOpacity={0.7}>
                <Text style={[styles.assignBtnText, { color: '#64748b' }]}>Cancel Edit</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        ) : (
          /* Task History Tab */
          <View style={{ flex: 1 }}>
            {/* Filter */}
            <View style={styles.filterRow}>
              {['All', 'Pending', 'In Progress', 'Completed'].map(f => (
                <TouchableOpacity
                  key={f}
                  onPress={() => setTaskFilter(f)}
                  style={[styles.filterBtn, taskFilter === f && styles.filterBtnActive]}
                >
                  <Text style={[styles.filterBtnText, taskFilter === f && styles.filterBtnTextActive]}>
                    {f}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <FlatList
              data={filteredTasks}
              keyExtractor={(item) => item._id}
              showsVerticalScrollIndicator={false}
              refreshing={fetching}
              onRefresh={() => { setFetching(true); fetchTasks().finally(() => setFetching(false)); }}
              contentContainerStyle={{ paddingBottom: 40 }}
              ListEmptyComponent={() => (
                <View style={styles.emptyState}>
                  <Ionicons name="clipboard-outline" size={48} color="#cbd5e1" />
                  <Text style={styles.emptyText}>No {taskFilter !== 'All' ? taskFilter.toLowerCase() : ''} tasks found.</Text>
                </View>
              )}
              renderItem={({ item }) => {
                const st = getStatusStyle(item.status);
                const isOverdue = item.dueDate && new Date() > new Date(item.dueDate) && item.status !== 'Completed';
                const isExpanded = expandedTaskId === item._id;

                return (
                  <View style={[styles.taskHistCard, isOverdue && styles.taskHistCardOverdue]}>
                    <TouchableOpacity
                      onPress={() => setExpandedTaskId(isExpanded ? null : item._id)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.taskHistRow}>
                        <View style={[styles.taskStatusDot, { backgroundColor: st.dot }]} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.taskHistTitle}>{item.title}</Text>
                          <Text 
                            style={styles.taskHistDesc} 
                            numberOfLines={isExpanded ? undefined : 2}
                          >
                            {item.description}
                          </Text>
                        </View>
                        <View style={[styles.taskStatusBadge, { backgroundColor: st.bg }]}>
                          <Text style={[styles.taskStatusText, { color: st.text }]}>{item.status}</Text>
                        </View>
                      </View>
                      <View style={styles.taskHistMeta}>
                        {item.assignedTo && (
                          <View style={styles.taskMetaItem}>
                            <Ionicons name="person-outline" size={12} color="#94a3b8" />
                            <Text style={styles.taskMetaText}>{item.assignedTo.name || 'Employee'}</Text>
                          </View>
                        )}
                        {item.dueDate && (
                          <View style={styles.taskMetaItem}>
                            <Ionicons name="calendar-outline" size={12} color={isOverdue ? '#dc2626' : '#94a3b8'} />
                            <Text style={[styles.taskMetaText, isOverdue && { color: '#dc2626', fontWeight: '900' }]}>
                              {isOverdue ? '⚠️ Overdue — ' : ''}
                              {new Date(item.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </Text>
                          </View>
                        )}
                        <Ionicons 
                          name={isExpanded ? "chevron-up" : "chevron-down"} 
                          size={14} 
                          color="#64748b" 
                          style={{ marginLeft: 'auto' }}
                        />
                      </View>
                    </TouchableOpacity>

                    {/* Timeline of updates */}
                    {isExpanded && (
                      <View style={styles.adminHistoryWrap}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                          <Text style={[styles.adminHistoryTitle, { marginBottom: 0 }]}>Updates Timeline</Text>
                          {item.status !== 'Completed' && (
                            <TouchableOpacity
                              onPress={() => startEditTask(item)}
                              style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#eff6ff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, gap: 4 }}
                            >
                              <Ionicons name="create-outline" size={12} color="#0284c7" />
                              <Text style={{ fontSize: 11, fontWeight: '900', color: '#0284c7' }}>Edit</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                        {!item.updates || item.updates.length === 0 ? (
                          <Text style={styles.adminNoUpdates}>No progress updates submitted yet.</Text>
                        ) : (
                          item.updates.map((up, idx) => {
                            const hasPhoto = up.photo && up.photo.data;
                            return (
                              <View key={up._id || idx} style={styles.adminHistRow}>
                                <View style={styles.adminHistLeftLine}>
                                  <View style={styles.adminHistDot} />
                                  {idx < item.updates.length - 1 && <View style={styles.adminHistConnector} />}
                                </View>
                                <View style={styles.adminHistContent}>
                                  <View style={styles.adminHistHeader}>
                                    <Text style={styles.adminHistDate}>
                                      {new Date(up.createdAt).toLocaleDateString('en-IN', {
                                        day: 'numeric',
                                        month: 'short',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })}
                                    </Text>
                                    <Text style={[
                                      styles.adminHistStatus,
                                      { color: up.statusAfterUpdate === 'Completed' ? '#16a34a' : '#d97706' }
                                    ]}>
                                      {up.statusAfterUpdate}
                                    </Text>
                                  </View>
                                  <Text style={styles.adminHistNotes}>{up.notes}</Text>
                                  {hasPhoto && (
                                    <View style={styles.adminEvidenceWrap}>
                                      <Text style={styles.adminEvidenceLabel}>📷 Submitted Photo Evidence:</Text>
                                      <EvidenceImage taskId={item._id} updateId={up._id} style={styles.adminEvidenceImage} />
                                    </View>
                                  )}
                                </View>
                              </View>
                            );
                          })
                        )}
                      </View>
                    )}
                  </View>
                );
              }}
            />
          </View>
        )}
    </View>
  );

  if (isComponent) return content;
  return <AppLayout currentScreen="TaskAssignment" role="Admin" scrollable={false}>{content}</AppLayout>;
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
    flexWrap: 'wrap',
    gap: 12,
  },
  pageHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  pageIconWrap: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: '#e0f2fe',
    alignItems: 'center', justifyContent: 'center',
  },
  pageTitle: { fontSize: 22, fontWeight: '900', color: '#0f172a' },
  pageSubtitle: { fontSize: 13, color: '#64748b', marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: 8 },
  statPill: {
    backgroundColor: '#fee2e2', borderRadius: 16,
    paddingHorizontal: 14, paddingVertical: 10, alignItems: 'center',
  },
  statPillNum: { fontSize: 18, fontWeight: '900', color: '#dc2626' },
  statPillLabel: { fontSize: 10, color: '#b91c1c', fontWeight: '600', marginTop: 1 },

  tabBar: {
    flexDirection: 'row', gap: 10, marginBottom: 20,
    backgroundColor: '#f1f5f9',
    borderRadius: 20, padding: 4,
  },
  tabBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12, borderRadius: 16,
  },
  tabBtnActive: { backgroundColor: '#0284c7' },
  tabBtnText: { fontSize: 13, fontWeight: '900', color: '#64748b' },
  tabBtnTextActive: { color: '#fff' },

  card: {
    backgroundColor: '#fff', borderRadius: 24,
    borderWidth: 1, borderColor: '#e2e8f0',
    padding: 20, marginBottom: 16,
  },
  cardLabel: {
    fontSize: 10, fontWeight: '900', color: '#94a3b8',
    letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4,
  },
  cardSubLabel: { fontSize: 12, color: '#64748b', marginBottom: 16 },

  fieldGroup: { marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '900', color: '#475569', marginBottom: 8 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f8fafc', borderRadius: 14,
    borderWidth: 1.5, borderColor: '#e2e8f0',
    paddingHorizontal: 14, minHeight: 50,
  },
  textAreaWrap: { alignItems: 'flex-start', paddingVertical: 12 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, color: '#0f172a', fontSize: 14 },
  textArea: { height: 90, textAlignVertical: 'top' },

  dateInputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f8fafc', borderRadius: 14,
    borderWidth: 1.5, borderColor: '#e2e8f0',
    paddingHorizontal: 14, minHeight: 50,
  },
  dateIcon: { marginRight: 10 },
  dateWebInput: { flex: 1, color: '#0f172a', fontSize: 14, minHeight: 48 },
  dateDisplayText: { fontSize: 12, color: '#0284c7', fontWeight: '600', marginLeft: 8 },
  dateNativeText: { flex: 1, fontSize: 14, color: '#0f172a' },
  webDateHint: { fontSize: 11, color: '#94a3b8', marginTop: 6, marginLeft: 4 },

  empCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f8fafc', borderRadius: 18,
    borderWidth: 1.5, borderColor: '#e2e8f0',
    padding: 14, marginBottom: 10, gap: 12,
  },
  empCardSelected: {
    backgroundColor: '#eff6ff', borderColor: '#0284c7',
  },
  empAvatar: {
    width: 46, height: 46, borderRadius: 14,
    backgroundColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center',
  },
  empAvatarSelected: { backgroundColor: '#0284c7' },
  empAvatarText: { fontSize: 18, fontWeight: '900', color: '#475569' },
  empInfo: { flex: 1 },
  empName: { fontSize: 15, fontWeight: '900', color: '#0f172a' },
  empNameSelected: { color: '#0284c7' },
  empEmail: { fontSize: 12, color: '#64748b', marginTop: 2 },
  empPhone: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  empRight: { alignItems: 'flex-end', gap: 6 },
  empTaskBadge: {
    backgroundColor: '#f1f5f9', borderRadius: 20,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  empTaskBadgeText: { fontSize: 10, color: '#64748b', fontWeight: '600' },
  statusBadge: {
    marginTop: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusBadgeActive: {
    backgroundColor: '#ecfdf5',
    borderColor: '#22c55e',
  },
  statusBadgeInactive: {
    backgroundColor: '#fef2f2',
    borderColor: '#fca5a5',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '900',
  },
  statusTextActive: { color: '#16a34a' },
  statusTextInactive: { color: '#dc2626' },
  empCheck: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: '#0284c7', alignItems: 'center', justifyContent: 'center',
  },
  emptyEmp: { alignItems: 'center', paddingVertical: 32 },
  emptyEmpText: { fontSize: 15, fontWeight: '600', color: '#94a3b8', marginTop: 12 },
  emptyEmpSub: { fontSize: 12, color: '#cbd5e1', marginTop: 4 },

  summaryCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#eff6ff', borderRadius: 16, borderWidth: 1,
    borderColor: '#bfdbfe', padding: 14, marginBottom: 16,
  },
  summaryText: { flex: 1, fontSize: 13, color: '#1e40af', lineHeight: 18 },
  summaryBold: { fontWeight: '900' },

  assignBtn: {
    backgroundColor: '#0284c7', borderRadius: 18,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, height: 56, marginBottom: 32,
  },
  assignBtnDisabled: { opacity: 0.7 },
  assignBtnText: { color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: 0.5 },

  filterRow: {
    flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap',
  },
  filterBtn: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  filterBtnActive: { backgroundColor: '#0284c7', borderColor: '#0284c7' },
  filterBtnText: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  filterBtnTextActive: { color: '#fff' },

  taskHistCard: {
    backgroundColor: '#fff', borderRadius: 20,
    borderWidth: 1, borderColor: '#e2e8f0',
    padding: 16, marginBottom: 12,
  },
  taskHistCardOverdue: { borderColor: '#fca5a5', backgroundColor: '#fff5f5' },
  taskHistRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  taskStatusDot: { width: 10, height: 10, borderRadius: 5, marginTop: 5 },
  taskHistTitle: { fontSize: 15, fontWeight: '900', color: '#0f172a', marginBottom: 3 },
  taskHistDesc: { fontSize: 12, color: '#64748b', lineHeight: 18 },
  taskStatusBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, marginLeft: 8 },
  taskStatusText: { fontSize: 10, fontWeight: '900' },
  taskHistMeta: { flexDirection: 'row', gap: 14, marginTop: 12, flexWrap: 'wrap' },
  taskMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  taskMetaText: { fontSize: 11, color: '#94a3b8', fontWeight: '500' },

  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 14, color: '#94a3b8', marginTop: 12, fontWeight: '500' },

  adminHistoryWrap: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  adminHistoryTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#334155',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  adminNoUpdates: {
    fontSize: 12,
    color: '#94a3b8',
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  adminHistRow: {
    flexDirection: 'row',
    gap: 8,
  },
  adminHistLeftLine: {
    alignItems: 'center',
    width: 12,
  },
  adminHistDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#94a3b8',
    marginTop: 6,
  },
  adminHistConnector: {
    width: 1.5,
    flex: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 4,
  },
  adminHistContent: {
    flex: 1,
    paddingBottom: 16,
  },
  adminHistHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  adminHistDate: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  adminHistStatus: {
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  adminHistNotes: {
    fontSize: 13,
    color: '#1e293b',
    marginTop: 4,
    lineHeight: 18,
  },
  adminEvidenceWrap: {
    marginTop: 8,
    gap: 4,
  },
  adminEvidenceLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  adminEvidenceImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
});
