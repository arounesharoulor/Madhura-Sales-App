import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ScrollView, Alert, TextInput, ActivityIndicator, Modal, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import api from '../api/api';
import AppLayout from '../components/AppLayout';

const STATUS_TABS = ['All', 'Pending', 'Called', 'Visited', 'Converted', 'Not Interested'];

const STATUS_CONFIG = {
  'Pending':       { bg: '#fff7ed', text: '#ea580c', border: '#fed7aa', icon: 'time-outline' },
  'Called':        { bg: '#eff6ff', text: '#0284c7', border: '#bfdbfe', icon: 'call-outline' },
  'Visited':       { bg: '#faf5ff', text: '#7c3aed', border: '#e9d5ff', icon: 'location-outline' },
  'Converted':     { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0', icon: 'checkmark-circle-outline' },
  'Not Interested':{ bg: '#fef2f2', text: '#e11d48', border: '#fecdd3', icon: 'close-circle-outline' },
};

function UpdateModal({ visible, item, onClose, onSaved }) {
  const [status, setStatus] = useState(item?.status || 'Pending');
  const [remarks, setRemarks] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (item) { setStatus(item.status); setRemarks(''); }
  }, [item]);

  const save = async () => {
    setSaving(true);
    try {
      await api.put(`/followups/${item._id}/status`, { status, remarks });
      Toast.show({ type: 'success', text1: 'Follow-up Updated', text2: `Marked as ${status}` });
      onSaved();
      onClose();
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to update follow-up' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <Text style={{ fontSize: 17, fontWeight: '800', color: '#0f172a' }}>Update Follow-up</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={22} color="#64748b" /></TouchableOpacity>
          </View>

          <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Update Status</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
            {['Called', 'Visited', 'Converted', 'Not Interested'].map(s => {
              const sc = STATUS_CONFIG[s];
              return (
                <TouchableOpacity
                  key={s}
                  onPress={() => setStatus(s)}
                  style={{
                    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, borderWidth: 1.5,
                    backgroundColor: status === s ? sc.text : sc.bg,
                    borderColor: status === s ? sc.text : sc.border,
                    flexDirection: 'row', alignItems: 'center', gap: 6,
                  }}
                >
                  <Ionicons name={sc.icon} size={13} color={status === s ? '#fff' : sc.text} />
                  <Text style={{ fontSize: 11, fontWeight: '700', color: status === s ? '#fff' : sc.text }}>{s}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Remarks</Text>
          <TextInput
            value={remarks}
            onChangeText={setRemarks}
            placeholder="Add remarks or notes..."
            placeholderTextColor="#94a3b8"
            multiline
            style={{
              backgroundColor: '#f8fafc', borderWidth: 1.5, borderColor: '#e2e8f0',
              borderRadius: 14, padding: 14, fontSize: 14, color: '#0f172a',
              minHeight: 80, textAlignVertical: 'top', marginBottom: 20,
            }}
          />

          <TouchableOpacity
            onPress={save}
            disabled={saving}
            style={{ backgroundColor: '#0284c7', borderRadius: 16, paddingVertical: 15, alignItems: 'center' }}
          >
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>Save Update</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export default function FollowupScreen({ navigation }) {
  const [followUps, setFollowUps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [selectedItem, setSelectedItem] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const fetchFollowUps = async () => {
    try {
      setLoading(true);
      const res = await api.get('/followups');
      setFollowUps(res.data.data || []);
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to load follow-ups' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchFollowUps(); }, []);

  const filtered = filter === 'All' ? followUps : followUps.filter(f => f.status === filter);
  const counts = STATUS_TABS.reduce((acc, t) => {
    acc[t] = t === 'All' ? followUps.length : followUps.filter(f => f.status === t).length;
    return acc;
  }, {});

  const isDueToday = (item) => {
    if (!item.followUpDate) return false;
    return new Date(item.followUpDate).toDateString() === new Date().toDateString();
  };

  const isOverdue = (item) => {
    if (!item.followUpDate || item.status === 'Converted') return false;
    return new Date(item.followUpDate) < new Date() && new Date(item.followUpDate).toDateString() !== new Date().toDateString();
  };

  return (
    <AppLayout currentScreen="Followup" role="Employee" scrollable={false}>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Text style={{ fontSize: 22, fontWeight: '900', color: '#0f172a' }}>Follow-ups</Text>
          <TouchableOpacity onPress={fetchFollowUps} style={{ backgroundColor: '#eff6ff', borderRadius: 12, padding: 8 }}>
            <Ionicons name="refresh" size={18} color="#0284c7" />
          </TouchableOpacity>
        </View>

        {/* Filter Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }} contentContainerStyle={{ gap: 8, paddingRight: 8 }}>
          {STATUS_TABS.map(tab => (
            <TouchableOpacity
              key={tab}
              onPress={() => setFilter(tab)}
              style={{
                paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
                backgroundColor: filter === tab ? '#0284c7' : '#f1f5f9',
                flexDirection: 'row', alignItems: 'center', gap: 6,
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: '700', color: filter === tab ? '#fff' : '#64748b' }}>{tab}</Text>
              {counts[tab] > 0 && (
                <View style={{ backgroundColor: filter === tab ? 'rgba(255,255,255,0.3)' : '#e2e8f0', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1 }}>
                  <Text style={{ fontSize: 9, fontWeight: '800', color: filter === tab ? '#fff' : '#64748b' }}>{counts[tab]}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>

        {loading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color="#0284c7" />
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={item => item._id}
            refreshing={loading}
            onRefresh={fetchFollowUps}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 60 }}
            ListEmptyComponent={() => (
              <View style={{ flex: 1, alignItems: 'center', paddingTop: 80, gap: 12 }}>
                <View style={{ backgroundColor: '#f1f5f9', borderRadius: 20, padding: 20 }}>
                  <Ionicons name="alarm-outline" size={40} color="#cbd5e1" />
                </View>
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#94a3b8' }}>No follow-ups found</Text>
              </View>
            )}
            renderItem={({ item }) => {
              const sc = STATUS_CONFIG[item.status] || STATUS_CONFIG['Pending'];
              const dueToday = isDueToday(item);
              const overdue = isOverdue(item);
              return (
                <View style={{
                  backgroundColor: '#fff', borderRadius: 20, borderWidth: 1,
                  borderColor: overdue ? '#fecdd3' : dueToday ? '#fde68a' : '#e2e8f0',
                  padding: 16, marginBottom: 12,
                  shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
                }}>
                  {(dueToday || overdue) && (
                    <View style={{
                      flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8,
                      backgroundColor: overdue ? '#fef2f2' : '#fffbeb', borderRadius: 8,
                      paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start',
                    }}>
                      <Ionicons name={overdue ? 'warning' : 'alarm'} size={11} color={overdue ? '#e11d48' : '#d97706'} />
                      <Text style={{ fontSize: 10, fontWeight: '700', color: overdue ? '#e11d48' : '#d97706' }}>
                        {overdue ? 'OVERDUE' : 'DUE TODAY'}
                      </Text>
                    </View>
                  )}

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={{ fontSize: 15, fontWeight: '800', color: '#0f172a' }}>{item.clientName}</Text>
                      {item.companyName ? <Text style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{item.companyName}</Text> : null}
                    </View>
                    <View style={{ backgroundColor: sc.bg, borderRadius: 10, borderWidth: 1, borderColor: sc.border, paddingHorizontal: 8, paddingVertical: 4, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Ionicons name={sc.icon} size={10} color={sc.text} />
                      <Text style={{ fontSize: 9, fontWeight: '700', color: sc.text, textTransform: 'uppercase' }}>{item.status}</Text>
                    </View>
                  </View>

                  <View style={{ gap: 6, marginBottom: 12 }}>
                    {item.notes && <Text style={{ fontSize: 12, color: '#64748b', lineHeight: 18 }} numberOfLines={2}>"{item.notes}"</Text>}
                    {item.followUpDate && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name="calendar-outline" size={13} color="#0284c7" />
                        <Text style={{ fontSize: 11, fontWeight: '600', color: '#0284c7' }}>
                          Follow-up: {new Date(item.followUpDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </Text>
                      </View>
                    )}
                  </View>

                  {item.status !== 'Converted' && item.status !== 'Not Interested' && (
                    <View style={{ borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 12 }}>
                      <TouchableOpacity
                        onPress={() => { setSelectedItem(item); setShowModal(true); }}
                        style={{ backgroundColor: '#eff6ff', borderRadius: 12, paddingVertical: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}
                      >
                        <Ionicons name="create-outline" size={14} color="#0284c7" />
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#0284c7' }}>Update Status</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            }}
          />
        )}
      </View>

      <UpdateModal
        visible={showModal}
        item={selectedItem}
        onClose={() => setShowModal(false)}
        onSaved={fetchFollowUps}
      />
    </AppLayout>
  );
}
