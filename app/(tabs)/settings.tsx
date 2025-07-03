import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Modal,
  Switch,
  Platform,
  Animated,
} from 'react-native';
import { 
  User, 
  Bell, 
  Trash2, 
  LogOut, 
  Plus,
  Clock,
  TestTube,
  X,
  Mail
} from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { storageService } from '../../lib/storage';
import { notificationService } from '../../lib/notifications';
import { getInspirationalQuote } from '../../lib/greetings';
import GradientBackground from '../../components/GradientBackground';
import AnimatedButton from '../../components/AnimatedButton';
import FloatingActionButton from '../../components/FloatingActionButton';
import type { Database } from '../../lib/supabase';

type NotificationSchedule = Database['public']['Tables']['notification_schedules']['Row'];

export default function Settings() {
  const [user, setUser] = useState<any>(null);
  const [notificationSchedules, setNotificationSchedules] = useState<NotificationSchedule[]>([]);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showFAB, setShowFAB] = useState(true);
  const [inspirationalQuote] = useState(getInspirationalQuote());
  const [totalManifestations, setTotalManifestations] = useState(0);
  const [writingStreak, setWritingStreak] = useState(0);
  const scrollY = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    {
      useNativeDriver: false,
      listener: (event: any) => {
        const currentScrollY = event.nativeEvent.contentOffset.y;
        const isScrollingDown = currentScrollY > lastScrollY.current;
        
        if (isScrollingDown && currentScrollY > 100) {
          setShowFAB(false);
        } else if (!isScrollingDown) {
          setShowFAB(true);
        }
        
        lastScrollY.current = currentScrollY;
      },
    }
  );

  const [newSchedule, setNewSchedule] = useState({
    title: 'Daily Manifestation',
    message: '',
    useRandomManifestation: true,
    time: '09:00',
    days: [1, 2, 3, 4, 5, 6, 0],
    isActive: true,
  });

  useEffect(() => {
    checkUser();
    loadNotificationSchedules();
    loadUserStats();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const loadNotificationSchedules = async () => {
    try {
      const schedules = await storageService.getNotificationSchedules();
      setNotificationSchedules(schedules);
    } catch (error) {
      console.error('Error loading notification schedules:', error);
    }
  };

  const loadUserStats = async () => {
    try {
      const manifestations = await storageService.getManifestations();
      setTotalManifestations(manifestations.length);
      
      // Calculate writing streak (simplified - consecutive days with entries)
      const today = new Date();
      let streak = 0;
      for (let i = 0; i < 30; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(today.getDate() - i);
        const hasEntry = manifestations.some(m => {
          const entryDate = new Date(m.created_at);
          return entryDate.toDateString() === checkDate.toDateString();
        });
        if (hasEntry) {
          streak++;
        } else if (i > 0) {
          break;
        }
      }
      setWritingStreak(streak);
    } catch (error) {
      console.error('Error loading user stats:', error);
    }
  };

  const signIn = async () => {
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    try {
      const { error } = await supabase.auth.signInWithOtp({ email });
      if (error) throw error;
      setSuccess('Check your email for a magic link to sign in!');
      setShowSignInModal(false);
      setEmail('');
    } catch (error: any) {
      setError(error.message);
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSuccess('You have been signed out successfully.');
    } catch (error: any) {
      setError(error.message);
    }
  };

  const clearAllData = async () => {
    try {
      await storageService.clearAllData();
      await notificationService.cancelAllNotifications();
      setNotificationSchedules([]);
      setTotalManifestations(0);
      setWritingStreak(0);
      setSuccess('All your data has been cleared.');
    } catch (error) {
      setError('Failed to clear data. Please try again.');
    }
  };

  const addNotificationSchedule = async () => {
    try {
      await storageService.addNotificationSchedule({
        title: newSchedule.title,
        message: newSchedule.message,
        use_random_manifestation: newSchedule.useRandomManifestation,
        time: newSchedule.time,
        days: newSchedule.days,
        is_active: newSchedule.isActive,
      });
      
      setShowScheduleModal(false);
      setNewSchedule({
        title: 'Daily Manifestation',
        message: '',
        useRandomManifestation: true,
        time: '09:00',
        days: [1, 2, 3, 4, 5, 6, 0],
        isActive: true,
      });
      
      await loadNotificationSchedules();
      setSuccess('Notification schedule created successfully!');
    } catch (error: any) {
      setError(error.message || 'Failed to create notification schedule.');
    }
  };

  const toggleSchedule = async (id: string) => {
    try {
      const schedule = notificationSchedules.find(s => s.id === id);
      if (schedule) {
        await storageService.updateNotificationSchedule(id, { is_active: !schedule.is_active });
        await loadNotificationSchedules();
      }
    } catch (error) {
      setError('Failed to update notification schedule.');
    }
  };

  const deleteSchedule = async (id: string) => {
    try {
      await storageService.deleteNotificationSchedule(id);
      await loadNotificationSchedules();
      setSuccess('Notification schedule deleted successfully.');
    } catch (error) {
      setError('Failed to delete notification schedule.');
    }
  };

  const testNotification = async () => {
    try {
      await notificationService.sendTestNotification(
        'Test Manifestation',
        'This is a test notification from The Rewrite app!'
      );
      setSuccess('Test notification sent! Check your notifications.');
    } catch (error: any) {
      setError(error.message || 'Unable to send test notification.');
    }
  };

  const getDayName = (day: number) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[day];
  };

  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccess(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  return (
    <GradientBackground>
      <View style={styles.container}>
        <FloatingActionButton visible={showFAB} />
        
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.greeting}>Your account</Text>
        <Text style={styles.title}>Profile & Settings</Text>
      </View>

      {/* Status Messages */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
      
      {success && (
        <View style={styles.successContainer}>
          <Text style={styles.successText}>{success}</Text>
        </View>
          <Text style={styles.greeting}>Welcome back</Text>
          <Text style={styles.title}>Your Journey</Text>
          
          {/* User Stats */}
          <View style={styles.statsCard}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <User size={24} color="#64748b" strokeWidth={1.5} />
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>
                  {user?.email?.split('@')[0] || 'Guest'}
                </Text>
                <Text style={styles.userStatus}>
                  {user ? 'Signed in' : 'Guest mode'}
                </Text>
              </View>
            </View>
            
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{writingStreak}</Text>
                <Text style={styles.statLabel}>Day Streak</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{totalManifestations}</Text>
                <Text style={styles.statLabel}>Manifestations</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>
                  {Math.floor(totalManifestations * 50 / 10) * 10}
                </Text>
                <Text style={styles.statLabel}>Words Written</Text>
              </View>
            </View>
          </View>
          
          {/* Inspirational Quote */}
          <View style={styles.quoteCard}>
            <Text style={styles.quoteText}>"{inspirationalQuote}"</Text>
          </View>
      <Animated.ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      >
        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          {user ? (
            <View style={styles.userCard}>
              <View style={styles.userInfo}>
                <View style={styles.userAvatar}>
                  <User size={20} color="#64748b" strokeWidth={1.5} />
                </View>
                <View style={styles.userDetails}>
                  <Text style={styles.userEmail}>{user.email}</Text>
                  <Text style={styles.userStatus}>Signed in</Text>
                </View>
              </View>
              <TouchableOpacity onPress={signOut} style={styles.signOutButton}>
                <LogOut size={18} color="#ef4444" strokeWidth={1.5} />
                <Text style={styles.signOutText}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.signInButton} onPress={() => setShowSignInModal(true)}>
              <Mail size={18} color="#ffffff" strokeWidth={1.5} />
              <Text style={styles.signInButtonText}>Sign In</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Notifications Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Notifications</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowScheduleModal(true)}
            >
              <Plus size={18} color="#ffffff" strokeWidth={1.5} />
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity style={styles.testButton} onPress={testNotification}>
            <TestTube size={18} color="#2563eb" strokeWidth={1.5} />
            <Text style={styles.testButtonText}>Test Notifications</Text>
          </TouchableOpacity>

          {notificationSchedules.map((schedule) => (
            <View key={schedule.id} style={styles.scheduleCard}>
              <View style={styles.scheduleHeader}>
                <Text style={styles.scheduleTitle}>{schedule.title}</Text>
                <Switch
                  value={schedule.is_active}
                  onValueChange={() => toggleSchedule(schedule.id)}
                  trackColor={{ false: '#e2e8f0', true: '#dbeafe' }}
                  thumbColor={schedule.is_active ? '#2563eb' : '#94a3b8'}
                />
              </View>
              
              <View style={styles.scheduleDetails}>
                <View style={styles.scheduleTime}>
                  <Clock size={14} color="#64748b" strokeWidth={1.5} />
                  <Text style={styles.scheduleTimeText}>{schedule.time}</Text>
                </View>
                
                <View style={styles.scheduleDays}>
                  {schedule.days.map(day => (
                    <Text key={day} style={styles.dayBadge}>
                      {getDayName(day)}
                    </Text>
                  ))}
                </View>
              </View>
              
              <Text style={styles.scheduleMessage}>
                {schedule.use_random_manifestation 
                  ? 'Random manifestation from your collection'
                  : schedule.message
                }
              </Text>
              
              <TouchableOpacity
                style={styles.deleteScheduleButton}
                onPress={() => deleteSchedule(schedule.id)}
              >
                <Trash2 size={14} color="#ef4444" strokeWidth={1.5} />
                <Text style={styles.deleteScheduleText}>Delete</Text>
              </TouchableOpacity>
            </View>
          ))}
          
          {notificationSchedules.length === 0 && (
            <View style={styles.emptyState}>
              <Bell size={32} color="#cbd5e1" strokeWidth={1.5} />
              <Text style={styles.emptyText}>
                No notification schedules yet. Tap + to create one.
              </Text>
            </View>
          )}
        </View>

        {/* Data Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data</Text>
          <TouchableOpacity style={styles.dangerButton} onPress={clearAllData}>
            <Trash2 size={18} color="#ffffff" strokeWidth={1.5} />
            <Text style={styles.dangerButtonText}>Clear All Data</Text>
          </TouchableOpacity>
        </View>
      </Animated.ScrollView>

      {/* Sign In Modal */}
      <Modal
        visible={showSignInModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setShowSignInModal(false)}
              style={styles.closeButton}
            >
              <X size={24} color="#64748b" strokeWidth={1.5} />
            </TouchableOpacity>
            
            <View style={styles.modalTitleContainer}>
              <Text style={styles.modalTitle}>Sign In</Text>
              <Text style={styles.modalSubtitle}>Access your account</Text>
            </View>
          </View>
          
          <View style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <TextInput
                style={styles.textInput}
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                placeholderTextColor="#94a3b8"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            
            <TouchableOpacity
              style={styles.createButton}
              onPress={signIn}
            >
              <Text style={styles.createButtonText}>Send Magic Link</Text>
            </TouchableOpacity>
            
            <Text style={styles.helpText}>
              We'll send you a secure link to sign in without a password.
            </Text>
          </View>
        </View>
      </Modal>

      {/* Add Schedule Modal */}
      <Modal
        visible={showScheduleModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setShowScheduleModal(false)}
              style={styles.closeButton}
            >
              <X size={24} color="#64748b" strokeWidth={1.5} />
            </TouchableOpacity>
            
            <View style={styles.modalTitleContainer}>
              <Text style={styles.modalTitle}>New Notification</Text>
              <Text style={styles.modalSubtitle}>Create a reminder schedule</Text>
            </View>
          </View>
          
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Title</Text>
              <TextInput
                style={styles.textInput}
                value={newSchedule.title}
                onChangeText={(text) => setNewSchedule({...newSchedule, title: text})}
                placeholder="e.g., Morning Manifestation"
                placeholderTextColor="#94a3b8"
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Time</Text>
              <TextInput
                style={styles.textInput}
                value={newSchedule.time}
                onChangeText={(text) => setNewSchedule({...newSchedule, time: text})}
          onScroll={handleScroll}
            
            <View style={styles.inputGroup}>
              <View style={styles.switchRow}>
                <Text style={styles.inputLabel}>Use Random Manifestation</Text>
                <Switch
                  value={newSchedule.useRandomManifestation}
              <View style={styles.accountCard}>
                <Text style={styles.accountEmail}>{user.email}</Text>
                <AnimatedButton onPress={signOut} style={styles.signOutButton}>
                  <View style={styles.signOutContent}>
                    <LogOut size={18} color="#ef4444" strokeWidth={1.5} />
                    <Text style={styles.signOutText}>Sign Out</Text>
                  </View>
                </AnimatedButton>
                  placeholder="Enter your custom notification message"
                  placeholderTextColor="#94a3b8"
              <AnimatedButton
                <View style={styles.signInContent}>
                  <Mail size={18} color="#ffffff" strokeWidth={1.5} />
                  <Text style={styles.signInButtonText}>Sign In</Text>
                </View>
              </AnimatedButton>
            )}
            
            <TouchableOpacity
              style={styles.createButton}
            <AnimatedButton style={styles.testButton} onPress={testNotification}>
              <View style={styles.testButtonContent}>
                <TestTube size={18} color="#2563eb" strokeWidth={1.5} />
                <Text style={styles.testButtonText}>Test Notifications</Text>
              </View>
            </AnimatedButton>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  greeting: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#0f172a',
    lineHeight: 34,
  },
  errorContainer: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    padding: 16,
    marginHorizontal: 20,
    borderRadius: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
                <AnimatedButton
    textAlign: 'center',
  },
  successContainer: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    padding: 16,
    marginHorizontal: 20,
    borderRadius: 12,
    marginBottom: 16,
  },
  successText: {
    color: '#16a34a',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#0f172a',
  },
  addButton: {
    backgroundColor: '#2563eb',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  userAvatar: {
                  <View style={styles.deleteScheduleContent}>
                    <Trash2 size={14} color="#ef4444" strokeWidth={1.5} />
                    <Text style={styles.deleteScheduleText}>Delete</Text>
                  </View>
                </AnimatedButton>
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userDetails: {
    flex: 1,
  },
                  Ready to set up reminders? Tap + to create your first notification schedule.
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#0f172a',
    marginBottom: 2,
  },
  userStatus: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
            <AnimatedButton style={styles.dangerButton} onPress={clearAllData}>
              <View style={styles.dangerButtonContent}>
                <Trash2 size={18} color="#ffffff" strokeWidth={1.5} />
                <Text style={styles.dangerButtonText}>Clear All Data</Text>
              </View>
            </AnimatedButton>
    alignItems: 'center',
          
          {/* Bottom padding for FAB */}
          <View style={styles.bottomPadding} />
    gap: 8,
    paddingVertical: 8,
  },
  signOutText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#ef4444',
  },
  signInButton: {
    flexDirection: 'row',
              <AnimatedButton
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    paddingHorizontal: 24,
              </AnimatedButton>
    gap: 8,
  },
  signInButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f9ff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 16,
  accountCard: {
  },
  testButtonText: {
    color: '#2563eb',
    fontSize: 14,
              <AnimatedButton
  },
  scheduleCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
  accountEmail: {
  },
    fontFamily: 'Inter-Regular',
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'center',
    gap: 6,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
  signOutContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  },
  scheduleDays: {
    flexDirection: 'row',
    gap: 4,
  },
  dayBadge: {
    borderRadius: 6,
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    color: '#475569',
  },
  signInContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  scheduleMessage: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
    fontStyle: 'italic',
    marginBottom: 12,
    lineHeight: 20,
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  deleteScheduleText: {
  },
  testButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    fontFamily: 'Inter-Medium',
    color: '#ef4444',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 20,
  },
  dangerButton: {
              <AnimatedButton
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ef4444',
    paddingVertical: 16,
              </AnimatedButton>
    borderRadius: 12,
    gap: 8,
  },
      </View>
    </GradientBackground>
    color: '#ffffff',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 16,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  modalTitleContainer: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#0f172a',
    marginBottom: 2,
  },
  modalSubtitle: {
    fontSize: 16,
  modalContent: {
    flex: 1,
  deleteScheduleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
    paddingHorizontal: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#0f172a',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  },
  dangerButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  createButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    marginBottom: 24,
  },
  statsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#0f172a',
    marginBottom: 2,
    textTransform: 'capitalize',
  },
  userStatus: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#059669',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#0f172a',
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#64748b',
    marginTop: 2,
  },
  quoteCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#2563eb',
  },
  quoteText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#475569',
    fontStyle: 'italic',
    lineHeight: 20,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  createButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  helpText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
    textAlign: 'center',
    paddingBottom: 120,
  },
  bottomPadding: {
    height: 40,
  },
});