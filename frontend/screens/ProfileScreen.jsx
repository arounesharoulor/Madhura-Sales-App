import React, { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { View, Text, Alert, ScrollView, TouchableOpacity, ActivityIndicator, Image, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { performLogout } from '../utils/logout';
import AppLayout from '../components/AppLayout';
import CustomInput from '../components/CustomInput';
import CustomButton from '../components/CustomButton';
import api from '../services/api';

function InfoRow({ icon, label, value }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', gap: 12 }}>
      <View style={{ backgroundColor: '#eff6ff', borderRadius: 10, padding: 8 }}>
        <Ionicons name={icon} size={15} color="#0284c7" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 10, fontWeight: '500', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 2 }}>{label}</Text>
        <Text style={{ fontSize: 14, fontWeight: '400', color: '#0f172a' }}>{value || '—'}</Text>
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  
  // Tabs: 'Basic', 'Professional', 'Security'
  const [activeTab, setActiveTab] = useState('Basic');
  const [editing, setEditing] = useState(false);
  
  // Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  
  const [designation, setDesignation] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [aadharNumber, setAadharNumber] = useState('');
  const [pfNumber, setPfNumber] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('');
  const [joiningDate, setJoiningDate] = useState('');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [photo, setPhoto] = useState(null);
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState({ tasks: 0, visits: 0, followUps: 0, onboarded: 0 });

  useEffect(() => {
    const load = async () => {
      const stored = await AsyncStorage.getItem('user');
      if (stored) {
        const u = JSON.parse(stored);
        setUser(u);
        setName(u.name || '');
        setEmail(u.email || '');
        setPhone(u.phone || '');
        setAddress(u.address || '');
        setDesignation(u.designation || '');
        setEmployeeId(u.employeeId || '');
        setPanNumber(u.panNumber || '');
        setAadharNumber(u.aadharNumber || '');
        setPfNumber(u.pfNumber || '');
        setExperienceLevel(u.experienceLevel || '');
        setJoiningDate(u.joiningDate ? u.joiningDate.split('T')[0] : '');
      }
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
    if (activeTab === 'Security') {
      if (!password || password.length < 6) { Alert.alert('Error', 'Password must be at least 6 characters'); return; }
      if (password !== confirmPassword) { Alert.alert('Error', 'Passwords do not match'); return; }
    } else if (activeTab === 'Basic') {
      if (!name || !email) { Alert.alert('Error', 'Name and Email are required'); return; }
      if (phone && !/^\d{10}$/.test(phone.trim())) { Alert.alert('Error', 'Mobile Number must be 10 digits.'); return; }
    }
    
    setLoading(true);
    try {
      let payload;
      if (photo && activeTab === 'Basic') {
        payload = new FormData();
        payload.append('name', name);
        payload.append('email', email);
        payload.append('phone', phone);
        payload.append('address', address);
        
        if (Platform.OS === 'web') {
          const res = await fetch(photo.uri);
          const blob = await res.blob();
          payload.append('profilePicture', blob, 'profile.jpg');
        } else {
          payload.append('profilePicture', { uri: photo.uri, type: 'image/jpeg', name: 'profile.jpg' });
        }
      } else {
        payload = activeTab === 'Basic' 
          ? { name, email, phone, address } 
          : activeTab === 'Professional' 
            ? { designation, employeeId, panNumber, aadharNumber, pfNumber, experienceLevel, joiningDate } 
            : { password };
      }

      const res = await api.put('/users/profile', payload, (photo && activeTab === 'Basic') ? { headers: { 'Content-Type': 'multipart/form-data' } } : {});
      const updated = res.data.data;
      
      // Update local storage
      const stored = await AsyncStorage.getItem('user');
      const oldUser = stored ? JSON.parse(stored) : {};
      const newUser = { ...oldUser, ...updated };
      await AsyncStorage.setItem('user', JSON.stringify(newUser));
      
      setUser(newUser);
      setEditing(false);
      if (activeTab === 'Security') {
        setPassword(''); setConfirmPassword('');
      }
      Alert.alert('Success', 'Profile updated successfully');
    } catch (e) {
      console.error(e);
      Alert.alert('Error', e.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
      setPhoto(null);
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true, aspect: [1, 1], quality: 0.5,
      });
      if (!result.canceled) {
        setPhoto(result.assets[0]);
        setEditing(true);
        setActiveTab('Basic');
      }
    } catch (e) {
      Alert.alert('Error', 'Could not pick image');
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => performLogout() },
    ]);
  };

  const avatarColors = ['#0284c7', '#7c3aed', '#16a34a', '#d97706', '#e11d48'];
  const avatarColor = avatarColors[(user?.name?.charCodeAt(0) || 0) % avatarColors.length];
  
  const isSuperAdmin = user?.role === 'Managing Director MD' || user?.role === 'Super Admin';
  const deviceLimit = isSuperAdmin ? 1 : 3;

  return (
    <AppLayout currentScreen="Profile" role={user?.role || 'Field Executive'}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }} automaticallyAdjustKeyboardInsets={true}>
        
        <View style={{ marginBottom: 16, flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => router.push(['Admin', 'Project Manager', 'Team Lead', 'Managing Director MD'].includes(user?.role || 'Employee') ? '/AdminDashboard' : '/Dashboard')}>
            <Ionicons name="arrow-back" size={24} color="#0f172a" />
          </TouchableOpacity>
        </View>

        {/* Hero Card */}
        <View style={{
          backgroundColor: '#0f172a', borderRadius: 28, padding: 24, marginBottom: 20,
          flexDirection: 'row', alignItems: 'center', gap: 16,
        }}>
          <TouchableOpacity onPress={pickImage} style={{ width: 70, height: 70, borderRadius: 22, backgroundColor: avatarColor + '30', borderWidth: 2.5, borderColor: avatarColor, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            {photo ? (
              <Image source={{ uri: photo.uri }} style={{ width: 70, height: 70 }} />
            ) : user?.profilePicture ? (
              <Image source={{ uri: user.profilePicture }} style={{ width: 70, height: 70 }} />
            ) : (
              <Text style={{ fontSize: 28, fontWeight: '500', color: avatarColor }}>
                {user?.name?.charAt(0)?.toUpperCase() || '?'}
              </Text>
            )}
            <View style={{ position: 'absolute', bottom: 0, width: '100%', height: 16, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="camera" size={10} color="#fff" />
            </View>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 20, fontWeight: '500', color: '#fff', letterSpacing: -0.3 }}>{user?.name}</Text>
            <Text style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{user?.designation || user?.role}</Text>
            <View style={{ backgroundColor: '#0284c7', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start', marginTop: 8 }}>
              <Text style={{ fontSize: 10, fontWeight: '500', color: '#fff', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                ID: {user?.employeeId || 'N/A'}
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => setEditing(!editing)} style={{ backgroundColor: editing ? '#0284c7' : '#1e293b', borderRadius: 12, padding: 10, borderWidth: 1, borderColor: editing ? '#0284c7' : '#334155' }}>
            <Ionicons name={editing ? 'close' : 'create-outline'} size={18} color={editing ? '#fff' : '#94a3b8'} />
          </TouchableOpacity>
        </View>

        {/* Custom Tabs */}
        <View style={{ flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 12, padding: 4, marginBottom: 20 }}>
          {['Basic', 'Professional', 'Security'].map(tab => (
            <TouchableOpacity key={tab} onPress={() => { setActiveTab(tab); setEditing(false); }} style={{ flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8, backgroundColor: activeTab === tab ? '#fff' : 'transparent', shadowColor: activeTab === tab ? '#000' : 'transparent', shadowOpacity: 0.05, shadowRadius: 2, elevation: activeTab === tab ? 2 : 0 }}>
              <Text style={{ fontSize: 13, fontWeight: activeTab === tab ? '600' : '500', color: activeTab === tab ? '#0f172a' : '#64748b' }}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab Content */}
        {!editing ? (
          <View style={{ backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0', padding: 16, marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#0f172a' }}>
                {activeTab === 'Basic' ? 'Basic Information' : activeTab === 'Professional' ? 'Professional Details' : 'Account Security'}
              </Text>
              <TouchableOpacity onPress={() => setEditing(true)}>
                <Text style={{ fontSize: 12, color: '#0284c7', fontWeight: '500' }}>Edit {activeTab}</Text>
              </TouchableOpacity>
            </View>

            {activeTab === 'Basic' && (
              <>
                <InfoRow icon="person-outline" label="Full Name" value={user?.name} />
                <InfoRow icon="mail-outline" label="Email Address" value={user?.email} />
                <InfoRow icon="call-outline" label="Mobile Number" value={user?.phone} />
                <InfoRow icon="location-outline" label="Home Address" value={user?.address} />
              </>
            )}

            {activeTab === 'Professional' && (
              <>
                <InfoRow icon="id-card-outline" label="Employee ID" value={user?.employeeId} />
                <InfoRow icon="briefcase-outline" label="Designation" value={user?.designation} />
                <InfoRow icon="business-outline" label="Experience Level" value={user?.experienceLevel} />
                <InfoRow icon="calendar-outline" label="Joining Date" value={user?.joiningDate ? user.joiningDate.split('T')[0] : ''} />
                <InfoRow icon="document-text-outline" label="PAN Number" value={user?.panNumber} />
                <InfoRow icon="finger-print-outline" label="Aadhar Number" value={user?.aadharNumber} />
                <InfoRow icon="cash-outline" label="PF Number" value={user?.pfNumber} />
              </>
            )}

            {activeTab === 'Security' && (
              <>
                <InfoRow icon="hardware-chip-outline" label="Active Devices" value={`${user?.activeDevicesCount || 1} / ${deviceLimit}`} />
                <InfoRow icon="lock-closed-outline" label="Password" value="••••••••" />
                <View style={{ marginTop: 16 }}>
                  <CustomButton title="Change Password" onPress={() => setEditing(true)} />
                </View>
              </>
            )}
          </View>
        ) : (
          <View style={{ backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0', padding: 16, marginBottom: 16 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#0f172a', marginBottom: 16 }}>Edit {activeTab}</Text>
            
            {activeTab === 'Basic' && (
              <>
                <CustomInput label="Full Name" value={name} onChangeText={setName} placeholder="Your full name" />
                <View style={{ height: 12 }} />
                <CustomInput label="Email Address" value={email} onChangeText={setEmail} placeholder="Your email" keyboardType="email-address" />
                <View style={{ height: 12 }} />
                <CustomInput label="Mobile Number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="10-digit number" maxLength={10} />
                <View style={{ height: 12 }} />
                <CustomInput label="Home Address" value={address} onChangeText={setAddress} placeholder="Your address" />
              </>
            )}

            {activeTab === 'Professional' && (
              <>
                <CustomInput label="Employee ID" value={employeeId} onChangeText={setEmployeeId} placeholder="E.g. 10001" />
                <View style={{ height: 12 }} />
                <CustomInput label="Designation" value={designation} onChangeText={setDesignation} placeholder="E.g. Sales Executive" />
                <View style={{ height: 12 }} />
                <CustomInput label="Experience Level" value={experienceLevel} onChangeText={setExperienceLevel} placeholder="Fresher / Experienced" />
                <View style={{ height: 12 }} />
                <CustomInput label="Joining Date (YYYY-MM-DD)" value={joiningDate} onChangeText={setJoiningDate} placeholder="2024-01-01" />
                <View style={{ height: 12 }} />
                <CustomInput label="PAN Number" value={panNumber} onChangeText={setPanNumber} placeholder="ABCDE1234F" />
                <View style={{ height: 12 }} />
                <CustomInput label="Aadhar Number" value={aadharNumber} onChangeText={setAadharNumber} placeholder="1234 5678 9012" />
                <View style={{ height: 12 }} />
                <CustomInput label="PF Number" value={pfNumber} onChangeText={setPfNumber} placeholder="MH/BAN/12345/000/1234567" />
              </>
            )}

            {activeTab === 'Security' && (
              <>
                <Text style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>Update your account password securely.</Text>
                <CustomInput label="New Password" value={password} onChangeText={setPassword} placeholder="At least 6 characters" secureTextEntry />
                <View style={{ height: 12 }} />
                <CustomInput label="Confirm New Password" value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Retype password" secureTextEntry />
              </>
            )}

            <View style={{ height: 20 }} />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <CustomButton title="Cancel" outline onPress={() => setEditing(false)} />
              </View>
              <View style={{ flex: 1 }}>
                <CustomButton title="Save Changes" loading={loading} onPress={handleSave} />
              </View>
            </View>
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
          <Text style={{ color: '#e11d48', fontWeight: '500', fontSize: 14 }}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </AppLayout>
  );
}
