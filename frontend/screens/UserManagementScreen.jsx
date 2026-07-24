import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, ScrollView, StyleSheet, ActivityIndicator, RefreshControl, Platform, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import CustomInput from '../components/CustomInput';
import CustomButton from '../components/CustomButton';
import AppLayout from '../components/AppLayout';
import api from '../api/api';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as DocumentPicker from 'expo-document-picker';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function UserManagementScreen() {
  const [users, setUsers] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [userRole, setUserRole] = useState('Admin');

  // Modal State
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
  const [employeeDetails, setEmployeeDetails] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('user').then(s => {
      if (s) {
        const parsed = JSON.parse(s);
        setUserRole(parsed.role || 'Admin');
      }
    });
  }, []);

  // User form details
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [userType, setUserType] = useState('Employee'); // Admin | Employee
  const [designation, setDesignation] = useState('');
  
  const [panNumber, setPanNumber] = useState('');
  const [aadharNumber, setAadharNumber] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('Fresher');
  const [pfNumber, setPfNumber] = useState('');
  const [joiningDate, setJoiningDate] = useState(new Date());
  const [showAddDatePicker, setShowAddDatePicker] = useState(false);
  
  const [photoFile, setPhotoFile] = useState(null);
  const [panFile, setPanFile] = useState(null);
  const [aadharFile, setAadharFile] = useState(null);
  const [payslipFile, setPayslipFile] = useState(null);

  const [loading, setLoading] = useState(false);

  const openProfile = async (empId) => {
    if (!empId) return;
    setSelectedEmployeeId(empId);
    setShowProfileModal(true);
    setLoadingProfile(true);
    try {
      const res = await api.get('/users/' + empId);
      setEmployeeDetails(res.data.data);
    } catch(e) {
      Alert.alert('Error', 'Failed to load employee details');
    } finally {
      setLoadingProfile(false);
    }
  };

  const uploadDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'] });
      if (result.canceled) return;
      
      const file = result.assets[0];
      const formData = new FormData();
      formData.append('document', {
        uri: file.uri,
        name: file.name,
        type: file.mimeType || 'application/octet-stream'
      });
      
      setLoadingProfile(true);
      const res = await api.post('/users/' + selectedEmployeeId + '/documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setEmployeeDetails(res.data.data);
      Alert.alert('Success', 'Document uploaded successfully');
    } catch (e) {
      Alert.alert('Error', 'Failed to upload document');
    } finally {
      setLoadingProfile(false);
    }
  };

  const updateJoiningDate = async (event, selectedDate) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      try {
        setLoadingProfile(true);
        const res = await api.put('/users/' + selectedEmployeeId + '/record', { joiningDate: selectedDate });
        setEmployeeDetails(res.data.data);
      } catch (e) {
        Alert.alert('Error', 'Failed to update joining date');
      } finally {
        setLoadingProfile(false);
      }
    }
  };

  const calculateYears = (dateStr) => {
    if (!dateStr) return '0 years';
    const joinDate = new Date(dateStr);
    const now = new Date();
    const diff = now - joinDate;
    const years = diff / (1000 * 60 * 60 * 24 * 365.25);
    return years.toFixed(1) + ' years';
  };

  const safeGet = async (url, config) => {
    try {
      return await api.get(url, config);
    } catch (e) {
      console.warn(`API call failed: ${url}`, e);
      return { data: { data: [] } };
    }
  };

  const fetchUsers = async () => {
    try {
      setRefreshing(true);
      const today = new Date().toISOString().split('T')[0];
      const [usersRes, attendanceRes] = await Promise.all([
        safeGet('/users'),
        safeGet('/attendance', { params: { date: today } }),
      ]);

      const attendanceByExec = (attendanceRes.data.data || []).reduce((acc, rec) => {
        const execId = rec.executive?._id?.toString() || rec.executive?.toString();
        if (execId) acc[execId] = rec;
        return acc;
      }, {});

      const usersWithStatus = (usersRes.data.data || []).map((user) => {
        const id = user._id?.toString() || user.id?.toString();
        const attendance = attendanceByExec[id] || null;
        return {
          ...user,
          todayAttendanceStatus: attendance?.status || 'No Attendance',
        };
      });

      setUsers(usersWithStatus);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to retrieve team members list.');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async () => {
    const finalRole = userType === 'Admin' ? 'Admin' : 'Field Executive';
    const finalDesignation = userType === 'Admin' ? 'Admin' : designation;

    if (!name || !email || !password || !phone || !finalDesignation) {
      Alert.alert('Validation Error', 'Please complete all required fields.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name, email, password, phone, role: finalRole, designation: finalDesignation,
        panNumber, aadharNumber, experienceLevel, joiningDate
      };
      if (experienceLevel === 'Experienced') payload.pfNumber = pfNumber;

      const userRes = await api.post('/users', payload);
      const newUserId = userRes.data.data.id;

      // Upload Documents
      const filesToUpload = [
        { file: photoFile, name: 'Profile Photo' },
        { file: panFile, name: 'PAN Document' },
        { file: aadharFile, name: 'Aadhar Document' },
        { file: payslipFile, name: 'Payslip' }
      ];

      for (const item of filesToUpload) {
        if (item.file) {
          const formData = new FormData();
          formData.append('document', {
            uri: item.file.uri,
            name: item.file.name,
            type: item.file.mimeType || 'application/octet-stream'
          });
          await api.post('/users/' + newUserId + '/documents', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
        }
      }

      Alert.alert('Success', `${finalRole} user successfully added!`);
      
      // Reset form
      setName(''); setEmail(''); setPassword(''); setPhone('');
      setUserType('Employee'); setDesignation(''); setPanNumber(''); setAadharNumber('');
      setExperienceLevel('Fresher'); setPfNumber(''); setJoiningDate(new Date());
      setPhotoFile(null); setPanFile(null); setAadharFile(null); setPayslipFile(null);
      
      setShowAddForm(false);
      fetchUsers();
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (userId, currentStatus) => {
    Alert.alert(
      'Toggle Status',
      `Are you sure you want to ${currentStatus ? 'Deactivate' : 'Activate'} this user?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Change Status',
          onPress: async () => {
            try {
              await api.delete(`/users/${userId}`);
              fetchUsers();
            } catch (e) {
              Alert.alert('Error', 'Failed to change user status');
            }
          },
        },
      ]
    );
  };

  const renderAddFormContent = () => (
    <>
      {Platform.OS === 'web' && (
        <View className="flex-row justify-between items-center mb-6 border-b border-slate-100 pb-4">
          <View>
            <Text className="text-xl font-black text-slate-900">Add New Member</Text>
            <Text className="text-xs text-slate-500 mt-1">Fill in the details to register a new employee.</Text>
          </View>
          <TouchableOpacity onPress={() => setShowAddForm(false)} className="p-2 bg-slate-50 rounded-full border border-slate-100">
            <Ionicons name="close" size={20} color="#64748b" />
          </TouchableOpacity>
        </View>
      )}

      {/* Account Details Section */}
      <Text className="text-xs font-bold text-sky-600 uppercase tracking-wider mb-3">Account Details</Text>
      <View className={Platform.OS === 'web' ? "flex-row gap-4 mb-4" : "mb-4"}>
        <View className="flex-1"><CustomInput label="Full Name *" value={name} onChangeText={setName} placeholder="E.g. John Doe" /></View>
        <View className="flex-1"><CustomInput label="Email Address *" value={email} onChangeText={setEmail} placeholder="john@fieldstaff.com" keyboardType="email-address" autoCapitalize="none" /></View>
      </View>
      <View className={Platform.OS === 'web' ? "flex-row gap-4 mb-4" : "mb-4"}>
        <View className="flex-1"><CustomInput label="Password *" value={password} onChangeText={setPassword} placeholder="••••••••" secureTextEntry /></View>
        <View className="flex-1"><CustomInput label="Phone Number *" value={phone} onChangeText={setPhone} placeholder="1234567890" keyboardType="phone-pad" /></View>
      </View>

      <View className="h-px bg-slate-100 w-full my-4" />

      {/* Role & Experience Section */}
      <Text className="text-xs font-bold text-sky-600 uppercase tracking-wider mb-3">Role & Experience</Text>
      
      <View className={Platform.OS === 'web' ? "flex-row gap-6 mb-4" : "mb-4"}>
        <View className="flex-1 mb-4 lg:mb-0">
          <Text className="text-[10px] font-bold uppercase tracking-wider mb-2 text-slate-500">User Type *</Text>
          <View className="flex-row bg-slate-50 p-1 rounded-xl border border-slate-200">
            {['Employee', 'Admin'].map((t) => (
              <TouchableOpacity
                key={t}
                onPress={() => setUserType(t)}
                className={`flex-1 py-2 rounded-lg ${userType === t ? 'bg-white shadow-sm border border-slate-200' : ''}`}
              >
                <Text className={`text-center text-xs font-bold ${userType === t ? 'text-sky-600' : 'text-slate-500'}`}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View className="flex-1">
          <Text className="text-[10px] font-bold uppercase tracking-wider mb-2 text-slate-500">Experience Level *</Text>
          <View className="flex-row bg-slate-50 p-1 rounded-xl border border-slate-200">
            {['Fresher', 'Experienced'].map((level) => (
              <TouchableOpacity
                key={level}
                onPress={() => setExperienceLevel(level)}
                className={`flex-1 py-2 rounded-lg ${experienceLevel === level ? 'bg-white shadow-sm border border-slate-200' : ''}`}
              >
                <Text className={`text-center text-xs font-bold ${experienceLevel === level ? 'text-sky-600' : 'text-slate-500'}`}>{level}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      <Text className="text-[10px] font-bold uppercase tracking-wider mb-2 text-slate-500">Designation *</Text>
      <View className="flex-row flex-wrap gap-2 mb-4">
        {(userType === 'Employee' ? ['BDE', 'BDM', 'Pre Sales'] : ['Admin', 'Manager', 'HR']).map((d) => (
          <TouchableOpacity
            key={d}
            onPress={() => setDesignation(d)}
            className={`px-4 py-2 rounded-xl border ${designation === d ? 'bg-sky-50 border-sky-600' : 'bg-slate-50 border-slate-200'}`}
          >
            <Text className={`text-xs font-bold ${designation === d ? 'text-sky-700' : 'text-slate-600'}`}>{d}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View className="h-px bg-slate-100 w-full my-4" />

      {/* KYC & Documents Section */}
      <Text className="text-xs font-bold text-sky-600 uppercase tracking-wider mb-3">KYC & Documents</Text>

      <View className={Platform.OS === 'web' ? "flex-row gap-4 mb-4" : "mb-4"}>
        <View className="flex-1"><CustomInput label="PAN Number" value={panNumber} onChangeText={setPanNumber} placeholder="ABCDE1234F" autoCapitalize="characters" /></View>
        <View className="flex-1"><CustomInput label="Aadhar Number" value={aadharNumber} onChangeText={setAadharNumber} placeholder="1234 5678 9012" keyboardType="numeric" /></View>
      </View>

      {experienceLevel === 'Experienced' && (
        <View className={Platform.OS === 'web' ? "w-1/2 pr-2 mb-4" : "mb-4"}><CustomInput label="PF Number *" value={pfNumber} onChangeText={setPfNumber} placeholder="Enter PF Number" /></View>
      )}

      <Text className="text-[10px] font-bold uppercase tracking-wider mb-2 text-slate-500 mt-2">Upload Documents</Text>
      <View className="flex-row flex-wrap gap-3 mb-6">
        {[
          { label: 'Profile Photo', state: photoFile, set: setPhotoFile, icon: 'image-outline', type: 'image/*' },
          { label: 'PAN Document', state: panFile, set: setPanFile, icon: 'card-outline', type: ['application/pdf', 'image/*'] },
          { label: 'Aadhar Doc', state: aadharFile, set: setAadharFile, icon: 'finger-print-outline', type: ['application/pdf', 'image/*'] },
          { label: 'Latest Payslip', state: payslipFile, set: setPayslipFile, icon: 'cash-outline', type: ['application/pdf', 'image/*'] }
        ].map((doc, idx) => (
          <TouchableOpacity 
            key={idx}
            onPress={async () => {
              const res = await DocumentPicker.getDocumentAsync({ type: doc.type });
              if (!res.canceled) doc.set(res.assets[0]);
            }} 
            className={`flex-row items-center justify-between p-3 border rounded-xl flex-1 min-w-[200px] ${doc.state ? 'bg-sky-50 border-sky-200' : 'bg-slate-50 border-slate-200 border-dashed'}`}
          >
            <View className="flex-row items-center gap-2">
              <Ionicons name={doc.icon} size={18} color={doc.state ? "#0284c7" : "#64748b"} />
              <Text className={`text-xs font-bold ${doc.state ? 'text-sky-700' : 'text-slate-600'}`} numberOfLines={1}>
                {doc.state ? doc.state.name : doc.label}
              </Text>
            </View>
            <Ionicons name={doc.state ? "checkmark-circle" : "cloud-upload-outline"} size={18} color={doc.state ? "#0ea5e9" : "#94a3b8"} />
          </TouchableOpacity>
        ))}
      </View>

      {/* Actions */}
      <View className={`mt-2 ${Platform.OS === 'web' ? 'flex-row justify-end gap-3' : 'space-y-3'}`}>
        {Platform.OS === 'web' && (
          <TouchableOpacity onPress={() => setShowAddForm(false)} className="px-6 py-3 border border-slate-200 rounded-xl bg-white shadow-sm">
            <Text className="text-center text-slate-700 font-bold text-xs">Cancel</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={handleCreateUser} disabled={loading} className={`px-6 py-3 rounded-xl shadow-sm justify-center items-center ${loading ? 'bg-sky-400' : 'bg-sky-600'} ${Platform.OS !== 'web' ? 'w-full' : ''}`}>
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text className="text-center text-white font-bold text-xs">Add User Member</Text>
          )}
        </TouchableOpacity>
        
        {Platform.OS !== 'web' && (
          <TouchableOpacity onPress={() => setShowAddForm(false)} className="py-3 border border-slate-200 rounded-xl bg-white shadow-sm w-full">
            <Text className="text-center text-slate-700 font-bold text-xs">Cancel</Text>
          </TouchableOpacity>
        )}
      </View>
    </>
  );

  return (
    <AppLayout currentScreen="UserManagement" role="Admin" scrollable={false}>
      <View className="flex-1">
        
        <View className="flex-row justify-between items-center mb-6">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <TouchableOpacity onPress={() => router.push('/AdminDashboard')}>
              <Ionicons name="arrow-back" size={24} color="#0f172a" />
            </TouchableOpacity>
            <Text className="text-2xl font-black text-slate-900">Field Staff</Text>
          </View>
        </View>

        {(!showAddForm || Platform.OS === 'web') && (
          <View className="flex-1">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Staff Members
              </Text>
              {['HR', 'Managing Director MD'].includes(userRole) && (
                <TouchableOpacity onPress={() => setShowAddForm(true)} className="bg-sky-600 px-4 py-2 rounded-xl shadow-sm">
                  <Text className="text-white font-bold text-xs">+ Add Member</Text>
                </TouchableOpacity>
              )}
            </View>

            <FlatList
              data={users}
              keyExtractor={(item) => item._id}
              refreshing={refreshing}
              onRefresh={fetchUsers}
              ListEmptyComponent={() => (
                <View className="flex-1 items-center justify-center pt-20">
                  <Text className="text-xs text-slate-500">
                    {['HR', 'Managing Director MD'].includes(userRole) ? 'No users found. Tap "+ Add Member" to register one.' : 'No users found.'}
                  </Text>
                </View>
              )}
              renderItem={({ item }) => {
                const attendanceBadgeClass = item.todayAttendanceStatus === 'Checked In'
                  ? 'bg-emerald-50 border-emerald-200'
                  : item.todayAttendanceStatus === 'Checked Out'
                    ? 'bg-rose-50 border-rose-200'
                    : 'bg-slate-100 border-slate-200';

                const attendanceBadgeText = item.todayAttendanceStatus === 'Checked In'
                  ? 'text-emerald-700'
                  : item.todayAttendanceStatus === 'Checked Out'
                    ? 'text-rose-700'
                    : 'text-slate-600';

                return (
                  <View className="bg-white border border-slate-200 rounded-3xl p-5 mb-4 shadow-sm">
                    <View className="flex-row justify-between items-start mb-3">
                      <View className="flex-1">
                        <Text className="text-sm font-black text-slate-900 mb-1">{item.name}</Text>
                        <Text className="text-xs text-slate-500 font-medium">{item.email}</Text>
                        <Text className="text-[11px] text-slate-400 mt-1">
                          Role: {item.role} | Desig: {item.designation || 'N/A'} | Phone: {item.phone || 'N/A'}
                        </Text>
                      </View>
                      
                      <View className="flex-row items-center gap-2">
                        {item.role !== 'Admin' && item.role !== 'Managing Director MD' && item.role !== 'HR' && (
                          <View className={`px-3 py-1.5 rounded-xl border ${attendanceBadgeClass}`}>
                            <Text className={`text-[10px] font-bold ${attendanceBadgeText}`}>
                              {item.todayAttendanceStatus === 'Checked In' ? 'Active' : 
                               item.todayAttendanceStatus === 'Checked Out' ? 'Checked Out' : 'No Attendance'}
                            </Text>
                          </View>
                        )}
                        <View className={`px-3 py-1.5 rounded-xl border ${item.isActive ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
                          <Text className={`text-[10px] font-bold ${item.isActive ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {item.isActive ? 'Active' : 'Inactive'}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <View className="flex-row items-center gap-2 mt-3 pt-3 border-t border-slate-100 justify-end">
                      {['HR', 'Managing Director MD'].includes(userRole) && (
                        <TouchableOpacity
                          onPress={() => openProfile(item._id)}
                          className="bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-100 flex-row items-center"
                        >
                          <Ionicons name="document-text-outline" size={14} color="#d97706" style={{ marginRight: 4 }} />
                          <Text className="text-[10px] text-amber-600 font-bold">Records</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        onPress={() => router.push({
                          pathname: '/Chat',
                          params: { partnerId: item._id, partnerName: item.name }
                        })}
                        className="bg-sky-50 px-3 py-1.5 rounded-lg border border-sky-100 flex-row items-center"
                      >
                        <Ionicons name="chatbubbles-outline" size={14} color="#0284c7" style={{ marginRight: 4 }} />
                        <Text className="text-[10px] text-sky-600 font-bold">Message</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              }}
            />
          </View>
        )}

        {showAddForm && (
          Platform.OS === 'web' ? (
            <View className="backdrop-blur-md" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', zIndex: 99999, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
              <View className="bg-white border border-slate-200 rounded-3xl shadow-2xl w-full flex-shrink-1" style={{ maxWidth: 800, maxHeight: '90%' }}>
                <ScrollView showsVerticalScrollIndicator={true} contentContainerStyle={{ padding: 32 }}>
                  {renderAddFormContent()}
                </ScrollView>
              </View>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} className="mt-4" contentContainerStyle={{ paddingBottom: 40 }}>
              <View className="space-y-4 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm self-center w-full" style={{ maxWidth: 600 }}>
                {renderAddFormContent()}
              </View>
            </ScrollView>
          )
        )}
      </View>

      {/* Profile / Documents Modal */}
      <Modal visible={showProfileModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowProfileModal(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Employee Records</Text>
            <TouchableOpacity onPress={() => setShowProfileModal(false)}><Ionicons name="close" size={24} color="#0f172a"/></TouchableOpacity>
          </View>
          {loadingProfile && !employeeDetails ? (
            <ActivityIndicator color="#0284c7" size="large" style={{marginTop:40}} />
          ) : employeeDetails ? (
            <ScrollView contentContainerStyle={styles.modalBody}>
              <View style={styles.recordSection}>
                <Text style={styles.sectionTitle}>Basic Information</Text>
                <Text style={styles.recordText}>Name: {employeeDetails.name}</Text>
                <Text style={styles.recordText}>Role: {employeeDetails.role}</Text>
                <Text style={styles.recordText}>Email: {employeeDetails.email}</Text>
              </View>
              
              <View style={styles.recordSection}>
                <Text style={styles.sectionTitle}>Tenure & Records</Text>
                <View style={{flexDirection:'row', alignItems:'center', justifyContent:'space-between'}}>
                  <View>
                    <Text style={styles.recordText}>Joined: {employeeDetails.joiningDate ? new Date(employeeDetails.joiningDate).toLocaleDateString() : 'Not Set'}</Text>
                    <Text style={styles.recordText}>Experience: {calculateYears(employeeDetails.joiningDate)}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.editBtn}>
                    <Text style={styles.editBtnText}>Edit Date</Text>
                  </TouchableOpacity>
                </View>
                {showDatePicker && (
                  <DateTimePicker
                    value={employeeDetails.joiningDate ? new Date(employeeDetails.joiningDate) : new Date()}
                    mode="date"
                    display="default"
                    onChange={updateJoiningDate}
                  />
                )}
              </View>

              <View style={styles.recordSection}>
                <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom: 12}}>
                  <Text style={styles.sectionTitle}>Documents</Text>
                  <TouchableOpacity onPress={uploadDocument} style={styles.uploadBtn}>
                    <Ionicons name="cloud-upload-outline" size={16} color="#fff" />
                    <Text style={styles.uploadBtnText}>Upload</Text>
                  </TouchableOpacity>
                </View>
                
                {employeeDetails.documents && employeeDetails.documents.length > 0 ? (
                  employeeDetails.documents.map((doc, idx) => (
                    <View key={idx} style={styles.docCard}>
                      <Ionicons name="document-outline" size={24} color="#64748b" />
                      <View style={{flex:1, marginLeft: 12}}>
                        <Text style={styles.docName}>{doc.name}</Text>
                        <Text style={styles.docDate}>Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}</Text>
                      </View>
                    </View>
                  ))
                ) : (
                  <Text style={styles.recordText}>No documents uploaded yet.</Text>
                )}
              </View>
            </ScrollView>
          ) : (
            <View style={{alignItems: 'center', marginTop: 40}}>
              <Text style={styles.recordText}>Failed to load employee records.</Text>
            </View>
          )}
        </View>
      </Modal>

    </AppLayout>
  );
}

const styles = StyleSheet.create({
  modalContainer: { flex: 1, backgroundColor: '#f8fafc' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  modalTitle: { fontSize: 18, fontWeight: '400', color: '#0f172a' },
  modalBody: { padding: 20 },
  recordSection: { backgroundColor: '#fff', padding: 16, borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: '#f1f5f9', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
  sectionTitle: { fontSize: 14, fontWeight: '400', color: '#334155', marginBottom: 12 },
  recordText: { fontSize: 13, color: '#475569', marginBottom: 6, fontWeight: '500' },
  editBtn: { backgroundColor: '#e0f2fe', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  editBtnText: { color: '#0284c7', fontSize: 12, fontWeight: '500' },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#0284c7', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  uploadBtnText: { color: '#fff', fontSize: 12, fontWeight: '500' },
  docCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', padding: 12, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  docName: { fontSize: 13, fontWeight: '500', color: '#0f172a' },
  docDate: { fontSize: 11, color: '#64748b', marginTop: 2 }
});
