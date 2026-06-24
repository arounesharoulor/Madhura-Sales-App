import React from 'react';
import { useNavigation } from 'expo-router';
import ChatScreen from '../screens/ChatScreen';

export default function Page() {
  const navigation = useNavigation();
  return <ChatScreen navigation={navigation} />;
}
