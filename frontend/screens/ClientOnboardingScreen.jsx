import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Alert, Platform, TextInput, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AppLayout from '../components/AppLayout';
import api from '../api/api';

const BUSINESS_TYPES = ['Retailer', 'Distributor', 'Wholesaler', 'Dealer', 'Corporate', 'Other'];
const PRIORITY_LEVELS = ['High', 'Medium', 'Low'];

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

// Date picker for web/native
function DateField({ label, required, value, onChange }) {
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
          <Ionicons name="calendar-outline" size={18} color="#0284c7" style={{ marginRight: 8 }} />
          <input
            type="date"
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
        <Ionicons name="calendar-outline" size={18} color="#0284c7" />
        <Text style={{ fontSize: 14, color: value ? '#0f172a' : '#94a3b8', flex: 1 }}>
          {value ? new Date(value + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Select date'}
        </Text>
        <Ionicons name="chevron-down" size={14} color="#94a3b8" />
      </TouchableOpacity>
      {show && (
        <DateTimePicker
          value={value ? new Date(value + 'T00:00:00') : new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_, d) => { setShow(false); if (d) onChange(d.toISOString().split('T')[0]); }}
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
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [landmark, setLandmark] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [yearsInBusiness, setYearsInBusiness] = useState('');
  const [leadSource, setLeadSource] = useState('');
  const [expectedVolume, setExpectedVolume] = useState('');
  const [interestedProducts, setInterestedProducts] = useState('');
  const [priority, setPriority] = useState('Medium');
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
    setAddress(''); setCity(''); setState(''); setPincode(''); setLandmark('');
    setPanNumber(''); setYearsInBusiness(''); setLeadSource(''); setExpectedVolume('');
    setInterestedProducts(''); setPriority('Medium'); setNotes('');
    setFollowUpDate(''); setNextMeetingDate(''); setCoords(null);
  };

  const handleSubmit = async () => {
    if (!businessName || !businessType || !ownerName || !phone || !address || !city || !pincode) {
      Alert.alert('Missing Fields', 'Please fill all required fields marked with *');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/onboarding', {
        businessName, businessType, gstNumber,
        ownerName, phone, email,
        address, city, state, pincode,
        latitude: coords?.latitude,
        longitude: coords?.longitude,
        notes,
        followUpDate,
      });
      Toast.show({ type: 'success', text1: 'Client Onboarded!', text2: `${businessName} added successfully.` });
      resetForm();
      setShowForm(false);
      fetchClients();
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to onboard client.');
    } finally {
      setSubmitting(false);
    }
  };

  const priorityColors = { High: { bg: '#fef2f2', text: '#e11d48', border: '#fecdd3' }, Medium: { bg: '#fffbeb', text: '#d97706', border: '#fde68a' }, Low: { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0' } };

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
              {role === 'Field Executive' && (
                <TouchableOpacity
                  onPress={() => { setShowForm(true); acquireGPS(); }}
                  style={{ backgroundColor: '#0284c7', paddingHorizontal: 16, paddingVertical: 9, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 6 }}
                >
                  <Ionicons name="add" size={16} color="#fff" />
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>New Client</Text>
                </TouchableOpacity>
              )}
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
                  const p = priorityColors[item.priority] || priorityColors.Medium;
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
                            {item.location?.city}, {item.location?.pincode}
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
                        {role === 'Admin' && item.executive && (
                          <Text style={{ fontSize: 10, fontWeight: '700', color: '#0284c7', backgroundColor: '#eff6ff', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                            By: {item.executive.name}
                          </Text>
                        )}
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
              <Field label="City" required value={city} onChangeText={setCity} placeholder="E.g. Mumbai" />
              <Field label="State" value={state} onChangeText={setState} placeholder="E.g. Maharashtra" />
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
              <FieldLabel text="Priority Level" />
              <PillSelector options={PRIORITY_LEVELS} value={priority} onSelect={setPriority} />
            </SectionCard>

            {/* SECTION 6: Remarks & Follow-up */}
            <SectionCard title="Remarks & Follow-up" icon="document-text-outline">
              <Field label="Notes / Remarks" value={notes} onChangeText={setNotes} placeholder="Initial discussion summary, requirements..." multiline />
              <DateField label="Follow-up Date" value={followUpDate} onChange={setFollowUpDate} />
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
                {submitting ? 'Submitting...' : 'Complete Onboarding'}
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
