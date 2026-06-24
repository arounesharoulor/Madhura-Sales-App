import React from 'react';
import { useNavigation } from 'expo-router';
import AdminDashboardPremium from '../screens/AdminDashboardPremium';

export default function Page() {
  const navigation = useNavigation();
  return <AdminDashboardPremium navigation={navigation} />;
}
