import React, { useState, useEffect } from 'react';
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/api';
import Toast from 'react-native-toast-message';

export default function RegisterScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web' && width > 768;

  const [form, setForm] = useState({ name: '', email: '', phone: '', employeeId: '', designation: '', password: '', confirmPassword: '', role: 'Field Executive' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  useEffect(() => {
    const checkLogin = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        const userStr = await AsyncStorage.getItem('user');
        if (token && userStr) {
          const user = JSON.parse(userStr);
          if (user.role === 'Admin') router.replace('/AdminDashboard');
          else router.replace('/Dashboard');
        }
      } catch (e) {
        // Ignore error
      }
    };
    checkLogin();
  }, []);

  const update = (key, value) => {
    setForm(f => ({ ...f, [key]: value }));
    if (errors[key]) {
      setErrors(e => ({ ...e, [key]: null }));
    }
    if (serverError) {
      setServerError('');
    }
  };

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Full name is required';
    if (!form.email.trim()) errs.email = 'Email address is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Please enter a valid email';
    if (!form.phone.trim()) errs.phone = 'Phone number is required';
    else if (!/^\d{10}$/.test(form.phone.trim())) errs.phone = 'Enter a valid 10-digit phone number';
    if (form.role !== 'Admin') {
      if (!form.employeeId.trim()) errs.employeeId = 'Employee ID is required';
      else if (!/^\d{5}$/.test(form.employeeId.trim())) errs.employeeId = 'Employee ID must be exactly 5 digits';
    }
    if (!form.designation.trim()) errs.designation = 'Designation is required';
    if (!form.password) errs.password = 'Password is required';
    else if (form.password.length < 6) errs.password = 'Password must be at least 6 characters';
    if (!form.confirmPassword) errs.confirmPassword = 'Please confirm your password';
    else if (form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        employeeId: form.employeeId.trim(),
        designation: form.designation.trim(),
        password: form.password,
        role: form.role === 'Employee' ? 'Field Executive' : form.role,
      };
      console.log('Register POST -> /auth/register');
      const response = await api.post('/auth/register', payload);
      const { user, token } = response.data;
      setServerError('');
      // Save credentials and auto-redirect
      await AsyncStorage.setItem('token', token);
      await AsyncStorage.setItem('user', JSON.stringify(user));
      Toast.show({
        type: 'success',
        text1: '🎉 Account Created!',
        text2: `Welcome, ${user.name}! Redirecting to your dashboard...`,
        visibilityTime: 3000,
      });
      // Small delay so the toast is visible before navigation
      setTimeout(() => {
        if (user.role === 'Admin') {
          router.replace('/AdminDashboard');
        } else {
          router.replace('/Dashboard');
        }
      }, 1500);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Something went wrong. Please try again.';
      console.error('Register error:', err.response?.status, err.response?.data);
      setServerError(msg);
      Alert.alert('Registration Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = (field) => [
    styles.inputContainer,
    focusedField === field && styles.inputFocused,
    errors[field] && styles.inputError,
  ];

  const FormContent = (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[styles.scroll, isWeb && styles.scrollWeb]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.formInner}>


        {/* Header */}
        <View style={styles.header}>
          <Image source={require('../assets/logo.png')} style={styles.logoImage} resizeMode="contain" />
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join Madhura Sales as an Admin or Field Executive</Text>
        </View>

        {/* Form Card */}
        <View style={styles.card}>

          {/* Full Name */}
          <View style={styles.fieldWrap}>
            <Text style={styles.label}>Full Name</Text>
            <View style={inputStyle('name')}>
              <Ionicons name="person-outline" size={18} color="#64748b" style={styles.icon} />
              <TextInput
                style={styles.input}
                value={form.name}
                onChangeText={v => update('name', v)}
                placeholder="Enter your full name"
                placeholderTextColor="#94a3b8"
                autoCapitalize="words"
                onFocus={() => setFocusedField('name')}
                onBlur={() => setFocusedField(null)}
              />
            </View>
            {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
          </View>

          {/* Email */}
          <View style={styles.fieldWrap}>
            <Text style={styles.label}>Email Address</Text>
            <View style={inputStyle('email')}>
              <Ionicons name="mail-outline" size={18} color="#64748b" style={styles.icon} />
              <TextInput
                style={styles.input}
                value={form.email}
                onChangeText={v => update('email', v)}
                placeholder="you@example.com"
                placeholderTextColor="#94a3b8"
                keyboardType="email-address"
                autoCapitalize="none"
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
              />
            </View>
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
          </View>

          {/* Phone */}
          <View style={styles.fieldWrap}>
            <Text style={styles.label}>Phone Number</Text>
            <View style={inputStyle('phone')}>
              <Ionicons name="call-outline" size={18} color="#64748b" style={styles.icon} />
              <TextInput
                style={styles.input}
                value={form.phone}
                onChangeText={v => update('phone', v)}
                placeholder="10-digit mobile number"
                placeholderTextColor="#94a3b8"
                keyboardType="phone-pad"
                maxLength={10}
                onFocus={() => setFocusedField('phone')}
                onBlur={() => setFocusedField(null)}
              />
            </View>
            {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
          </View>

          {form.role !== 'Admin' && (
            <>
              {/* Employee ID */}
              <View style={styles.fieldWrap}>
                <Text style={styles.label}>Employee ID</Text>
                <View style={inputStyle('employeeId')}>
                  <Ionicons name="id-card-outline" size={18} color="#64748b" style={styles.icon} />
                  <TextInput
                    style={styles.input}
                    value={form.employeeId}
                    onChangeText={v => update('employeeId', v)}
                    placeholder="5-digit ID (e.g. 32629)"
                    placeholderTextColor="#94a3b8"
                    keyboardType="numeric"
                    maxLength={5}
                    onFocus={() => setFocusedField('employeeId')}
                    onBlur={() => setFocusedField(null)}
                  />
                </View>
                {errors.employeeId && <Text style={styles.errorText}>{errors.employeeId}</Text>}
              </View>
            </>
          )}

          {/* Designation — shown for both Admin and Employee */}
          <View style={styles.fieldWrap}>
            <Text style={styles.label}>{form.role === 'Admin' ? 'Your Designation / Title' : 'Designation'}</Text>
            <View style={inputStyle('designation')}>
              <Ionicons name="briefcase-outline" size={18} color="#64748b" style={styles.icon} />
              <TextInput
                style={styles.input}
                value={form.designation}
                onChangeText={v => update('designation', v)}
                placeholder={form.role === 'Admin' ? 'e.g. Branch Manager, Director' : 'e.g. Sales Executive, Caller'}
                placeholderTextColor="#94a3b8"
                autoCapitalize="words"
                onFocus={() => setFocusedField('designation')}
                onBlur={() => setFocusedField(null)}
              />
            </View>
            {errors.designation && <Text style={styles.errorText}>{errors.designation}</Text>}
          </View>

          <View style={styles.roleGroup}>
            <Text style={styles.label}>Account Type</Text>
            <View style={styles.roleToggle}>
              {[
                { label: 'Admin', value: 'Admin' },
                { label: 'Employee', value: 'Field Executive' },
              ].map((option) => (
                <TouchableOpacity
                  key={option.value}
                  onPress={() => update('role', option.value)}
                  activeOpacity={0.85}
                  style={[
                    styles.roleOption,
                    form.role === option.value && styles.roleOptionActive,
                  ]}
                >
                  <Text style={[
                    styles.roleOptionText,
                    form.role === option.value && styles.roleOptionTextActive,
                  ]}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.roleHint}>
              {form.role === 'Admin'
                ? 'This will create an admin account. Admins can manage users and reports.'
                : 'This will create a field executive account. Employees can submit reports and follow ups.'}
            </Text>
          </View>

          <View style={styles.roleNotice}>
            <Ionicons name="information-circle" size={18} color="#F5A623" />
            <Text style={styles.roleNoticeText}>
              Admin accounts can be created directly here using your email.
            </Text>
          </View>

          {/* Password */}
          <View style={styles.fieldWrap}>
            <Text style={styles.label}>Password</Text>
            <View style={inputStyle('password')}>
              <Ionicons name="lock-closed-outline" size={18} color="#64748b" style={styles.icon} />
              <TextInput
                style={styles.input}
                value={form.password}
                onChangeText={v => update('password', v)}
                placeholder="Minimum 6 characters"
                placeholderTextColor="#94a3b8"
                secureTextEntry={!showPassword}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
              />
              <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={styles.eyeBtn}>
                <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#64748b" />
              </TouchableOpacity>
            </View>
            {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
          </View>

          {/* Confirm Password */}
          <View style={styles.fieldWrap}>
            <Text style={styles.label}>Confirm Password</Text>
            <View style={inputStyle('confirmPassword')}>
              <Ionicons name="lock-closed-outline" size={18} color="#64748b" style={styles.icon} />
              <TextInput
                style={styles.input}
                value={form.confirmPassword}
                onChangeText={v => update('confirmPassword', v)}
                placeholder="Re-enter your password"
                placeholderTextColor="#94a3b8"
                secureTextEntry={!showConfirm}
                onFocus={() => setFocusedField('confirmPassword')}
                onBlur={() => setFocusedField(null)}
              />
              <TouchableOpacity onPress={() => setShowConfirm(v => !v)} style={styles.eyeBtn}>
                <Ionicons name={showConfirm ? "eye-off-outline" : "eye-outline"} size={20} color="#64748b" />
              </TouchableOpacity>
            </View>
            {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
          </View>
          {serverError ? (
            <View style={styles.serverErrorBox}>
              <Text style={styles.serverErrorText}>{serverError}</Text>
            </View>
          ) : null}

          {/* Role Notice */}
          <View style={styles.roleNotice}>
            <Ionicons name="information-circle" size={18} color="#F5A623" />
            <Text style={styles.roleNoticeText}>
              Admin accounts must be approved by an existing admin before elevated access is allowed.
            </Text>
          </View>

          {/* Register Button */}
          <TouchableOpacity
            style={[styles.registerBtn, loading && styles.btnDisabled]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.registerBtnText}>Create Account →</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Sign In Link */}
        <View style={styles.signinRow}>
          <Text style={styles.signinLabel}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.replace('/Login')} activeOpacity={0.7}>
            <Text style={styles.signinLink}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#1B2B4B" />
      {isWeb ? (
        <View style={styles.webContainer}>
          <View style={styles.webLeftPane}>
            <View style={styles.webLeftContent}>
              <View style={styles.webIconWrap}>
                <Image source={require('../assets/logo.png')} style={{width: 60, height: 60}} resizeMode="contain" />
              </View>
              <Text style={styles.webLeftTitle}>MADHURA</Text>
              <Text style={styles.webLeftBrand}>Sales Portal</Text>
              <Text style={styles.webLeftSubtitle}>
                Become part of the most efficient field workforce. Let's get you set up and ready to go.
              </Text>
              
              <View style={styles.webFeatureRow}>
                <Ionicons name="checkmark-circle" size={22} color="#F5A623" />
                <Text style={styles.webFeatureText}>Quick &amp; Easy Onboarding</Text>
              </View>
              <View style={styles.webFeatureRow}>
                <Ionicons name="checkmark-circle" size={22} color="#F5A623" />
                <Text style={styles.webFeatureText}>Secure Data Protection</Text>
              </View>
              <View style={styles.webFeatureRow}>
                <Ionicons name="checkmark-circle" size={22} color="#F5A623" />
                <Text style={styles.webFeatureText}>Instant Admin Access</Text>
              </View>
            </View>
          </View>
          <View style={styles.webRightPane}>
            {FormContent}
          </View>
        </View>
      ) : (
        Platform.OS === 'ios' ? (
          <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
            {FormContent}
          </KeyboardAvoidingView>
        ) : (
          <View style={{ flex: 1 }}>
            {FormContent}
          </View>
        )
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F7FA' },
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
  },
  webLeftContent: {
    maxWidth: 500,
  },
  webIconWrap: {
    width: 90,
    height: 90,
    backgroundColor: '#F5A623',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    boxShadow: '0px 10px 20px rgba(245, 166, 35, 0.35)',
  },
  webLeftTitle: {
    fontSize: 42,
    fontWeight: '900',
    color: '#ffffff',
    marginBottom: 4,
    letterSpacing: 3,
  },
  webLeftBrand: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F5A623',
    letterSpacing: 1.5,
    marginBottom: 24,
  },
  webLeftSubtitle: {
    fontSize: 16,
    color: '#9EB4D0',
    lineHeight: 26,
    marginBottom: 36,
  },
  webFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  webFeatureText: {
    fontSize: 15,
    color: '#D4E3F5',
    fontWeight: '500',
    marginLeft: 12,
  },
  webRightPane: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
  },
  scrollWeb: {
    alignItems: 'center',
  },
  formInner: {
    width: '100%',
    maxWidth: 450,
  },
  backBtn: { marginBottom: 20, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center' },
  backText: { color: '#2563eb', fontSize: 14, fontWeight: '600' },
  header: { alignItems: 'center', marginBottom: 28 },
  logoImage: {
    width: 80,
    height: 80,
    marginBottom: 14,
    borderRadius: 18,
  },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: '#1B2B4B',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    elevation: 8,
    borderWidth: 3,
    borderColor: '#F5A623',
    boxShadow: '0px 6px 12px rgba(27, 43, 75, 0.35)',
  },
  logoText: { fontSize: 28, fontWeight: '900', color: '#F5A623' },
  title: { fontSize: 22, fontWeight: '800', color: '#0f172a', marginBottom: 6 },
  subtitle: { fontSize: 13, color: '#64748b', textAlign: 'center' },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.99)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 4,
    // Web shadow fallback
    boxShadow: '0px 10px 20px rgba(0, 0, 0, 0.05)',
  },
  fieldWrap: { marginBottom: 16 },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 7,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(241, 245, 249, 0.99)',
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    paddingHorizontal: 13,
    height: 50,
  },
  inputFocused: {
    borderColor: '#F5A623',
    borderWidth: 2,
  },
  inputError: { borderColor: '#ef4444' },
  icon: { marginRight: 9 },
  input: { flex: 1, color: '#0f172a', fontSize: 14, height: '100%', outlineWidth: 0, outlineColor: 'transparent' },
 
  eyeBtn: { padding: 4 },
  errorText: {
    color: '#ef4444',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 5,
    paddingLeft: 3,
  },
  roleNotice: {
    flexDirection: 'row',
    backgroundColor: '#FFF8EC',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F5A623',
    marginBottom: 20,
    gap: 8,
    alignItems: 'flex-start',
  },
  roleNoticeText: { flex: 1, color: '#475569', fontSize: 12, lineHeight: 18 },
  roleGroup: {
    marginBottom: 20,
  },
  roleToggle: {
    flexDirection: 'row',
    borderRadius: 18,
    backgroundColor: '#e2e8f0',
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
    color: '#334155',
    fontSize: 13,
    fontWeight: '700',
  },
  roleOptionTextActive: {
    color: '#fff',
  },
  roleHint: {
    marginTop: 10,
    color: '#64748b',
    fontSize: 12,
    lineHeight: 18,
  },
  serverErrorBox: {
    backgroundColor: '#fee2e2',
    borderColor: '#fca5a5',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  serverErrorText: {
    color: '#b91c1c',
    fontSize: 12,
    fontWeight: '600',
  },
  registerBtn: {
    backgroundColor: '#1B2B4B',
    borderRadius: 13,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 7,
    borderBottomWidth: 3,
    borderBottomColor: '#F5A623',
    boxShadow: '0px 6px 12px rgba(27, 43, 75, 0.35)',
  },
  btnDisabled: { opacity: 0.7 },
  registerBtnText: { color: '#fff', fontSize: 15, fontWeight: '700', letterSpacing: 0.4 },
  signinRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  signinLabel: { color: '#64748b', fontSize: 14 },
  signinLink: { color: '#F5A623', fontSize: 14, fontWeight: '700' },
});
