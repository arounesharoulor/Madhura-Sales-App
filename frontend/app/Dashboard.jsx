import React from 'react';
import { useNavigation } from 'expo-router';
import DashboardScreen from '../screens/DashboardScreen';

export default function Page() {
  const navigation = useNavigation();
  return <DashboardScreen navigation={navigation} />;
}
