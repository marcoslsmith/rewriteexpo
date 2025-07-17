import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet } from 'react-native';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import GradientBackground from '@/components/GradientBackground';
import { notificationService } from '@/lib/notifications';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useFrameworkReady();
  
  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
      
      // Initialize notifications
      const initializeNotifications = async () => {
        try {
          // Ensure default schedules exist for new users
          await notificationService.ensureDefaultSchedulesExist();
          
          // Schedule all active notifications
          await notificationService.scheduleAllActiveNotifications();
        } catch (error) {
          console.error('Error initializing notifications:', error);
        }
      };
      
      initializeNotifications();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return (
      <GradientBackground colors={['#fefbff', '#f8fafc']}>
        <View style={styles.splashContainer}>
          <Text style={styles.splashTitle}>The Rewrite</Text>
          <Text style={styles.splashSubtitle}>Transform your thoughts</Text>
        </View>
      </GradientBackground>
    );
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="dark" />
    </>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  splashTitle: {
    fontSize: 32,
    fontFamily: 'Inter-Bold',
    color: '#1e293b',
    marginBottom: 8,
    textAlign: 'center',
  },
  splashSubtitle: {
    fontSize: 18,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
    textAlign: 'center',
  },
});