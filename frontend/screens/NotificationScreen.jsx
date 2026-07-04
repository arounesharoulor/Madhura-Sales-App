import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, ActivityIndicator,
  StyleSheet, Platform, Vibration,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/api';
import { connectSocket } from '../utils/socket';
import AppLayout from '../components/AppLayout';

// Cross-platform notification sound (same helper as AppLayout)
const playNotificationSound = () => {
  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.45);
    } else {
      Vibration.vibrate([0, 80, 60, 80]);
    }
  } catch (_) {}
};

const TYPE_CONFIG = {
  Success: { color: '#16a34a', bg: '#f0fdf4', icon: 'checkmark-circle' },
  Warning: { color: '#d97706', bg: '#fffbeb', icon: 'warning' },
  Alert:   { color: '#0284c7', bg: '#eff6ff', icon: 'notifications' },
  Task:    { color: '#7c3aed', bg: '#faf5ff', icon: 'clipboard' },
  Info:    { color: '#0891b2', bg: '#ecfeff', icon: 'information-circle' },
};

export default function NotificationScreen({ navigation }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState('Employee');

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const userStr = await AsyncStorage.getItem('user');
      if (userStr) {
        setUserRole(JSON.parse(userStr).role);
      }
      const res = await api.get('/notifications');
      setNotifications(res.data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, []);

  // Real-time socket listener — adds new notifications instantly to list
  useEffect(() => {
    let socket;
    let isMounted = true;

    const initSocket = async () => {
      socket = await connectSocket();
      if (!socket) return;

      socket.on('notification', (notif) => {
        if (!isMounted || !notif?._id) return;
        // Play sound here too (in case AppLayout isn't mounted)
        playNotificationSound();
        setNotifications((prev) => {
          if (prev.some((item) => item._id === notif._id)) return prev;
          return [notif, ...prev];
        });
      });
    };

    initSocket();
    return () => {
      isMounted = false;
      if (socket) socket.off('notification');
    };
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await api.put('/notifications/all/read');
      fetchNotifications();
    } catch (e) {}
  };

  const handleMarkRead = async (id, title, message) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(prev =>
        prev.map(n => n._id === id ? { ...n, isRead: true } : n)
      );
    } catch (e) {}

    // Navigate based on notification content
    const t = (title || '').toLowerCase();
    const m = (message || '').toLowerCase();
    
    if (t.includes('attendance') || t.includes('check-in') || t.includes('check-out') || t.includes('leave')) {
      navigation.navigate(userRole === 'Admin' ? 'AdminAttendance' : 'Dashboard');
    } else if (t.includes('task') || m.includes('task')) {
      navigation.navigate(userRole === 'Admin' ? 'TaskAssignment' : 'Task');
    } else if (t.includes('follow-up') || m.includes('follow up')) {
      navigation.navigate(userRole === 'Admin' ? 'AdminFollowupManagement' : 'Followup');
    } else if (t.includes('onboard') || t.includes('client')) {
      navigation.navigate('ClientOnboarding');
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now - d;
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH}h ago`;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  return (
    <AppLayout currentScreen="Notification" role={userRole} scrollable={false}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Notifications</Text>
            {unreadCount > 0 && (
              <Text style={styles.subtitle}>{unreadCount} unread message{unreadCount !== 1 ? 's' : ''}</Text>
            )}
          </View>
          {unreadCount > 0 && (
            <TouchableOpacity onPress={handleMarkAllRead} style={styles.markAllBtn}>
              <Ionicons name="checkmark-done" size={14} color="#0284c7" />
              <Text style={styles.markAllText}>Mark all read</Text>
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#0284c7" />
          </View>
        ) : (
          <FlatList
            data={notifications}
            keyExtractor={(item) => item._id}
            refreshing={loading}
            onRefresh={fetchNotifications}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.list}
            ListEmptyComponent={() => (
              <View style={styles.empty}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="notifications-off-outline" size={40} color="#cbd5e1" />
                </View>
                <Text style={styles.emptyTitle}>No Notifications</Text>
                <Text style={styles.emptyText}>You're all caught up! Check back later.</Text>
              </View>
            )}
            renderItem={({ item }) => {
              const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG['Alert'];
              return (
                <TouchableOpacity
                  onPress={() => handleMarkRead(item._id, item.title, item.message)}
                  activeOpacity={0.85}
                  style={[
                    styles.card,
                    !item.isRead && styles.cardUnread,
                    { borderLeftColor: cfg.color },
                  ]}
                >
                  <View style={styles.cardRow}>
                    {/* Icon */}
                    <View style={[styles.iconWrap, { backgroundColor: cfg.bg }]}>
                      <Ionicons name={cfg.icon} size={20} color={cfg.color} />
                    </View>

                    {/* Content */}
                    <View style={styles.cardContent}>
                      <View style={styles.cardTopRow}>
                        <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                        <Text style={styles.cardTime}>{formatTime(item.createdAt)}</Text>
                      </View>
                      <Text style={styles.cardMessage}>{item.message}</Text>
                      <View style={styles.cardMeta}>
                        <View style={[styles.typeBadge, { backgroundColor: cfg.bg }]}>
                          <Text style={[styles.typeBadgeText, { color: cfg.color }]}>{item.type}</Text>
                        </View>
                        {!item.isRead && <View style={styles.unreadDot} />}
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        )}
      </View>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 22, fontWeight: '900', color: '#0f172a' },
  subtitle: { fontSize: 12, color: '#0284c7', fontWeight: '600', marginTop: 2 },
  markAllBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#eff6ff', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 7,
  },
  markAllText: { fontSize: 11, fontWeight: '700', color: '#0284c7' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  list: { paddingBottom: 40 },

  empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyIcon: {
    backgroundColor: '#f1f5f9', borderRadius: 20, padding: 20, marginBottom: 4,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#334155' },
  emptyText: { fontSize: 13, color: '#94a3b8', textAlign: 'center' },

  card: {
    backgroundColor: '#fff', borderRadius: 18, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: '#f1f5f9', borderLeftWidth: 4,
    shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 6, elevation: 1,
  },
  cardUnread: {
    backgroundColor: '#f8fbff', borderColor: '#bfdbfe', borderLeftWidth: 4,
  },
  cardRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  iconWrap: {
    width: 42, height: 42, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  cardContent: { flex: 1 },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardTitle: { fontSize: 13, fontWeight: '800', color: '#0f172a', flex: 1, marginRight: 8 },
  cardTime: { fontSize: 10, color: '#94a3b8', fontWeight: '600', flexShrink: 0 },
  cardMessage: { fontSize: 12, color: '#475569', lineHeight: 18, marginBottom: 8 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  typeBadge: {
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: 20,
  },
  typeBadgeText: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  unreadDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: '#3b82f6',
  },
});
