import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const Header = ({ title, onBack }) => {
  return (
    <View className="flex-row items-center justify-between pb-4 border-b border-slate-200 mb-4">
      {onBack ? (
        <TouchableOpacity onPress={onBack} className="py-2 pr-4">
          <Ionicons name="chevron-back-outline" size={22} color="#0f172a" />
        </TouchableOpacity>
      ) : (
        <View style={{ width: 40 }} />
      )}
      <Text className="text-lg font-bold text-slate-900 tracking-wide">{title}</Text>
      <View style={{ width: 40 }} />
    </View>
  );
};

export default Header;
