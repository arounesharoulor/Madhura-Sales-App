import React, { useState } from 'react';
import { View, Text, Alert, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomInput from '../components/CustomInput';
import CustomButton from '../components/CustomButton';
import Header from '../components/Header';
import api from '../api/api';

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [step, setStep] = useState(1); // 1 = request token, 2 = reset password
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoBack = () => {
    if (navigation?.canGoBack?.()) navigation.goBack();
  };

  const handleRequestToken = async () => {
    if (!email) {
      setError('Please enter your email address');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/auth/forgotpassword', { email });
      const resetToken = response.data.resetToken;
      Alert.alert(
        'Token Generated',
        `Password reset token: ${resetToken}\n(Normally emailed/sent, copy this token to proceed)`,
        [
          {
            text: 'Proceed to Reset',
            onPress: () => {
              setToken(resetToken);
              setStep(2);
            },
          },
        ]
      );
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!token || !newPassword) {
      setError('Please fill in all fields');
      return;
    }
    setError('');
    setLoading(true);

    try {
      await api.put(`/auth/resetpassword/${token}`, { password: newPassword });
      Alert.alert(
        'Success',
        'Your password has been changed successfully. Please sign in with your new password.',
        [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
      );
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24 }}>
        <Header title="Password Recovery" onBack={handleGoBack} />

        {step === 1 ? (
          <View className="mt-6 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <Text className="text-xl font-bold text-slate-900 mb-2">Request Reset Token</Text>
            <Text className="text-xs text-slate-500 mb-6">
              Enter your registered email address to receive a secure password reset token.
            </Text>

            <CustomInput
              label="Email Address"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="executive@fieldstaff.com"
              error={error}
            />

            <CustomButton title="Request Token" loading={loading} onPress={handleRequestToken} style="mt-4" />
          </View>
        ) : (
          <View className="mt-6 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <Text className="text-xl font-bold text-slate-900 mb-2">Set New Password</Text>
            <Text className="text-xs text-slate-500 mb-6">
              Enter the reset token code and configure your new password.
            </Text>

            <CustomInput
              label="Reset Token"
              value={token}
              onChangeText={setToken}
              placeholder="Enter token code"
              error={error}
            />

            <CustomInput
              label="New Password"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              placeholder="••••••••"
            />

            <CustomButton title="Save Password" loading={loading} onPress={handleResetPassword} style="mt-4" />

            <TouchableOpacity onPress={() => setStep(1)} className="mt-4">
              <Text className="text-sky-500 font-semibold text-xs text-center">
                Back to Request Token
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
