import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  View,
  StatusBar,
  Pressable,
} from 'react-native';

import { useAuth } from '@/lib/auth';
import {
  getAttendanceHistory,
  getTeacherEventAttendance,
  type AttendanceRecord,
  type TeacherEventAttendance,
} from '@/lib/attendance';
import { getProfile, type Role } from '@/lib/profile';

const COLORS = {
  background: '#F4F6FF',
  primary: '#4F65F6',
  text: '#172554',
  muted: '#64748B',
  white: '#FFFFFF',
};

const CARD_COLORS = [
  { background: '#EEF4FF', accent: '#4F83F1' },
  { background: '#EAF9F0', accent: '#28A766' },
  { background: '#F2EDFF', accent: '#8559E8' },
  { background: '#FFF3E7', accent: '#F28A36' },
];

type EventFilter = 'all' | 'upcoming' | 'past';

export default function HistoryScreen() {
  const { user } = useAuth();

  const [role, setRole] = useState<Role | null>(null);
  const [studentRecords, setStudentRecords] =
    useState<AttendanceRecord[]>([]);
  const [teacherEvents, setTeacherEvents] =
    useState<TeacherEventAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventFilter, setEventFilter] =
    useState<EventFilter>('all');

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const profile = await getProfile(user.id);
      const currentRole = profile?.role ?? 'student';

      setRole(currentRole);

      if (currentRole === 'teacher') {
        const events = await getTeacherEventAttendance(user.id);
        setTeacherEvents(events);
        setStudentRecords([]);
      } else {
        const records = await getAttendanceHistory(user.id);
        setStudentRecords(records);
        setTeacherEvents([]);
      }
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const isTeacher = role === 'teacher';

  const recordCount = isTeacher
    ? teacherEvents.length
    : studentRecords.length;

  const filteredTeacherEvents = teacherEvents.filter((event) => {
    if (eventFilter === 'all') return true;
    if (!event.startTime) return false;

    const timestamp = new Date(event.startTime).getTime();

    if (Number.isNaN(timestamp)) return false;

    if (eventFilter === 'upcoming') {
      return timestamp > Date.now();
    }

    return timestamp <= Date.now();
  });

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={COLORS.primary}
      />

      <View style={styles.hero}>
        <Text style={styles.eyebrow}>QR-ATT • ATTENDANCE</Text>

        <Text style={styles.heroTitle}>
          {isTeacher ? 'My Events' : 'History'}
        </Text>

        <Text style={styles.heroSubtitle}>
          {isTeacher
            ? 'Review your events and student attendance.'
            : 'Your attendance records in one place.'}
        </Text>

        <View style={styles.summaryCard}>
          <View style={styles.summaryIcon}>
            <Text style={styles.summaryIconText}>✓</Text>
          </View>

          <View style={styles.summaryInfo}>
            <Text style={styles.summaryNumber}>{recordCount}</Text>
            <Text style={styles.summaryLabel}>
              {isTeacher ? 'Events Created' : 'Attendance Records'}
            </Text>
          </View>

          <Text style={styles.summaryDecoration}>▦</Text>
        </View>
      </View>

      <View style={styles.sectionHeading}>
        <View style={styles.sectionIcon}>
          <Text style={styles.sectionIconText}>▤</Text>
        </View>

        <View style={styles.sectionInfo}>
          <Text style={styles.sectionTitle}>
            {isTeacher ? 'Your Events' : 'My Attendance'}
          </Text>

          <Text style={styles.sectionSubtitle}>
            {loading ? 'Loading records...' : 'Your recent activity'}
          </Text>
        </View>
      </View>

      {!loading && isTeacher && (
        <View style={styles.filterSection}>
          <Text style={styles.filterTitle}>Filter Events</Text>

          <View style={styles.filterRow}>
            <FilterButton
              label="All Events"
              active={eventFilter === 'all'}
              onPress={() => setEventFilter('all')}
            />

            <FilterButton
              label="Upcoming"
              active={eventFilter === 'upcoming'}
              onPress={() => setEventFilter('upcoming')}
            />

            <FilterButton
              label="Past Events"
              active={eventFilter === 'past'}
              onPress={() => setEventFilter('past')}
            />
          </View>

          <Text style={styles.filterHint}>
            {eventFilter === 'all'
              ? 'Showing all your events'
              : eventFilter === 'upcoming'
                ? 'Showing future events'
                : 'Showing events whose scheduled time has passed'}
          </Text>
        </View>
      )}

      {loading ? (
        <Text style={styles.message}>Loading history...</Text>
      ) : isTeacher ? (
        <FlatList
          data={filteredTeacherEvents}
          keyExtractor={(item) => item.eventId}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>
                {eventFilter === 'all'
                  ? 'No events yet'
                  : 'No matching events'}
              </Text>

              <Text style={styles.emptyDescription}>
                {eventFilter === 'all'
                  ? 'Create an event from the Teacher tab.'
                  : 'Try another filter to see your events.'}
              </Text>
            </View>
          }
          renderItem={({ item, index }) => {
            const color = CARD_COLORS[index % CARD_COLORS.length];

            return (
              <View
                style={[
                  styles.card,
                  {
                    backgroundColor: color.background,
                    borderLeftColor: color.accent,
                  },
                ]}
              >
                <View style={styles.cardHeader}>
                  <View
                    style={[
                      styles.eventIcon,
                      { backgroundColor: color.accent },
                    ]}
                  >
                    <Text style={styles.eventIconText}>▦</Text>
                  </View>

                  <View style={styles.eventInfo}>
                    <Text style={styles.eventTitle}>{item.title}</Text>
                    <Text style={styles.eventMeta}>
                      Code: {item.eventCode}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.countBadge,
                      { backgroundColor: color.accent },
                    ]}
                  >
                    <Text style={styles.countText}>
                      {item.attendeeCount}
                    </Text>
                  </View>
                </View>

                {item.startTime ? (
                  <Text style={styles.dateText}>
                    ◷ {formatDate(item.startTime)}
                  </Text>
                ) : null}

                <View style={styles.divider} />

                <Text style={styles.attendeeTitle}>
                  Students • {item.attendees.length}
                </Text>

                {item.attendees.length === 0 ? (
                  <Text style={styles.emptyAttendees}>
                    No students have scanned yet.
                  </Text>
                ) : (
                  item.attendees.map((attendee) => (
                    <View
                      key={`${attendee.studentId}-${attendee.scannedAt}`}
                      style={styles.attendeeRow}
                    >
                      <Text style={styles.studentId}>
                        {shortId(attendee.studentId)}
                      </Text>
                      <Text style={styles.scanTime}>
                        {formatDate(attendee.scannedAt)}
                      </Text>
                    </View>
                  ))
                )}
              </View>
            );
          }}
        />
      ) : (
        <FlatList
          data={studentRecords}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <View style={styles.emptyIcon}>
                <Text style={styles.emptyIconText}>◷</Text>
              </View>

              <Text style={styles.emptyTitle}>No records yet</Text>
              <Text style={styles.emptyDescription}>
                Scan a QR code to register your attendance.
              </Text>
            </View>
          }
          renderItem={({ item, index }) => {
            const color = CARD_COLORS[index % CARD_COLORS.length];

            return (
              <View
                style={[
                  styles.card,
                  {
                    backgroundColor: color.background,
                    borderLeftColor: color.accent,
                  },
                ]}
              >
                <View style={styles.cardHeader}>
                  <View
                    style={[
                      styles.eventIcon,
                      { backgroundColor: color.accent },
                    ]}
                  >
                    <Text style={styles.eventIconText}>✓</Text>
                  </View>

                  <View style={styles.eventInfo}>
                    <Text style={styles.eventTitle}>
                      {item.eventTitle}
                    </Text>
                    <Text style={styles.eventMeta}>
                      Event ID: {item.eventId}
                    </Text>
                  </View>

                  <View style={styles.presentBadge}>
                    <Text style={styles.presentText}>Present</Text>
                  </View>
                </View>

                <View style={styles.dateRow}>
                  <Text style={styles.dateIcon}>◷</Text>
                  <Text style={styles.dateText}>
                    {formatDate(item.scannedAt)}
                  </Text>
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

function FilterButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={[
        styles.filterButton,
        active && styles.filterButtonActive,
      ]}
    >
      <Text
        style={[
          styles.filterButtonText,
          active && styles.filterButtonTextActive,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function shortId(id: string) {
  return id ? `…${id.slice(-8)}` : 'unknown';
}

function formatDate(iso: string) {
  const date = new Date(iso);

  return Number.isNaN(date.getTime())
    ? iso
    : date.toLocaleString();
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  hero: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 28,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  eyebrow: {
    color: '#DDE5FF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  heroTitle: {
    color: COLORS.white,
    fontSize: 32,
    fontWeight: '800',
  },
  heroSubtitle: {
    color: '#E5E9FF',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 6,
  },
  summaryCard: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 16,
    marginTop: 22,
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#E9F8EF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryIconText: {
    color: '#229B57',
    fontSize: 24,
    fontWeight: '800',
  },
  summaryInfo: {
    marginLeft: 12,
    flex: 1,
  },
  summaryNumber: {
    color: COLORS.text,
    fontSize: 23,
    fontWeight: '800',
  },
  summaryLabel: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 2,
  },
  summaryDecoration: {
    color: '#C5CBFF',
    fontSize: 30,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 24,
    marginBottom: 14,
  },
  sectionIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#E8E9FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionIconText: {
    color: COLORS.primary,
    fontSize: 23,
    fontWeight: '700',
  },
  sectionInfo: {
    marginLeft: 12,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '700',
  },
  sectionSubtitle: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 3,
  },
  filterSection: {
    marginHorizontal: 20,
    marginBottom: 14,
  },
  filterTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterButton: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#DDE3F5',
    borderRadius: 20,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterButtonText: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  filterButtonTextActive: {
    color: COLORS.white,
  },
  filterHint: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 8,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  card: {
    borderRadius: 18,
    borderLeftWidth: 5,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventIconText: {
    color: COLORS.white,
    fontSize: 23,
    fontWeight: '800',
  },
  eventInfo: {
    flex: 1,
    marginLeft: 12,
  },
  eventTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 5,
  },
  eventMeta: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 2,
  },
  countBadge: {
    minWidth: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  countText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '800',
  },
  dateText: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 12,
    lineHeight: 18,
  },
  divider: {
    height: 1,
    backgroundColor: '#DCE3F0',
    marginTop: 14,
    marginBottom: 12,
  },
  attendeeTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptyAttendees: {
    color: COLORS.muted,
    fontSize: 13,
  },
  attendeeRow: {
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#DCE3F0',
  },
  studentId: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
  },
  scanTime: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 3,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  dateIcon: {
    color: COLORS.primary,
    fontSize: 16,
    marginRight: 7,
  },
  presentBadge: {
    backgroundColor: '#D7F8E4',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 10,
    marginLeft: 6,
  },
  presentText: {
    color: '#16834A',
    fontSize: 11,
    fontWeight: '800',
  },
  message: {
    color: COLORS.muted,
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 21,
    marginHorizontal: 24,
    marginTop: 30,
  },
  emptyBox: {
    alignItems: 'center',
    backgroundColor: COLORS.white,
    marginHorizontal: 20,
    padding: 28,
    borderRadius: 20,
    marginTop: 10,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: '#E8E9FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyIconText: {
    color: COLORS.primary,
    fontSize: 32,
    fontWeight: '700',
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '800',
  },
  emptyDescription: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 8,
  },
});