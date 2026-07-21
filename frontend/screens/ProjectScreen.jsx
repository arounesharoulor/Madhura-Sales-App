import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import AppLayout from '../components/AppLayout';
import api from '../api/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import { useLocalSearchParams } from 'expo-router';

import LeadScreen from './LeadScreen';
import TaskAssignmentScreen from './TaskAssignmentScreen';
import AdminFollowupManagementScreen from './AdminFollowupManagementScreen';
import TaskScreen from './TaskScreen';
import FollowupScreen from './FollowupScreen';
import QuotationScreen from './QuotationScreen';
import ProposalScreen from './ProposalScreen';
import InvoiceScreen from './InvoiceScreen';

const SERVICE_OPTIONS = ['Website', 'Mobile App', 'Software', 'Digital Marketing', 'Poster Designing', 'Other'];
const CATEGORY_OPTIONS = ['Development', 'Marketing', 'Design', 'Consulting', 'Maintenance'];
const PRIORITY_OPTIONS = ['Low', 'Medium', 'High', 'Urgent'];

// Multi Pill selector
function MultiPillSelector({ options, selectedValues, onToggle }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8, marginBottom: 12 }}>
      {options.map((opt) => {
        const isSelected = selectedValues.includes(opt);
        return (
          <TouchableOpacity
            key={opt}
            onPress={() => onToggle(opt)}
            style={{
              paddingHorizontal: 14, paddingVertical: 8, borderRadius: 30, borderWidth: 1.5,
              backgroundColor: isSelected ? '#0284c7' : '#f8fafc',
              borderColor: isSelected ? '#0284c7' : '#e2e8f0',
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '700', color: isSelected ? '#fff' : '#64748b' }}>
              {opt}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// Select field
function SelectField({ label, required, value, onChange, options, optionKey = 'value', optionLabel = 'label' }) {
  if (Platform.OS === 'web') {
    return (
      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
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
            {options.map(opt => (
              <option key={opt[optionKey] || opt} value={opt[optionKey] || opt}>{opt[optionLabel] || opt}</option>
            ))}
          </select>
        </View>
      </View>
    );
  }
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
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
          {options.map(opt => <Picker.Item key={opt[optionKey] || opt} label={opt[optionLabel] || opt} value={opt[optionKey] || opt} />)}
        </Picker>
      </View>
    </View>
  );
}

// Field input
function Field({ label, required, value, onChangeText, placeholder, keyboardType, multiline }) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
        {label}{required && <Text style={{ color: '#e11d48' }}> *</Text>}
      </Text>
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

// Date field
function DateField({ label, required, value, onChange }) {
  const [show, setShow] = useState(false);
  if (Platform.OS === 'web') {
    return (
      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
          {label}{required && <Text style={{ color: '#e11d48' }}> *</Text>}
        </Text>
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
    <View style={{ marginBottom: 16 }}>
      <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
        {label}{required && <Text style={{ color: '#e11d48' }}> *</Text>}
      </Text>
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
          {value ? new Date(value).toLocaleDateString() : `Select Date`}
        </Text>
      </TouchableOpacity>
      {show && (
        <DateTimePicker
          value={value ? new Date(value) : new Date()}
          mode="date"
          display="default"
          onChange={(_, d) => { setShow(false); if (d) onChange(d.toISOString().split('T')[0]); }}
        />
      )}
    </View>
  );
}

export default function ProjectScreen({ navigation }) {
  const [role, setRole] = useState('Field Executive');
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState('projects'); // 'leads', 'projects', 'tasks', 'followups'
  const [prefilledLead, setPrefilledLead] = useState(null);
  
  // Form State
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [name, setName] = useState('');
  const [projectCode, setProjectCode] = useState('');
  const [client, setClient] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [startDate, setStartDate] = useState('');
  const [targetCompletionDate, setTargetCompletionDate] = useState('');
  const [clientRequirement, setClientRequirement] = useState('');
  const [services, setServices] = useState([]);

  useEffect(() => {
    const load = async () => {
      const stored = await AsyncStorage.getItem('user');
      if (stored) setRole(JSON.parse(stored).role);
      fetchProjects();
      fetchClients();
    };
    load();
  }, []);

  const params = useLocalSearchParams();

  useEffect(() => {
    if (params?.prefillProjectFromMeeting) {
      try {
        const meeting = JSON.parse(params.prefillProjectFromMeeting);
        setPrefilledLead(meeting);
        setName(`${meeting.clientName} - Project`);
        setDescription(meeting.notes || '');
        setClientRequirement(meeting.clientRequirement || '');
        setClient(meeting.companyName || meeting.clientName || '');
        setActiveTab('projects');
        setShowForm(true);
      } catch (e) {
        console.error('Failed to parse prefillProjectFromMeeting', e);
      }
    }
    if (params?.prefillProjectFromClient) {
      try {
        const clientData = JSON.parse(params.prefillProjectFromClient);
        setPrefilledLead(clientData);
        setName(clientData.projectName || `${clientData.clientName} - Project`);
        setDescription(clientData.notes || '');
        setClientRequirement(clientData.clientRequirement || '');
        setClient(clientData.companyName || clientData.clientName || '');
        if (clientData.services) setServices(clientData.services);
        if (clientData.softwareDetails) setSoftwareDetails(clientData.softwareDetails);
        setActiveTab('projects');
        setShowForm(true);
      } catch (e) {
        console.error('Failed to parse prefillProjectFromClient', e);
      }
    }
  }, [params?.prefillProjectFromMeeting, params?.prefillProjectFromClient]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await api.get('/projects');
      setProjects(res.data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const res = await api.get('/onboarding');
      setClients(res.data.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const resetForm = () => {
    setName(''); setProjectCode(''); setClient(''); setCategory('');
    setDescription(''); setClientRequirement(''); setPriority('Medium'); setStartDate('');
    setTargetCompletionDate(''); setServices([]); setPrefilledLead(null);
  };

  const handleSubmit = async () => {
    if (!name || !client) {
      Alert.alert('Missing Fields', 'Project Name and Client are required.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/projects', {
        name, projectCode, client, category, description, clientRequirement, priority, startDate, targetCompletionDate, services
      });
      Toast.show({ type: 'success', text1: 'Project Added', text2: 'The project was successfully created.' });
      resetForm();
      setShowForm(false);
      fetchProjects();
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to create project.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppLayout currentScreen="Project" role={role} scrollable={false}>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 12, padding: 4, marginBottom: 16, marginHorizontal: 2 }}>
          {[
            { id: 'leads', label: 'Leads', icon: 'funnel' },
            { id: 'projects', label: 'Projects', icon: 'briefcase' },
            { id: 'tasks', label: 'Tasks', icon: 'checkmark-done' },
            { id: 'followups', label: 'Follow-ups', icon: 'chatbubbles' }
          ].map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <TouchableOpacity 
                key={tab.id}
                onPress={() => setActiveTab(tab.id)}
                activeOpacity={0.8}
                style={{ 
                  flex: 1, 
                  paddingVertical: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  borderRadius: 10, 
                  backgroundColor: isActive ? '#fff' : 'transparent',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: isActive ? 0.05 : 0,
                  shadowRadius: 2,
                  elevation: isActive ? 1 : 0,
                }}
              >
                <Ionicons 
                  name={isActive ? tab.icon : `${tab.icon}-outline`} 
                  size={14} 
                  color={isActive ? '#0284c7' : '#64748b'} 
                />
                <Text style={{ 
                  fontSize: 12, 
                  fontWeight: isActive ? '800' : '600', 
                  color: isActive ? '#0f172a' : '#64748b' 
                }}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {activeTab === 'leads' && <LeadScreen 
          navigation={navigation} 
          isComponent={true} 
          onOnboardProject={(lead) => {
            setPrefilledLead(lead);
            setName(`${lead.clientName} - Project`);
            setServices(lead.serviceInterested ? [lead.serviceInterested] : []);
            setDescription(lead.notes || '');
            setActiveTab('projects');
            setShowForm(true);
          }}
        />}
        {activeTab === 'tasks' && (
          ['Admin', 'Project Manager', 'Team Lead', 'Managing Director MD'].includes(role) 
            ? <TaskAssignmentScreen navigation={navigation} isComponent={true} />
            : <TaskScreen navigation={navigation} isComponent={true} />
        )}
        {activeTab === 'followups' && (
          ['Admin', 'Project Manager', 'Team Lead', 'Managing Director MD'].includes(role)
            ? <AdminFollowupManagementScreen navigation={navigation} isComponent={true} />
            : <FollowupScreen navigation={navigation} isComponent={true} />
        )}
        

        {activeTab === 'projects' && (
          <>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 24, fontWeight: '900', color: '#0f172a' }}>Projects</Text>
          {!showForm && (
            <TouchableOpacity 
              onPress={() => setShowForm(true)}
              style={{ backgroundColor: '#0284c7', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 6 }}
            >
              <Ionicons name="add" size={16} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>New Project</Text>
            </TouchableOpacity>
          )}
        </View>

        {showForm ? (
          <ScrollView contentContainerStyle={{ paddingBottom: 80 }} showsVerticalScrollIndicator={false}>
            <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#0f172a', marginBottom: 16 }}>Add New Project</Text>
              
              <Field label="Project Name" required value={name} onChangeText={setName} placeholder="E.g. Website Redesign" />
              <Field label="Project Code / ID (Optional)" value={projectCode} onChangeText={setProjectCode} placeholder="E.g. PRJ-2024-001" />
              
              <SelectField 
                label="Select Client" required 
                value={client} onChange={setClient} 
                options={clients.map(c => ({ value: c._id, label: c.businessName + (c.ownerName ? ` (${c.ownerName})` : '') }))} 
              />
              
              <SelectField label="Category" value={category} onChange={setCategory} options={CATEGORY_OPTIONS} />
              
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Services Required</Text>
              <MultiPillSelector options={SERVICE_OPTIONS} selectedValues={services} onToggle={(val) => {
                setServices(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]);
              }} />

              <SelectField label="Priority" value={priority} onChange={setPriority} options={PRIORITY_OPTIONS} />
              
              <DateField label="Start Date" value={startDate} onChange={setStartDate} />
              <DateField label="Target Completion Date" value={targetCompletionDate} onChange={setTargetCompletionDate} />
              
              <Field label="Description" value={description} onChangeText={setDescription} placeholder="Project scope and details..." multiline />
              <Field label="Client Requirements" value={clientRequirement} onChangeText={setClientRequirement} placeholder="Client needs / requirements..." multiline />
              
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={submitting}
                style={{ backgroundColor: submitting ? '#93c5fd' : '#0284c7', borderRadius: 16, paddingVertical: 14, alignItems: 'center', marginTop: 12 }}
              >
                {submitting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>Create Project</Text>}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { setShowForm(false); resetForm(); }}
                style={{ borderRadius: 16, paddingVertical: 14, alignItems: 'center', marginTop: 8, borderWidth: 1.5, borderColor: '#e2e8f0' }}
              >
                <Text style={{ fontWeight: '700', fontSize: 14, color: '#64748b' }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        ) : loading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color="#0f172a" /></View>
        ) : projects.length === 0 ? (
           <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
             <Ionicons name="laptop-outline" size={48} color="#94a3b8" />
             <Text style={{ fontSize: 16, fontWeight: '700', color: '#475569' }}>No projects created yet.</Text>
           </View>
        ) : (
          <ScrollView contentContainerStyle={{ paddingBottom: 80 }} showsVerticalScrollIndicator={false}>
            {projects.map((proj) => (
              <View key={proj._id} style={{ backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 6, elevation: 1 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 18, fontWeight: '900', color: '#0f172a', marginBottom: 4 }}>{proj.name}</Text>
                    {proj.projectCode ? <Text style={{ fontSize: 12, color: '#64748b', fontWeight: '700', marginBottom: 4 }}>{proj.projectCode}</Text> : null}
                  </View>
                  <View style={{ backgroundColor: proj.priority === 'Urgent' ? '#fee2e2' : proj.priority === 'High' ? '#ffedd5' : '#eff6ff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                    <Text style={{ fontSize: 10, fontWeight: '800', color: proj.priority === 'Urgent' ? '#ef4444' : proj.priority === 'High' ? '#f97316' : '#0ea5e9' }}>{proj.priority}</Text>
                  </View>
                </View>
                
                <Text style={{ fontSize: 13, color: '#475569', marginBottom: 12, fontWeight: '600' }}>Client: {proj.client?.businessName}</Text>
                
                {proj.services?.length > 0 && (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                    {proj.services.map(s => (
                      <View key={s} style={{ backgroundColor: '#f1f5f9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
                        <Text style={{ fontSize: 11, color: '#475569', fontWeight: '700' }}>{s}</Text>
                      </View>
                    ))}
                  </View>
                )}
                
                <View style={{ height: 6, backgroundColor: '#f1f5f9', borderRadius: 3, marginBottom: 8, overflow: 'hidden' }}>
                  <View style={{ height: '100%', width: `${proj.progress || 0}%`, backgroundColor: '#22c55e' }} />
                </View>
                
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                   <Text style={{ fontSize: 11, color: '#64748b', fontWeight: '700' }}>{proj.progress}% Complete</Text>
                   <Text style={{ fontSize: 11, color: '#64748b', fontWeight: '600' }}>{new Date(proj.createdAt).toLocaleDateString()}</Text>
                </View>

                {/* Role Based Document Actions for Admin */}
                {role === 'Admin' && (
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#f1f5f9' }}>
                    <TouchableOpacity 
                      style={{ flex: 1, backgroundColor: '#f8fafc', paddingVertical: 8, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' }}
                      onPress={() => navigation.navigate('Quotation')}
                    >
                      <Ionicons name="document-text-outline" size={16} color="#0f172a" style={{ marginBottom: 4 }} />
                      <Text style={{ fontSize: 10, fontWeight: '700', color: '#0f172a' }}>Quotation</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={{ flex: 1, backgroundColor: '#f8fafc', paddingVertical: 8, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' }}
                      onPress={() => navigation.navigate('Proposal')}
                    >
                      <Ionicons name="briefcase-outline" size={16} color="#0f172a" style={{ marginBottom: 4 }} />
                      <Text style={{ fontSize: 10, fontWeight: '700', color: '#0f172a' }}>Proposal</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={{ flex: 1, backgroundColor: '#f8fafc', paddingVertical: 8, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' }}
                      onPress={() => navigation.navigate('Invoice')}
                    >
                      <Ionicons name="receipt-outline" size={16} color="#0f172a" style={{ marginBottom: 4 }} />
                      <Text style={{ fontSize: 10, fontWeight: '700', color: '#0f172a' }}>Invoice</Text>
                    </TouchableOpacity>
                  </View>
                )}

              </View>
            ))}
          </ScrollView>
        )}
          </>
        )}
      </View>
    </AppLayout>
  );
}
