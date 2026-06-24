import React from 'react';
import { useNavigation } from 'expo-router';
import UserManagementScreen from '../screens/UserManagementScreen';

export default function Page() {
  const navigation = useNavigation();
  return <UserManagementScreen navigation={navigation} />;
}
