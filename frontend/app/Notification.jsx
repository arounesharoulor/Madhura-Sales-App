import React from 'react';
import { useNavigation } from 'expo-router';
import NotificationScreen from '../screens/NotificationScreen';

export default function Page() {
  const navigation = useNavigation();
  return <NotificationScreen navigation={navigation} />;
}
