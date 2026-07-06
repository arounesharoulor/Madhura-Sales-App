import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ScrollView, ActivityIndicator, Alert, TextInput, Image, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import Toast from 'react-native-toast-message';
import api from '../api/api';
import { connectSocket, getSocket } from '../utils/socket';
import AppLayout from '../components/AppLayout';

const STATUS_TABS = ['All', 'Pending', 'In Progress', 'Completed', 'Hold'];

const STATUS_CONFIG = {
  'Pending':    { bg: '#fff7ed', text: '#ea580c', border: '#fed7aa', dot: '#ea580c' },
  'In Progress':{ bg: '#eff6ff', text: '#0284c7', border: '#bfdbfe', dot: '#0284c7' },
  'Completed':  { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0', dot: '#16a34a' },
  'Hold':       { bg: '#faf5ff', text: '#7c3aed', border: '#e9d5ff', dot: '#7c3aed' },
};

const PRIORITY_CONFIG = {
  'High':   { bg: '#fef2f2', text: '#e11d48', border: '#fecdd3' },
  'Medium': { bg: '#fffbeb', text: '#d97706', border: '#fde68a' },
  'Low':    { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0' },
};

export default function TaskScreen({ navigation }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [updatingId, setUpdatingId] = useState(null);
  
  // New state for task update form
  const [expandedTask, setExpandedTask] = useState(null);
  const [updateNotes, setUpdateNotes] = useState('');
  const [updateStatus, setUpdateStatus] = useState('In Progress');
  const [updatePhoto, setUpdatePhoto] = useState(null);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const res = await api.get('/tasks');
      setTasks(res.data.data || []);
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to load tasks' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
    let mounted = true;
    (async () => {
      const sock = await connectSocket();
      if (!mounted || !sock) return;
      sock.on('task_assigned', (t) => {
        Toast.show({ type: 'info', text1: '📋 New Task', text2: t.title, visibilityTime: 5000 });
        if (mounted) fetchTasks();
      });
      sock.on('task_updated', () => {
        if (mounted) fetchTasks();
      });
      sock.on('notification', (n) => Toast.show({ type: 'info', text1: n.title, text2: n.message }));
    })();
    return () => {
      mounted = false;
      const s = getSocket();
      if (s) { s.off('task_assigned'); s.off('task_updated'); s.off('notification'); }
    };
  }, []);

  const openUpdateForm = (task, initialStatus) => {
    setExpandedTask(task._id);
    setUpdateStatus(initialStatus || 'In Progress');
    setUpdateNotes('');
    setUpdatePhoto(null);
  };

  const cancelUpdate = () => {
    setExpandedTask(null);
    setUpdateNotes('');
    setUpdatePhoto(null);
  };

  const handlePickCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission needed', 'Camera access is required.'); return; }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true, quality: 0.7,
    });
    if (!result.canceled) setUpdatePhoto(result.assets[0]);
  };

  const handlePickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: '*/*', copyToCacheDirectory: true,
    });
    if (!result.canceled) setUpdatePhoto(result.assets[0]);
  };

  const submitUpdate = async (id) => {
    if (!updateNotes.trim()) {
      Alert.alert('Required', 'Please enter some notes or description for the update.');
      return;
    }
    if (updateStatus === 'Completed' && !updatePhoto) {
      Alert.alert('Required', 'Please upload photo evidence to mark this task as Completed.');
      return;
    }
    
    setUpdatingId(id);
    try {
      const formData = new FormData();
      formData.append('notes', updateNotes.trim());
      formData.append('status', updateStatus);
      
      if (updatePhoto) {
        const filename = updatePhoto.name || updatePhoto.fileName || updatePhoto.uri.split('/').pop() || 'evidence.file';
        const type = updatePhoto.mimeType || updatePhoto.type || 'application/octet-stream';
        
        formData.append('photo', {
          uri: Platform.OS === 'ios' ? updatePhoto.uri.replace('file://', '') : updatePhoto.uri,
          name: filename,
          type,
        });
      }
      
      await api.put(`/tasks/${id}/status`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      Toast.show({ type: 'success', text1: 'Task Updated', text2: `Status: ${updateStatus}` });
      cancelUpdate();
      fetchTasks();
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Error', text2: e.response?.data?.message || 'Failed to update task' });
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = filter === 'All' ? tasks : tasks.filter(t => t.status === filter);

  const counts = STATUS_TABS.reduce((acc, tab) => {
    acc[tab] = tab === 'All' ? tasks.length : tasks.filter(t => t.status === tab).length;
    return acc;
  }, {});

  const isOverdue = (t) => t.dueDate && new Date() > new Date(t.dueDate) && t.status !== 'Completed';

  return (
    <AppLayout currentScreen="Task" role="Employee" scrollable={false}>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Text style={{ fontSize: 22, fontWeight: '900', color: '#0f172a' }}>My Tasks</Text>
          <TouchableOpacity onPress={fetchTasks} style={{ backgroundColor: '#eff6ff', borderRadius: 12, padding: 8 }}>
            <Ionicons name="refresh" size={18} color="#0284c7" />
          </TouchableOpacity>
        </View>

        {/* Filter Tabs */}
        <View style={{ backgroundColor: '#f1f5f9', padding: 4, borderRadius: 14, marginBottom: 16 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 4 }}>
            {STATUS_TABS.map(tab => (
              <TouchableOpacity
                key={tab}
                onPress={() => setFilter(tab)}
                style={{
                  paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12,
                  backgroundColor: filter === tab ? '#fff' : 'transparent',
                  shadowColor: filter === tab ? '#000' : 'transparent',
                  shadowOpacity: filter === tab ? 0.05 : 0,
                  shadowRadius: 4, elevation: filter === tab ? 1 : 0,
                  flexDirection: 'row', alignItems: 'center', gap: 6,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '700', color: filter === tab ? '#0f172a' : '#64748b' }}>{tab}</Text>
                {counts[tab] > 0 && (
                  <View style={{ backgroundColor: filter === tab ? '#eff6ff' : '#e2e8f0', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 }}>
                    <Text style={{ fontSize: 9, fontWeight: '800', color: filter === tab ? '#0284c7' : '#64748b' }}>{counts[tab]}</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {loading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color="#0284c7" />
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={item => item._id}
            refreshing={loading}
            onRefresh={fetchTasks}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 60 }}
            ListEmptyComponent={() => (
              <View style={{ flex: 1, alignItems: 'center', paddingTop: 80, gap: 12 }}>
                <View style={{ backgroundColor: '#f1f5f9', borderRadius: 20, padding: 20 }}>
                  <Ionicons name="clipboard-outline" size={40} color="#cbd5e1" />
                </View>
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#94a3b8' }}>No {filter} tasks</Text>
              </View>
            )}
            renderItem={({ item }) => {
              const sc = STATUS_CONFIG[item.status] || STATUS_CONFIG['Pending'];
              const pc = PRIORITY_CONFIG[item.priority] || PRIORITY_CONFIG['Medium'];
              const overdue = isOverdue(item);
              return (
                <View style={{
                  backgroundColor: '#fff', borderRadius: 20, borderWidth: 1,
                  borderColor: overdue ? '#fecdd3' : '#e2e8f0',
                  padding: 16, marginBottom: 12,
                  shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
                }}>
                  {overdue && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8, backgroundColor: '#fef2f2', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start' }}>
                      <Ionicons name="warning" size={12} color="#e11d48" />
                      <Text style={{ fontSize: 10, fontWeight: '700', color: '#e11d48' }}>OVERDUE</Text>
                    </View>
                  )}

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#0f172a', flex: 1, marginRight: 8 }}>{item.title}</Text>
                    <View style={{ backgroundColor: sc.bg, borderRadius: 10, borderWidth: 1, borderColor: sc.border, paddingHorizontal: 8, paddingVertical: 4 }}>
                      <Text style={{ fontSize: 9, fontWeight: '700', color: sc.text, textTransform: 'uppercase' }}>{item.status}</Text>
                    </View>
                  </View>

                  <View style={{ gap: 6, marginBottom: 12 }}>
                    {item.description ? (
                      <Text style={{ fontSize: 12, color: '#64748b', lineHeight: 18 }} numberOfLines={2}>{item.description}</Text>
                    ) : null}
                    <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
                      {item.priority && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: pc.bg, borderRadius: 8, borderWidth: 1, borderColor: pc.border, paddingHorizontal: 8, paddingVertical: 3 }}>
                          <Ionicons name="flag" size={10} color={pc.text} />
                          <Text style={{ fontSize: 10, fontWeight: '700', color: pc.text }}>{item.priority}</Text>
                        </View>
                      )}
                      {item.dueDate && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Ionicons name="calendar-outline" size={12} color="#94a3b8" />
                          <Text style={{ fontSize: 11, color: overdue ? '#e11d48' : '#94a3b8', fontWeight: '600' }}>
                            Due: {new Date(item.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </Text>
                        </View>
                      )}
                      {item.assignedBy?.name && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Ionicons name="person-outline" size={12} color="#94a3b8" />
                          <Text style={{ fontSize: 11, color: '#94a3b8', fontWeight: '600' }}>By: {item.assignedBy.name}</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Status Update Section */}
                  {item.status !== 'Completed' && expandedTask !== item._id && (
                    <View style={{ borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 12, alignItems: 'flex-start' }}>
                      <TouchableOpacity
                        onPress={() => openUpdateForm(item)}
                        style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#eff6ff', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, gap: 6 }}
                      >
                        <Ionicons name="chatbubble-ellipses-outline" size={14} color="#0284c7" />
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#0284c7' }}>Update Status & Add Notes</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Expanded Update Form */}
                  {expandedTask === item._id && (
                    <View style={{ marginTop: 12, backgroundColor: '#f8fafc', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' }}>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: '#0f172a', marginBottom: 8 }}>Update Task Progress</Text>
                      
                      {/* Status Selector */}
                      <Text style={{ fontSize: 11, fontWeight: '600', color: '#64748b', marginBottom: 4 }}>Select Status</Text>
                      <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}>
                        {['In Progress', 'Completed', 'Hold'].filter(s => s !== item.status).map(s => (
                          <TouchableOpacity
                            key={s}
                            onPress={() => setUpdateStatus(s)}
                            style={{
                              flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center',
                              backgroundColor: updateStatus === s ? (s === 'Completed' ? '#16a34a' : s === 'In Progress' ? '#0284c7' : '#7c3aed') : '#fff',
                              borderWidth: 1,
                              borderColor: updateStatus === s ? (s === 'Completed' ? '#16a34a' : s === 'In Progress' ? '#0284c7' : '#7c3aed') : '#e2e8f0',
                            }}
                          >
                            <Text style={{
                              fontSize: 11, fontWeight: '700',
                              color: updateStatus === s ? '#fff' : '#64748b'
                            }}>
                              {s}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>

                      {/* Notes Input */}
                      <Text style={{ fontSize: 11, fontWeight: '600', color: '#64748b', marginBottom: 4 }}>
                        Update Notes <Text style={{ color: '#ef4444' }}>*</Text>
                      </Text>
                      <TextInput
                        style={{
                          backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8,
                          padding: 10, fontSize: 12, color: '#334155', minHeight: 60, textAlignVertical: 'top', marginBottom: 12
                        }}
                        placeholder="Enter task updates or follow-up notes..."
                        placeholderTextColor="#94a3b8"
                        multiline
                        numberOfLines={3}
                        value={updateNotes}
                        onChangeText={setUpdateNotes}
                      />

                      {/* Photo Upload (Required for Completed) */}
                      <Text style={{ fontSize: 11, fontWeight: '600', color: '#64748b', marginBottom: 4 }}>
                        Evidence (Photo/Document) {updateStatus === 'Completed' && <Text style={{ color: '#ef4444' }}>*</Text>}
                      </Text>
                      {updatePhoto ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                          {updatePhoto.mimeType?.startsWith('image') || !updatePhoto.mimeType ? (
                            <Image source={{ uri: updatePhoto.uri }} style={{ width: 60, height: 60, borderRadius: 8 }} />
                          ) : (
                            <View style={{ width: 60, height: 60, borderRadius: 8, backgroundColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' }}>
                              <Ionicons name="document-text" size={24} color="#64748b" />
                            </View>
                          )}
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 11, color: '#334155', fontWeight: '600' }} numberOfLines={1}>{updatePhoto.name || 'Attachment Added'}</Text>
                            <TouchableOpacity onPress={() => setUpdatePhoto(null)} style={{ marginTop: 4 }}>
                              <Text style={{ fontSize: 11, color: '#ef4444', fontWeight: '600' }}>Remove</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ) : (
                        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                          <TouchableOpacity
                            onPress={handlePickCamera}
                            style={{
                              flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
                              backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1', borderStyle: 'dashed',
                              padding: 12, borderRadius: 8, justifyContent: 'center'
                            }}
                          >
                            <Ionicons name="camera-outline" size={16} color="#64748b" />
                            <Text style={{ fontSize: 12, color: '#64748b', fontWeight: '600' }}>Take Photo</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={handlePickDocument}
                            style={{
                              flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
                              backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1', borderStyle: 'dashed',
                              padding: 12, borderRadius: 8, justifyContent: 'center'
                            }}
                          >
                            <Ionicons name="document-attach-outline" size={16} color="#64748b" />
                            <Text style={{ fontSize: 12, color: '#64748b', fontWeight: '600' }}>Document</Text>
                          </TouchableOpacity>
                        </View>
                      )}

                      {/* Action Buttons */}
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TouchableOpacity
                          disabled={updatingId === item._id}
                          onPress={() => cancelUpdate()}
                          style={{
                            flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center',
                            backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0'
                          }}
                        >
                          <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748b' }}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          disabled={updatingId === item._id}
                          onPress={() => submitUpdate(item._id)}
                          style={{
                            flex: 2, paddingVertical: 10, borderRadius: 8, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6,
                            backgroundColor: updateStatus === 'Completed' ? '#16a34a' : '#0284c7'
                          }}
                        >
                          {updatingId === item._id ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : (
                            <>
                              <Ionicons name="send" size={14} color="#fff" />
                              <Text style={{ fontSize: 12, fontWeight: '700', color: '#fff' }}>Submit Update</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              );
            }}
          />
        )}
      </View>
    </AppLayout>
  );
}
