import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '../components/Header';
import api from '../api/api';
import { connectSocket } from '../utils/socket';

export default function NotificationScreen({ navigation }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await api.get('/notifications');
      setNotifications(res.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleGoBack = () => {
    if (navigation?.canGoBack?.()) navigation.goBack();
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  useEffect(() => {
    let socket;
    let isMounted = true;

    const initSocket = async () => {
      socket = await connectSocket();
      if (!socket) return;

      const handleIncomingNotification = (notif) => {
        if (!isMounted || !notif?._id) return;
        setNotifications((prev) => {
          if (prev.some((item) => item._id === notif._id)) return prev;
          return [notif, ...prev];
        });
      };

      socket.on('notification', handleIncomingNotification);
    };

    initSocket();

    return () => {
      isMounted = false;
      if (socket) {
        socket.off('notification');
      }
    };
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await api.put('/notifications/all/read');
      fetchNotifications();
    } catch (e) {
      Alert.alert('Error', 'Failed to mark notifications read');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <View className="p-6 flex-1">
        <View className="flex-row justify-between items-center mb-4">
          <Header title="Alerts & Notices" onBack={handleGoBack} />
          {notifications.filter((n) => !n.isRead).length > 0 && (
            <TouchableOpacity onPress={handleMarkAllRead} className="absolute right-0 top-3">
              <Text className="text-sky-600 font-bold text-xs underline">Mark all read</Text>
            </TouchableOpacity>
          )}
        </View>

        <FlatList
          data={notifications}
          keyExtractor={(item) => item._id}
          refreshing={loading}
          onRefresh={fetchNotifications}
          ListEmptyComponent={() => (
            <View className="flex-1 items-center justify-center pt-20">
              <Text className="text-xs text-slate-500">
                No notifications found.
              </Text>
            </View>
          )}
          renderItem={({ item }) => (
            <View className={`mb-3 p-4 bg-white border rounded-3xl ${!item.isRead ? 'border-sky-200 border-2' : 'border-slate-200'} shadow-sm`}>
              <View className="flex-row justify-between items-start">
                <View className="flex-1 pr-2">
                  <Text className="font-bold text-xs text-slate-900">
                    {item.title}
                  </Text>
                  <Text className="text-[11px] leading-relaxed mt-1 text-slate-500">
                    {item.message}
                  </Text>
                </View>

                {!item.isRead && (
                  <View className="w-2.5 h-2.5 rounded-full bg-sky-500" />
                )}
              </View>

              <View className="mt-3 pt-2.5 border-t border-slate-200 flex-row justify-between text-[9px] text-slate-500">
                <Text>Type: {item.type}</Text>
                <Text>{new Date(item.createdAt).toLocaleDateString()} {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
              </View>
            </View>
          )}
        />
      </View>
    </SafeAreaView>
  );
}
