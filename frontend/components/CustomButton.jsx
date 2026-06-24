import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator } from 'react-native';

const CustomButton = ({ title, loading, style = '', textStyle = '', ...props }) => {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      disabled={loading}
      className={`bg-sky-600 active:bg-sky-700 py-4 px-6 rounded-2xl flex-row items-center justify-center shadow-lg shadow-sky-900/10 ${style}`}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color="#ffffff" size="small" />
      ) : (
        <Text className={`text-white font-bold text-sm text-center ${textStyle}`}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

export default CustomButton;
