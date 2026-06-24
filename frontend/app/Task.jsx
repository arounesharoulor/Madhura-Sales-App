import React from 'react';
import { useNavigation } from 'expo-router';
import TaskScreen from '../screens/TaskScreen';

export default function Page() {
  const navigation = useNavigation();
  return <TaskScreen navigation={navigation} />;
}
