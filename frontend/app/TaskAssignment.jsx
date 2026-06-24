import React from 'react';
import { useNavigation } from 'expo-router';
import TaskAssignmentScreen from '../screens/TaskAssignmentScreen';

export default function Page() {
  const navigation = useNavigation();
  return <TaskAssignmentScreen navigation={navigation} />;
}
