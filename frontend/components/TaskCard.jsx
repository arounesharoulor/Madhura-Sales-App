import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
  ActivityIndicator,
  Platform,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/api';
import { API_URL } from '../utils/constants';

// Helper component to render secure images from buffer
export function EvidenceImage({ taskId, updateId, style }) {
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const loadToken = async () => {
      const storedToken = await AsyncStorage.getItem('token');
      if (active) {
        setToken(storedToken);
        setLoading(false);
      }
    };
    loadToken();
    return () => { active = false; };
  }, []);

  if (loading) {
    return (
      <View style={[style, styles.imagePlaceholder]}>
        <ActivityIndicator size="small" color="#0284c7" />
      </View>
    );
  }

  if (!token) return null;

  return (
    <Image
      source={{
        uri: `${API_URL}/tasks/${taskId}/updates/${updateId}/photo`,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }}
      style={style}
      resizeMode="cover"
    />
  );
}

export default function TaskCard({ item, onRefresh }) {
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState('');
  const [imageUri, setImageUri] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const statusStyle = item.status === 'Completed' ? {
    bg: '#f0fdf4',
    border: '#bbf7d0',
    text: '#16a34a',
    icon: 'checkmark-done-circle',
    label: 'Completed',
  } : item.status === 'In Progress' ? {
    bg: '#fffbeb',
    border: '#fde68a',
    text: '#d97706',
    icon: 'hourglass-outline',
    label: 'In Progress',
  } : {
    bg: '#fff1f2',
    border: '#fecdd3',
    text: '#e11d48',
    icon: 'alert-circle-outline',
    label: 'Pending',
  };

  const isOverdue = item.dueDate && new Date() > new Date(item.dueDate) && item.status !== 'Completed';

  const handleSelectImage = async (useCamera = false) => {
    try {
      let permissionResult;
      if (useCamera) {
        permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      } else {
        permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      }

      if (permissionResult.status !== 'granted') {
        Alert.alert('Permission Denied', `Camera/gallery permission is required to submit evidence.`);
        return;
      }

      let result;
      if (useCamera) {
        result = await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          quality: 0.6,
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          allowsEditing: true,
          quality: 0.6,
        });
      }

      if (!result.canceled) {
        setImageUri(result.assets[0].uri);
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to pick image.');
    }
  };

  const handleSubmitUpdate = async () => {
    if (!notes.trim()) {
      Alert.alert('Validation Error', 'Please write follow-up notes for the task update.');
      return;
    }

    setSubmitting(true);
    try {
      let res;
      if (imageUri) {
        const formData = new FormData();
        formData.append('notes', notes.trim());
        const filename = imageUri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';

        if (Platform.OS === 'web') {
          const blob = await fetch(imageUri).then((r) => r.blob());
          const file = new File([blob], filename, { type });
          formData.append('photo', file);
        } else {
          formData.append('photo', { uri: imageUri, name: filename, type });
        }

        res = await api.put(`/tasks/${item._id}/status`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      } else {
        res = await api.put(`/tasks/${item._id}/status`, {
          notes: notes.trim(),
        });
      }

      Alert.alert(
        imageUri ? 'Task Completed! 🎉' : 'Progress Saved',
        imageUri
          ? 'Task completed successfully with image evidence.'
          : 'Follow-up submitted. Task status is In Progress.'
      );

      setNotes('');
      setImageUri(null);
      setExpanded(false);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || 'Failed to submit update. Please try again.';
      Alert.alert('Update Failed', msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.card}>
      {/* Upper Section */}
      <View style={styles.upper}>
        <View style={[styles.iconWrap, { backgroundColor: statusStyle.bg }]}>
          <Ionicons name={statusStyle.icon} size={22} color={statusStyle.text} />
        </View>
        <View style={styles.info}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.desc}>{item.description}</Text>
        </View>
        <View style={styles.badgeCol}>
          <View style={[styles.badge, { backgroundColor: statusStyle.bg, borderColor: statusStyle.border }]}>
            <Text style={[styles.badgeText, { color: statusStyle.text }]}>{statusStyle.label}</Text>
          </View>
          {isOverdue && (
            <View style={styles.overdueBadge}>
              <Text style={styles.overdueText}>OVERDUE</Text>
            </View>
          )}
        </View>
      </View>

      {/* Meta Row */}
      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Ionicons name="calendar-outline" size={12} color="#64748b" />
          <Text style={styles.metaText}>
            Due: {new Date(item.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </Text>
        </View>
        {item.assignedBy && (
          <View style={styles.metaItem}>
            <Ionicons name="person-outline" size={12} color="#64748b" />
            <Text style={styles.metaText}>By: {item.assignedBy.name}</Text>
          </View>
        )}
      </View>

      {/* ── Updates / History ── */}
      {item.updates && item.updates.length > 0 && (
        <View style={styles.historySection}>
          <Text style={styles.historyHeader}>Update History ({item.updates.length})</Text>
          {item.updates.map((up, idx) => {
            const hasPhoto = up.photo && up.photo.data;
            return (
              <View key={up._id || idx} style={styles.historyRow}>
                <View style={styles.historyLeftLine}>
                  <View style={styles.historyDot} />
                  {idx < item.updates.length - 1 && <View style={styles.historyConnector} />}
                </View>
                <View style={styles.historyContent}>
                  <View style={styles.historyMetaRow}>
                    <Text style={styles.historyDate}>
                      {new Date(up.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                    <Text style={[
                      styles.historyStatusText,
                      { color: up.statusAfterUpdate === 'Completed' ? '#16a34a' : '#d97706' }
                    ]}>
                      {up.statusAfterUpdate}
                    </Text>
                  </View>
                  <Text style={styles.historyNotes}>{up.notes}</Text>
                  {hasPhoto && (
                    <View style={styles.evidenceWrap}>
                      <Text style={styles.evidenceLabel}>📷 Evidence photo submitted:</Text>
                      <EvidenceImage taskId={item._id} updateId={up._id} style={styles.evidenceImage} />
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Update form controls */}
      {item.status !== 'Completed' && (
        <View style={styles.actions}>
          <TouchableOpacity
            onPress={() => setExpanded(!expanded)}
            style={[styles.toggleBtn, expanded && styles.toggleBtnActive]}
            activeOpacity={0.7}
          >
            <Ionicons name={expanded ? "chevron-up" : "create-outline"} size={16} color={expanded ? "#0284c7" : "#475569"} />
            <Text style={[styles.toggleBtnText, expanded && styles.toggleBtnTextActive]}>
              {expanded ? 'Cancel Update' : 'Submit Update / Progress'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {expanded && (
        <View style={styles.form}>
          <Text style={styles.formTitle}>Add Update Details</Text>
          
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Type your follow-up notes here..."
            placeholderTextColor="#94a3b8"
            multiline
            numberOfLines={4}
            style={styles.notesInput}
            textAlignVertical="top"
          />

          <Text style={styles.evidenceTitle}>Image Evidence (Optional)</Text>
          <Text style={styles.evidenceDesc}>
            ⚠️ Uploading photo proof will automatically mark this task as <Text style={{fontWeight: '500', color: '#16a34a'}}>Completed</Text>. Notes only will keep it <Text style={{fontWeight: '500', color: '#d97706'}}>In Progress</Text>.
          </Text>

          {imageUri ? (
            <View style={styles.previewContainer}>
              <Image source={{ uri: imageUri }} style={styles.previewImage} />
              <TouchableOpacity
                onPress={() => setImageUri(null)}
                style={styles.removePreviewBtn}
              >
                <Ionicons name="trash-outline" size={16} color="#ef4444" />
                <Text style={styles.removePreviewText}>Remove Evidence</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.uploadRow}>
              <TouchableOpacity
                onPress={() => handleSelectImage(true)}
                style={styles.uploadBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="camera-outline" size={20} color="#0284c7" />
                <Text style={styles.uploadBtnText}>Take Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleSelectImage(false)}
                style={styles.uploadBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="image-outline" size={20} color="#0284c7" />
                <Text style={styles.uploadBtnText}>From Gallery</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            onPress={handleSubmitUpdate}
            disabled={submitting}
            style={[styles.submitBtn, submitting && styles.btnDisabled]}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name={imageUri ? "checkmark-done-circle" : "send"} size={18} color="#fff" />
                <Text style={styles.submitBtnText}>
                  {imageUri ? 'Complete Task (With Photo)' : 'Submit Progress (In Progress)'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  upper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  info: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '400',
    color: '#0f172a',
  },
  desc: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
  },
  badgeCol: {
    alignItems: 'flex-end',
    gap: 6,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '400',
    textTransform: 'uppercase',
  },
  overdueBadge: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  overdueText: {
    fontSize: 9,
    color: '#ef4444',
    fontWeight: '500',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },

  // History Updates
  historySection: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  historyHeader: {
    fontSize: 12,
    fontWeight: '400',
    color: '#334155',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  historyRow: {
    flexDirection: 'row',
    gap: 8,
  },
  historyLeftLine: {
    alignItems: 'center',
    width: 12,
  },
  historyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#94a3b8',
    marginTop: 6,
  },
  historyConnector: {
    width: 1.5,
    flex: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 4,
  },
  historyContent: {
    flex: 1,
    paddingBottom: 12,
  },
  historyMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyDate: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '400',
  },
  historyStatusText: {
    fontSize: 9,
    fontWeight: '400',
    textTransform: 'uppercase',
  },
  historyNotes: {
    fontSize: 12,
    color: '#1e293b',
    marginTop: 4,
    lineHeight: 16,
  },
  evidenceWrap: {
    marginTop: 8,
    gap: 4,
  },
  evidenceLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '400',
  },
  evidenceImage: {
    width: '100%',
    height: 150,
    borderRadius: 12,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  imagePlaceholder: {
    height: 150,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },

  // Actions
  actions: {
    marginTop: 12,
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingVertical: 10,
    backgroundColor: '#f8fafc',
  },
  toggleBtnActive: {
    borderColor: '#bfdbfe',
    backgroundColor: '#eff6ff',
  },
  toggleBtnText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#475569',
  },
  toggleBtnTextActive: {
    color: '#0284c7',
  },

  // Form
  form: {
    marginTop: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  formTitle: {
    fontSize: 12,
    fontWeight: '400',
    color: '#334155',
    marginBottom: 8,
  },
  notesInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    color: '#0f172a',
    minHeight: 80,
    lineHeight: 18,
  },
  evidenceTitle: {
    fontSize: 12,
    fontWeight: '400',
    color: '#334155',
    marginTop: 12,
    marginBottom: 4,
  },
  evidenceDesc: {
    fontSize: 11,
    color: '#64748b',
    lineHeight: 16,
    marginBottom: 10,
  },
  previewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 8,
  },
  previewImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  removePreviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  removePreviewText: {
    fontSize: 12,
    color: '#ef4444',
    fontWeight: '500',
  },
  uploadRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  uploadBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#bae6fd',
    borderRadius: 12,
    paddingVertical: 10,
    backgroundColor: '#eff6ff',
  },
  uploadBtnText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#0284c7',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0284c7',
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 8,
  },
  submitBtnText: {
    color: '#fff',
    fontWeight: '400',
    fontSize: 13,
  },
  btnDisabled: {
    opacity: 0.6,
  },
});
