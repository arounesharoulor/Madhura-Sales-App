import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web' && width > 768;

  const [role, setRole] = useState('Field Executive');
  const [email, setEmail] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [focusedField, setFocusedField] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleResetPassword = async () => {
    let errs = {};
    if (role === 'Admin' || role === 'Super Admin') {
      if (!email) errs.email = true;
      else if (!/^\S+@\S+\.\S+$/.test(email)) errs.email = true;
    } else {
      if (!employeeId) errs.employeeId = true;
      else if (!/^\d{5}$/.test(employeeId)) errs.employeeId = true;
    }
    
    if (!newPassword || newPassword.length < 6) errs.newPassword = true;
    if (newPassword !== confirmPassword) errs.confirmPassword = true;
    
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setLoading(true);
    try {
      const apiRole = role === 'Super Admin' ? 'Managing Director MD' : role === 'Admin' ? 'Admin' : 'Field Executive';
      const payload = {
        role: apiRole,
        password: newPassword,
      };
      if (role === 'Admin' || role === 'Super Admin') payload.email = email;
      else payload.employeeId = employeeId;

      await api.post(`/auth/directresetpassword`, payload);
      
      router.replace('/Login');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  const FormContent = (
    <View style={styles.formInner}>
      <View style={styles.header}>
        <Image source={require('../assets/madhura.png')} style={{ width: 80, height: 80, marginBottom: 12 }} resizeMode="contain" />
        <Text style={styles.brandName}>Madhura CRM</Text>
        <Text style={styles.brandTagline}>Field Staff Management Platform</Text>
      </View>

      <View style={styles.card}>
        <TouchableOpacity 
          style={styles.backBtn}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={20} color="#64748b" />
          <Text style={styles.backBtnText}>Back</Text>
        </TouchableOpacity>

        <Text style={styles.cardTitle}>Reset Password</Text>
        <Text style={styles.cardSubtitle}>
          Select your account type and update your password securely.
        </Text>

        <View style={styles.roleGroup}>
          <Text style={styles.label}>Account Type</Text>
          <View style={styles.roleToggle}>
            {['Super Admin', 'Admin', 'Field Executive'].map((option) => (
              <TouchableOpacity
                key={option}
                onPress={() => setRole(option)}
                activeOpacity={0.85}
                style={[
                  styles.roleOption,
                  role === option && styles.roleOptionActive,
                ]}
              >
                <Text style={[
                  styles.roleOptionText,
                  role === option && styles.roleOptionTextActive,
                ]}>{option === 'Field Executive' ? 'Employee' : option}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {role === 'Admin' || role === 'Super Admin' ? (
          <View style={styles.fieldWrap}>
            <Text style={styles.label}>Email Address</Text>
            <View style={[
              styles.inputContainer,
              focusedField === 'email' && styles.inputFocused,
              errors.email && styles.inputError,
            ]}>
              <Ionicons name="mail-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={t => { setEmail(t); if(errors.email) setErrors(e => ({ ...e, email: null })); }}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="admin@madhura.com"
                placeholderTextColor="#64748b"
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
              />
            </View>
            {errors.email && <Text style={styles.errorText}>Please enter a valid email address</Text>}
          </View>
        ) : (
          <View style={styles.fieldWrap}>
            <Text style={styles.label}>Employee ID</Text>
            <View style={[
              styles.inputContainer,
              focusedField === 'employeeId' && styles.inputFocused,
              errors.employeeId && styles.inputError,
            ]}>
              <Ionicons name="id-card-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={employeeId}
                onChangeText={t => { 
                  const numOnly = t.replace(/\D/g, '');
                  setEmployeeId(numOnly); 
                  if(errors.employeeId) setErrors(e => ({ ...e, employeeId: null }));
                }}
                keyboardType="numeric"
                maxLength={5}
                placeholder="5-digit ID (e.g. 32629)"
                placeholderTextColor="#64748b"
                onFocus={() => setFocusedField('employeeId')}
                onBlur={() => setFocusedField(null)}
              />
            </View>
            {errors.employeeId && <Text style={styles.errorText}>Please enter a valid 5-digit Employee ID</Text>}
          </View>
        )}

        <View style={styles.fieldWrap}>
          <Text style={styles.label}>New Password</Text>
          <View style={[styles.inputContainer, focusedField === 'newPassword' && styles.inputFocused, errors.newPassword && styles.inputError]}>
            <Ionicons name="lock-closed-outline" size={20} color={focusedField === 'newPassword' ? "#F5A623" : "#94a3b8"} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Enter new password"
              placeholderTextColor="#94a3b8"
              value={newPassword}
              onChangeText={(text) => { setNewPassword(text); if(errors.newPassword) setErrors(e => ({ ...e, newPassword: null })); }}
              onFocus={() => setFocusedField('newPassword')}
              onBlur={() => setFocusedField(null)}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
              <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#94a3b8" />
            </TouchableOpacity>
          </View>
          {errors.newPassword && <Text style={styles.errorText}>Password must be at least 6 characters</Text>}
        </View>

        <View style={styles.fieldWrap}>
          <Text style={styles.label}>Confirm Password</Text>
          <View style={[styles.inputContainer, focusedField === 'confirmPassword' && styles.inputFocused, errors.confirmPassword && styles.inputError]}>
            <Ionicons name="lock-closed-outline" size={20} color={focusedField === 'confirmPassword' ? "#F5A623" : "#94a3b8"} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Re-enter new password"
              placeholderTextColor="#94a3b8"
              value={confirmPassword}
              onChangeText={(text) => { setConfirmPassword(text); if(errors.confirmPassword) setErrors(e => ({ ...e, confirmPassword: null })); }}
              onFocus={() => setFocusedField('confirmPassword')}
              onBlur={() => setFocusedField(null)}
              secureTextEntry={!showConfirmPassword}
            />
            <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeBtn}>
              <Ionicons name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#94a3b8" />
            </TouchableOpacity>
          </View>
          {errors.confirmPassword && <Text style={styles.errorText}>Passwords do not match</Text>}
        </View>

        <TouchableOpacity 
          style={[styles.primaryBtn, loading && styles.btnDisabled]} 
          onPress={handleResetPassword}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.primaryBtnText}>Update Password</Text>
          )}
        </TouchableOpacity>
      </View>
      
      <Text style={styles.footer}>© {new Date().getFullYear()} Madhura. All rights reserved.</Text>
    </View>
  );

  if (isWeb) {
    return (
      <View style={styles.webContainer}>
        <StatusBar barStyle="light-content" />
        <View style={styles.webLeftPane}>
          <View style={styles.webLeftContent}>
            <View style={styles.webIconWrap}>
              <Image source={require('../assets/adaptive-icon.png')} style={{ width: 150, height: 150 }} resizeMode="contain" />
            </View>
            <Text style={styles.webLeftTitle}>MADHURA</Text>
            <Text style={styles.webLeftBrand}>SALES MANAGEMENT SYSTEM</Text>
            <Text style={styles.webLeftSubtitle}>
              Securely recover your account access and get back to managing your field operations effortlessly.
            </Text>
          </View>
        </View>

        <View style={styles.webRightPane}>
          <ScrollView contentContainerStyle={[styles.scroll, styles.scrollWeb]} showsVerticalScrollIndicator={false}>
            {FormContent}
          </ScrollView>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView 
          contentContainerStyle={styles.scroll} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets={true}
        >
          {FormContent}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  webContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  webLeftPane: {
    flex: 1,
    backgroundColor: '#1B2B4B',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 60,
    position: 'relative',
    overflow: 'hidden',
  },
  webLeftContent: {
    maxWidth: 500,
    zIndex: 2,
  },
  webIconWrap: {
    width: 150,
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
  },
  webLeftTitle: {
    fontSize: 42,
    fontWeight: '500',
    color: '#fff',
    marginBottom: 4,
    letterSpacing: 3,
  },
  webLeftBrand: {
    fontSize: 14,
    fontWeight: '500',
    color: '#F5A623',
    letterSpacing: 1.5,
    marginBottom: 28,
  },
  webLeftSubtitle: {
    fontSize: 16,
    color: '#9EB4D0',
    lineHeight: 26,
    marginBottom: 40,
  },
  webRightPane: {
    flex: 1,
    backgroundColor: '#f8fafc',
    position: 'relative',
    overflow: 'hidden',
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  scrollWeb: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  formInner: {
    width: '100%',
    maxWidth: 420,
    zIndex: 2,
  },
  header: {
    alignItems: 'center',
    marginBottom: 36,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: '#1B2B4B',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    elevation: 12,
    boxShadow: '0px 8px 24px rgba(27, 43, 75, 0.4)',
    borderWidth: 3,
    borderColor: '#F5A623',
  },
  logoText: {
    fontSize: 36,
    fontWeight: '500',
    color: '#F5A623',
  },
  brandName: {
    fontSize: 26,
    fontWeight: '500',
    color: '#0f172a',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  brandTagline: {
    fontSize: 13,
    color: '#64748b',
    letterSpacing: 0.3,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.99)',
    borderRadius: 28,
    padding: 28,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 4,
    boxShadow: '0px 12px 32px rgba(0, 0, 0, 0.05)',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backBtnText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '500',
    color: '#0f172a',
    marginBottom: 6,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 28,
    lineHeight: 20,
  },
  fieldWrap: {
    marginBottom: 18,
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748b',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(248, 250, 252, 0.99)',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    paddingHorizontal: 16,
    height: 54,
  },
  inputFocused: {
    borderColor: '#F5A623',
    borderWidth: 2,
  },
  inputError: {
    borderColor: '#ef4444',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: '#0f172a',
    fontSize: 15,
    height: '100%',
  },
  eyeBtn: {
    padding: 4,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 11,
    fontWeight: '400',
    marginTop: 6,
    paddingLeft: 4,
  },
  primaryBtn: {
    backgroundColor: '#1B2B4B',
    borderRadius: 16,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    borderBottomWidth: 3,
    borderBottomColor: '#F5A623',
    boxShadow: '0px 8px 20px rgba(27, 43, 75, 0.35)',
    marginTop: 12,
  },
  btnDisabled: {
    opacity: 0.7,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  roleGroup: {
    marginBottom: 20,
  },
  roleToggle: {
    flexDirection: 'row',
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    padding: 4,
    marginTop: 8,
  },
  roleOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleOptionActive: {
    backgroundColor: '#1B2B4B',
  },
  roleOptionText: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '500',
  },
  roleOptionTextActive: {
    color: '#ffffff',
  },
  footer: {
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 32,
    letterSpacing: 0.5,
  }
});
