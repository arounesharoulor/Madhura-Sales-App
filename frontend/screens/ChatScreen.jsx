import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  KeyboardAvoidingView, Platform, Alert, StyleSheet, StatusBar, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useLocalSearchParams } from 'expo-router';
import api from '../api/api';
import { connectSocket, getSocket } from '../utils/socket';
import AppLayout from '../components/AppLayout';

const NAVY = '#1B2B4B';
const GOLD = '#F5A623';

export default function ChatScreen() {
  const router = useRouter();
  const { partnerId, partnerName } = useLocalSearchParams();

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [userId, setUserId] = useState('');
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(false);
  const flatListRef = useRef(null);

  const safePartnerId = (partnerId && partnerId !== 'undefined') ? partnerId : null;

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const url = safePartnerId ? `/messages?partnerId=${safePartnerId}` : '/messages';
      const res = await api.get(url);
      setMessages(res.data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initUser = async () => {
      const storedUser = await AsyncStorage.getItem('user');
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        setUserId(parsed.id);
        setUserName(parsed.name || '');
      }
      fetchMessages();
    };
    initUser();
  }, [safePartnerId]);

  useEffect(() => {
    if (!userId) return;

    let socket = getSocket();
    if (!socket) return;

    const handlePrivateMsg = (msg) => {
      const senderId = msg.sender?._id || msg.sender;
      const receiverId = msg.receiver?._id || msg.receiver;
      if (
        (senderId === safePartnerId && receiverId === userId) ||
        (senderId === userId && receiverId === safePartnerId)
      ) {
        setMessages((prev) => {
          const withoutOptimistic = prev.filter(
            (m) => !(m._id?.startsWith('optimistic_') && (m.sender?._id || m.sender) === senderId && m.text === msg.text)
          );
          if (withoutOptimistic.find((m) => m._id === msg._id)) return withoutOptimistic;
          return [...withoutOptimistic, msg];
        });
      }
    };

    const handleTeamMsg = (msg) => {
      setMessages((prev) => {
        const senderId = msg.sender?._id || msg.sender;
        const withoutOptimistic = prev.filter(
          (m) => !(m._id?.startsWith('optimistic_') && (m.sender?._id || m.sender) === senderId && m.text === msg.text)
        );
        if (withoutOptimistic.find((m) => m._id === msg._id)) return withoutOptimistic;
        return [...withoutOptimistic, msg];
      });
    };

    if (safePartnerId) {
      socket.on('private_message', handlePrivateMsg);
    } else {
      socket.on('team_message', handleTeamMsg);
    }

    return () => {
      if (socket) {
        socket.off('private_message', handlePrivateMsg);
        socket.off('team_message', handleTeamMsg);
      }
    };
  }, [userId, safePartnerId]);

  const handleSend = async () => {
    if (!text.trim()) return;
    const msgText = text.trim();
    setText('');

    // Optimistic update — show message immediately in the UI
    const optimisticMsg = {
      _id: `optimistic_${Date.now()}`,
      text: msgText,
      sender: { _id: userId, name: userName },
      receiver: safePartnerId ? { _id: safePartnerId } : null,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    const payload = safePartnerId ? { text: msgText, receiver: safePartnerId } : { text: msgText };
    try {
      await api.post('/messages', payload);
    } catch (e) {
      // Remove the optimistic message on failure
      setMessages((prev) => prev.filter((m) => m._id !== optimisticMsg._id));
      Alert.alert('Error', 'Failed to send message. Please try again.');
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const renderMessage = ({ item, index }) => {
    const isMe = (item.sender?._id || item.sender) === userId;
    const senderName = item.sender?.name || 'Unknown';
    const prevItem = messages[index - 1];
    const prevSenderId = prevItem?.sender?._id || prevItem?.sender;
    const currSenderId = item.sender?._id || item.sender;
    const showName = !isMe && prevSenderId !== currSenderId;

    return (
      <View style={[styles.msgRow, isMe ? styles.msgRowMe : styles.msgRowOther]}>
        {/* Avatar for others — only shown on first message in a group */}
        {!isMe && (
          <View style={[styles.avatar, { opacity: showName ? 1 : 0 }]}>
            <Text style={styles.avatarText}>{getInitials(senderName)}</Text>
          </View>
        )}

        <View style={[styles.bubbleWrap, isMe ? styles.bubbleWrapMe : styles.bubbleWrapOther]}>
          {/* Sender name shown above received bubbles */}
          {showName && (
            <Text style={styles.senderName}>{senderName}</Text>
          )}

          <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
            <Text style={[styles.msgText, isMe ? styles.msgTextMe : styles.msgTextOther]}>
              {item.text}
            </Text>
            <Text style={[styles.timeText, isMe ? styles.timeTextMe : styles.timeTextOther]}>
              {formatTime(item.createdAt)}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <AppLayout currentScreen="Chat" scrollable={false}>
      <StatusBar barStyle="light-content" backgroundColor={NAVY} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerAvatar}>
          <Text style={styles.headerAvatarText}>
            {partnerName ? getInitials(partnerName) : '👥'}
          </Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {partnerName ? partnerName : 'Company Team Chat'}
          </Text>
          <View style={styles.onlineRow}>
            <View style={styles.onlineDot} />
            <Text style={styles.onlineText}>
              {partnerName ? 'Direct Message' : 'All members'}
            </Text>
          </View>
        </View>

        <TouchableOpacity onPress={fetchMessages} style={styles.refreshBtn} activeOpacity={0.7}>
          <Ionicons name="refresh-outline" size={20} color={GOLD} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {loading ? (
          <ActivityIndicator color={NAVY} size="large" style={{ marginTop: 60 }} />
        ) : messages.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="chatbubbles-outline" size={64} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>No messages yet</Text>
            <Text style={styles.emptyText}>
              {partnerName ? `Start a conversation with ${partnerName}` : 'Send the first message to the team!'}
            </Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item, i) => item._id || String(i)}
            contentContainerStyle={styles.messageList}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
            renderItem={renderMessage}
          />
        )}

        {/* Input Bar */}
        <View style={styles.inputBar}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={partnerName ? `Message ${partnerName}...` : 'Message the team...'}
            placeholderTextColor="#94a3b8"
            style={styles.input}
            multiline
            returnKeyType="send"
            onSubmitEditing={handleSend}
          />
          <TouchableOpacity
            onPress={handleSend}
            style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]}
            activeOpacity={0.8}
            disabled={!text.trim()}
          >
            <Ionicons name="send" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F7FA' },

  // ── Header ──
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: NAVY, paddingHorizontal: 16, paddingVertical: 14,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center',
  },
  headerAvatar: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: GOLD, alignItems: 'center', justifyContent: 'center',
  },
  headerAvatarText: { color: NAVY, fontWeight: '900', fontSize: 14 },
  headerTitle: { color: '#fff', fontWeight: '900', fontSize: 16 },
  onlineRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  onlineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#22c55e' },
  onlineText: { color: '#9EB4D0', fontSize: 11, fontWeight: '500' },
  refreshBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center',
  },

  // ── Messages ──
  messageList: { padding: 16, paddingBottom: 8 },
  msgRow: { flexDirection: 'row', marginBottom: 6, alignItems: 'flex-end' },
  msgRowMe: { justifyContent: 'flex-end' },
  msgRowOther: { justifyContent: 'flex-start' },

  avatar: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: NAVY, alignItems: 'center', justifyContent: 'center',
    marginRight: 8, flexShrink: 0,
  },
  avatarText: { color: GOLD, fontWeight: '900', fontSize: 10 },

  bubbleWrap: { maxWidth: '75%' },
  bubbleWrapMe: { alignItems: 'flex-end' },
  bubbleWrapOther: { alignItems: 'flex-start' },

  senderName: {
    fontSize: 11, fontWeight: '900', color: '#475569',
    marginBottom: 3, marginLeft: 2,
  },

  bubble: {
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18,
  },
  bubbleMe: {
    backgroundColor: NAVY, borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: '#fff', borderBottomLeftRadius: 4,
    borderWidth: 1, borderColor: '#e2e8f0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1,
  },

  msgText: { fontSize: 14, lineHeight: 20 },
  msgTextMe: { color: '#fff' },
  msgTextOther: { color: '#0f172a' },

  timeText: { fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },
  timeTextMe: { color: 'rgba(255,255,255,0.55)' },
  timeTextOther: { color: '#94a3b8' },

  // ── Empty State ──
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '900', color: '#334155', marginTop: 16 },
  emptyText: { fontSize: 13, color: '#94a3b8', marginTop: 6, textAlign: 'center', lineHeight: 20 },

  // ── Input Bar ──
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e2e8f0',
  },
  input: {
    flex: 1, backgroundColor: '#f1f5f9', borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0',
    paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: '#0f172a',
    maxHeight: 100, minHeight: 44,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: NAVY, alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#94a3b8' },
});
