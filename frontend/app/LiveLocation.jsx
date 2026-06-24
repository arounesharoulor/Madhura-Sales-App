import React from 'react';
import { useNavigation } from 'expo-router';
import LiveLocationScreen from '../screens/LiveLocationScreen';

export default function Page() {
  const navigation = useNavigation();
  return <LiveLocationScreen navigation={navigation} />;
}
