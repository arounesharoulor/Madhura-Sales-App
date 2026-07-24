import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Platform, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { router } from 'expo-router';
import api from '../api/api';
import Toast from 'react-native-toast-message';

// Select field
function SelectField({ label, required, value, onChange, options, optionKey = 'value', optionLabel = 'label' }) {
  if (Platform.OS === 'web') {
    return (
      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 11, fontWeight: '500', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
          {label}{required && <Text style={{ color: '#e11d48' }}> *</Text>}
        </Text>
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
            {options.map(opt => {
              const val = typeof opt === 'string' ? opt : opt[optionKey];
              const lbl = typeof opt === 'string' ? opt : opt[optionLabel];
              return <option key={val} value={val}>{lbl}</option>;
            })}
          </select>
        </View>
      </View>
    );
  }
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ fontSize: 11, fontWeight: '500', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
        {label}{required && <Text style={{ color: '#e11d48' }}> *</Text>}
      </Text>
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
          {options.map(opt => {
            const val = typeof opt === 'string' ? opt : opt[optionKey];
            const lbl = typeof opt === 'string' ? opt : opt[optionLabel];
            return <Picker.Item key={val} label={lbl} value={val} />;
          })}
        </Picker>
      </View>
    </View>
  );
}

// Field input
function Field({ label, required, value, onChangeText, placeholder, keyboardType, multiline, maxLength }) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ fontSize: 11, fontWeight: '500', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
        {label}{required && <Text style={{ color: '#e11d48' }}> *</Text>}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder || ''}
        placeholderTextColor="#94a3b8"
        keyboardType={keyboardType || 'default'}
        multiline={multiline}
        maxLength={maxLength}
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

export default function LeadScreen({ isComponent, onOnboardProject }) {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [clientName, setClientName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [serviceInterested, setServiceInterested] = useState('');
  const [notes, setNotes] = useState('');

  const SERVICE_OPTIONS = ['Website', 'Mobile App', 'Software', 'Digital Marketing', 'Poster Designing', 'Other'];

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const res = await api.get('/leads');
      setLeads(res.data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setClientName('');
    setCompanyName('');
    setPhone('');
    setEmail('');
    setServiceInterested('');
    setNotes('');
  };

  const handleSubmit = async () => {
    if (!clientName || !companyName || !phone) {
      Alert.alert('Missing Fields', 'Client Name, Company Name, and Phone are required.');
      return;
    }
    if (!/^\d{10}$/.test(phone.trim())) {
      Alert.alert('Invalid Phone', 'Phone number must be exactly 10 digits.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/leads', {
        clientName, companyName, phone, email, serviceInterested, notes
      });
      Toast.show({ type: 'success', text1: 'Lead Created', text2: 'The lead was successfully created.' });
      resetForm();
      setShowForm(false);
      fetchLeads();
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to create lead.');
    } finally {
      setSubmitting(false);
    }
  };

  const updateLeadStatus = async (lead, newStatus, meetingType = '') => {
    try {
      await api.put(`/leads/${lead._id}/status`, { status: newStatus, meetingType });
      Toast.show({ type: 'success', text1: 'Lead Updated', text2: `Status changed to ${newStatus}` });
      fetchLeads();
      if (newStatus === 'Meeting') {
        // Automatically go to log client visit (Meeting)
        import('expo-router').then(({ router }) => {
          router.push({ pathname: '/Meeting', params: { prefillLead: JSON.stringify(lead) } });
        });
      }
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to update status.');
    }
  };

  if (loading && leads.length === 0) {
    return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color="#0f172a" /></View>;
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
          {!isComponent && (
            <TouchableOpacity onPress={() => router.push('/Dashboard')} style={{ marginTop: 4 }}>
              <Ionicons name="arrow-back" size={24} color="#0f172a" />
            </TouchableOpacity>
          )}
          <View>
            <Text style={{ fontSize: 20, fontWeight: '500', color: '#0f172a' }}>Client Leads</Text>
            <Text style={{ fontSize: 12, color: '#64748b' }}>Manage presales and meetings</Text>
          </View>
        </View>
        {!showForm && (
          <TouchableOpacity 
            onPress={() => setShowForm(true)}
            style={{ backgroundColor: '#f97316', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 6 }}
          >
            <Ionicons name="add" size={16} color="#fff" />
            <Text style={{ color: '#fff', fontWeight: '500', fontSize: 12 }}>New Lead</Text>
          </TouchableOpacity>
        )}
      </View>

      {showForm ? (
        <ScrollView contentContainerStyle={{ paddingBottom: 80 }} showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            <Text style={{ fontSize: 16, fontWeight: '500', color: '#0f172a', marginBottom: 16 }}>Add New Lead</Text>
            
            <Field label="Client Name" required value={clientName} onChangeText={setClientName} placeholder="E.g. John Doe" />
            <Field label="Company / Business Name" required value={companyName} onChangeText={setCompanyName} placeholder="E.g. Acme Corp" />
            <Field label="Phone Number" required value={phone} onChangeText={setPhone} placeholder="10-digit number" keyboardType="phone-pad" maxLength={10} />
            <Field label="Email Address" value={email} onChangeText={setEmail} placeholder="client@example.com" keyboardType="email-address" />
            <SelectField label="Service Interested In" value={serviceInterested} onChange={setServiceInterested} options={SERVICE_OPTIONS} />
            <Field label="Notes / Comments" value={notes} onChangeText={setNotes} placeholder="Context for the lead..." multiline />
            
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={submitting}
              style={{ backgroundColor: submitting ? '#fdba74' : '#f97316', borderRadius: 16, paddingVertical: 14, alignItems: 'center', marginTop: 12 }}
            >
              {submitting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '500', fontSize: 14 }}>Save Lead</Text>}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { setShowForm(false); resetForm(); }}
              style={{ borderRadius: 16, paddingVertical: 14, alignItems: 'center', marginTop: 8, borderWidth: 1.5, borderColor: '#e2e8f0' }}
            >
              <Text style={{ fontWeight: '500', fontSize: 14, color: '#64748b' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : leads.length === 0 ? (
         <View style={{ flex: 1, alignItems: 'center', paddingTop: 60, gap: 12 }}>
           <Ionicons name="funnel-outline" size={48} color="#cbd5e1" />
           <Text style={{ fontSize: 16, fontWeight: '500', color: '#475569' }}>No leads added yet.</Text>
         </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 80 }} showsVerticalScrollIndicator={false}>
          {leads.map((lead) => (
            <View key={lead._id} style={styles.leadCard}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 17, fontWeight: '500', color: '#0f172a', marginBottom: 2 }}>{lead.clientName}</Text>
                  <Text style={{ fontSize: 13, color: '#64748b', fontWeight: '400', marginBottom: 8 }}>{lead.companyName}</Text>
                </View>
                <View style={[styles.statusBadge, 
                  lead.status === 'Meeting' ? { backgroundColor: '#dcfce7', borderColor: '#86efac' } : 
                  lead.status === 'Lead Taken to the Meeting' ? { backgroundColor: '#fef9c3', borderColor: '#fde047' } :
                  { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' }
                ]}>
                  <Text style={[styles.statusText,
                    lead.status === 'Meeting' ? { color: '#16a34a' } : 
                    lead.status === 'Lead Taken to the Meeting' ? { color: '#ca8a04' } :
                    { color: '#2563eb' }
                  ]}>{lead.status}</Text>
                </View>
              </View>
              
              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
                <View style={styles.iconRow}><Ionicons name="call-outline" size={14} color="#64748b" /><Text style={styles.iconText}>{lead.phone}</Text></View>
                {lead.serviceInterested ? <View style={styles.iconRow}><Ionicons name="briefcase-outline" size={14} color="#64748b" /><Text style={styles.iconText}>{lead.serviceInterested}</Text></View> : null}
              </View>

              {lead.notes ? <Text style={styles.notes}>"{lead.notes}"</Text> : null}

              {/* Status Actions */}
              <View style={styles.actionRow}>
                {lead.status === 'Lead Taken' && (
                  <TouchableOpacity 
                    onPress={() => updateLeadStatus(lead, 'Lead Taken to the Meeting')}
                    style={[styles.actionBtn, { backgroundColor: '#fef9c3', borderColor: '#fde047' }]}
                  >
                    <Text style={[styles.actionBtnText, { color: '#ca8a04' }]}>Move to Meeting Stage</Text>
                  </TouchableOpacity>
                )}
                {lead.status === 'Lead Taken to the Meeting' && (
                  <View style={{ flexDirection: 'row', gap: 8, flex: 1 }}>
                    <TouchableOpacity 
                      onPress={() => updateLeadStatus(lead, 'Meeting', 'Online')}
                      style={[styles.actionBtn, { flex: 1, backgroundColor: '#dcfce7', borderColor: '#86efac' }]}
                    >
                      <Text style={[styles.actionBtnText, { color: '#16a34a' }]}>Online Meeting</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      onPress={() => updateLeadStatus(lead, 'Meeting', 'In-Person')}
                      style={[styles.actionBtn, { flex: 1, backgroundColor: '#dcfce7', borderColor: '#86efac' }]}
                    >
                      <Text style={[styles.actionBtnText, { color: '#16a34a' }]}>In-Person Meeting</Text>
                    </TouchableOpacity>
                  </View>
                )}
                {lead.status === 'Meeting' && (
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: 11, fontWeight: '500', color: '#16a34a', fontStyle: 'italic', flex: 1 }}>
                      {lead.meetingDate 
                        ? `Scheduled on ${new Date(lead.meetingDate).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}` 
                        : `Meeting Confirmed (${lead.meetingType}) - Next: Log Visit`}
                    </Text>
                    <TouchableOpacity 
                      onPress={() => {
                        import('expo-router').then(({ router }) => {
                          router.push({ pathname: '/Meeting', params: { prefillLead: JSON.stringify(lead) } });
                        });
                      }}
                      style={[styles.actionBtn, { backgroundColor: '#7c3aed', borderColor: '#6d28d9', paddingHorizontal: 12 }]}
                    >
                      <Text style={[styles.actionBtnText, { color: '#fff' }]}>Log Client Visit</Text>
                    </TouchableOpacity>
                  </View>
                )}
                {lead.status === 'Meeting Completed' && (
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: 11, fontWeight: '500', color: '#16a34a', fontStyle: 'italic', flex: 1 }}>
                      Meeting Completed - Next: Client Onboard
                    </Text>
                    <TouchableOpacity 
                      onPress={() => {
                        import('expo-router').then(({ router }) => {
                          router.push({ pathname: '/ClientOnboarding', params: { prefillClientFromLead: JSON.stringify(lead) } });
                        });
                      }}
                      style={[styles.actionBtn, { backgroundColor: '#10b981', borderColor: '#059669', paddingHorizontal: 12 }]}
                    >
                      <Text style={[styles.actionBtnText, { color: '#fff' }]}>Onboard Client</Text>
                    </TouchableOpacity>
                  </View>
                )}
                {lead.status === 'Client Onboarded' && (
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: 11, fontWeight: '500', color: '#16a34a', fontStyle: 'italic', flex: 1 }}>
                      Client Onboarded - Next: Create Project
                    </Text>
                    <TouchableOpacity 
                      onPress={() => {
                        updateLeadStatus(lead, 'Project Onboarded');
                        if (onOnboardProject) onOnboardProject(lead);
                      }}
                      style={[styles.actionBtn, { backgroundColor: '#0284c7', borderColor: '#0369a1', paddingHorizontal: 12 }]}
                    >
                      <Text style={[styles.actionBtnText, { color: '#fff' }]}>Onboard Project</Text>
                    </TouchableOpacity>
                  </View>
                )}
                {lead.status === 'Project Onboarded' && (
                  <Text style={{ fontSize: 11, fontWeight: '500', color: '#0f172a', fontStyle: 'italic' }}>
                    ✅ Successfully converted into a Project
                  </Text>
                )}
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  leadCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 6, elevation: 1 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
  statusText: { fontSize: 10, fontWeight: '500' },
  iconRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  iconText: { fontSize: 12, color: '#475569', fontWeight: '400' },
  notes: { fontSize: 12, color: '#64748b', fontStyle: 'italic', marginBottom: 12, backgroundColor: '#f8fafc', padding: 8, borderRadius: 8 },
  actionRow: { marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  actionBtn: { paddingVertical: 10, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  actionBtnText: { fontSize: 12, fontWeight: '500' }
});
