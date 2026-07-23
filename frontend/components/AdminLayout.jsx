import { router } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, useWindowDimensions, Pressable, StyleSheet, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { connectSocket } from '../utils/socket';
import Toast from 'react-native-toast-message';

const navSections = [
  {
    title: 'Overview',
    items: [
      { title: 'Dashboard', screen: 'AdminDashboard', icon: 'grid-outline', iconActive: 'grid' },
    ],
  },
  {
    title: 'Management',
    items: [
      { title: 'Team Members', screen: 'UserManagement', icon: 'people-outline', iconActive: 'people' },
      { title: 'Assign Tasks', screen: 'TaskAssignment', icon: 'send-outline', iconActive: 'send' },
      { title: 'Task History', screen: 'Task', icon: 'clipboard-outline', iconActive: 'clipboard' },
      { title: 'Attendance', screen: 'AdminAttendance', icon: 'calendar-outline', iconActive: 'calendar' },
    ],
  },
  {
    title: 'Monitor',
    items: [
      { title: 'Live Locations', screen: 'LiveLocation', icon: 'location-outline', iconActive: 'location' },
      { title: 'Reports', screen: 'Reports', icon: 'bar-chart-outline', iconActive: 'bar-chart' },
    ],
  },
];

export default function AdminLayout({ children, currentScreen, scrollable = true }) {
  
  const { width } = useWindowDimensions();
  const [adminName, setAdminName] = useState('Admin');
  const [adminInitial, setAdminInitial] = useState('A');
  const [isSidebarOpen, setIsSidebarOpen] = useState(width > 768);

  useEffect(() => {
    const load = async () => {
      const stored = await AsyncStorage.getItem('user');
      if (stored) {
        const user = JSON.parse(stored);
        setAdminName(user.name || 'Admin');
        setAdminInitial(user.name?.charAt(0)?.toUpperCase() || 'A');
      }
    };
    load();
  }, []);

  useEffect(() => {
    let activeSocket = null;
    const initSocket = async () => {
      activeSocket = await connectSocket();
      if (activeSocket) {
        activeSocket.on('notification', (notif) => {
          Toast.show({
            type: notif.type === 'Warning' ? 'error' : notif.type === 'Info' ? 'success' : 'info',
            text1: notif.title,
            text2: notif.message,
            visibilityTime: 6000,
          });
        });
      }
    };
    initSocket();
    return () => { if (activeSocket) activeSocket.off('notification'); };
  }, []);

  useEffect(() => {
    setIsSidebarOpen(width > 768);
  }, [width]);

  const handleLogout = async () => {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');
    router.replace('/Login');
  };

  const handleNav = (screen) => {
    if (width <= 768) setIsSidebarOpen(false);
    router.push(screen.startsWith('/') ? screen : '/' + screen);
  };

  const isDesktop = width > 768;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.root}>

        {/* ── Mobile Top Bar ── */}
        {!isDesktop && (
          <View style={styles.mobileTopBar}>
            <View style={styles.mobileTopLeft}>
              <View style={styles.mobileLogo}>
                <Image source={require('../assets/logo.png')} style={{width: 44, height: 44, borderRadius: 12}} resizeMode="contain" />
              </View>
              <Text style={styles.mobileBrand}>Madhura</Text>
            </View>
            <TouchableOpacity
              onPress={() => setIsSidebarOpen(!isSidebarOpen)}
              style={styles.mobileMenuBtn}
            >
              <Ionicons name={isSidebarOpen ? 'close' : 'menu'} size={24} color="#f8fafc" />
            </TouchableOpacity>
          </View>
        )}

        {/* ── Mobile Overlay ── */}
        {isSidebarOpen && !isDesktop && (
          <Pressable
            style={styles.overlay}
            onPress={() => setIsSidebarOpen(false)}
          />
        )}

        {/* ── Sidebar ── */}
        {isSidebarOpen && (
          <View style={[
            styles.sidebar,
            isDesktop ? styles.sidebarDesktop : styles.sidebarMobile,
          ]}>
            {/* Brand Header */}
            <View style={styles.sidebarHeader}>
              <View style={styles.sidebarAvatarWrap}>
                <View style={styles.sidebarAvatar}>
                  <Text style={styles.sidebarAvatarText}>{adminInitial}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sidebarPortalLabel}>ADMIN PORTAL</Text>
                  <Text style={styles.sidebarName} numberOfLines={1}>{adminName}</Text>
                </View>
                <View style={styles.sidebarOnlineDot} />
              </View>
            </View>

            {/* Nav Sections */}
            <ScrollView
              style={{ flex: 1 }}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.navScroll}
            >
              {navSections.map((section) => (
                <View key={section.title} style={styles.navSection}>
                  <Text style={styles.navSectionTitle}>{section.title}</Text>
                  {section.items.map((item) => {
                    const isActive = currentScreen === item.screen;
                    return (
                      <TouchableOpacity
                        key={item.screen}
                        onPress={() => handleNav(item.screen)}
                        style={[styles.navItem, isActive && styles.navItemActive]}
                        activeOpacity={0.75}
                      >
                        <View style={[styles.navIconWrap, isActive && styles.navIconWrapActive]}>
                          <Ionicons
                            name={isActive ? item.iconActive : item.icon}
                            size={18}
                            color={isActive ? '#0284c7' : '#64748b'}
                          />
                        </View>
                        <Text style={[styles.navItemText, isActive && styles.navItemTextActive]}>
                          {item.title}
                        </Text>
                        {isActive && <View style={styles.navActiveBar} />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </ScrollView>

            {/* Logout */}
            <View style={styles.sidebarFooter}>
              <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn} activeOpacity={0.8}>
                <Ionicons name="log-out-outline" size={20} color="#f43f5e" />
                <Text style={styles.logoutText}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── Main Content ── */}
        <View style={styles.main}>
          {scrollable ? (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[
                styles.mainContent,
                { padding: isDesktop ? 32 : 16 },
              ]}
            >
              {children}
            </ScrollView>
          ) : (
            <View style={[
              styles.mainFlex,
              { padding: isDesktop ? 32 : 16 },
            ]}>
              {children}
            </View>
          )}
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0f172a' },
  root: { flex: 1, flexDirection: 'row' },

  // Mobile top bar
  mobileTopBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#0f172a', paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#1e293b',
  },
  mobileTopLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mobileLogo: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: '#0284c7', alignItems: 'center', justifyContent: 'center',
  },
  mobileLogoText: { color: '#fff', fontWeight: '900', fontSize: 16 },
  mobileBrand: { color: '#f8fafc', fontWeight: '700', fontSize: 18 },
  mobileMenuBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#1e293b', alignItems: 'center', justifyContent: 'center',
  },

  // Overlay
  overlay: {
    position: 'absolute', top: 0, bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 10,
  },

  // Sidebar
  sidebar: {
    backgroundColor: '#0f172a',
    borderRightWidth: 1, borderRightColor: '#1e293b',
    zIndex: 20,
  },
  sidebarDesktop: { width: 260 },
  sidebarMobile: { position: 'absolute', top: 0, bottom: 0, left: 0, width: '80%', maxWidth: 280 },

  sidebarHeader: {
    paddingHorizontal: 16, paddingTop: 20, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: '#1e293b',
  },
  sidebarAvatarWrap: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sidebarAvatar: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: '#0284c7', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  sidebarAvatarText: { color: '#fff', fontWeight: '900', fontSize: 18 },
  sidebarPortalLabel: { fontSize: 9, color: '#475569', fontWeight: '800', letterSpacing: 1.5, marginBottom: 2 },
  sidebarName: { color: '#f8fafc', fontWeight: '800', fontSize: 15 },
  sidebarOnlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22c55e', flexShrink: 0 },

  navScroll: { paddingBottom: 8 },
  navSection: { paddingTop: 20, paddingHorizontal: 12 },
  navSectionTitle: {
    fontSize: 9, fontWeight: '800', color: '#334155',
    letterSpacing: 1.5, textTransform: 'uppercase',
    marginBottom: 6, paddingLeft: 4,
  },
  navItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 12, paddingVertical: 11,
    borderRadius: 14, marginBottom: 2, position: 'relative',
  },
  navItemActive: { backgroundColor: '#0c1929' },
  navIconWrap: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: '#1e293b', alignItems: 'center', justifyContent: 'center',
  },
  navIconWrapActive: { backgroundColor: '#0c2d4a' },
  navItemText: { flex: 1, fontSize: 13, color: '#64748b', fontWeight: '600' },
  navItemTextActive: { color: '#e2e8f0', fontWeight: '700' },
  navActiveBar: {
    position: 'absolute', right: 0, top: '25%', bottom: '25%',
    width: 3, borderRadius: 3, backgroundColor: '#0284c7',
  },

  sidebarFooter: {
    borderTopWidth: 1, borderTopColor: '#1e293b',
    padding: 12,
  },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 12, paddingVertical: 12,
    borderRadius: 14, backgroundColor: '#1a0a0e',
  },
  logoutText: { color: '#f43f5e', fontWeight: '700', fontSize: 13 },

  // Main content
  main: { flex: 1, backgroundColor: '#f8fafc' },
  mainContent: { flexGrow: 1, paddingBottom: 60 },
  mainFlex: { flex: 1, paddingBottom: 60 },
});
