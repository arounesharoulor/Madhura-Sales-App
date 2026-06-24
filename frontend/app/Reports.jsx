import React from 'react';
import { useNavigation } from 'expo-router';
import ReportsScreen from '../screens/ReportsScreen';

export default function Page() {
  const navigation = useNavigation();
  return <ReportsScreen navigation={navigation} />;
}
