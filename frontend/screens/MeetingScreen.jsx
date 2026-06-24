import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, Alert, FlatList, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import CustomInput from '../components/CustomInput';
import CustomButton from '../components/CustomButton';
import Header from '../components/Header';
import MeetingCard from '../components/MeetingCard';
import api from '../api/api';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

export default function MeetingScreen({ navigation }) {
  const [meetings, setMeetings] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Form Fields
  const [clientName, setClientName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [nextFollowUpDate, setNextFollowUpDate] = useState('');
  const [imageUri, setImageUri] = useState(null);

  // GPS Coords
  const [locationCoords, setLocationCoords] = useState(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleGoBack = () => {
    if (navigation?.canGoBack?.()) navigation.goBack();
  };

  const fetchMeetings = async () => {
    try {
      setRefreshing(true);
      const res = await api.get('/meetings');
      setMeetings(res.data.data);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to retrieve meetings');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMeetings();
    getGPSCoords();
  }, []);

  const getGPSCoords = async () => {
    try {
      setGettingLocation(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permissions are required to log a visit.');
        setGettingLocation(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLocationCoords(loc.coords);
    } catch (e) {
      console.error(e);
    } finally {
      setGettingLocation(false);
    }
  };

  const handleCaptureImage = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera permissions are required to take photo proof.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.7,
      });

      if (!result.canceled) {
        setImageUri(result.assets[0].uri);
      }
    } catch (e) {
      Alert.alert('Camera Error', 'Could not open camera.');
    }
  };

  const handleSubmit = async () => {
    if (!clientName || !companyName || !phone || !notes) {
      Alert.alert('Validation Error', 'Please complete all required fields.');
      return;
    }

    if (!locationCoords) {
      Alert.alert('GPS Error', 'Acquiring GPS location. Please wait for coordinates to bind.');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('clientName', clientName);
      formData.append('companyName', companyName);
      formData.append('phone', phone);
      formData.append('notes', notes);
      formData.append('latitude', locationCoords.latitude.toString());
      formData.append('longitude', locationCoords.longitude.toString());
      if (nextFollowUpDate) {
        formData.append('nextFollowUpDate', nextFollowUpDate);
      }

      if (imageUri) {
        const filename = imageUri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';

        if (Platform.OS === 'web') {
          const blob = await fetch(imageUri).then((response) => response.blob());
          const file = new File([blob], filename, { type });
          formData.append('photo', file);
        } else {
          formData.append('photo', { uri: imageUri, name: filename, type });
        }
      }

      await api.post('/meetings', formData);

      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Visit proof logged successfully!',
        visibilityTime: 4000,
      });
      setClientName('');
      setCompanyName('');
      setPhone('');
      setNotes('');
      setNextFollowUpDate('');
      setImageUri(null);
      setShowAddForm(false);
      fetchMeetings();
    } catch (err) {
      console.error('Meeting submission error:', err.response?.data || err.message);
      const msg = err.response?.data?.message || err.message || 'Failed to submit meeting details.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <View className="p-6 flex-1">
        <Header title="Client Meetings" onBack={handleGoBack} />

        {showAddForm ? (
          <ScrollView showsVerticalScrollIndicator={false} className="mt-4">
            <View className="space-y-4">
              <View className="p-4 bg-white border border-slate-200 rounded-3xl mb-4 flex-row justify-between items-center shadow-sm">
                <Text className="text-xs font-bold text-slate-900">GPS Bound Coordinates:</Text>
                {gettingLocation ? (
                  <Text className="text-amber-600 text-xs font-bold">Acquiring...</Text>
                ) : locationCoords ? (
                  <Text className="text-emerald-600 text-xs font-bold">
                    ({locationCoords.latitude.toFixed(4)}, {locationCoords.longitude.toFixed(4)})
                  </Text>
                ) : (
                  <TouchableOpacity onPress={getGPSCoords}>
                    <Text className="text-rose-600 text-xs font-bold underline">Retry Bind</Text>
                  </TouchableOpacity>
                )}
              </View>

              <CustomInput label="Client Name *" value={clientName} onChangeText={setClientName} placeholder="E.g. John Doe" />
              <CustomInput label="Company Name *" value={companyName} onChangeText={setCompanyName} placeholder="E.g. Acme Corp" />
              <CustomInput label="Contact Phone *" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="E.g. 1234567890" />
              
              <View>
                <Text className="text-xs font-bold text-slate-700 mb-1 ml-1 uppercase tracking-wider">Next Follow Up Date & Time</Text>
                {Platform.OS === 'web' ? (
                  <View className="flex-row items-center bg-white border border-slate-300 rounded-2xl px-4 shadow-sm h-[52px]">
                    <Ionicons name="calendar-outline" size={18} color="#0284c7" style={{ marginRight: 8 }} />
                    <TextInput
                      value={nextFollowUpDate}
                      onChangeText={setNextFollowUpDate}
                      placeholder="YYYY-MM-DDTHH:mm (e.g. 2026-07-15T14:30)"
                      placeholderTextColor="#94a3b8"
                      type="datetime-local"
                      style={{ flex: 1, color: '#0f172a', fontSize: 14 }}
                    />
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={() => setShowDatePicker('date')}
                    className="flex-row items-center justify-between bg-white border border-slate-300 rounded-2xl px-4 py-3 shadow-sm h-[52px]"
                  >
                    <Text className={nextFollowUpDate ? 'text-slate-900 text-sm' : 'text-slate-400 text-sm'}>
                      {nextFollowUpDate
                        ? (() => { try { const d = new Date(nextFollowUpDate); return isNaN(d.getTime()) ? nextFollowUpDate : d.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch { return nextFollowUpDate; } })()
                        : 'Select Follow-up Date & Time'}
                    </Text>
                    <Ionicons name="calendar-outline" size={20} color="#0284c7" />
                  </TouchableOpacity>
                )}
                {showDatePicker && Platform.OS !== 'web' && (() => {
                  const DateTimePicker = require('@react-native-community/datetimepicker').default;
                  const currentDate = nextFollowUpDate ? new Date(nextFollowUpDate) : new Date();
                  return (
                    <DateTimePicker
                      value={isNaN(currentDate.getTime()) ? new Date() : currentDate}
                      mode={Platform.OS === 'ios' ? 'datetime' : showDatePicker}
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      minimumDate={new Date()}
                      onChange={(event, selectedDate) => {
                        if (Platform.OS === 'android') {
                          if (event.type === 'set' && selectedDate) {
                            if (showDatePicker === 'date') {
                              setNextFollowUpDate(selectedDate.toISOString());
                              setShowDatePicker('time');
                            } else {
                              setShowDatePicker(false);
                              setNextFollowUpDate(selectedDate.toISOString());
                            }
                          } else {
                            setShowDatePicker(false);
                          }
                        } else {
                          setShowDatePicker(false);
                          if (selectedDate) setNextFollowUpDate(selectedDate.toISOString());
                        }
                      }}
                    />
                  );
                })()}
              </View>

              <CustomInput label="Visit Notes / Comments *" value={notes} onChangeText={setNotes} multiline placeholder="Discussed product plans..." style="min-h-[80px]" />

              <View className="mb-6">
                <Text className="text-[10px] font-bold uppercase tracking-wider mb-2 text-slate-400">
                  Proof Photo
                </Text>
                {imageUri ? (
                  <View className="relative w-full h-44 rounded-2xl overflow-hidden mb-3">
                    <Image source={{ uri: imageUri }} className="w-full h-full object-cover" />
                    <TouchableOpacity
                      onPress={() => setImageUri(null)}
                      className="absolute right-3 top-3 bg-white border border-slate-200 p-2 rounded-full shadow-sm"
                    >
                      <Text className="text-rose-600 text-[10px] font-bold">REMOVE</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={handleCaptureImage}
                    activeOpacity={0.8}
                    className="py-6 border-2 border-dashed border-slate-200 rounded-2xl items-center justify-center bg-slate-50"
                  >
                    <Text className="text-sky-600 font-bold text-xs">Capture Client Picture</Text>
                  </TouchableOpacity>
                )}
              </View>

              <CustomButton title="Log Meeting" loading={loading} onPress={handleSubmit} />
              
              <TouchableOpacity onPress={() => setShowAddForm(false)} className="mt-4 py-3 border border-slate-200 rounded-2xl bg-white shadow-sm">
                <Text className="text-center text-slate-900 font-bold text-xs">Cancel</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        ) : (
          <View className="flex-1">
            <View className="flex-row justify-between items-center mb-4">
                <Text className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Logged Visits
                </Text>
                <TouchableOpacity onPress={() => setShowAddForm(true)} className="bg-sky-600 px-4 py-2 rounded-xl shadow-sm">
                  <Text className="text-white font-bold text-xs">+ Log Visit</Text>
                </TouchableOpacity>
            </View>

            <FlatList
              data={meetings}
              keyExtractor={(item) => item._id}
              refreshing={refreshing}
              onRefresh={fetchMeetings}
              renderItem={({ item }) => <MeetingCard item={item} />}
              ListEmptyComponent={() => (
                <View className="flex-1 items-center justify-center pt-20">
                  <Text className="text-xs text-slate-500">
                    No client meetings logged. Tap "+ Log Visit" to submit one.
                  </Text>
                </View>
              )}
            />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
