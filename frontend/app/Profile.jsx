import React from 'react';
import { useNavigation } from 'expo-router';
import ProfileScreen from '../screens/ProfileScreen';

export default function Page() {
  const navigation = useNavigation();
  return <ProfileScreen navigation={navigation} />;
}
