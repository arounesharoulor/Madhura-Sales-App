import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, useWindowDimensions, Pressable, StyleSheet, Platform, Vibration, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from 'expo-router';
import { connectSocket, disconnectSocket } from '../utils/socket';
import Toast from 'react-native-toast-message';
import * as Location from 'expo-location';

// ── Brand Tokens ──────────────────────────────────────────────────
const NAVY   = '#1B2B4B';   // Madhura deep navy
const GOLD   = '#F5A623';   // Madhura amber/gold
const NAVY_2 = '#243454';   // slightly lighter navy for hover
const GOLD_BG= '#FFF8EC';   // gold tint background
// ──────────────────────────────────────────────────────────────────

// ── Cross-platform notification sound ─────────────────────────────
const playNotificationSound = () => {
  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.45);
    } else {
      // Mobile: short double-vibrate as audio cue
      Vibration.vibrate([0, 80, 60, 80]);
    }
  } catch (_) {}
};
// ──────────────────────────────────────────────────────────────────

const adminNavSections = [
  {
    title: 'Operations',
    items: [
      { title: 'Dashboard',         screen: 'AdminDashboard',           icon: 'grid-outline',      iconActive: 'grid' },
      { title: 'Field Staff Mgmt',  screen: 'UserManagement',           icon: 'people-outline',    iconActive: 'people' },
      { title: 'Task Assignments',  screen: 'TaskAssignment',           icon: 'clipboard-outline', iconActive: 'clipboard' },
      { title: 'Client Onboarding', screen: 'ClientOnboarding',         icon: 'briefcase-outline', iconActive: 'briefcase' },
      { title: 'Follow-up Mgmt',   screen: 'AdminFollowupManagement',  icon: 'alarm-outline',     iconActive: 'alarm' },
    ],
  },
  {
    title: 'Tracking',
    items: [
      { title: 'Live Map & GPS',  screen: 'LiveLocation',    icon: 'map-outline',      iconActive: 'map' },
      { title: 'Attendance Log',  screen: 'AdminAttendance', icon: 'time-outline',     iconActive: 'time' },
      { title: 'Reports',         screen: 'Reports',         icon: 'bar-chart-outline',iconActive: 'bar-chart' },
      { title: 'Profile',         screen: 'Profile',         icon: 'person-outline',   iconActive: 'person' },
    ],
  },
];

const employeeNavSections = [
  {
    title: 'Operations',
    items: [
      { title: 'Home',             screen: 'Dashboard',       icon: 'home-outline',          iconActive: 'home' },
      { title: 'Daily Attendance', screen: 'Attendance',      icon: 'calendar-outline',      iconActive: 'calendar' },
      { title: 'Log Client Visit', screen: 'Meeting',         icon: 'location-outline',      iconActive: 'location' },
      { title: 'Work Update',      screen: 'WorkUpdate',      icon: 'document-text-outline', iconActive: 'document-text' },
      { title: 'Client Onboarding',screen: 'ClientOnboarding',icon: 'briefcase-outline',     iconActive: 'briefcase' },
    ],
  },
  {
    title: 'Tracking',
    items: [
      { title: 'Assigned Tasks',   screen: 'Task',            icon: 'clipboard-outline',     iconActive: 'clipboard' },
      { title: 'Follow-ups',       screen: 'Followup',        icon: 'alarm-outline',         iconActive: 'alarm' },
      { title: 'Reports',          screen: 'Reports',         icon: 'bar-chart-outline',     iconActive: 'bar-chart' },
      { title: 'Chat',             screen: 'Chat',            icon: 'chatbubbles-outline',   iconActive: 'chatbubbles' },
      { title: 'Notifications',    screen: 'Notification',    icon: 'notifications-outline', iconActive: 'notifications' },
      { title: 'Support',          screen: 'Support',         icon: 'help-buoy-outline',     iconActive: 'help-buoy' },
      { title: 'Profile',          screen: 'Profile',         icon: 'person-outline',        iconActive: 'person' },
    ],
  },
];

export default function AppLayout({ children, currentScreen, scrollable = true, role = 'Admin' }) {
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const [userName, setUserName] = useState('');
  const [userInitial, setUserInitial] = useState('?');
  const [userRole, setUserRole] = useState(role);
  const [userDesignation, setUserDesignation] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(width > 768);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const load = async () => {
      const stored = await AsyncStorage.getItem('user');
      if (stored) {
        const user = JSON.parse(stored);
        setUserName(user.name || '');
        setUserInitial(user.name?.charAt(0)?.toUpperCase() || '?');
        setUserRole(user.role || role);
        // For employees: designation IS their role label; for admins: show designation if set
        setUserDesignation(user.designation || '');
      }
    };
    load();
  }, [role]);

  useEffect(() => {
    let activeSocket = null;
    const initSocket = async () => {
      activeSocket = await connectSocket();
      if (activeSocket) {
        activeSocket.on('notification', (notif) => {
          // Play sound
          playNotificationSound();
          // Show toast
          Toast.show({
            type: notif.type === 'Warning' ? 'error' : notif.type === 'Success' ? 'success' : 'info',
            text1: notif.title,
            text2: notif.message,
            visibilityTime: 6000,
            onPress: () => {
              Toast.hide();
              setUnreadCount(0);
              navigation.navigate('Notification');
            }
          });
          // Bump unread badge
          setUnreadCount(prev => prev + 1);
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
    try {
      await Location.stopLocationUpdatesAsync('background-location-task');
    } catch (e) {}
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');
    disconnectSocket();
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  const handleNav = (screen) => {
    if (width <= 768) setIsSidebarOpen(false);
    navigation.navigate(screen);
  };

  const isDesktop = width > 768;
  const navSections = role === 'Admin' ? adminNavSections : employeeNavSections;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={[styles.root, { flexDirection: isDesktop ? 'row' : 'column' }]}>

        {/* ── Mobile Top Bar ── */}
        {!isDesktop && (
          <View style={styles.mobileTopBar}>
            <View style={styles.mobileTopLeft}>
              <TouchableOpacity
                onPress={() => setIsSidebarOpen(!isSidebarOpen)}
                style={styles.mobileMenuBtn}
              >
                <Ionicons name={isSidebarOpen ? 'close' : 'menu'} size={24} color="#fff" />
              </TouchableOpacity>
              {/* Logo mark */}
              <View style={styles.mobileLogo}>
                <Image source={require('../assets/logo.png')} style={{width: 34, height: 34, borderRadius: 10}} resizeMode="contain" />
              </View>
              <View>
                <Text style={styles.mobileBrand}>MADHURA</Text>
                <Text style={styles.mobileSub}>Sales Portal</Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => {
                setUnreadCount(0);
                navigation.navigate('Notification');
              }}
              style={styles.bellBtn}
            >
              <Ionicons name="notifications-outline" size={22} color={GOLD} />
              {unreadCount > 0 && (
                <View style={styles.bellBadge}>
                  <Text style={styles.bellBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              )}
              {unreadCount === 0 && <View style={styles.bellDot} />}
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
              {/* Logo row */}
              <View style={styles.logoRow}>
                <View style={styles.logoMark}>
                  <Image source={require('../assets/logo.png')} style={{width: 40, height: 40, borderRadius: 12}} resizeMode="contain" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.logoTitle}>MADHURA</Text>
                  <Text style={styles.logoSub}>Sales Portal</Text>
                </View>
                <View style={styles.sidebarOnlineDot} />
              </View>

              {/* User pill */}
              <View style={styles.userPill}>
                <View style={styles.userAvatar}>
                  <Text style={styles.userAvatarText}>{userInitial}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.userPortalLabel}>
                    {userRole === 'Admin' ? 'ADMIN PORTAL' : (userDesignation ? userDesignation.toUpperCase() : 'EMPLOYEE PORTAL')}
                  </Text>
                  <Text style={styles.userName} numberOfLines={1}>{userName}</Text>
                </View>
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
                            size={17}
                            color={isActive ? GOLD : '#9EB4D0'}
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
                <Ionicons name="log-out-outline" size={18} color="#f87171" />
                <Text style={styles.logoutText}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── Main Content ── */}
        <View style={styles.main}>
          {currentScreen !== 'AdminDashboard' && currentScreen !== 'Dashboard' && (
            <TouchableOpacity 
              onPress={() => navigation.navigate(role === 'Admin' ? 'AdminDashboard' : 'Dashboard')}
              style={[
                styles.globalBackBtn,
                { paddingHorizontal: isDesktop ? 32 : 16, paddingTop: isDesktop ? 32 : 16, paddingBottom: isDesktop ? 0 : 8 }
              ]}
              activeOpacity={0.7}
            >
              <View style={{ backgroundColor: '#f1f5f9', padding: 6, borderRadius: 10 }}>
                <Ionicons name="arrow-back" size={18} color="#475569" />
              </View>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#475569' }}>Back to Dashboard</Text>
            </TouchableOpacity>
          )}
          
          {scrollable ? (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[
                styles.mainContent,
                { padding: isDesktop ? 32 : 16, paddingTop: currentScreen !== 'AdminDashboard' && currentScreen !== 'Dashboard' ? 16 : (isDesktop ? 32 : 16) },
              ]}
            >
              {children}
            </ScrollView>
          ) : (
            <View style={[
              styles.mainFlex,
              { padding: isDesktop ? 32 : 16, paddingTop: currentScreen !== 'AdminDashboard' && currentScreen !== 'Dashboard' ? 16 : (isDesktop ? 32 : 16) },
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
  safe: { flex: 1, backgroundColor: NAVY },
  root: { flex: 1, flexDirection: 'row' },

  // ── Mobile top bar ──
  mobileTopBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: NAVY, paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#243454',
  },
  mobileTopLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mobileLogo: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: GOLD, alignItems: 'center', justifyContent: 'center',
  },
  mobileLogoText: { color: NAVY, fontWeight: '900', fontSize: 18 },
  mobileBrand: { color: '#fff', fontWeight: '900', fontSize: 15, letterSpacing: 1.5 },
  mobileSub:   { color: GOLD,  fontWeight: '600', fontSize: 9,  letterSpacing: 0.5 },
  mobileMenuBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#243454', alignItems: 'center', justifyContent: 'center',
  },
  bellBtn: {
    width: 38, height: 38, borderRadius: 11,
    backgroundColor: '#243454', alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  bellDot: {
    position: 'absolute', top: 8, right: 9, width: 7, height: 7,
    borderRadius: 4, backgroundColor: '#ef4444', borderWidth: 1, borderColor: NAVY,
  },
  bellBadge: {
    position: 'absolute', top: 4, right: 4, minWidth: 16, height: 16,
    borderRadius: 8, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: NAVY, paddingHorizontal: 2,
  },
  bellBadgeText: { color: '#fff', fontSize: 8, fontWeight: '900' },

  // ── Overlay ──
  overlay: {
    position: 'absolute', top: 0, bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.55)', zIndex: 10,
  },

  // ── Sidebar ──
  sidebar: {
    backgroundColor: NAVY,
    borderRightWidth: 1, borderRightColor: '#243454',
    zIndex: 20,
  },
  sidebarDesktop: { width: 260 },
  sidebarMobile: { position: 'absolute', top: 0, bottom: 0, left: 0, width: '80%', maxWidth: 280 },

  sidebarHeader: {
    paddingHorizontal: 16, paddingTop: 20, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: '#243454',
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  logoMark: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: GOLD, alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  logoMarkText: { color: NAVY, fontWeight: '900', fontSize: 22 },
  logoTitle: { color: '#fff', fontWeight: '900', fontSize: 14, letterSpacing: 2 },
  logoSub:   { color: GOLD,  fontWeight: '600', fontSize: 9,  letterSpacing: 0.5, marginTop: 1 },
  sidebarOnlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22c55e', flexShrink: 0 },

  userPill: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#243454', borderRadius: 14, padding: 10,
  },
  userAvatar: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: GOLD, alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  userAvatarText: { color: NAVY, fontWeight: '900', fontSize: 16 },
  userPortalLabel: { fontSize: 8, color: GOLD, fontWeight: '800', letterSpacing: 1.5, marginBottom: 2 },
  userName: { color: '#fff', fontWeight: '700', fontSize: 13 },

  // ── Nav ──
  navScroll: { paddingBottom: 8 },
  navSection: { paddingTop: 20, paddingHorizontal: 12 },
  navSectionTitle: {
    fontSize: 9, fontWeight: '800', color: '#5B7A9D',
    letterSpacing: 1.5, textTransform: 'uppercase',
    marginBottom: 6, paddingLeft: 4,
  },
  navItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 12, paddingVertical: 11,
    borderRadius: 14, marginBottom: 2, position: 'relative',
  },
  navItemActive: { backgroundColor: '#243454' },
  navIconWrap: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: '#243454', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#2E4168',
  },
  navIconWrapActive: { backgroundColor: GOLD + '22', borderColor: GOLD + '55' },
  navItemText: { flex: 1, fontSize: 13, color: '#9EB4D0', fontWeight: '600' },
  navItemTextActive: { color: '#fff', fontWeight: '700' },
  navActiveBar: {
    position: 'absolute', right: 0, top: '25%', bottom: '25%',
    width: 3, borderRadius: 3, backgroundColor: GOLD,
  },

  // ── Footer ──
  sidebarFooter: {
    borderTopWidth: 1, borderTopColor: '#243454',
    padding: 12,
  },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 12, paddingVertical: 12,
    borderRadius: 14, backgroundColor: '#2E1A1A',
  },
  logoutText: { color: '#f87171', fontWeight: '700', fontSize: 13 },

  // ── Main content ──
  main: { flex: 1, backgroundColor: '#F5F7FA' },
  mainContent: { flexGrow: 1, paddingBottom: 60 },
  mainFlex: { flex: 1, paddingBottom: 60 },
  globalBackBtn: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
