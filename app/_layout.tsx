import { Redirect, Stack, useSegments } from 'expo-router';
import {
  ActivityIndicator,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { COLORS } from '@/constants/colors';
import { useAuth } from '@/lib/auth';

export default function RootLayout() {
  const { session, loading } = useAuth();
  const segments = useSegments();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const firstSegment = segments?.[0];

  const inAuthGroup =
    firstSegment === 'login' ||
    firstSegment === 'register';

  if (!session && !inAuthGroup) {
    return <Redirect href="/login" />;
  }

  if (session && inAuthGroup) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
});