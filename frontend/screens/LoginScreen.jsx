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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../api/api';

export default function LoginScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web' && width > 768;

  const [email, setEmail] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Field Executive');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
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
        // Ignore error and stay on login
      }
    };
    checkLogin();
  }, []);

  const validate = () => {
    let errs = {};
    if (role === 'Admin') {
      if (!email) errs.email = 'Email address is required';
      else if (!/\S+@\S+\.\S+/.test(email)) errs.email = 'Please enter a valid email';
    } else {
      if (!employeeId) errs.employeeId = 'Employee ID is required';
      else if (!/^\d{5}$/.test(employeeId)) errs.employeeId = 'Employee ID must be exactly 5 digits';
    }
    if (!password) errs.password = 'Password is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const payload = role === 'Admin' ? { email, password, role } : { employeeId, password, role };
      const response = await api.post('/auth/login', payload);
      const { token, user } = response.data;
      const isAdminAccount = user.role === 'Admin';

      if (role === 'Admin' && !isAdminAccount) {
        setLoading(false);
        Alert.alert(
          'Wrong Account Type',
          'This login is for admin accounts. Please choose Employee login or use an admin account.'
        );
        return;
      }

      if (role === 'Field Executive' && isAdminAccount) {
        setLoading(false);
        Alert.alert(
          'Use Admin Login',
          'This account belongs to an admin. Please switch to Admin login to continue.'
        );
        return;
      }

      await AsyncStorage.setItem('token', token);
      await AsyncStorage.setItem('user', JSON.stringify(user));
      if (isAdminAccount) {
        router.replace('/AdminDashboard');
      } else {
        router.replace('/Dashboard');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Network error occurred. Please try again.';
      Alert.alert('Login Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  const FormContent = (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[styles.scroll, isWeb && styles.scrollWeb]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* Background Glows for Mobile */}
      {!isWeb && (
        <View style={StyleSheet.absoluteFillObject}>
          <View style={[styles.glow, { top: -50, left: -50, width: 250, height: 250, backgroundColor: '#0ea5e9', opacity: 0.15 }]} />
          <View style={[styles.glow, { bottom: -100, right: -100, width: 350, height: 350, backgroundColor: '#6366f1', opacity: 0.15 }]} />
        </View>
      )}

      <View style={styles.formInner}>
        {/* Logo / Brand Header */}
        <View style={styles.header}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>M</Text>
          </View>
          <Text style={styles.brandName}>Madhura Sales</Text>
          <Text style={styles.brandTagline}>
            Field Staff Management Platform
          </Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Welcome Back</Text>
          <Text style={styles.cardSubtitle}>Sign in to your account to continue</Text>

          <View style={styles.roleGroup}>
            <Text style={styles.label}>Login Type</Text>
            <View style={styles.roleToggle}>
              {['Admin', 'Field Executive'].map((option) => (
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
            <Text style={styles.roleHint}>
              {role === 'Admin'
                ? 'Use your admin credentials to access the admin dashboard.'
                : 'Use your employee credentials to access the field executive dashboard.'}
            </Text>
          </View>

          {role === 'Admin' ? (
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
              {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
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
                  onChangeText={t => { setEmployeeId(t); if(errors.employeeId) setErrors(e => ({ ...e, employeeId: null })); }}
                  keyboardType="numeric"
                  maxLength={5}
                  placeholder="5-digit ID (e.g. 32629)"
                  placeholderTextColor="#64748b"
                  onFocus={() => setFocusedField('employeeId')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
              {errors.employeeId && <Text style={styles.errorText}>{errors.employeeId}</Text>}
            </View>
          )}

          {/* Password Field */}
          <View style={styles.fieldWrap}>
            <Text style={styles.label}>Password</Text>
            <View style={[
              styles.inputContainer,
              focusedField === 'password' && styles.inputFocused,
              errors.password && styles.inputError,
            ]}>
              <Ionicons name="lock-closed-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={t => { setPassword(t); if(errors.password) setErrors(e => ({ ...e, password: null })); }}
                secureTextEntry={!showPassword}
                placeholder="••••••••••"
                placeholderTextColor="#64748b"
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
              />
              <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={styles.eyeBtn}>
                <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>
            {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
          </View>

          {/* Forgot Password */}
          <TouchableOpacity
            onPress={() => router.push('/ForgotPassword')}
            style={styles.forgotBtn}
            activeOpacity={0.7}
          >
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>

          {/* Sign In Button */}
          <TouchableOpacity
            style={[styles.signInBtn, loading && styles.signInBtnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.signInText}>Sign In →</Text>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Create Account */}
          <TouchableOpacity
            style={styles.createBtn}
            onPress={() => router.push('/Register')}
            activeOpacity={0.85}
          >
            <Text style={styles.createBtnText}>Create New Account</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          Madhura Sales · Field Management System
        </Text>
      </View>
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#030712" />
      {isWeb ? (
        <View style={styles.webContainer}>
          <View style={styles.webLeftPane}>
            {/* Decorative glow */}
            <View style={StyleSheet.absoluteFillObject}>
              <View style={[styles.glow, { top: -100, left: -100, width: 450, height: 450, backgroundColor: '#F5A623', opacity: 0.1 }]} />
              <View style={[styles.glow, { bottom: -150, right: -150, width: 550, height: 550, backgroundColor: '#F5A623', opacity: 0.06 }]} />
            </View>

            <View style={styles.webLeftContent}>
              <View style={styles.webIconWrap}>
                <Text style={{ fontSize: 42, fontWeight: '900', color: '#1B2B4B' }}>M</Text>
              </View>
              <Text style={styles.webLeftTitle}>MADHURA</Text>
              <Text style={styles.webLeftBrand}>Sales Portal</Text>
              <Text style={styles.webLeftSubtitle}>
                Empower your field workforce. Track performance, manage routes, and increase productivity in real-time.
              </Text>
              
              <View style={styles.webFeatureRow}>
                <View style={styles.webCheckIcon}>
                  <Ionicons name="checkmark" size={16} color="#1B2B4B" />
                </View>
                <Text style={styles.webFeatureText}>Real-time Location Tracking</Text>
              </View>
              <View style={styles.webFeatureRow}>
                <View style={styles.webCheckIcon}>
                  <Ionicons name="checkmark" size={16} color="#1B2B4B" />
                </View>
                <Text style={styles.webFeatureText}>Automated Expense Reports</Text>
              </View>
              <View style={styles.webFeatureRow}>
                <View style={styles.webCheckIcon}>
                  <Ionicons name="checkmark" size={16} color="#1B2B4B" />
                </View>
                <Text style={styles.webFeatureText}>Seamless Client Management</Text>
              </View>
            </View>
          </View>
          <View style={styles.webRightPane}>
            {/* Background Glows for Web Right Pane */}
            <View style={StyleSheet.absoluteFillObject}>
              <View style={[styles.glow, { top: '30%', left: '20%', width: 300, height: 300, backgroundColor: '#0ea5e9', opacity: 0.08 }]} />
            </View>
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
  safe: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  glow: {
    position: 'absolute',
    borderRadius: 9999,
  },
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
    width: 80,
    height: 80,
    backgroundColor: '#F5A623',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    boxShadow: '0px 10px 30px rgba(245, 166, 35, 0.3)',
  },
  webLeftTitle: {
    fontSize: 42,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 4,
    letterSpacing: 3,
  },
  webLeftBrand: {
    fontSize: 14,
    fontWeight: '700',
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
  webFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  webCheckIcon: {
    width: 28,
    height: 28,
    borderRadius: 99,
    backgroundColor: '#F5A623',
    justifyContent: 'center',
    alignItems: 'center',
  },
  webFeatureText: {
    fontSize: 15,
    color: '#D4E3F5',
    fontWeight: '500',
    marginLeft: 16,
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
    justifyContent: 'center',
  },
  scrollWeb: {
    alignItems: 'center',
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
    fontWeight: '900',
    color: '#F5A623',
  },
  brandName: {
    fontSize: 26,
    fontWeight: '800',
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
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 6,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 28,
  },
  fieldWrap: {
    marginBottom: 18,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
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
    fontWeight: '600',
    marginTop: 6,
    paddingLeft: 4,
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginBottom: 24,
    marginTop: -4,
  },
  forgotText: {
    color: '#F5A623',
    fontSize: 13,
    fontWeight: '700',
  },
  signInBtn: {
    backgroundColor: '#1B2B4B',
    borderRadius: 16,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    borderBottomWidth: 3,
    borderBottomColor: '#F5A623',
    boxShadow: '0px 8px 20px rgba(27, 43, 75, 0.35)',
  },
  signInBtnDisabled: {
    opacity: 0.7,
  },
  signInText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  dividerText: {
    color: '#64748b',
    paddingHorizontal: 16,
    fontSize: 12,
    fontWeight: '600',
  },
  createBtn: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  createBtnText: {
    color: '#475569',
    fontSize: 15,
    fontWeight: '600',
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
    fontWeight: '700',
  },
  roleOptionTextActive: {
    color: '#ffffff',
  },
  roleHint: {
    marginTop: 10,
    color: '#64748b',
    fontSize: 12,
    lineHeight: 18,
  },
  footer: {
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 32,
    letterSpacing: 0.5,
  },
});
