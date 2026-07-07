import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, Image, Linking, StyleSheet, Platform, TextInput, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../api/api';
import Toast from 'react-native-toast-message';
import * as ImagePicker from 'expo-image-picker';

const STATUS_COLORS = {
  Scheduled: { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' },
  Completed:  { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0' },
  Cancelled:  { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' },
};

const TYPE_COLORS = {
  'In-Person': { bg: '#fdf4ff', text: '#9333ea', icon: 'people-outline' },
  Online:      { bg: '#eff6ff', text: '#2563eb', icon: 'videocam-outline' },
};

function fmt(dateStr) {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true,
    });
  } catch { return dateStr; }
}

const MeetingCard = ({ item, isAdmin = false, onUpdated }) => {
  const [expanded, setExpanded] = useState(false);
  const [followUpText, setFollowUpText] = useState(item.meetingFollowUp || '');
  const [saving, setSaving] = useState(false);

  const [imageUri, setImageUri] = useState(null);

  const statusStyle  = STATUS_COLORS[item.status] || STATUS_COLORS.Completed;
  const typeStyle    = TYPE_COLORS[item.meetingType] || TYPE_COLORS['In-Person'];

  const openMap = () => {
    const lat = item.location?.latitude;
    const lng = item.location?.longitude;
    if (!lat || !lng) return;
    const url = Platform.OS === 'web'
      ? `https://www.google.com/maps?q=${lat},${lng}`
      : `geo:${lat},${lng}?q=${lat},${lng}`;
    Linking.openURL(url);
  };

  const handleCaptureImage = async () => {
    try {
      if (Platform.OS === 'web') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
          const file = e.target.files[0];
          if (file) setImageUri(URL.createObjectURL(file));
        };
        input.click();
        return;
      }
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Toast.show({ type: 'error', text1: 'Camera permission denied.' });
        return;
      }
      const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.7 });
      if (!result.canceled) setImageUri(result.assets[0].uri);
    } catch (e) { Toast.show({ type: 'error', text1: 'Could not open camera.' }); }
  };

  const saveFollowUp = async () => {
    setSaving(true);
    try {
      const fd = new FormData();
      if (followUpText) fd.append('meetingFollowUp', followUpText);
      fd.append('status', 'Completed');

      if (imageUri) {
        const filename = imageUri.split('/').pop() || 'photo.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        if (Platform.OS === 'web') {
          const blob = await fetch(imageUri).then(r => r.blob());
          fd.append('photo', new File([blob], filename, { type }));
        } else {
          fd.append('photo', { uri: imageUri, name: filename, type });
        }
      }

      await api.put(`/meetings/${item._id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      Toast.show({ type: 'success', text1: 'Meeting updated and admins notified!' });
      setImageUri(null);
      if (onUpdated) onUpdated();
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Failed to update meeting' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.card}>
      {/* ── Header Row ── */}
      <TouchableOpacity
        onPress={() => setExpanded(v => !v)}
        activeOpacity={0.85}
        style={styles.headerRow}
      >
        {/* Icon */}
        <View style={[styles.iconWrap, { backgroundColor: typeStyle.bg }]}>
          <Ionicons name={typeStyle.icon} size={20} color={typeStyle.text} />
        </View>

        {/* Info */}
        <View style={styles.headerInfo}>
          <Text style={styles.clientName} numberOfLines={1}>{item.clientName}</Text>
          <Text style={styles.companyName} numberOfLines={1}>{item.companyName}</Text>

          {/* Date row */}
          <View style={styles.dateRow}>
            <Ionicons name="time-outline" size={11} color="#94a3b8" />
            <Text style={styles.dateText}>
              {item.scheduledAt
                ? `Scheduled: ${fmt(item.scheduledAt)}`
                : fmt(item.createdAt)}
            </Text>
          </View>
        </View>

        {/* Badges */}
        <View style={styles.badgeCol}>
          {/* Meeting Type badge */}
          <View style={[styles.badge, { backgroundColor: typeStyle.bg, borderColor: typeStyle.text + '30' }]}>
            <Text style={[styles.badgeText, { color: typeStyle.text }]}>{item.meetingType || 'In-Person'}</Text>
          </View>
          {/* Status badge */}
          <View style={[styles.badge, { backgroundColor: statusStyle.bg, borderColor: statusStyle.border, marginTop: 4 }]}>
            <Text style={[styles.badgeText, { color: statusStyle.text }]}>{item.status || 'Completed'}</Text>
          </View>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={14}
            color="#94a3b8"
            style={{ marginTop: 6, alignSelf: 'flex-end' }}
          />
        </View>
      </TouchableOpacity>

      {/* ── Quick Join Banner (visible without expanding, for admin on scheduled online meetings) ── */}
      {item.meetingType === 'Online' && item.onlineMeetingLink && item.status === 'Scheduled' && (
        <TouchableOpacity
          onPress={() => Linking.openURL(item.onlineMeetingLink)}
          activeOpacity={0.85}
          style={styles.joinBanner}
        >
          <View style={styles.joinBannerLeft}>
            <Ionicons name="videocam" size={15} color="#2563eb" />
            <Text style={styles.joinBannerLabel}>Online Meeting Link</Text>
          </View>
          <View style={styles.joinBtn}>
            <Ionicons name="open-outline" size={12} color="#fff" />
            <Text style={styles.joinBtnText}>Join</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* ── Expandable Details ── */}
      {expanded && (
        <View style={styles.expandedBody}>
          {/* Divider */}
          <View style={styles.divider} />

          {/* Notes */}
          <View style={styles.detailRow}>
            <Ionicons name="document-text-outline" size={14} color="#64748b" />
            <Text style={styles.detailLabel}>Notes</Text>
          </View>
          <Text style={styles.notesText}>{item.notes}</Text>

          {/* Phone */}
          <View style={styles.detailRow}>
            <Ionicons name="call-outline" size={14} color="#64748b" />
            <Text style={styles.detailValue}>{item.phone}</Text>
          </View>

          {/* Executive (admin view) */}
          {isAdmin && item.executive?.name && (
            <View style={styles.detailRow}>
              <Ionicons name="person-outline" size={14} color="#64748b" />
              <Text style={styles.detailValue}>{item.executive.name}</Text>
            </View>
          )}

          {/* Online meeting link — full styled banner */}
          {item.meetingType === 'Online' && item.onlineMeetingLink ? (
            <View style={styles.linkBanner}>
              <View style={styles.linkBannerTop}>
                <Ionicons name="videocam-outline" size={14} color="#1d4ed8" />
                <Text style={styles.linkBannerTitle}>Online Meeting Link</Text>
              </View>
              <Text style={styles.linkBannerUrl} numberOfLines={2}>{item.onlineMeetingLink}</Text>
              <TouchableOpacity
                onPress={() => Linking.openURL(item.onlineMeetingLink)}
                style={styles.linkBannerBtn}
                activeOpacity={0.85}
              >
                <Ionicons name="open-outline" size={13} color="#fff" />
                <Text style={styles.linkBannerBtnText}>Open / Join Meeting</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* GPS Location */}
          {item.location?.latitude ? (
            <TouchableOpacity onPress={openMap} style={styles.locationRow}>
              <Ionicons name="location" size={14} color="#16a34a" />
              <Text style={styles.locationText}>
                {item.location.address
                  ? item.location.address
                  : `${item.location.latitude.toFixed(5)}, ${item.location.longitude.toFixed(5)}`}
              </Text>
              <View style={styles.mapBtn}>
                <Text style={styles.mapBtnText}>Open Map</Text>
              </View>
            </TouchableOpacity>
          ) : null}

          {/* Next Follow-up date */}
          {item.nextFollowUpDate ? (
            <View style={styles.detailRow}>
              <Ionicons name="calendar-outline" size={14} color="#f97316" />
              <Text style={[styles.detailValue, { color: '#f97316' }]}>
                Follow-up: {fmt(item.nextFollowUpDate)}
              </Text>
            </View>
          ) : null}

          {/* Reminder */}
          {item.reminderAt ? (
            <View style={styles.detailRow}>
              <Ionicons name="alarm-outline" size={14} color="#8b5cf6" />
              <Text style={[styles.detailValue, { color: '#8b5cf6' }]}>
                Reminder: {fmt(item.reminderAt)}
              </Text>
            </View>
          ) : null}

          {/* Photo evidence — expandable */}
          {(item.photoUrl || item.photo?.contentType) ? (
            <View style={styles.photoWrap}>
              <View style={styles.detailRow}>
                <Ionicons name="image-outline" size={14} color="#0ea5e9" />
                <Text style={[styles.detailLabel, { color: '#0ea5e9' }]}>Photo Evidence</Text>
              </View>
              {item.photoUrl ? (
                <Image
                  source={{ uri: item.photoUrl }}
                  style={styles.proofImage}
                  resizeMode="cover"
                />
              ) : (
                <Text style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                  (Photo stored — download via admin panel)
                </Text>
              )}
            </View>
          ) : null}

          {/* Meeting Follow-up note */}
          <View style={styles.followUpSection}>
            <View style={styles.detailRow}>
              <Ionicons name="chatbubble-ellipses-outline" size={14} color="#0284c7" />
              <Text style={[styles.detailLabel, { color: '#0284c7' }]}>Meeting Follow-up</Text>
            </View>
            
            {isAdmin ? (
              item.meetingFollowUp ? (
                <Text style={styles.followUpText}>{item.meetingFollowUp}</Text>
              ) : (
                <Text style={styles.noFollowUp}>No follow-up note yet.</Text>
              )
            ) : (
              <View>
                <TextInput
                  value={followUpText}
                  onChangeText={setFollowUpText}
                  placeholder="Type follow-up notes or next steps here..."
                  placeholderTextColor="#94a3b8"
                  multiline
                  style={{ backgroundColor: '#fff', borderRadius: 8, padding: 10, fontSize: 12, minHeight: 60, marginTop: 6, borderWidth: 1, borderColor: '#e2e8f0', textAlignVertical: 'top' }}
                />

                {/* If there's no photo yet, let them add one during update */}
                {!item.photoUrl && !item.photo?.contentType && (
                  <View style={{ marginTop: 10 }}>
                    {imageUri ? (
                      <View style={{ position: 'relative' }}>
                        <Image source={{ uri: imageUri }} style={{ width: '100%', height: 120, borderRadius: 8 }} />
                        <TouchableOpacity onPress={() => setImageUri(null)} style={{ position: 'absolute', top: 5, right: 5, backgroundColor: 'rgba(255,255,255,0.8)', padding: 4, borderRadius: 4 }}>
                          <Text style={{ color: '#dc2626', fontSize: 10, fontWeight: 'bold' }}>Remove</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity onPress={handleCaptureImage} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#e0f2fe', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#bae6fd' }}>
                        <Ionicons name="camera-outline" size={16} color="#0284c7" style={{ marginRight: 6 }} />
                        <Text style={{ color: '#0284c7', fontSize: 12, fontWeight: '600' }}>Add Photo Evidence</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                <TouchableOpacity 
                  onPress={saveFollowUp} 
                  disabled={saving || (!followUpText && !imageUri && item.status === 'Completed')}
                  style={{ backgroundColor: '#2563eb', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 10, opacity: saving ? 0.7 : 1 }}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 13 }}>
                      {item.status === 'Scheduled' ? 'Complete Meeting & Notify Admins' : 'Update & Notify Admins'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    gap: 10,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 2,
  },
  companyName: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 4,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  dateText: {
    fontSize: 10,
    color: '#94a3b8',
    flexShrink: 1,
  },
  badgeCol: {
    alignItems: 'flex-end',
  },
  badge: {
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  expandedBody: {
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 12,
    color: '#334155',
    flex: 1,
  },
  notesText: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
  },
  locationText: {
    flex: 1,
    fontSize: 11,
    color: '#166534',
  },
  mapBtn: {
    backgroundColor: '#16a34a',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  mapBtnText: {
    fontSize: 9,
    color: '#fff',
    fontWeight: '700',
  },
  photoWrap: {
    marginBottom: 10,
  },
  proofImage: {
    width: '100%',
    height: 180,
    borderRadius: 10,
    marginTop: 6,
    backgroundColor: '#f1f5f9',
  },
  followUpSection: {
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    padding: 10,
    marginTop: 4,
  },
  followUpText: {
    fontSize: 12,
    color: '#1e40af',
    lineHeight: 18,
  },
  noFollowUp: {
    fontSize: 11,
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  // Quick join banner (card-level, no expand needed)
  joinBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#eff6ff',
    borderTopWidth: 1,
    borderTopColor: '#bfdbfe',
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  joinBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  joinBannerLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563eb',
  },
  joinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  joinBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  // Full link banner inside expanded section
  linkBanner: {
    backgroundColor: '#eff6ff',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  linkBannerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 5,
  },
  linkBannerTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1d4ed8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  linkBannerUrl: {
    fontSize: 11,
    color: '#3b82f6',
    textDecorationLine: 'underline',
    marginBottom: 8,
    lineHeight: 16,
  },
  linkBannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 8,
  },
  linkBannerBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
});

export default MeetingCard;
