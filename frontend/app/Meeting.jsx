import React from 'react';
import { useNavigation } from 'expo-router';
import MeetingScreen from '../screens/MeetingScreen';

export default function Page() {
  const navigation = useNavigation();
  return <MeetingScreen navigation={navigation} />;
}
