import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppLayout from '../components/AppLayout';
import api from '../api/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ProjectScreen({ navigation }) {
  const [role, setRole] = useState('Field Executive');
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const stored = await AsyncStorage.getItem('user');
      if (stored) setRole(JSON.parse(stored).role);
      fetchProjects();
    };
    load();
  }, []);

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

  return (
    <AppLayout currentScreen="Project" role={role} scrollable={false}>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Text style={{ fontSize: 24, fontWeight: '900', color: '#0f172a' }}>Projects</Text>
          <TouchableOpacity style={{ backgroundColor: '#0284c7', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="add" size={16} color="#fff" />
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>New Project</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color="#0f172a" /></View>
        ) : projects.length === 0 ? (
           <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
             <Ionicons name="laptop-outline" size={48} color="#94a3b8" />
             <Text style={{ fontSize: 16, fontWeight: '700', color: '#475569' }}>No projects created yet.</Text>
           </View>
        ) : (
          <ScrollView contentContainerStyle={{ paddingBottom: 80 }}>
            {projects.map((proj) => (
              <View key={proj._id} style={{ backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' }}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#0f172a' }}>{proj.name}</Text>
                <Text style={{ fontSize: 14, color: '#64748b', marginBottom: 8 }}>Client: {proj.client?.businessName}</Text>
                
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                  {proj.services.map(s => (
                    <View key={s} style={{ backgroundColor: '#eff6ff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
                      <Text style={{ fontSize: 11, color: '#0284c7', fontWeight: '700' }}>{s}</Text>
                    </View>
                  ))}
                </View>
                
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                   <Text style={{ fontSize: 12, color: '#16a34a', fontWeight: '700' }}>{proj.status}</Text>
                   <Text style={{ fontSize: 12, color: '#94a3b8' }}>{new Date(proj.createdAt).toLocaleDateString()}</Text>
                </View>
              </View>
            ))}
          </ScrollView>
        )}
      </View>
    </AppLayout>
  );
}
