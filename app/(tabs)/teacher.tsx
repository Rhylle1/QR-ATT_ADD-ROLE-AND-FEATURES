import Ionicons from '@expo/vector-icons/Ionicons';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import AppButton from '@/components/AppButton';
import { COLORS } from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import { createEvent } from '@/lib/events';
import {
  getTeacherEventAttendance,
  type TeacherEventAttendance,
} from '@/lib/attendance';
import { getProfile } from '@/lib/profile';
import type { Role } from '@/lib/profile';

type EditTarget = 'start' | 'end';

function toLocalISO(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}:00`;
}

function formatDateTime(value: string | Date | null) {
  if (!value) return 'Not set';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not available';

  return date.toLocaleString('en-PH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export default function TeacherScreen() {
  const { user } = useAuth();

  const [role, setRole] = useState<Role | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);

  const [title, setTitle] = useState('');
  const [eventId, setEventId] = useState('');
  const [startDate, setStartDate] = useState(() => new Date());
  const [endDate, setEndDate] = useState(
    () => new Date(Date.now() + 60 * 60 * 1000)
  );

  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [editingPart, setEditingPart] = useState<'date' | 'time'>('date');
  const [payload, setPayload] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [events, setEvents] = useState<TeacherEventAttendance[]>([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  // Search fields
  const [eventSearch, setEventSearch] = useState('');
  const [studentSearch, setStudentSearch] = useState('');

  const isAndroid = Platform.OS === 'android';

  const refreshAttendance = useCallback(async () => {
    if (!user?.id) return;

    setLoadingAttendance(true);
    setAttendanceError(null);

    try {
      const result = await getTeacherEventAttendance(user.id);
      setEvents(result);
    } catch {
      setAttendanceError('Unable to load attendance. Please refresh.');
    } finally {
      setLoadingAttendance(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function load() {
        if (!user?.id) {
          setRole('student');
          setRoleLoading(false);
          return;
        }

        setRoleLoading(true);

        try {
          const profile = await getProfile(user.id);
          if (!active) return;

          const currentRole = profile?.role ?? 'student';
          setRole(currentRole);

          if (currentRole === 'teacher') {
            setLoadingAttendance(true);
            const result = await getTeacherEventAttendance(user.id);
            if (active) setEvents(result);
          }
        } catch {
          if (active) {
            setAttendanceError('Unable to load teacher information.');
          }
        } finally {
          if (active) {
            setRoleLoading(false);
            setLoadingAttendance(false);
          }
        }
      }

      void load();

      return () => {
        active = false;
      };
    }, [user?.id])
  );

  const openPicker = (target: EditTarget) => {
    setMessage(null);
    setEditTarget(target);
    setEditingPart('date');
  };

  const onPickerChange = (
    event: DateTimePickerEvent,
    selected?: Date
  ) => {
    if (!editTarget) return;

    if (event.type === 'dismissed' || !selected) {
      setEditTarget(null);
      setEditingPart('date');
      return;
    }

    const current = editTarget === 'start' ? startDate : endDate;
    const next = new Date(current);

    if (editingPart === 'date') {
      next.setFullYear(
        selected.getFullYear(),
        selected.getMonth(),
        selected.getDate()
      );
    } else {
      next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
    }

    if (editTarget === 'start') {
      setStartDate(next);
    } else {
      setEndDate(next);
    }

    if (isAndroid && editingPart === 'date') {
      setEditingPart('time');
    } else {
      setEditTarget(null);
      setEditingPart('date');
    }
  };

  const handleCreateEvent = async () => {
    setMessage(null);

    const event = {
      eventId: eventId.trim(),
      title: title.trim(),
      start: toLocalISO(startDate),
      end: toLocalISO(endDate),
    };

    if (!event.eventId || !event.title) {
      setMessage('Event title and code are required.');
      return;
    }

    if (endDate.getTime() <= startDate.getTime()) {
      setMessage('End time must be after start time.');
      return;
    }

    setSaving(true);

    try {
      const result = await createEvent(event);

      if (result.error) {
        setMessage(`Could not save event: ${result.error}`);
        return;
      }

      setPayload(
        JSON.stringify({
          v: 1,
          event: event.eventId,
          title: event.title,
          start: event.start,
          end: event.end,
        })
      );

      setMessage('Event saved successfully. QR code is ready.');
      await refreshAttendance();
    } catch {
      setMessage('An error occurred while saving the event.');
    } finally {
      setSaving(false);
    }
  };

  // Search event title or event code
  const filteredEvents = events.filter((event) => {
    const query = eventSearch.trim().toLowerCase();

    if (!query) return true;

    return (
      event.title.toLowerCase().includes(query) ||
      event.eventCode.toLowerCase().includes(query)
    );
  });

  if (roleLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.subtitle}>Checking your account...</Text>
      </View>
    );
  }

  if (role !== 'teacher') {
    return (
      <View style={styles.center}>
        <Ionicons
          name="lock-closed-outline"
          size={48}
          color={COLORS.primary}
        />
        <Text style={styles.title}>Teachers Only</Text>
        <Text style={styles.subtitle}>
          Only teacher accounts can create events.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Teacher Dashboard</Text>
      <Text style={styles.subtitle}>
        Create events and monitor student attendance.
      </Text>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Create Event</Text>

        <Text style={styles.label}>Event title</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. CCS Night"
          placeholderTextColor="#888"
        />

        <Text style={styles.label}>Event code</Text>
        <TextInput
          style={styles.input}
          value={eventId}
          onChangeText={setEventId}
          placeholder="e.g. CCS-NIGHT-2026"
          placeholderTextColor="#888"
          autoCapitalize="characters"
        />

        <Text style={styles.label}>Start date and time</Text>
        <Pressable
          style={styles.dateButton}
          onPress={() => openPicker('start')}
        >
          <Ionicons
            name="calendar-outline"
            size={20}
            color={COLORS.primary}
          />
          <Text style={styles.dateText}>{formatDateTime(startDate)}</Text>
        </Pressable>

        <Text style={styles.label}>End date and time</Text>
        <Pressable
          style={styles.dateButton}
          onPress={() => openPicker('end')}
        >
          <Ionicons
            name="calendar-outline"
            size={20}
            color={COLORS.primary}
          />
          <Text style={styles.dateText}>{formatDateTime(endDate)}</Text>
        </Pressable>

        {editTarget && (
          <DateTimePicker
            value={editTarget === 'start' ? startDate : endDate}
            mode={isAndroid ? editingPart : 'datetime'}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onPickerChange}
          />
        )}

        <AppButton
          title={saving ? 'Saving...' : 'Create Event & Generate QR'}
          icon="qr-code-outline"
          onPress={() => {
            if (!saving) void handleCreateEvent();
          }}
        />

        {message && <Text style={styles.message}>{message}</Text>}

        {payload && (
          <View style={styles.qrContainer}>
            <Text style={styles.sectionTitle}>Event QR Code</Text>
            <QRCode value={payload} size={220} />
            <Text style={styles.eventTitle}>{title}</Text>
            <Text style={styles.subtitle}>
              Ask students to scan this QR code from the Scan tab.
            </Text>
          </View>
        )}
      </View>

      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Attendance Monitoring</Text>

          <Pressable
            onPress={() => void refreshAttendance()}
            disabled={loadingAttendance}
            style={styles.refreshButton}
          >
            <Ionicons
              name="refresh-outline"
              size={20}
              color={COLORS.primary}
            />
            <Text style={styles.refreshText}>Refresh</Text>
          </Pressable>
        </View>

        <Text style={styles.subtitle}>
          Search your events and check the attendance records.
        </Text>

        {/* Search events */}
        <View style={styles.searchBox}>
          <Ionicons
            name="search-outline"
            size={20}
            color="#687386"
          />
          <TextInput
            style={styles.searchInput}
            value={eventSearch}
            onChangeText={setEventSearch}
            placeholder="Search event title or code..."
            placeholderTextColor="#8993A4"
            autoCapitalize="none"
            returnKeyType="search"
          />
          {eventSearch.length > 0 && (
            <Pressable onPress={() => setEventSearch('')}>
              <Ionicons name="close-circle" size={20} color="#687386" />
            </Pressable>
          )}
        </View>

        {loadingAttendance ? (
          <ActivityIndicator color={COLORS.primary} />
        ) : attendanceError ? (
          <Text style={styles.errorText}>{attendanceError}</Text>
        ) : events.length === 0 ? (
          <Text style={styles.subtitle}>
            No events found. Create an event first.
          </Text>
        ) : filteredEvents.length === 0 ? (
          <Text style={styles.emptyText}>
            No events match "{eventSearch}".
          </Text>
        ) : (
          filteredEvents.map((event) => {
            const isSelected = selectedEventId === event.eventId;

            const filteredAttendees = event.attendees.filter((attendee) =>
              attendee.studentId
                .toLowerCase()
                .includes(studentSearch.trim().toLowerCase())
            );

            return (
              <View key={event.eventId} style={styles.eventCard}>
                <Text style={styles.eventTitle}>{event.title}</Text>
                <Text style={styles.smallText}>
                  Event code: {event.eventCode}
                </Text>
                <Text style={styles.smallText}>
                  Starts: {formatDateTime(event.startTime)}
                </Text>
                <Text style={styles.smallText}>
                  Ends: {formatDateTime(event.endTime)}
                </Text>

                <View style={styles.countBox}>
                  <Ionicons
                    name="people-outline"
                    size={22}
                    color={COLORS.primary}
                  />
                  <Text style={styles.countText}>
                    Total attendees: {event.attendeeCount}
                  </Text>
                </View>

                <Pressable
                  style={styles.viewButton}
                  onPress={() => {
                    setSelectedEventId(isSelected ? null : event.eventId);
                    setStudentSearch('');
                  }}
                >
                  <Ionicons
                    name={isSelected ? 'chevron-up' : 'people'}
                    size={19}
                    color="#FFFFFF"
                  />
                  <Text style={styles.viewButtonText}>
                    {isSelected ? 'Hide Attendance' : 'View Attendance'}
                  </Text>
                </Pressable>

                {isSelected && (
                  <View style={styles.attendeeList}>
                    {event.attendees.length > 0 && (
                      <>
                        <Text style={styles.label}>Search student ID</Text>
                        <View style={styles.searchBox}>
                          <Ionicons
                            name="search-outline"
                            size={19}
                            color="#687386"
                          />
                          <TextInput
                            style={styles.searchInput}
                            value={studentSearch}
                            onChangeText={setStudentSearch}
                            placeholder="Enter student ID..."
                            placeholderTextColor="#8993A4"
                            autoCapitalize="none"
                          />
                          {studentSearch.length > 0 && (
                            <Pressable
                              onPress={() => setStudentSearch('')}
                            >
                              <Ionicons
                                name="close-circle"
                                size={20}
                                color="#687386"
                              />
                            </Pressable>
                          )}
                        </View>
                      </>
                    )}

                    {event.attendees.length === 0 ? (
                      <Text style={styles.subtitle}>
                        No students have scanned this event yet.
                      </Text>
                    ) : filteredAttendees.length === 0 ? (
                      <Text style={styles.emptyText}>
                        No student ID matches "{studentSearch}".
                      </Text>
                    ) : (
                      filteredAttendees.map((attendee, index) => (
                        <View
                          key={`${attendee.studentId}-${attendee.scannedAt}-${index}`}
                          style={styles.attendeeRow}
                        >
                          <View style={styles.avatar}>
                            <Ionicons
                              name="person-outline"
                              size={20}
                              color={COLORS.primary}
                            />
                          </View>

                          <View style={styles.attendeeInfo}>
                            <Text style={styles.attendeeName}>
                              Student ID
                            </Text>
                            <Text style={styles.smallText}>
                              {attendee.studentId}
                            </Text>
                            <Text style={styles.timeText}>
                              Scanned: {formatDateTime(attendee.scannedAt)}
                            </Text>
                          </View>
                        </View>
                      ))
                    )}
                  </View>
                )}
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },
  content: {
    padding: 18,
    paddingBottom: 40,
    gap: 16,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#F5F7FB',
    gap: 12,
  },
  title: {
    fontSize: 25,
    fontWeight: '700',
    color: '#172033',
  },
  subtitle: {
    fontSize: 14,
    color: '#687386',
    lineHeight: 21,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#E4E8F0',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#172033',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#354052',
  },
  input: {
    borderWidth: 1,
    borderColor: '#D7DDE7',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 15,
    color: '#172033',
    backgroundColor: '#FFFFFF',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    borderWidth: 1,
    borderColor: '#D7DDE7',
    borderRadius: 10,
    paddingHorizontal: 12,
    minHeight: 46,
    backgroundColor: '#FFFFFF',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: '#172033',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#D7DDE7',
    borderRadius: 10,
    padding: 12,
  },
  dateText: {
    color: '#263247',
    fontSize: 14,
    flexShrink: 1,
  },
  message: {
    color: COLORS.primary,
    fontSize: 14,
    lineHeight: 20,
  },
  qrContainer: {
    alignItems: 'center',
    gap: 12,
    paddingTop: 16,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#172033',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    padding: 6,
  },
  refreshText: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  errorText: {
    color: '#B42318',
    fontSize: 14,
  },
  emptyText: {
    color: '#687386',
    fontSize: 14,
    paddingVertical: 8,
  },
  eventCard: {
    borderWidth: 1,
    borderColor: '#E4E8F0',
    borderRadius: 12,
    padding: 13,
    gap: 8,
  },
  smallText: {
    fontSize: 12,
    color: '#687386',
  },
  countBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EEF3FF',
    borderRadius: 9,
    padding: 10,
  },
  countText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#172033',
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 9,
    padding: 11,
    marginTop: 4,
  },
  viewButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  attendeeList: {
    marginTop: 8,
    gap: 10,
  },
  attendeeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF0F4',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EEF3FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  attendeeInfo: {
    flex: 1,
    gap: 3,
  },
  attendeeName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#172033',
  },
  timeText: {
    fontSize: 12,
    color: '#46536A',
    marginTop: 3,
  },
});