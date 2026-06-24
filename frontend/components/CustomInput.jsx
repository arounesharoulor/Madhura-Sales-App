import React from 'react';
import { View, Text, TextInput } from 'react-native';

const CustomInput = ({ label, error, style = '', ...props }) => {
  return (
    <View className="mb-4">
      {label && (
        <Text className="text-[10px] font-bold uppercase tracking-wider mb-1.5 text-slate-500">
          {label}
        </Text>
      )}
      <TextInput
        placeholderTextColor="#94a3b8"
        className={`px-4 py-3.5 border rounded-2xl text-sm bg-white border-slate-200 text-slate-900 focus:border-sky-500 ${style}`}
        style={{ outlineStyle: 'none' }}
        {...props}
      />
      {error && (
        <Text className="text-rose-500 text-xs font-semibold mt-1 pl-1">
          {error}
        </Text>
      )}
    </View>
  );
};

export default CustomInput;
