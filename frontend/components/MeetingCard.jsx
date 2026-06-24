import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const MeetingCard = ({ item }) => {
  return (
    <View className="mb-4 p-5 bg-white border border-slate-200 rounded-3xl shadow-sm">
      <View className="flex-row justify-between items-start">
        <View className="flex-row items-start gap-3">
          <View className="w-11 h-11 rounded-2xl bg-sky-50 items-center justify-center">
            <Ionicons name="business-outline" size={20} color="#0284c7" />
          </View>
          <View className="flex-1">
            <Text className="font-semibold text-slate-900 text-base">
              {item.clientName}
            </Text>
            <Text className="text-xs text-slate-500 mt-1">
              {item.companyName}
            </Text>
            <Text className="text-sm leading-relaxed mt-3 text-slate-600">
              {item.notes}
            </Text>
          </View>
        </View>
        <Text className="text-[10px] text-slate-400">
          {new Date(item.createdAt || item.timestamp).toLocaleDateString()}
        </Text>
      </View>
      <View className="mt-4 pt-4 border-t border-slate-200 flex-row justify-between items-center">
        <Text className="text-[11px] text-slate-500">
          Phone: {item.phone}
        </Text>
        {item.nextFollowUpDate && (
          <Text className="text-[11px] text-amber-600 font-semibold">
            Follow-up: {new Date(item.nextFollowUpDate).toLocaleDateString()}
          </Text>
        )}
      </View>
    </View>
  );
};

export default MeetingCard;
