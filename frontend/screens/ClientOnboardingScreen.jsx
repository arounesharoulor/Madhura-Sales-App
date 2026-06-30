import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Alert, Platform, TextInput, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AppLayout from '../components/AppLayout';
import api from '../api/api';

const BUSINESS_TYPES = ['Retailer', 'Distributor', 'Wholesaler', 'Dealer', 'Corporate', 'Other'];

const LOCATION_DATA = {
  "Maharashtra": ["Mumbai", "Pune", "Nagpur", "Nashik", "Thane"],
  "Karnataka": ["Bangalore", "Mysore", "Hubli", "Mangalore"],
  "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Trichy"],
  "Delhi": ["New Delhi", "North Delhi", "South Delhi"],
  "Gujarat": ["Ahmedabad", "Surat", "Vadodara", "Rajkot"],
  "Telangana": ["Hyderabad", "Warangal", "Nizamabad"],
  "Kerala": ["Kochi", "Thiruvananthapuram", "Kozhikode"],
};
const STATES = Object.keys(LOCATION_DATA);

// Reusable field label
function FieldLabel({ text, required }) {
  return (
    <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, marginTop: 14 }}>
      {text}{required && <Text style={{ color: '#e11d48' }}> *</Text>}
    </Text>
  );
}

// Reusable text input
function Field({ label, required, value, onChangeText, placeholder, keyboardType, multiline }) {
  return (
    <View>
      <FieldLabel text={label} required={required} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder || ''}
        placeholderTextColor="#94a3b8"
        keyboardType={keyboardType || 'default'}
        multiline={multiline}
        style={{
          backgroundColor: '#f8fafc', borderWidth: 1.5, borderColor: '#e2e8f0',
          borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12,
          fontSize: 14, color: '#0f172a', minHeight: multiline ? 80 : 50,
          textAlignVertical: multiline ? 'top' : 'center',
        }}
      />
    </View>
  );
}

// Section card wrapper
function SectionCard({ title, icon, children }) {
  return (
    <View style={{
      backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0',
      padding: 18, marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.04,
      shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, elevation: 2,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <View style={{ backgroundColor: '#eff6ff', borderRadius: 10, padding: 7 }}>
          <Ionicons name={icon} size={16} color="#0284c7" />
        </View>
        <Text style={{ fontSize: 14, fontWeight: '800', color: '#0f172a' }}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

// Pill selector
function PillSelector({ options, value, onSelect }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
      {options.map((opt) => (
        <TouchableOpacity
          key={opt}
          onPress={() => onSelect(opt)}
          style={{
            paddingHorizontal: 14, paddingVertical: 8, borderRadius: 30,
            borderWidth: 1.5,
            backgroundColor: value === opt ? '#0284c7' : '#f8fafc',
            borderColor: value === opt ? '#0284c7' : '#e2e8f0',
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: '700', color: value === opt ? '#fff' : '#64748b' }}>
            {opt}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// Select field for cross platform dropdowns
function SelectField({ label, required, value, onChange, options }) {
  if (Platform.OS === 'web') {
    return (
      <View>
        <FieldLabel text={label} required={required} />
        <View style={{
          backgroundColor: '#f8fafc', borderWidth: 1.5, borderColor: '#e2e8f0',
          borderRadius: 14, paddingHorizontal: 14, height: 50, justifyContent: 'center'
        }}>
          <select
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', fontSize: 14, color: value ? '#0f172a' : '#94a3b8', fontFamily: 'inherit' }}
          >
            <option value="" disabled>Select {label}</option>
            {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </View>
      </View>
    );
  }
  return (
    <View>
      <FieldLabel text={label} required={required} />
      <View style={{
        backgroundColor: '#f8fafc', borderWidth: 1.5, borderColor: '#e2e8f0',
        borderRadius: 14, height: 50, justifyContent: 'center', overflow: 'hidden'
      }}>
        <Picker
          selectedValue={value}
          onValueChange={(val) => onChange(val)}
          style={{ height: 50, width: '100%', color: value ? '#0f172a' : '#94a3b8' }}
        >
          <Picker.Item label={`Select ${label}`} value="" color="#94a3b8" />
          {options.map(opt => <Picker.Item key={opt} label={opt} value={opt} />)}
        </Picker>
      </View>
    </View>
  );
}

// Date picker for web/native
function DateField({ label, required, value, onChange, mode = 'date' }) {
  const [show, setShow] = useState(false);
  if (Platform.OS === 'web') {
    return (
      <View>
        <FieldLabel text={label} required={required} />
        <View style={{
          flexDirection: 'row', alignItems: 'center',
          backgroundColor: '#f8fafc', borderWidth: 1.5, borderColor: '#e2e8f0',
          borderRadius: 14, paddingHorizontal: 14, minHeight: 50,
        }}>
          <Ionicons name={mode === 'time' ? 'time-outline' : 'calendar-outline'} size={18} color="#0284c7" style={{ marginRight: 8 }} />
          <input
            type={mode === 'datetime' ? 'datetime-local' : mode === 'time' ? 'time' : 'date'}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 14, color: value ? '#0f172a' : '#94a3b8', fontFamily: 'inherit' }}
          />
        </View>
      </View>
    );
  }
  const DateTimePicker = require('@react-native-community/datetimepicker').default;
  return (
    <View>
      <FieldLabel text={label} required={required} />
      <TouchableOpacity
        onPress={() => setShow(true)}
        style={{
          flexDirection: 'row', alignItems: 'center',
          backgroundColor: '#f8fafc', borderWidth: 1.5, borderColor: '#e2e8f0',
          borderRadius: 14, paddingHorizontal: 14, minHeight: 50, gap: 10,
        }}
      >
        <Ionicons name={mode === 'time' ? 'time-outline' : 'calendar-outline'} size={18} color="#0284c7" />
        <Text style={{ fontSize: 14, color: value ? '#0f172a' : '#94a3b8', flex: 1 }}>
          {value ? (mode === 'time' ? value : new Date(value).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: mode === 'datetime' ? '2-digit' : undefined, minute: mode === 'datetime' ? '2-digit' : undefined })) : `Select ${mode}`}
        </Text>
        <Ionicons name="chevron-down" size={14} color="#94a3b8" />
      </TouchableOpacity>
      {show && (
        <DateTimePicker
          value={value ? new Date(value) : new Date()}
          mode={mode === 'datetime' ? 'datetime' : mode}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_, d) => { setShow(false); if (d) onChange(mode === 'datetime' ? d.toISOString().slice(0, 16) : d.toISOString().split('T')[0]); }}
        />
      )}
    </View>
  );
}

export default function ClientOnboardingScreen({ navigation }) {
  const [role, setRole] = useState('Field Executive');
  const [userData, setUserData] = useState({});
  const [clients, setClients] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editId, setEditId] = useState(null);

  // Location state
  const [coords, setCoords] = useState(null);
  const [gettingCoords, setGettingCoords] = useState(false);

  // Form state
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [altPhone, setAltPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [pincode, setPincode] = useState('');
  const [landmark, setLandmark] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [yearsInBusiness, setYearsInBusiness] = useState('');
  const [leadSource, setLeadSource] = useState('');
  const [expectedVolume, setExpectedVolume] = useState('');
  const [interestedProducts, setInterestedProducts] = useState('');
  const [notes, setNotes] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [nextMeetingDate, setNextMeetingDate] = useState('');

  useEffect(() => {
    const load = async () => {
      const stored = await AsyncStorage.getItem('user');
      if (stored) {
        const u = JSON.parse(stored);
        setRole(u.role);
        setUserData(u);
      }
      fetchClients();
    };
    load();
  }, []);

  const fetchClients = async () => {
    try {
      setRefreshing(true);
      const res = await api.get('/onboarding');
      setClients(res.data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setRefreshing(false);
    }
  };

  const acquireGPS = async () => {
    try {
      setGettingCoords(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setCoords(loc.coords);
      Toast.show({ type: 'success', text1: 'GPS Acquired', text2: 'Location captured successfully.' });
    } catch (e) {
      Alert.alert('GPS Error', 'Could not acquire location.');
    } finally {
      setGettingCoords(false);
    }
  };

  const resetForm = () => {
    setBusinessName(''); setBusinessType(''); setGstNumber('');
    setOwnerName(''); setContactPerson(''); setPhone(''); setAltPhone(''); setEmail('');
    setAddress(''); setCity(''); setSelectedState(''); setPincode(''); setLandmark('');
    setPanNumber(''); setYearsInBusiness(''); setLeadSource(''); setExpectedVolume('');
    setInterestedProducts(''); setNotes('');
    setFollowUpDate(''); setNextMeetingDate(''); setCoords(null);
    setEditId(null);
  };

  const handleSubmit = async () => {
    if (!businessName || !businessType || !ownerName || !phone || !address || !city || !selectedState || !pincode) {
      Alert.alert('Missing Fields', 'Please fill all required fields marked with *');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        businessName, businessType, gstNumber,
        ownerName, phone, email,
        address, city, state: selectedState, pincode,
        latitude: coords?.latitude,
        longitude: coords?.longitude,
        notes,
        followUpDate,
      };

      if (editId) {
        await api.put(`/onboarding/${editId}`, payload);
        Toast.show({ type: 'success', text1: 'Client Updated!', text2: `${businessName} updated successfully.` });
      } else {
        await api.post('/onboarding', payload);
        Toast.show({ type: 'success', text1: 'Client Onboarded!', text2: `${businessName} added successfully.` });
      }
      
      resetForm();
      setShowForm(false);
      fetchClients();
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || `Failed to ${editId ? 'update' : 'onboard'} client.`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (client) => {
    setEditId(client._id);
    setBusinessName(client.businessName || '');
    setBusinessType(client.businessType || '');
    setGstNumber(client.gstNumber || '');
    setOwnerName(client.ownerName || '');
    setContactPerson(client.contactPerson || '');
    setPhone(client.phone || '');
    setAltPhone(client.altPhone || '');
    setEmail(client.email || '');
    setAddress(client.location?.address || '');
    setCity(client.location?.city || '');
    setSelectedState(client.location?.state || '');
    setPincode(client.location?.pincode || '');
    setLandmark(client.landmark || '');
    setPanNumber(client.panNumber || '');
    setYearsInBusiness(client.yearsInBusiness?.toString() || '');
    setLeadSource(client.leadSource || '');
    setExpectedVolume(client.expectedVolume || '');
    setInterestedProducts(client.interestedProducts || '');
    setNotes(client.notes || '');
    setFollowUpDate(client.followUpDate ? new Date(client.followUpDate).toISOString().slice(0, 16) : '');
    
    if (client.location?.latitude && client.location?.longitude) {
      setCoords({ latitude: client.location.latitude, longitude: client.location.longitude });
    } else {
      setCoords(null);
    }
    setShowForm(true);
  };

  const handleDelete = (id) => {
    Alert.alert('Delete Client', 'Are you sure you want to delete this client?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await api.delete(`/onboarding/${id}`);
            Toast.show({ type: 'success', text1: 'Deleted', text2: 'Client removed successfully' });
            fetchClients();
          } catch (e) {
            Alert.alert('Error', 'Failed to delete client');
          }
        } 
      }
    ]);
  };

  return (
    <AppLayout currentScreen="ClientOnboarding" role={role} scrollable={false}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 22, fontWeight: '900', color: '#0f172a', marginBottom: 16 }}>Client Onboarding</Text>

        {!showForm ? (
          // ── LIST VIEW ──
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {clients.length} Client{clients.length !== 1 ? 's' : ''} Onboarded
              </Text>
              <TouchableOpacity
                onPress={() => { setShowForm(true); acquireGPS(); }}
                style={{ backgroundColor: '#0284c7', paddingHorizontal: 16, paddingVertical: 9, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 6 }}
              >
                <Ionicons name="add" size={16} color="#fff" />
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>New Client</Text>
              </TouchableOpacity>
            </View>

            {refreshing && clients.length === 0 ? (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator size="large" color="#0284c7" />
              </View>
            ) : clients.length === 0 ? (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                <View style={{ backgroundColor: '#eff6ff', borderRadius: 20, padding: 20 }}>
                  <Ionicons name="briefcase-outline" size={40} color="#0284c7" />
                </View>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#64748b' }}>No clients onboarded yet</Text>
                {role === 'Field Executive' && (
                  <Text style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>Tap "New Client" to add your first client</Text>
                )}
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
                {clients.map((item) => {
                  return (
                    <View key={item._id} style={{
                      backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0',
                      padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.04,
                      shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, elevation: 2,
                    }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                          <Text style={{ fontSize: 15, fontWeight: '800', color: '#0f172a' }}>{item.businessName}</Text>
                          <Text style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{item.businessType}</Text>
                        </View>
                        <View style={{ backgroundColor: '#eff6ff', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
                          <Text style={{ fontSize: 10, fontWeight: '700', color: '#0284c7', textTransform: 'uppercase' }}>Active</Text>
                        </View>
                      </View>

                      <View style={{ gap: 4 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Ionicons name="person-outline" size={13} color="#94a3b8" />
                          <Text style={{ fontSize: 12, color: '#475569' }}>{item.ownerName}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Ionicons name="call-outline" size={13} color="#94a3b8" />
                          <Text style={{ fontSize: 12, color: '#475569' }}>{item.phone}</Text>
                        </View>
                        {item.email ? (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Ionicons name="mail-outline" size={13} color="#94a3b8" />
                            <Text style={{ fontSize: 12, color: '#475569' }}>{item.email}</Text>
                          </View>
                        ) : null}
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Ionicons name="location-outline" size={13} color="#94a3b8" />
                          <Text style={{ fontSize: 12, color: '#475569' }} numberOfLines={1}>
                            {item.location?.city || item.city}, {item.location?.state || item.state}, {item.location?.pincode || item.pincode}
                          </Text>
                        </View>
                        {item.gstNumber ? (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Ionicons name="document-text-outline" size={13} color="#94a3b8" />
                            <Text style={{ fontSize: 12, color: '#475569' }}>GST: {item.gstNumber}</Text>
                          </View>
                        ) : null}
                      </View>

                      {item.followUpDate && (
                        <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Ionicons name="calendar-outline" size={13} color="#0284c7" />
                          <Text style={{ fontSize: 11, color: '#0284c7', fontWeight: '600' }}>
                            Follow-up: {new Date(item.followUpDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </Text>
                        </View>
                      )}

                      <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontSize: 10, color: '#94a3b8' }}>
                          {new Date(item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                          {(role === 'Admin' || userData.id === item.executive?._id || userData.employeeId === item.executive?.employeeId) && (
                            <>
                              <TouchableOpacity onPress={() => handleEdit(item)} style={{ padding: 4 }}>
                                <Ionicons name="pencil" size={16} color="#0284c7" />
                              </TouchableOpacity>
                              <TouchableOpacity onPress={() => handleDelete(item._id)} style={{ padding: 4 }}>
                                <Ionicons name="trash" size={16} color="#e11d48" />
                              </TouchableOpacity>
                            </>
                          )}
                          {role === 'Admin' && item.executive && (
                            <Text style={{ fontSize: 10, fontWeight: '700', color: '#0284c7', backgroundColor: '#eff6ff', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                              By: {item.executive.name}
                            </Text>
                          )}
                        </View>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            )}
          </View>
        ) : (
          // ── FORM VIEW ──
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 80 }}>

            {/* SECTION 1: Business Details */}
            <SectionCard title="Business Details" icon="briefcase-outline">
              <Field label="Business / Client Name" required value={businessName} onChangeText={setBusinessName} placeholder="E.g. Sharma Traders" />
              <FieldLabel text="Business Type" required />
              <PillSelector options={BUSINESS_TYPES} value={businessType} onSelect={setBusinessType} />
              <Field label="GST Number" value={gstNumber} onChangeText={setGstNumber} placeholder="E.g. 27AAPFU0939F1ZV" />
              <Field label="PAN Number" value={panNumber} onChangeText={setPanNumber} placeholder="E.g. AAPFU0939F" />
              <Field label="Years in Business" value={yearsInBusiness} onChangeText={setYearsInBusiness} keyboardType="numeric" placeholder="E.g. 5" />
            </SectionCard>

            {/* SECTION 2: Contact Information */}
            <SectionCard title="Contact Information" icon="people-outline">
              <Field label="Owner Name" required value={ownerName} onChangeText={setOwnerName} placeholder="E.g. Rajesh Sharma" />
              <Field label="Contact Person Name" value={contactPerson} onChangeText={setContactPerson} placeholder="E.g. Anita (Accountant)" />
              <Field label="Mobile Number" required value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="E.g. 9876543210" />
              <Field label="Alternate Mobile" value={altPhone} onChangeText={setAltPhone} keyboardType="phone-pad" placeholder="E.g. 9123456789" />
              <Field label="Email Address" value={email} onChangeText={setEmail} keyboardType="email-address" placeholder="E.g. sharma@traders.com" />
            </SectionCard>

            {/* SECTION 3: Address */}
            <SectionCard title="Address Information" icon="location-outline">
              <Field label="Full Address" required value={address} onChangeText={setAddress} placeholder="Street, Building, Area" multiline />
              <SelectField label="State" required value={selectedState} onChange={(v) => { setSelectedState(v); setCity(''); }} options={STATES} />
              <SelectField label="City" required value={city} onChange={setCity} options={selectedState ? LOCATION_DATA[selectedState] || [] : []} />
              <Field label="Pincode" required value={pincode} onChangeText={setPincode} keyboardType="numeric" placeholder="E.g. 400001" />
              <Field label="Landmark" value={landmark} onChangeText={setLandmark} placeholder="E.g. Near Railway Station" />
            </SectionCard>

            {/* SECTION 4: GPS Location */}
            <SectionCard title="Location Details" icon="navigate-outline">
              <View style={{ marginTop: 10 }}>
                <TouchableOpacity
                  onPress={acquireGPS}
                  style={{
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                    backgroundColor: coords ? '#f0fdf4' : '#eff6ff',
                    borderRadius: 14, borderWidth: 1.5,
                    borderColor: coords ? '#bbf7d0' : '#bfdbfe',
                    paddingVertical: 14, paddingHorizontal: 20,
                  }}
                >
                  {gettingCoords ? (
                    <ActivityIndicator size="small" color="#0284c7" />
                  ) : (
                    <Ionicons name={coords ? 'checkmark-circle' : 'navigate-outline'} size={20} color={coords ? '#16a34a' : '#0284c7'} />
                  )}
                  <Text style={{ fontSize: 13, fontWeight: '700', color: coords ? '#16a34a' : '#0284c7' }}>
                    {gettingCoords ? 'Acquiring GPS...' : coords ? 'GPS Captured ✓' : 'Capture Current Location'}
                  </Text>
                </TouchableOpacity>
                {coords && (
                  <Text style={{ fontSize: 11, color: '#64748b', textAlign: 'center', marginTop: 8 }}>
                    {coords.latitude.toFixed(5)}, {coords.longitude.toFixed(5)}
                  </Text>
                )}
              </View>
            </SectionCard>

            {/* SECTION 5: Sales Information */}
            <SectionCard title="Sales Information" icon="stats-chart-outline">
              <Field label="Lead Source" value={leadSource} onChangeText={setLeadSource} placeholder="E.g. Cold Call, Reference" />
              <Field label="Expected Business Volume" value={expectedVolume} onChangeText={setExpectedVolume} placeholder="E.g. ₹50,000/month" />
              <Field label="Interested Products / Services" value={interestedProducts} onChangeText={setInterestedProducts} placeholder="E.g. Fertilizers, Seeds" multiline />
            </SectionCard>

            {/* SECTION 6: Remarks & Follow-up */}
            <SectionCard title="Remarks & Follow-up" icon="document-text-outline">
              <Field label="Notes / Remarks" value={notes} onChangeText={setNotes} placeholder="Initial discussion summary, requirements..." multiline />
              <DateField label="Follow-up Date & Time" value={followUpDate} onChange={setFollowUpDate} mode="datetime" />
              <DateField label="Next Meeting Date" value={nextMeetingDate} onChange={setNextMeetingDate} />
            </SectionCard>

            {/* Employee Info (auto-filled) */}
            <SectionCard title="Employee Information" icon="person-circle-outline">
              <View style={{ backgroundColor: '#f8fafc', borderRadius: 12, padding: 14, gap: 6 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 12, color: '#94a3b8', fontWeight: '600' }}>Employee Name</Text>
                  <Text style={{ fontSize: 12, color: '#0f172a', fontWeight: '700' }}>{userData.name || '—'}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 12, color: '#94a3b8', fontWeight: '600' }}>Employee ID</Text>
                  <Text style={{ fontSize: 12, color: '#0f172a', fontWeight: '700' }}>{userData.employeeId || '—'}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 12, color: '#94a3b8', fontWeight: '600' }}>Date & Time</Text>
                  <Text style={{ fontSize: 12, color: '#0f172a', fontWeight: '700' }}>
                    {new Date().toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 12, color: '#94a3b8', fontWeight: '600' }}>GPS Coordinates</Text>
                  <Text style={{ fontSize: 12, color: coords ? '#16a34a' : '#e11d48', fontWeight: '700' }}>
                    {coords ? `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}` : 'Not captured'}
                  </Text>
                </View>
              </View>
            </SectionCard>

            {/* Submit & Cancel */}
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={submitting}
              style={{
                backgroundColor: submitting ? '#93c5fd' : '#0284c7',
                borderRadius: 16, paddingVertical: 16,
                alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8,
                marginBottom: 12, shadowColor: '#0284c7', shadowOpacity: 0.3,
                shadowOffset: { width: 0, height: 4 }, shadowRadius: 8, elevation: 6,
              }}
            >
              {submitting ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />}
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>
                {submitting ? (editId ? 'Updating...' : 'Submitting...') : (editId ? 'Update Client' : 'Complete Onboarding')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => { setShowForm(false); resetForm(); }}
              style={{ borderRadius: 16, paddingVertical: 14, alignItems: 'center', borderWidth: 1.5, borderColor: '#e2e8f0', backgroundColor: '#fff' }}
            >
              <Text style={{ fontWeight: '700', fontSize: 14, color: '#64748b' }}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </View>
    </AppLayout>
  );
}
