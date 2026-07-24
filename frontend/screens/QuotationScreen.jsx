import { router } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import AppLayout from '../components/AppLayout';
import api from '../api/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

export default function QuotationScreen() {
  const [role, setRole] = useState('Field Executive');
  const [quotations, setQuotations] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editId, setEditId] = useState(null);

  const [project, setProject] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('Pending');

  useEffect(() => {
    const load = async () => {
      const stored = await AsyncStorage.getItem('user');
      if (stored) setRole(JSON.parse(stored).role);
      fetchQuotations();
      fetchProjects();
    };
    load();
  }, []);

  const fetchQuotations = async () => {
    try {
      setLoading(true);
      const res = await api.get('/quotations');
      setQuotations(res.data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await api.get('/projects');
      setProjects(res.data.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const resetForm = () => {
    setProject(''); setAmount(''); setDescription(''); setStatus('Pending'); setEditId(null);
  };

  const handleEdit = (q) => {
    setEditId(q._id);
    setProject(q.project?._id || q.project);
    setAmount(q.amount?.toString() || '');
    setDescription(q.description || '');
    setStatus(q.status || 'Pending');
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!project || !amount || !description) {
      Alert.alert('Missing Fields', 'Please fill all required fields.');
      return;
    }
    setSubmitting(true);
    try {
      const payload = { project, amount: Number(amount), description, status };
      if (editId) {
        await api.put(`/quotations/${editId}`, payload);
        Toast.show({ type: 'success', text1: 'Quotation Updated' });
      } else {
        await api.post('/quotations', payload);
        Toast.show({ type: 'success', text1: 'Quotation Created' });
      }
      resetForm();
      setShowForm(false);
      fetchQuotations();
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to save quotation.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppLayout currentScreen="Quotation" role={role} scrollable={false}>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <TouchableOpacity onPress={() => router.push(role.includes('Admin') || role === 'Managing Director MD' ? '/AdminDashboard' : '/Dashboard')}>
              <Ionicons name="arrow-back" size={24} color="#0f172a" />
            </TouchableOpacity>
            <Text style={{ fontSize: 24, fontWeight: '500', color: '#0f172a' }}>Quotations</Text>
          </View>
          {!showForm && (
            <TouchableOpacity 
              onPress={() => setShowForm(true)}
              style={{ backgroundColor: '#0f172a', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 6 }}
            >
               <Ionicons name="add" size={16} color="#fff" />
               <Text style={{ color: '#fff', fontWeight: '500', fontSize: 12 }}>Add Quote</Text>
            </TouchableOpacity>
          )}
        </View>

        {showForm ? (
          <ScrollView contentContainerStyle={{ paddingBottom: 80 }} showsVerticalScrollIndicator={false}>
            <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#e2e8f0' }}>
              <Text style={{ fontSize: 18, fontWeight: '500', color: '#0f172a', marginBottom: 16 }}>{editId ? 'Edit Quotation' : 'New Quotation'}</Text>
              
              <SelectField 
                label="Select Project" required 
                value={project} onChange={setProject} 
                options={projects.map(p => ({ value: p._id, label: p.name + (p.client?.businessName ? ` - ${p.client.businessName}` : '') }))} 
              />
              
              <Field label="Amount (₹)" required value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="E.g. 50000" />
              <Field label="Description" required value={description} onChangeText={setDescription} placeholder="Scope of quotation..." multiline />
              
              {editId && (
                <SelectField label="Status" required value={status} onChange={setStatus} options={['Pending', 'Approved', 'Rejected']} />
              )}
              
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={submitting}
                style={{ backgroundColor: submitting ? '#94a3b8' : '#0f172a', borderRadius: 16, paddingVertical: 14, alignItems: 'center', marginTop: 12 }}
              >
                {submitting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '500', fontSize: 14 }}>{editId ? 'Save Changes' : 'Create Quotation'}</Text>}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { setShowForm(false); resetForm(); }}
                style={{ borderRadius: 16, paddingVertical: 14, alignItems: 'center', marginTop: 8, borderWidth: 1.5, borderColor: '#e2e8f0' }}
              >
                <Text style={{ fontWeight: '500', fontSize: 14, color: '#64748b' }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        ) : loading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color="#0f172a" /></View>
        ) : quotations.length === 0 ? (
           <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
             <Ionicons name="document-text-outline" size={48} color="#94a3b8" />
             <Text style={{ fontSize: 16, fontWeight: '500', color: '#475569' }}>No quotations created yet.</Text>
           </View>
        ) : (
          <ScrollView contentContainerStyle={{ paddingBottom: 80 }} showsVerticalScrollIndicator={false}>
            {quotations.map((quote) => (
              <View key={quote._id} style={{ backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 18, fontWeight: '500', color: '#0f172a' }}>{quote.project?.name}</Text>
                    <Text style={{ fontSize: 14, color: '#64748b', marginBottom: 8, marginTop: 4 }}>{quote.description}</Text>
                  </View>
                  <TouchableOpacity onPress={() => handleEdit(quote)} style={{ padding: 6, backgroundColor: '#f1f5f9', borderRadius: 10 }}>
                    <Ionicons name="pencil" size={16} color="#475569" />
                  </TouchableOpacity>
                </View>
                
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                   <Text style={{ fontSize: 16, color: '#0284c7', fontWeight: '500' }}>₹{quote.amount}</Text>
                   <View style={{ backgroundColor: quote.status === 'Approved' ? '#dcfce7' : quote.status === 'Rejected' ? '#fee2e2' : '#fef3c7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                     <Text style={{ fontSize: 11, color: quote.status === 'Approved' ? '#16a34a' : quote.status === 'Rejected' ? '#ef4444' : '#d97706', fontWeight: '500' }}>{quote.status}</Text>
                   </View>
                </View>
              </View>
            ))}
          </ScrollView>
        )}
      </View>
    </AppLayout>
  );
}
