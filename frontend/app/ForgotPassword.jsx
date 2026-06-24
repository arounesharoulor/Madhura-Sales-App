import React from 'react';
import { useNavigation } from 'expo-router';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';

export default function Page() {
  const navigation = useNavigation();
  return <ForgotPasswordScreen navigation={navigation} />;
}
