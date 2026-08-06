import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'react-native';

export default function WelcomeScreen() {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.9));

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      })
    ]).start();

    const proceed = async () => {
      try {
        const userStr = await AsyncStorage.getItem('user');
        const user = userStr ? JSON.parse(userStr) : null;
        
        setTimeout(() => {
          const adminRoles = ['Admin', 'Project Manager', 'Team Lead', 'HR', 'Managing Director MD'];
          if (user && adminRoles.includes(user.role)) {
            router.replace('/AdminDashboard');
          } else {
            router.replace('/Dashboard');
          }
        }, 2500); // Wait 2.5s to show the logo
      } catch (e) {
        router.replace('/Login');
      }
    };
    
    proceed();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View 
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }]
          }
        ]}
      >
        <Image 
          source={require('../assets/madhura.png')} 
          style={{width: 140, height: 140, borderRadius: 24, marginBottom: 16}} 
          resizeMode="contain" 
        />
        <Text style={styles.title}>Welcome to Madhura CRM</Text>
        <Text style={styles.subtitle}>Setting up your workspace...</Text>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1B2B4B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    marginTop: 24,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#9EB4D0',
    textAlign: 'center',
  }
});
