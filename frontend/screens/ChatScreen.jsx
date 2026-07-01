import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Header from '../components/Header';
import api from '../api/api';
import { connectSocket, getSocket } from '../utils/socket';

export default function ChatScreen({ route, navigation }) {
  const partnerId = route?.params?.partnerId;
  const partnerName = route?.params?.partnerName;

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const flatListRef = useRef(null);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const url = partnerId ? `/messages?partnerId=${partnerId}` : '/messages';
      const res = await api.get(url);
      setMessages(res.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleGoBack = () => {
    if (navigation?.canGoBack?.()) navigation.goBack();
  };

  const setupChat = async () => {
    let currentUserId = '';
    const storedUser = await AsyncStorage.getItem('user');
    if (storedUser) {
      currentUserId = JSON.parse(storedUser).id;
      setUserId(currentUserId);
    }

    await fetchMessages();

    let socket = getSocket();
    if (!socket) {
      socket = await connectSocket();
    }

    if (socket) {
      if (partnerId) {
        socket.on('private_message', (msg) => {
          if (
            (msg.sender._id === partnerId && msg.receiver._id === currentUserId) ||
            (msg.sender._id === currentUserId && msg.receiver._id === partnerId)
          ) {
            setMessages((prev) => [...prev, msg]);
          }
        });
      } else {
        socket.on('team_message', (msg) => {
          setMessages((prev) => [...prev, msg]);
        });
      }
    }
  };

  useEffect(() => {
    setupChat();
  }, []);

  const handleSend = async () => {
    if (!text.trim()) return;

    try {
      const payload = partnerId ? { text, receiver: partnerId } : { text };
      setText('');
      await api.post('/messages', payload);
    } catch (e) {
      Alert.alert('Error', 'Failed to dispatch message');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <View className="p-6 flex-1">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1"
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          <Header title={partnerName ? `Chat with ${partnerName}` : "Company Team Chat"} onBack={handleGoBack} />

          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item._id}
            refreshing={loading}
            onRefresh={fetchMessages}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
            renderItem={({ item }) => {
              const isMe = item.sender?._id === userId;

              return (
                <View className={`mb-3 max-w-[80%] ${isMe ? 'self-end' : 'self-start'}`}>
                  {!isMe && (
                    <Text className="text-[9px] font-bold mb-1 ml-1.5 uppercase tracking-wide text-slate-500">
                      {item.sender?.name} ({item.sender?.role})
                    </Text>
                  )}
                  
                  <View className={`px-4 py-3 rounded-2xl ${
                    isMe
                      ? 'bg-sky-600 rounded-tr-none'
                      : 'bg-white rounded-tl-none border border-slate-200 shadow-sm'
                  }`}>
                    <Text className={`text-xs ${isMe ? 'text-white' : 'text-slate-900'}`}>
                      {item.text}
                    </Text>
                    
                    <Text className={`text-[8px] self-end mt-1 ${isMe ? 'text-white/70' : 'text-slate-400'}`}>
                      {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                </View>
              );
            }}
          />

          <View className="flex-row items-center pt-3 border-t border-slate-200 bg-transparent">
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Write a message to the team..."
              placeholderTextColor="#475569"
              className="flex-1 px-4 py-3 rounded-2xl text-xs bg-white text-slate-900 border border-slate-200"
            />
            <TouchableOpacity
              onPress={handleSend}
              className="ml-3 bg-sky-600 p-3.5 rounded-2xl justify-center items-center"
            >
              <Text className="text-white font-bold text-xs">Send</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}
