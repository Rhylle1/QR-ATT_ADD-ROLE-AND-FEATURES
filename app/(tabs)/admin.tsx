import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';

import { useAuth } from '@/lib/auth';
import { getProfile } from '@/lib/profile';
import { supabase } from '@/lib/supabase';

type Account = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: 'student' | 'teacher';
};

type FilterType = 'all' | 'student' | 'teacher';

export default function AdminScreen() {
  const { session } = useAuth();

  const [isAdmin, setIsAdmin] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [error, setError] = useState('');

  const loadAccounts = useCallback(async (refresh = false) => {
    if (refresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError('');

    try {
      const userId = session?.user?.id;

      if (!userId) {
        setIsAdmin(false);
        setAccounts([]);
        return;
      }

      const profile = await getProfile(userId);
      const adminAccess = profile?.role === 'admin';

      setIsAdmin(adminAccess);

      if (!adminAccess) {
        setAccounts([]);
        return;
      }

      const { data, error: queryError } = await supabase
        .from('profiles')
        .select('id, email, full_name, role')
        .in('role', ['student', 'teacher'])
        .order('full_name', { ascending: true });

      if (queryError) {
        throw queryError;
      }

      setAccounts((data ?? []) as Account[]);
    } catch (err) {
      console.error('Admin account loading error:', err);
      setError(
        'Unable to load accounts. Check your Supabase permissions and connection.',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session?.user?.id]);

  useFocusEffect(
    useCallback(() => {
      loadAccounts();
    }, [loadAccounts]),
  );

  const filteredAccounts = accounts.filter((account) => {
    const matchesRole = filter === 'all' || account.role === filter;
    const searchText = search.trim().toLowerCase();

    const matchesSearch =
      (account.full_name ?? '').toLowerCase().includes(searchText) ||
      (account.email ?? '').toLowerCase().includes(searchText);

    return matchesRole && matchesSearch;
  });

  const studentCount = accounts.filter(
    (account) => account.role === 'student',
  ).length;

  const teacherCount = accounts.filter(
    (account) => account.role === 'teacher',
  ).length;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Loading accounts...</Text>
      </View>
    );
  }

  if (!isAdmin) {
    return (
      <View style={styles.center}>
        <Text style={styles.lockIcon}>🔒</Text>
        <Text style={styles.title}>Admin Access Only</Text>
        <Text style={styles.subtitle}>
          Only an authorized administrator can view student and teacher
          accounts.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => loadAccounts(true)}
        />
      }
    >
      <Text style={styles.title}>Admin Dashboard</Text>
      <Text style={styles.subtitle}>
        Manage and view registered school accounts.
      </Text>

      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, styles.studentCard]}>
          <Text style={styles.summaryNumber}>{studentCount}</Text>
          <Text style={styles.summaryLabel}>Students</Text>
        </View>

        <View style={[styles.summaryCard, styles.teacherCard]}>
          <Text style={styles.summaryNumber}>{teacherCount}</Text>
          <Text style={styles.summaryLabel}>Teachers</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>User Accounts</Text>

      <TextInput
        style={styles.searchInput}
        placeholder="Search name or email..."
        placeholderTextColor="#777"
        value={search}
        onChangeText={setSearch}
        autoCapitalize="none"
      />

      <View style={styles.filterRow}>
        {(['all', 'student', 'teacher'] as FilterType[]).map((item) => (
          <Text
            key={item}
            onPress={() => setFilter(item)}
            style={[
              styles.filterButton,
              filter === item && styles.activeFilter,
            ]}
          >
            {item === 'all'
              ? 'All'
              : item === 'student'
                ? 'Students'
                : 'Teachers'}
          </Text>
        ))}
      </View>

      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : filteredAccounts.length === 0 ? (
        <Text style={styles.emptyText}>No matching accounts found.</Text>
      ) : (
        filteredAccounts.map((account) => (
          <View key={account.id} style={styles.accountCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(account.full_name || account.email || '?')
                  .charAt(0)
                  .toUpperCase()}
              </Text>
            </View>

            <View style={styles.accountInfo}>
              <Text style={styles.accountName}>
                {account.full_name || 'No name provided'}
              </Text>
              <Text style={styles.email}>
                {account.email || 'No email provided'}
              </Text>
              <Text
                style={[
                  styles.roleBadge,
                  account.role === 'teacher'
                    ? styles.teacherBadge
                    : styles.studentBadge,
                ]}
              >
                {account.role.toUpperCase()}
              </Text>
            </View>
          </View>
        ))
      )}

      <Text style={styles.footer}>
        Pull down to refresh account information.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F7FB',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F4F7FB',
  },
  title: {
    fontSize: 25,
    fontWeight: 'bold',
    color: '#172554',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 22,
    lineHeight: 21,
    textAlign: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#475569',
  },
  lockIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 28,
  },
  summaryCard: {
    flex: 1,
    padding: 18,
    borderRadius: 14,
  },
  studentCard: {
    backgroundColor: '#DBEAFE',
  },
  teacherCard: {
    backgroundColor: '#D1FAE5',
  },
  summaryNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#172554',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#334155',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#172554',
    marginBottom: 12,
  },
  searchInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D8E0EA',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#172554',
    marginBottom: 12,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterButton: {
    overflow: 'hidden',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: '#E2E8F0',
    color: '#334155',
    fontWeight: '600',
  },
  activeFilter: {
    backgroundColor: '#2563EB',
    color: '#FFFFFF',
  },
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#1D4ED8',
    fontSize: 20,
    fontWeight: 'bold',
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#172554',
    marginBottom: 3,
  },
  email: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 7,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    overflow: 'hidden',
    borderRadius: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 10,
    fontWeight: 'bold',
  },
  studentBadge: {
    backgroundColor: '#DBEAFE',
    color: '#1D4ED8',
  },
  teacherBadge: {
    backgroundColor: '#D1FAE5',
    color: '#047857',
  },
  emptyText: {
    textAlign: 'center',
    color: '#64748B',
    paddingVertical: 28,
  },
  errorText: {
    color: '#B91C1C',
    paddingVertical: 16,
  },
  footer: {
    marginTop: 18,
    fontSize: 12,
    textAlign: 'center',
    color: '#64748B',
  },
});