import React, { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { View, Text, Alert, ScrollView, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { disconnectSocket } from '../utils/socket';
import { performLogout } from '../utils/logout';
import AppLayout from '../components/AppLayout';
import CustomInput from '../components/CustomInput';
import CustomButton from '../components/CustomButton';
import api from '../api/api';

function InfoRow({ icon, label, value }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', gap: 12 }}>
      <View style={{ backgroundColor: '#eff6ff', borderRadius: 10, padding: 8 }}>
        <Ionicons name={icon} size={15} color="#0284c7" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 10, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 2 }}>{label}</Text>
        <Text style={{ fontSize: 14, fontWeight: '600', color: '#0f172a' }}>{value || '—'}</Text>
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const [user, setUser] = useState(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [designation, setDesignation] = useState('');
  const [address, setAddress] = useState('');
  const [photo, setPhoto] = useState(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [metrics, setMetrics] = useState({ tasks: 0, visits: 0, followUps: 0, onboarded: 0 });

  useEffect(() => {
    const load = async () => {
      const stored = await AsyncStorage.getItem('user');
      if (stored) {
        const u = JSON.parse(stored);
        setUser(u);
        setName(u.name || '');
        setPhone(u.phone || '');
        setDesignation(u.designation || '');
        setAddress(u.address || '');
      }
      // Load performance metrics
      try {
        const [tasksRes, meetingsRes, followUpsRes, onboardingRes] = await Promise.all([
          api.get('/tasks').catch(() => ({ data: { data: [] } })),
          api.get('/meetings').catch(() => ({ data: { data: [] } })),
          api.get('/followups').catch(() => ({ data: { data: [] } })),
          api.get('/onboarding').catch(() => ({ data: { data: [] } })),
        ]);
        setMetrics({
          tasks: (tasksRes.data.data || []).filter(t => t.status === 'Completed').length,
          visits: meetingsRes.data.data?.length || 0,
          followUps: (followUpsRes.data.data || []).filter(f => f.status === 'Completed').length,
          onboarded: onboardingRes.data.data?.length || 0,
        });
      } catch (e) {}
    };
    load();
  }, []);

  const handleSave = async () => {
    if (!name) { Alert.alert('Error', 'Name is required'); return; }
    if (phone && !/^\d{10}$/.test(phone.trim())) {
      Alert.alert('Error', 'Mobile Number must be exactly 10 digits.');
      return;
    }
    setLoading(true);
    try {
      let payload;
      if (photo) {
        payload = new FormData();
        payload.append('name', name);
        payload.append('phone', phone);
        payload.append('designation', designation);
        payload.append('address', address);
        
        // Handle web or mobile image picker format
        if (Platform.OS === 'web') {
          const res = await fetch(photo.uri);
          const blob = await res.blob();
          payload.append('profilePicture', blob, 'profile.jpg');
        } else {
          payload.append('profilePicture', {
            uri: photo.uri,
            type: 'image/jpeg',
            name: 'profile.jpg',
          });
        }
      } else {
        payload = { name, phone, designation, address };
      }

      const res = await api.put('/users/profile', payload, photo ? { headers: { 'Content-Type': 'multipart/form-data' } } : {});
      const updated = res.data.data;
      await AsyncStorage.setItem('user', JSON.stringify(updated));
      setUser(updated);
      setEditing(false);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (e) {
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setLoading(false);
      setPhoto(null);
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });
      if (!result.canceled) {
        setPhoto(result.assets[0]);
        setEditing(true);
      }
    } catch (e) {
      Alert.alert('Error', 'Could not pick image');
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out', style: 'destructive',
        onPress: () => performLogout(),
      },
    ]);
  };

  const avatarColors = ['#0284c7', '#7c3aed', '#16a34a', '#d97706', '#e11d48'];
  const avatarColor = avatarColors[(user?.name?.charCodeAt(0) || 0) % avatarColors.length];

  return (
    <AppLayout currentScreen="Profile" role={user?.role || 'Field Executive'}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>

        {/* Hero Card */}
        <View style={{
          background: 'linear-gradient(135deg, #0f172a, #1e293b)',
          backgroundColor: '#0f172a', borderRadius: 28, padding: 24, marginBottom: 20,
          flexDirection: 'row', alignItems: 'center', gap: 16,
        }}>
          <TouchableOpacity onPress={pickImage} style={{ width: 70, height: 70, borderRadius: 22, backgroundColor: avatarColor + '30', borderWidth: 2.5, borderColor: avatarColor, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            {photo ? (
              <Image source={{ uri: photo.uri }} style={{ width: 70, height: 70 }} />
            ) : user?.profilePicture ? (
              <Image source={{ uri: user.profilePicture }} style={{ width: 70, height: 70 }} />
            ) : (
              <Text style={{ fontSize: 28, fontWeight: '900', color: avatarColor }}>
                {user?.name?.charAt(0)?.toUpperCase() || '?'}
              </Text>
            )}
            <View style={{ position: 'absolute', bottom: 0, width: '100%', height: 16, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="camera" size={10} color="#fff" />
            </View>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 20, fontWeight: '900', color: '#fff', letterSpacing: -0.3 }}>{user?.name}</Text>
            <Text style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{user?.designation || 'Field Executive'}</Text>
            <View style={{ backgroundColor: '#0284c7', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start', marginTop: 8 }}>
              <Text style={{ fontSize: 10, fontWeight: '900', color: '#fff', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                ID: {user?.employeeId || 'N/A'}
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => setEditing(!editing)} style={{ backgroundColor: '#1e293b', borderRadius: 12, padding: 10, borderWidth: 1, borderColor: '#334155' }}>
            <Ionicons name={editing ? 'close' : 'create-outline'} size={18} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        {/* Performance Mini Dashboard */}
        <Text style={{ fontSize: 11, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>My Performance</Text>
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
          {[
            { label: 'Visits', value: metrics.visits, icon: 'location', color: '#0284c7', bg: '#eff6ff' },
            { label: 'Completed', value: metrics.followUps, icon: 'checkmark-circle', color: '#16a34a', bg: '#f0fdf4' },
            { label: 'Clients', value: metrics.onboarded, icon: 'briefcase', color: '#7c3aed', bg: '#faf5ff' },
            { label: 'Tasks Done', value: metrics.tasks, icon: 'clipboard', color: '#d97706', bg: '#fffbeb' },
          ].map(s => (
            <View key={s.label} style={{ flex: 1, backgroundColor: s.bg, borderRadius: 16, padding: 12, alignItems: 'center', gap: 4 }}>
              <Ionicons name={s.icon} size={18} color={s.color} />
              <Text style={{ fontSize: 20, fontWeight: '900', color: '#0f172a' }}>{s.value}</Text>
              <Text style={{ fontSize: 9, fontWeight: '900', color: '#64748b', textTransform: 'uppercase' }}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Employee Details */}
        <View style={{ backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0', padding: 16, marginBottom: 16 }}>
          <Text style={{ fontSize: 13, fontWeight: '900', color: '#0f172a', marginBottom: 4 }}>
            {user?.role === 'Admin' ? 'Admin Information' : 'Employee Information'}
          </Text>
          {user?.role !== 'Admin' && (
            <InfoRow icon="id-card-outline" label="Employee ID" value={user?.employeeId} />
          )}
          <InfoRow icon="person-outline" label="Full Name" value={user?.name} />
          <InfoRow icon="call-outline" label="Mobile Number" value={user?.phone} />
          <InfoRow icon="mail-outline" label="Email Address" value={user?.email} />
          <InfoRow icon="briefcase-outline" label="Role / Designation" value={user?.designation || user?.role} />
          <InfoRow icon="location-outline" label="Address" value={user?.address} />
          <InfoRow icon="people-outline" label="Department" value={user?.department || 'Sales'} />
        </View>

        {/* Edit Form */}
        {editing && (
          <View style={{ backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0', padding: 16, marginBottom: 16 }}>
            <Text style={{ fontSize: 13, fontWeight: '900', color: '#0f172a', marginBottom: 14 }}>Edit Profile</Text>
            <CustomInput label="Full Name" value={name} onChangeText={setName} placeholder="Your full name" />
            <View style={{ height: 12 }} />
            <CustomInput label="Mobile Number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="10-digit mobile number" maxLength={10} />
            <View style={{ height: 12 }} />
            <CustomInput label="Designation" value={designation} onChangeText={setDesignation} placeholder="E.g. Sales Executive" />
            <View style={{ height: 12 }} />
            <CustomInput label="Address" value={address} onChangeText={setAddress} placeholder="Your address" />
            <View style={{ height: 16 }} />
            <CustomButton title="Save Changes" loading={loading} onPress={handleSave} />
          </View>
        )}

        {/* Logout */}
        <TouchableOpacity
          onPress={handleLogout}
          style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
            backgroundColor: '#fef2f2', borderRadius: 16, paddingVertical: 15,
            borderWidth: 1.5, borderColor: '#fecdd3',
          }}
        >
          <Ionicons name="log-out-outline" size={18} color="#e11d48" />
          <Text style={{ color: '#e11d48', fontWeight: '900', fontSize: 14 }}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </AppLayout>
  );
}
