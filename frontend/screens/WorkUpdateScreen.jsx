import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomInput from '../components/CustomInput';
import CustomButton from '../components/CustomButton';
import Header from '../components/Header';
import api from '../api/api';

export default function WorkUpdateScreen({ navigation }) {
  const [updates, setUpdates] = useState([]);
  const [notes, setNotes] = useState('');
  const [hoursWorked, setHoursWorked] = useState('');
  const [meetingsCount, setMeetingsCount] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const handleGoBack = () => {
    if (navigation?.canGoBack?.()) navigation.goBack();
  };

  const fetchUpdates = async () => {
    try {
      setRefreshing(true);
      const res = await api.get('/workupdates');
      setUpdates(res.data.data);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to retrieve work updates');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUpdates();
  }, []);

  const handleSubmit = async () => {
    if (!notes || !hoursWorked) {
      Alert.alert('Validation Error', 'Notes and Hours Worked are required.');
      return;
    }

    const payload = {
      notes,
      hoursWorked: Number(hoursWorked),
      meetingsCount: meetingsCount ? Number(meetingsCount) : 0,
    };

    setLoading(true);
    try {
      await api.post('/workupdates', payload);
      Alert.alert('Success', 'Daily report submitted successfully');
      setNotes('');
      setHoursWorked('');
      setMeetingsCount('');
      setShowAddForm(false);
      fetchUpdates();
    } catch (err) {
      Alert.alert('Error', 'Failed to submit report.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <View className="p-6 flex-1">
        <Header title="Daily Work Updates" onBack={handleGoBack} />

        {showAddForm ? (
          <ScrollView showsVerticalScrollIndicator={false} className="mt-4">
            <View className="space-y-4 bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
              <CustomInput
                label="Estimated Hours Worked"
                value={hoursWorked}
                onChangeText={setHoursWorked}
                keyboardType="numeric"
                placeholder="E.g. 8"
              />

              <CustomInput
                label="Visits Conducted Today"
                value={meetingsCount}
                onChangeText={setMeetingsCount}
                keyboardType="numeric"
                placeholder="E.g. 5"
              />

              <CustomInput
                label="Activity Notes / Summary"
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={6}
                placeholder="Describe daily tasks completed, customer responses, and general notes..."
                style="min-h-[120px] pt-3 align-top"
              />

              <CustomButton title="Submit Update" loading={loading} onPress={handleSubmit} style="mt-6" />
              
              <TouchableOpacity onPress={() => setShowAddForm(false)} className="mt-4 py-3 border border-slate-200 rounded-2xl bg-white shadow-sm">
                <Text className="text-center text-slate-900 font-bold text-xs">Cancel</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        ) : (
          <View className="flex-1">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Update History
              </Text>
              <TouchableOpacity onPress={() => setShowAddForm(true)} className="bg-sky-600 px-4 py-2 rounded-xl shadow-sm">
                <Text className="text-white font-bold text-xs">+ Log New</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={updates}
              keyExtractor={(item) => item._id}
              refreshing={refreshing}
              onRefresh={fetchUpdates}
              ListEmptyComponent={() => (
                <View className="flex-1 items-center justify-center pt-20">
                  <Text className="text-xs text-slate-500">
                    No work updates found. Tap "+ Log New" to submit one.
                  </Text>
                </View>
              )}
              renderItem={({ item }) => (
                <View className="mb-4 p-5 bg-white border border-slate-200 rounded-3xl shadow-sm">
                  <View className="flex-row justify-between items-center mb-2">
                    <Text className="text-sky-600 font-bold text-xs">
                      Hours: {item.hoursWorked} hrs | Visits: {item.meetingsCount || 0}
                    </Text>
                    <Text className="text-[10px] text-slate-500">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                  <Text className="text-slate-600 text-xs leading-relaxed">{item.notes}</Text>
                </View>
              )}
            />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
