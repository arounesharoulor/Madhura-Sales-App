import React from 'react';
import { useNavigation } from 'expo-router';
import WorkUpdateScreen from '../screens/WorkUpdateScreen';

export default function Page() {
  const navigation = useNavigation();
  return <WorkUpdateScreen navigation={navigation} />;
}
