import React from 'react';
import { useNavigation } from 'expo-router';
import AdminFollowupManagementScreen from '../screens/AdminFollowupManagementScreen';

export default function Page() {
  const navigation = useNavigation();
  return <AdminFollowupManagementScreen navigation={navigation} />;
}
