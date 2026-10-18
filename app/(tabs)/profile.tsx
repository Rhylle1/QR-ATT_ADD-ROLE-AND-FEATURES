import { useCallback, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Alert,
  TextInput,
  Pressable,
  ScrollView,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

import { COLORS } from '@/constants/colors';
import { useAuth, signOut } from '@/lib/auth';
import {
  getProfile,
  updateProfile,
  type Profile,
} from '@/lib/profile';

export default function ProfileScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [draftName, setDraftName] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!user) return;

    try {
      const data = await getProfile(user.id);
      setProfile(data);
      setDraftName(data?.full_name ?? '');
    } catch {
      Alert.alert('Error', 'Unable to load profile.');
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  const handleSave = async () => {
    if (!user) return;

    const name = draftName.trim();

    if (!name) {
      Alert.alert('Required', 'Please enter your name.');
      return;
    }

    setSaving(true);

    try {
      const { error } = await updateProfile(user.id, {
        full_name: name,
      });

      if (error) {
        Alert.alert('Error', error);
        return;
      }

      setProfile((previous) =>
        previous ? { ...previous, full_name: name } : previous
      );
      setDraftName(name);
      setEditing(false);
      Alert.alert('Success', 'Profile updated successfully.');
    } catch {
      Alert.alert('Error', 'Unable to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);

            try {
              await (signOut as unknown as () => Promise<void>)();
              router.replace('/login');
            } catch (error: any) {
              Alert.alert(
                'Error',
                error?.message || 'Failed to sign out.'
              );
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const isTeacher = profile?.role === 'teacher';
  const isAdmin = profile?.role === 'admin';

  const roleLabel = isAdmin
    ? 'Administrator'
    : isTeacher
      ? 'Teacher'
      : 'Student';

  const displayName = profile?.full_name || 'Your Name';

  const initial = (
    profile?.full_name || user?.email || 'U'
  ).charAt(0).toUpperCase();

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
        <Text style={styles.headerSubtitle}>
          Manage your account information
        </Text>
      </View>

      {user && (
        <>
          <View style={styles.profileCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>

            <View style={styles.profileDetails}>
              <Text style={styles.name}>{displayName}</Text>

              <View
                style={[
                  styles.roleBadge,
                  !isTeacher && !isAdmin && styles.studentBadge,
                ]}
              >
                <Text style={styles.roleText}>{roleLabel}</Text>
              </View>
            </View>

            {!editing && (
              <Pressable
                onPress={() => setEditing(true)}
                style={styles.editButton}
              >
                <Text style={styles.editText}>Edit</Text>
              </Pressable>
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>
              Personal Information
            </Text>

            <Text style={styles.label}>Full Name</Text>

            {editing ? (
              <>
                <TextInput
                  value={draftName}
                  onChangeText={setDraftName}
                  style={styles.input}
                  placeholder="Enter your name"
                  placeholderTextColor={COLORS.textSecondary}
                  autoCapitalize="words"
                />

                <View style={styles.actionRow}>
                  <Pressable
                    onPress={() => {
                      setDraftName(profile?.full_name ?? '');
                      setEditing(false);
                    }}
                    style={styles.cancelButton}
                    disabled={saving}
                  >
                    <Text style={styles.cancelText}>Cancel</Text>
                  </Pressable>

                  <Pressable
                    onPress={handleSave}
                    style={styles.saveButton}
                    disabled={saving}
                  >
                    <Text style={styles.saveText}>
                      {saving ? 'Saving...' : 'Save Changes'}
                    </Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <Text style={styles.value}>
                {profile?.full_name || 'Add your name'}
              </Text>
            )}

            <View style={styles.divider} />

            <Text style={styles.label}>Email Address</Text>
            <Text style={styles.value}>
              {user.email || 'No email available'}
            </Text>

            <View style={styles.divider} />

            <Text style={styles.label}>User ID</Text>
            <Text selectable style={styles.userId}>
              {user.id}
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>
              Account Settings
            </Text>

            <View style={styles.settingRow}>
              <View style={styles.settingIcon}>
                <Text style={styles.settingIconText}>♙</Text>
              </View>

              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Account Role</Text>
                <Text style={styles.settingSubtitle}>
                  {roleLabel} account
                </Text>
              </View>

              <View
                style={[
                  styles.roleBadge,
                  !isTeacher && !isAdmin && styles.studentBadge,
                ]}
              >
                <Text style={styles.roleText}>{roleLabel}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.settingRow}>
              <View style={styles.settingIcon}>
                <Text style={styles.settingIconText}>✓</Text>
              </View>

              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>QR-ATT</Text>
                <Text style={styles.settingSubtitle}>
                  Smart School Event Attendance System
                </Text>
              </View>
            </View>
          </View>

          <Pressable
            onPress={handleSignOut}
            disabled={loading}
            style={[
              styles.signOutButton,
              loading && styles.disabledButton,
            ]}
          >
            <Text style={styles.signOutText}>
              {loading ? 'Signing Out...' : '↪  Sign Out'}
            </Text>
          </Pressable>

          <Text style={styles.footer}>
            QR-ATT · Smart School Event Attendance
          </Text>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  content: {
    paddingBottom: 32,
  },

  header: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 58,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },

  headerTitle: {
    fontSize: 27,
    fontWeight: '700',
    color: COLORS.textOnPrimary,
  },

  headerSubtitle: {
    fontSize: 13,
    color: COLORS.textOnPrimary,
    marginTop: 6,
    opacity: 0.9,
  },

  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    marginHorizontal: 20,
    marginTop: -32,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E8EAF5',
    marginBottom: 18,
  },

  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E5E7FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarText: {
    fontSize: 27,
    fontWeight: '700',
    color: COLORS.primary,
  },

  profileDetails: {
    flex: 1,
    marginLeft: 13,
  },

  name: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 7,
  },

  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },

  studentBadge: {
    backgroundColor: COLORS.textSecondary,
  },

  roleText: {
    color: COLORS.textOnPrimary,
    fontSize: 10,
    fontWeight: '600',
  },

  editButton: {
    backgroundColor: '#EEF0FF',
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 10,
  },

  editText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
  },

  card: {
    backgroundColor: COLORS.card,
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 18,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: '#E8EAF5',
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 15,
  },

  label: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 6,
  },

  value: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },

  userId: {
    fontSize: 11,
    lineHeight: 17,
    color: COLORS.textSecondary,
  },

  divider: {
    height: 1,
    backgroundColor: '#ECEEF5',
    marginVertical: 14,
  },

  input: {
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: COLORS.textPrimary,
    fontSize: 14,
  },

  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 12,
  },

  cancelButton: {
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#D9DCE7',
  },

  cancelText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },

  saveButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 9,
  },

  saveText: {
    color: COLORS.textOnPrimary,
    fontSize: 12,
    fontWeight: '700',
  },

  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  settingIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: '#EEF0FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  settingIconText: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
  },

  settingInfo: {
    flex: 1,
  },

  settingTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },

  settingSubtitle: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 4,
  },

  signOutButton: {
    marginHorizontal: 20,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: '#F0C4CA',
    borderRadius: 13,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 2,
  },

  signOutText: {
    color: '#D9485A',
    fontSize: 14,
    fontWeight: '700',
  },

  disabledButton: {
    opacity: 0.6,
  },

  footer: {
    fontSize: 10,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 18,
    paddingHorizontal: 20,
  },
});