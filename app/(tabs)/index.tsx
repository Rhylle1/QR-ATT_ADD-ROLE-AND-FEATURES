import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Header from '@/components/Header';
import { supabase } from '@/lib/supabase';

type UpcomingEvent = {
  id: string | number;
  title: string;
  start_time: string | null;
  end_time: string | null;
};

export default function HomeScreen() {
  const [events, setEvents] = useState<UpcomingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadEvents = useCallback(async () => {
    setError('');

    try {
      const { data, error: fetchError } = await supabase
        .from('events')
        .select('id, title, start_time, end_time')
        .order('start_time', { ascending: true });

      if (fetchError) throw fetchError;

      const now = Date.now();

      const upcoming = (data ?? []).filter((event) => {
        const start = event.start_time
          ? new Date(event.start_time).getTime()
          : null;
        const end = event.end_time
          ? new Date(event.end_time).getTime()
          : null;

        if (end !== null && end < now) return false;
        if (start !== null && start < now && end === null) return false;

        return true;
      });

      setEvents(upcoming);
    } catch (err) {
      console.log('Upcoming events error:', err);
      setError('Unable to load events. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const formatDate = (value: string | null) => {
    if (!value) return 'Date to be announced';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Date to be announced';

    return date.toLocaleDateString('en-PH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (value: string | null) => {
    if (!value) return 'Time to be announced';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Time to be announced';

    return date.toLocaleTimeString('en-PH', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const refreshEvents = () => {
    setRefreshing(true);
    loadEvents();
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refreshEvents}
            tintColor="#4F63F6"
          />
        }
      >
        <Header title="Home" />

        <View style={styles.welcome}>
          <Text style={styles.eyebrow}>QR-ATT • ATTENDANCE</Text>
          <Text style={styles.heading}>Welcome to QR-ATT</Text>
          <Text style={styles.subtitle}>
            A simple and convenient way to manage school event attendance.
          </Text>
        </View>

        <Pressable
          onPress={() => router.push('/scan')}
          style={({ pressed }) => [
            styles.qrCard,
            pressed && styles.pressed,
          ]}
        >
          <View style={styles.qrIconBox}>
            <Text style={styles.qrIcon}>▦</Text>
          </View>

          <View style={styles.qrContent}>
            <Text style={styles.cardTitle}>QR Attendance</Text>
            <Text style={styles.cardDescription}>
              Scan an event QR code to record your attendance.
            </Text>
            <Text style={styles.actionText}>Get Started  →</Text>
          </View>
        </Pressable>

        <View style={styles.sectionHeader}>
          <View style={styles.sectionText}>
            <Text style={styles.sectionTitle}>Upcoming Events</Text>
            <Text style={styles.sectionSubtitle}>
              Check the latest school events.
            </Text>
          </View>

          <Pressable
            onPress={refreshEvents}
            style={styles.refreshButton}
          >
            <Text style={styles.refreshText}>Refresh</Text>
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.stateCard}>
            <ActivityIndicator color="#4F63F6" />
            <Text style={styles.stateText}>Loading events...</Text>
          </View>
        ) : error ? (
          <View style={styles.stateCard}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={refreshEvents} style={styles.retryButton}>
              <Text style={styles.retryText}>Try Again</Text>
            </Pressable>
          </View>
        ) : events.length === 0 ? (
          <View style={styles.stateCard}>
            <Text style={styles.eventEmoji}>📅</Text>
            <Text style={styles.emptyTitle}>No Upcoming Events</Text>
            <Text style={styles.stateText}>
              School events will appear here when available.
            </Text>
          </View>
        ) : (
          events.map((event) => (
            <View key={String(event.id)} style={styles.eventCard}>
              <View style={styles.eventIconBox}>
                <Text style={styles.eventEmoji}>📅</Text>
              </View>

              <View style={styles.eventContent}>
                <Text style={styles.eventTitle}>{event.title}</Text>
                <Text style={styles.eventInfo}>
                  {formatDate(event.start_time)}
                </Text>
                <Text style={styles.eventInfo}>
                  {formatTime(event.start_time)}
                  {event.end_time
                    ? ` - ${formatTime(event.end_time)}`
                    : ''}
                </Text>
              </View>

              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>Upcoming</Text>
              </View>
            </View>
          ))
        )}

        <View style={styles.quickSection}>
          <Text style={styles.sectionTitle}>Quick Access</Text>
          <Text style={styles.sectionSubtitle}>
            Your attendance tools in one place.
          </Text>

          <View style={styles.quickRow}>
            <Pressable
              style={({ pressed }) => [
                styles.quickCard,
                pressed && styles.pressed,
              ]}
              onPress={() => router.push('/scan')}
            >
              <Text style={styles.quickIcon}>▦</Text>
              <Text style={styles.quickTitle}>Scan QR</Text>
              <Text style={styles.quickDescription}>
                Record attendance
              </Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.quickCard,
                pressed && styles.pressed,
              ]}
              onPress={() => router.push('/history')}
            >
              <Text style={styles.quickIcon}>◷</Text>
              <Text style={styles.quickTitle}>My Attendance</Text>
              <Text style={styles.quickDescription}>View records</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.quickCard,
                pressed && styles.pressed,
              ]}
              onPress={() => router.push('/profile')}
            >
              <Text style={styles.quickIcon}>♙</Text>
              <Text style={styles.quickTitle}>My Profile</Text>
              <Text style={styles.quickDescription}>Account details</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Made for Everyone</Text>
          <Text style={styles.infoDescription}>
            QR-ATT helps students record attendance and allows teachers to
            manage and monitor school event attendance.
          </Text>

          <View style={styles.rolesRow}>
            <View style={styles.rolePill}>
              <Text style={styles.roleText}>Student</Text>
            </View>
            <View style={styles.rolePill}>
              <Text style={styles.roleText}>Teacher</Text>
            </View>
            <View style={styles.rolePill}>
              <Text style={styles.roleText}>Administrator</Text>
            </View>
          </View>
        </View>

        <Text style={styles.footer}>
          QR-ATT • Smart School Attendance
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F3F5FF',
  },
  scroll: {
    flex: 1,
  },
  container: {
    paddingHorizontal: 18,
    paddingTop: 0,
    paddingBottom: 16,
  },
  welcome: {
    backgroundColor: '#4F63F6',
    marginHorizontal: -18,
    marginTop: 0,
    marginBottom: 22,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 30,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: '#DDE4FF',
    marginBottom: 10,
  },
  heading: {
    fontSize: 27,
    lineHeight: 34,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: '#EEF1FF',
  },
  qrCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: '#E4E8F5',
    elevation: 2,
  },
  pressed: {
    opacity: 0.82,
  },
  qrIconBox: {
    width: 62,
    height: 62,
    borderRadius: 17,
    backgroundColor: '#E9EDFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  qrIcon: {
    color: '#4F63F6',
    fontSize: 38,
    fontWeight: '800',
  },
  qrContent: {
    flex: 1,
  },
  cardTitle: {
    color: '#182344',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6,
  },
  cardDescription: {
    color: '#737D91',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 9,
  },
  actionText: {
    color: '#4058E8',
    fontSize: 13,
    fontWeight: '800',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionText: {
    flex: 1,
    paddingRight: 8,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#182344',
    marginBottom: 5,
  },
  sectionSubtitle: {
    fontSize: 12,
    lineHeight: 18,
    color: '#7A8498',
  },
  refreshButton: {
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#E6EBFF',
  },
  refreshText: {
    color: '#4058E8',
    fontSize: 12,
    fontWeight: '800',
  },
  stateCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E4E8F5',
    borderRadius: 17,
    padding: 20,
    alignItems: 'center',
    marginBottom: 26,
  },
  stateText: {
    color: '#7A8498',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 19,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 13,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 9,
    backgroundColor: '#4F63F6',
    borderRadius: 10,
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#182344',
    marginTop: 8,
  },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E4E8F5',
    padding: 14,
    marginBottom: 12,
    elevation: 1,
  },
  eventIconBox: {
    width: 45,
    height: 45,
    borderRadius: 14,
    backgroundColor: '#E9EDFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  eventEmoji: {
    fontSize: 21,
  },
  eventContent: {
    flex: 1,
    paddingRight: 5,
  },
  eventTitle: {
    color: '#182344',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 5,
  },
  eventInfo: {
    color: '#7A8498',
    fontSize: 11,
    marginTop: 3,
  },
  statusBadge: {
    backgroundColor: '#E4F7EC',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 9,
    alignSelf: 'flex-start',
  },
  statusText: {
    color: '#218653',
    fontSize: 10,
    fontWeight: '800',
  },
  quickSection: {
    marginTop: 12,
    marginBottom: 24,
  },
  quickRow: {
    flexDirection: 'row',
    gap: 9,
    marginTop: 14,
  },
  quickCard: {
    flex: 1,
    minHeight: 126,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E4E8F5',
    padding: 11,
  },
  quickIcon: {
    fontSize: 24,
    color: '#4F63F6',
    marginBottom: 12,
  },
  quickTitle: {
    color: '#182344',
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 5,
  },
  quickDescription: {
    color: '#7A8498',
    fontSize: 10,
    lineHeight: 14,
  },
  infoCard: {
    backgroundColor: '#E8EDFF',
    borderRadius: 19,
    padding: 18,
    marginBottom: 24,
  },
  infoTitle: {
    color: '#182344',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
  },
  infoDescription: {
    color: '#596782',
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 14,
  },
  rolesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  rolePill: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  roleText: {
    color: '#4058E8',
    fontSize: 11,
    fontWeight: '800',
  },
  footer: {
    textAlign: 'center',
    fontSize: 11,
    color: '#9AA3B6',
    marginTop: 4,
  },
});