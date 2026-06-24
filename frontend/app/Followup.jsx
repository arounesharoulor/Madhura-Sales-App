import React from 'react';
import { useNavigation } from 'expo-router';
import FollowupScreen from '../screens/FollowupScreen';

export default function Page() {
  const navigation = useNavigation();
  return <FollowupScreen navigation={navigation} />;
}
